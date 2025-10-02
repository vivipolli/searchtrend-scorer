import axios from 'axios';
import dotenv from 'dotenv';
import database from './db.js';
import { createDomain } from './models/domain.js';
import { logNewEventAlert } from './services/alerts.js';
import { sendAlert, mapFriendlyToApi } from './bot/telegram.js';
import { shouldAutoBuy, createAutoBuyOffer, getUserWalletAddress } from './services/autoBuy.js';

dotenv.config({ path: './config/.env' });

const baseUrl = process.env.DOMA_API_BASE || 'https://api-testnet.doma.xyz';
const apiKey = process.env.DOMA_API_KEY || '';
const debugPoller = process.env.DEBUG_POLLER === '1';

function extractFieldsFromEvent(ev) {
  const event_type = ev?.type || 'UNKNOWN';
  const name = ev?.name || ev?.eventData?.name || null;
  const tx_hash = ev?.eventData?.txHash || null;
  let price = null;
  const payment = ev?.eventData?.payment;
  if (payment && typeof payment.price === 'string') {
    const parsed = Number(payment.price);
    if (!Number.isNaN(parsed)) price = parsed;
  }
  return { name, event_type, price, tx_hash };
}

function formatAlertMessage({ name, event_type, price, tx_hash }) {
  const parts = [
    `🚨 New activity detected: ${event_type}`,
    name ? `Name: ${name}` : null,
    price != null ? `Price: ${price}` : null,
    tx_hash ? `Tx: ${tx_hash}` : null,
  ].filter(Boolean);
  return parts.join('\n');
}

function matchesFilters(alert, { event_type, price, name }) {
  const apiTypes = mapFriendlyToApi(alert.event_type);
  if (apiTypes.length && !apiTypes.includes(event_type)) return false;

  if (alert.filter_price && alert.filter_price.toLowerCase() !== 'none') {
    const m = alert.filter_price.match(/([<>]=?|==)\s*(\d*\.?\d+)/);
    if (m) {
      const op = m[1];
      const val = Number(m[2]);
      if (Number.isFinite(val) && Number.isFinite(price)) {
        if (op === '<' && !(price < val)) return false;
        if (op === '<=' && !(price <= val)) return false;
        if (op === '>' && !(price > val)) return false;
        if (op === '>=' && !(price >= val)) return false;
        if (op === '==' && !(price === val)) return false;
      }
    }
  }

  if (alert.domain_filter && alert.domain_filter.toLowerCase() !== 'none') {
    const needle = String(alert.domain_filter).toLowerCase();
    const hay = String(name || '').toLowerCase();
    if (!hay.includes(needle)) return false;
  }

  if (alert.filter_score && alert.filter_score.toLowerCase() !== 'none') {
    // Placeholder; scoring not yet integrated
  }
  return true;
}

function isProcessed(uniqueId) {
  if (!uniqueId) return false; // if absent, allow through (lastId ack still prevents re-fetch)
  const row = database.prepare('SELECT 1 FROM processed_events WHERE unique_id = ?').get(uniqueId);
  return !!row;
}

function markProcessed(uniqueId) {
  if (!uniqueId) return;
  const stmt = database.prepare('INSERT OR IGNORE INTO processed_events (unique_id) VALUES (?)');
  stmt.run(uniqueId);
}

async function notifyMatchingUsers(eventRow) {
  const alerts = database.prepare('SELECT * FROM alerts').all();
  for (const alert of alerts) {
    if (matchesFilters(alert, eventRow)) {
      const message = formatAlertMessage(eventRow);
      logNewEventAlert(eventRow);
      await sendAlert(alert.user_id, message);

      // Check if auto-buy should be triggered
      if (shouldAutoBuy(alert, eventRow)) {
        console.log(`[AUTO_BUY] Triggering auto-buy for user ${alert.user_id} on domain ${eventRow.name}`);
        
        try {
          const autoBuyResult = await createAutoBuyOffer(alert, eventRow);
          
          if (autoBuyResult.success) {
            const autoBuyMessage = `🤖 Auto-buy triggered!\n\nDomain: ${autoBuyResult.domain}\nOrder ID: ${autoBuyResult.orderId}\nAmount: ${autoBuyResult.amount} wei`;
            await sendAlert(alert.user_id, autoBuyMessage);
          } else {
            const errorMessage = `❌ Auto-buy failed for ${eventRow.name}\nError: ${autoBuyResult.error}`;
            await sendAlert(alert.user_id, errorMessage);
          }
        } catch (error) {
          console.error(`[AUTO_BUY] Error processing auto-buy for user ${alert.user_id}:`, error.message);
          const errorMessage = `❌ Auto-buy error for ${eventRow.name}\nError: ${error.message}`;
          await sendAlert(alert.user_id, errorMessage);
        }
      }
    }
  }
}

export async function pollOnce({ limit = 25, finalizedOnly = true } = {}) {
  const url = `${baseUrl}/v1/poll`;
  const headers = apiKey ? { 'Api-Key': apiKey } : {};
  const res = await axios.get(url, { headers, params: { limit, finalizedOnly } });
  const data = res.data || {};
  // console.log('[POLLER][API_RESPONSE]', JSON.stringify(data, null, 2));
  const events = Array.isArray(data.events) ? data.events : [];

  for (const ev of events) {
    // console.log('[POLLER][FULL_RESPONSE]', JSON.stringify(ev, null, 2));
    
    const fields = extractFieldsFromEvent(ev);
    // console.log('[POLLER][EXTRACTED]', {
    //   id: ev?.id,
    //   type: ev?.type,
    //   name: fields.name,
    //   price: fields.price,
    //   tx_hash: fields.tx_hash,
    //   uniqueId: ev?.uniqueId,
    // });

    // Deduplicate by uniqueId
    const uniqueId = ev?.uniqueId;
    if (isProcessed(uniqueId)) continue;

    if (!fields.name && !fields.event_type && !fields.tx_hash) {
      markProcessed(uniqueId);
      continue;
    }

    const created = createDomain(fields);
    await notifyMatchingUsers(created);
    markProcessed(uniqueId);
  }

  // Acknowledge lastId to advance server-side cursor
  if (typeof data.lastId === 'number') {
    try {
      const ackUrl = `${baseUrl}/v1/poll/ack/${data.lastId}`;
      await axios.post(ackUrl, null, { headers });
    } catch (e) {
      console.error('[POLLER] Ack failed', e?.message || e);
    }
  }

  return { count: events.length, lastId: data.lastId, hasMore: data.hasMoreEvents };
}

export default { pollOnce };
