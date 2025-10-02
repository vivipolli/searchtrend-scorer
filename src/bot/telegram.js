import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import database from '../db.js';
import { addUserWallet, getUserWallets, setActiveWallet, removeWallet, generateNewWallet } from '../services/walletService.js';
import { createConnectionSession, getConnectionStatus, disconnectWallet } from '../services/walletConnectService.js';

dotenv.config({ path: './config/.env' });

let botInstance = null;
const chatStates = new Map();

// Friendly labels shown to users
const FRIENDLY_EVENTS = [
  'Domain Registered',
  'Domain Listed',
  'Domain Sold',
  'Domain Expiring (soon)',
];

// Map friendly labels to lists of Poll API event types
const FRIENDLY_TO_API = {
  'Domain Registered': ['NAME_TOKEN_MINTED', 'NAME_TOKENIZED'],
  'Domain Listed': ['NAME_TOKEN_LISTED'],
  'Domain Sold': ['NAME_TOKEN_PURCHASED'],
  'Domain Expiring (soon)': [],
};

function upsertUser({ telegramId, username }) {
  const createUsers = `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    username TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`;
  database.exec(createUsers);

  const upsert = database.prepare(
    'INSERT OR IGNORE INTO users (telegram_id, username) VALUES (?, ?)' 
  );
  upsert.run(String(telegramId), username || null);

  const select = database.prepare('SELECT * FROM users WHERE telegram_id = ?');
  return select.get(String(telegramId));
}

function ensureAlertsTable() {
  const createAlerts = `CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    filter_price TEXT,
    filter_score TEXT,
    domain_filter TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );`;
  database.exec(createAlerts);
}

function setChatState(chatId, state) {
  chatStates.set(chatId, state);
}

function getChatState(chatId) {
  return chatStates.get(chatId);
}

function clearChatState(chatId) {
  chatStates.delete(chatId);
}

// Inline keyboards (render directly under the message)
function inlineEventKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: FRIENDLY_EVENTS[0], callback_data: `evt:${FRIENDLY_EVENTS[0]}` },
          { text: FRIENDLY_EVENTS[1], callback_data: `evt:${FRIENDLY_EVENTS[1]}` },
        ],
        [
          { text: FRIENDLY_EVENTS[2], callback_data: `evt:${FRIENDLY_EVENTS[2]}` },
          { text: FRIENDLY_EVENTS[3], callback_data: `evt:${FRIENDLY_EVENTS[3]}` },
        ],
      ],
    },
  };
}

function inlinePriceKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'None', callback_data: 'price:none' },
          { text: '<0.01', callback_data: 'price:<0.01' },
          { text: '<0.05', callback_data: 'price:<0.05' },
        ],
        [
          { text: '<0.1', callback_data: 'price:<0.1' },
          { text: '<1', callback_data: 'price:<1' },
          { text: 'Custom', callback_data: 'price:custom' },
        ],
      ],
    },
  };
}

function inlineScoreKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'None', callback_data: 'score:none' },
          { text: '>60', callback_data: 'score:>60' },
          { text: '>80', callback_data: 'score:>80' },
        ],
        [
          { text: '>90', callback_data: 'score:>90' },
          { text: 'Custom', callback_data: 'score:custom' },
        ],
      ],
    },
  };
}

function inlineDomainKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [ { text: 'No domain filter', callback_data: 'domain:none' } ],
        [ { text: 'Set domain filter…', callback_data: 'domain:custom' } ],
      ],
    },
  };
}

function inlineAutoBuyKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [ { text: '❌ No auto-buy', callback_data: 'autobuy:no' } ],
        [ { text: '✅ Enable auto-buy', callback_data: 'autobuy:yes' } ],
        [ { text: 'Type custom…', callback_data: 'autobuy:custom' } ],
      ],
    },
  };
}

function getMainMenu() {
  return {
    reply_markup: {
      keyboard: [
        ['📊 My Alerts', '➕ Create Alert'],
        ['💳 My Wallets', '🤖 Auto-Buy Logs'],
        ['🗑️ Clear All Alerts', '❓ Help'],
      ],
      resize_keyboard: true,
      persistent: true,
    },
  };
}

function removeKeyboard() {
  return { reply_markup: { remove_keyboard: true } };
}

async function handleStart(msg) {
  const chatId = msg.chat.id;
  const username = msg.from?.username || null;
  console.log('[BOT] /start from', chatId, username);
  const user = await Promise.resolve(upsertUser({ telegramId: chatId, username }));
  await botInstance.sendMessage(
    chatId,
    'Welcome to Doma Alerts 🚀\n\nUse the menu below to manage your alerts or type /help for more info.',
    getMainMenu()
  );
  return user;
}

async function handleHelp(msg) {
  const chatId = msg.chat.id;
  const helpText = `🤖 *Doma Alerts Bot Help*

*Available Commands:*
• /start - Show welcome message and menu
• /setalert - Create a new alert (or use "➕ Create Alert" button)
• /myalerts - List your alerts (or use "📊 My Alerts" button)
• /mywallets - View your connected wallet (or use "💳 My Wallets" button)
• /connectwallet - Connect your wallet securely (no private keys required)
• /disconnectwallet - Disconnect your wallet
• /autobuylogs - View your auto-buy history
• /clearalerts - Remove all alerts (or use "🗑️ Clear All Alerts" button)
• /deletealert <number> - Remove specific alert by number
• /help - Show this help message

*How to create alerts:*
1. Choose activity type (Domain Registered, Listed, Sold, etc.)
2. Set price filter (optional)
3. Set score filter (optional)
4. Set domain filter (optional)
5. Enable auto-buy (optional)

*Auto-Buy Features:*
• Automatically purchase domains that match your criteria
• Only works for NAME_TOKEN_MINTED events
• Respects your price and domain filters
• Creates offers on the Doma marketplace
• Requires a wallet to be set up first

*Wallet Management:*
• Use /connectwallet to connect your wallet securely
• Works with MetaMask, WalletConnect, Coinbase Wallet, and more
• No private keys or seed phrases required
• Use /mywallets to view your connected wallet
• Use /disconnectwallet to disconnect your wallet
• Your wallet stays secure - we never store private keys

*Example:*
1. Use /connectwallet to connect your wallet securely
2. Create an alert for domains containing "demo" with price < 0.05 ETH and auto-buy enabled
3. The bot will automatically create offers when matching domains are found

*Need help?* Contact support or check the documentation.`;
  
  await botInstance.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
}

async function startSetAlertFlow(chatId) {
  setChatState(chatId, { step: 'choose_event' });
  console.log('[BOT] /setalert start for', chatId);
  await botInstance.sendMessage(
    chatId,
    'Which type of activity do you want to monitor?',
    inlineEventKeyboard()
  );
}

function normalizePriceInput(text) {
  if (!text) return null;
  const v = text.trim();
  if (/^none$/i.test(v)) return 'none';
  if (/^custom$/i.test(v)) return 'custom';
  return v;
}

function normalizeScoreInput(text) {
  if (!text) return null;
  const v = text.trim();
  if (/^none$/i.test(v)) return 'none';
  if (/^custom$/i.test(v)) return 'custom';
  return v;
}

// Handle text inputs (used for custom values)
async function handleInteractiveMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  const state = getChatState(chatId);
  
  // Handle menu button presses
  if (!state) {
    if (text === '📊 My Alerts') {
      await handleMyAlerts(msg);
      return;
    }
    if (text === '➕ Create Alert') {
      await startSetAlertFlow(chatId);
      return;
    }
    if (text === '💳 My Wallets') {
      await handleMyWallets(msg);
      return;
    }
    if (text === '🤖 Auto-Buy Logs') {
      await handleAutoBuyLogs(msg);
      return;
    }
    if (text === '🗑️ Clear All Alerts') {
      await handleClearAlerts(msg);
      return;
    }
    if (text === '❓ Help') {
      await handleHelp(msg);
      return;
    }
    return;
  }

  if (state.step === 'filter_price_custom') {
    state.filter_price = text;
    state.step = 'filter_score';
    setChatState(chatId, state);
    await botInstance.sendMessage(
      chatId,
      'Do you want to filter by score? Choose below or type a custom value like >80.',
      inlineScoreKeyboard()
    );
    return;
  }

  if (state.step === 'filter_score_custom') {
    state.filter_score = text;
    state.step = 'domain_filter';
    setChatState(chatId, state);
    await botInstance.sendMessage(chatId, 'Add a domain filter? (type a name like example.com or send "none")', removeKeyboard());
    return;
  }

  if (state.step === 'domain_filter_custom') {
    state.domain_filter = text && text.toLowerCase() !== 'none' ? text : 'none';
    state.step = 'auto_buy';
    setChatState(chatId, state);
    await botInstance.sendMessage(chatId, 'Enable auto-buy for this alert?', inlineAutoBuyKeyboard());
    return;
  }

  if (state.step === 'auto_buy_custom') {
    state.auto_buy = text.toLowerCase() === 'yes' || text.toLowerCase() === 'y';
    await finalizeAlert(chatId, state);
    return;
  }

  if (state.step === 'import_private_key') {
    await processPrivateKeyImport(chatId, text);
    return;
  }

  if (state.step === 'import_mnemonic') {
    await processMnemonicImport(chatId, text);
    return;
  }
}

// Handle button presses
async function handleCallbackQuery(cb) {
  try {
    const chatId = cb.message.chat.id;
    const data = cb.data || '';
    const state = getChatState(chatId);
    if (!state) return;

    if (data.startsWith('evt:') && state.step === 'choose_event') {
      const label = data.slice(4);
      if (!FRIENDLY_EVENTS.includes(label)) return;
      state.event_type = label;
      state.step = 'filter_price';
      setChatState(chatId, state);
      await botInstance.sendMessage(chatId, 'Do you want to filter by price?', inlinePriceKeyboard());
      return;
    }

    if (data.startsWith('price:') && state.step === 'filter_price') {
      const p = data.slice(6);
      if (p === 'custom') {
        state.step = 'filter_price_custom';
        setChatState(chatId, state);
        await botInstance.sendMessage(chatId, 'Send a price filter (e.g., <0.05, >0.1, ==0.2).', removeKeyboard());
        return;
      }
      state.filter_price = p === 'none' ? 'none' : p;
      state.step = 'filter_score';
      setChatState(chatId, state);
      await botInstance.sendMessage(chatId, 'Do you want to filter by score?', inlineScoreKeyboard());
      return;
    }

    if (data.startsWith('score:') && state.step === 'filter_score') {
      const s = data.slice(6);
      if (s === 'custom') {
        state.step = 'filter_score_custom';
        setChatState(chatId, state);
        await botInstance.sendMessage(chatId, 'Send a score filter (e.g., >80).', removeKeyboard());
        return;
      }
      state.filter_score = s === 'none' ? 'none' : s;
      state.step = 'domain_filter';
      setChatState(chatId, state);
      await botInstance.sendMessage(chatId, 'Add a domain filter?', inlineDomainKeyboard());
      return;
    }

    if (data.startsWith('domain:') && state.step === 'domain_filter') {
      const d = data.slice(7);
      if (d === 'custom') {
        state.step = 'domain_filter_custom';
        setChatState(chatId, state);
        await botInstance.sendMessage(chatId, 'Type a domain to filter (e.g., yev-domatest2.shib), or "none".', removeKeyboard());
        return;
      }
      state.domain_filter = d === 'none' ? 'none' : d;
      state.step = 'auto_buy';
      setChatState(chatId, state);
      await botInstance.sendMessage(chatId, 'Enable auto-buy for this alert?', inlineAutoBuyKeyboard());
      return;
    }

    if (data.startsWith('autobuy:') && state.step === 'auto_buy') {
      const ab = data.slice(8);
      if (ab === 'custom') {
        state.step = 'auto_buy_custom';
        setChatState(chatId, state);
        await botInstance.sendMessage(chatId, 'Type "yes" to enable auto-buy or "no" to disable.', removeKeyboard());
        return;
      }
      state.auto_buy = ab === 'yes';
      await finalizeAlert(chatId, state);
      return;
    }

    // Handle wallet-related callbacks
    if (data.startsWith('wallet:')) {
      const action = data.slice(7);
      
      if (action === 'connect_secure') {
        await handleConnectWallet({ chat: { id: chatId } });
        return;
      }
      
      if (action === 'check_connection') {
        const user = await Promise.resolve(upsertUser({ telegramId: chatId, username: null }));
        const connectionStatus = getConnectionStatus(user.id);
        
        if (connectionStatus.connected) {
          await botInstance.sendMessage(
            chatId,
            `✅ *Wallet Connected Successfully!*\n\n🔗 **Address:** \`${connectionStatus.walletAddress}\`\n🟢 **Status:** Connected and authorized\n\nYour wallet is now ready for auto-buy transactions!`,
            { parse_mode: 'Markdown', ...getMainMenu() }
          );
        } else {
          await botInstance.sendMessage(
            chatId,
            '❌ *Connection Not Found*\n\nPlease make sure you completed the connection process in your browser. If you haven\'t connected yet, click the link to start.',
            { parse_mode: 'Markdown', ...getMainMenu() }
          );
        }
        return;
      }
      
      if (action === 'cancel') {
        clearChatState(chatId);
        await botInstance.sendMessage(chatId, '❌ Operation cancelled.', getMainMenu());
        return;
      }
    }
  } finally {
    // Acknowledge callback to remove Telegram's "loading" state
    if (cb.id) botInstance.answerCallbackQuery(cb.id).catch(() => {});
  }
}

async function finalizeAlert(chatId, state) {
  await saveAlertForChat(chatId, state);
  const chips = [];
  if (state.filter_price && state.filter_price.toLowerCase() !== 'none') chips.push(`Price ${state.filter_price}`);
  if (state.filter_score && state.filter_score.toLowerCase() !== 'none') chips.push(`Score ${state.filter_score}`);
  if (state.domain_filter && state.domain_filter.toLowerCase() !== 'none') chips.push(`Domain ~ ${state.domain_filter}`);
  if (state.auto_buy) chips.push('Auto-buy enabled');
  const filtersText = chips.length ? ` with filters [${chips.join(' | ')}]` : '';
  await botInstance.sendMessage(
    chatId,
    `✅ Alert created! You will receive notifications for *${state.event_type}*${filtersText}`,
    { parse_mode: 'Markdown', ...getMainMenu() }
  );
  clearChatState(chatId);
  console.log('[BOT] alert created for', chatId, state);
}

async function saveAlertForChat(chatId, { event_type, filter_price, filter_score, domain_filter, auto_buy }) {
  ensureAlertsTable();
  const user = await Promise.resolve(upsertUser({ telegramId: chatId, username: null }));
  const insert = database.prepare(
    'INSERT INTO alerts (user_id, event_type, filter_price, filter_score, domain_filter, auto_buy) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insert.run(user.id, event_type, filter_price || null, filter_score || null, domain_filter || null, auto_buy ? 1 : 0);
}

async function handleMyAlerts(msg) {
  const chatId = msg.chat.id;
  console.log('[BOT] /myalerts from', chatId);
  const user = await Promise.resolve(upsertUser({ telegramId: chatId, username: msg.from?.username || null }));
  ensureAlertsTable();
  const list = database.prepare('SELECT * FROM alerts WHERE user_id = ? ORDER BY id ASC').all(user.id);
  if (!list.length) {
    await botInstance.sendMessage(chatId, 'You do not have any alerts yet. Use "➕ Create Alert" to create one.', getMainMenu());
    return;
  }
  const lines = list.map((a, i) => {
    const parts = [a.event_type];
    parts.push(a.filter_price && a.filter_price.toLowerCase() !== 'none' ? `Price ${a.filter_price}` : 'no price');
    parts.push(a.filter_score && a.filter_score.toLowerCase() !== 'none' ? `Score ${a.filter_score}` : 'no score');
    parts.push(a.domain_filter && a.domain_filter.toLowerCase() !== 'none' ? `Domain ~ ${a.domain_filter}` : 'no domain');
    parts.push(a.auto_buy ? 'Auto-buy ✅' : 'Auto-buy ❌');
    return `${i + 1}️⃣ ${parts.join(' | ')}`;
  });
  await botInstance.sendMessage(chatId, `Your current alerts:\n${lines.join('\n')}`, getMainMenu());
}

async function handleClearAlerts(msg) {
  const chatId = msg.chat.id;
  const user = upsertUser({ telegramId: chatId, username: msg.from?.username || null });
  ensureAlertsTable();
  const del = database.prepare('DELETE FROM alerts WHERE user_id = ?');
  del.run(user.id);
  await botInstance.sendMessage(chatId, 'All your alerts were removed.', getMainMenu());
}

async function handleAutoBuyLogs(msg) {
  const chatId = msg.chat.id;
  console.log('[BOT] /autobuylogs from', chatId);
  const user = await Promise.resolve(upsertUser({ telegramId: chatId, username: msg.from?.username || null }));
  
  try {
    const logs = database.prepare(`
      SELECT * FROM auto_buy_logs 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 10
    `).all(user.id);
    
    if (!logs.length) {
      await botInstance.sendMessage(chatId, '📋 No auto-buy logs found.', getMainMenu());
      return;
    }
    
    const lines = logs.map((log, i) => {
      const status = log.success ? '✅' : '❌';
      const orderId = log.order_id ? `Order: ${log.order_id}` : 'No order ID';
      const amount = log.amount ? `Amount: ${log.amount} wei` : 'No amount';
      const error = log.error ? `Error: ${log.error}` : '';
      const date = new Date(log.created_at).toLocaleString();
      
      return `${i + 1}️⃣ ${status} ${log.domain_name}\n${orderId} | ${amount}\n${error ? error + '\n' : ''}${date}`;
    });
    
    await botInstance.sendMessage(
      chatId, 
      `🤖 *Auto-Buy History*\n\n${lines.join('\n\n')}`,
      { parse_mode: 'Markdown', ...getMainMenu() }
    );
  } catch (error) {
    console.error('[BOT] Error fetching auto-buy logs:', error);
    await botInstance.sendMessage(chatId, '❌ Error fetching auto-buy logs.', getMainMenu());
  }
}

async function handleMyWallets(msg) {
  const chatId = msg.chat.id;
  console.log('[BOT] /mywallets from', chatId);
  const user = await Promise.resolve(upsertUser({ telegramId: chatId, username: msg.from?.username || null }));
  
  try {
    const connectionStatus = getConnectionStatus(user.id);
    
    if (!connectionStatus.connected) {
      await botInstance.sendMessage(
        chatId,
        `💳 *Your Wallet*\n\n${connectionStatus.message}\n\nUse /connectwallet to connect your wallet securely.`,
        { parse_mode: 'Markdown', ...getMainMenu() }
      );
      return;
    }
    
    const message = `💳 *Your Connected Wallet*\n\n🔗 **Address:** \`${connectionStatus.walletAddress}\`\n🟢 **Status:** Connected and authorized\n\n✅ Ready for auto-buy transactions\n\nUse /disconnectwallet to disconnect.`;
    
    await botInstance.sendMessage(chatId, message, { parse_mode: 'Markdown', ...getMainMenu() });
  } catch (error) {
    console.error('[BOT] Error fetching wallet:', error);
    await botInstance.sendMessage(chatId, '❌ Error fetching wallet.', getMainMenu());
  }
}

async function handleDisconnectWallet(msg) {
  const chatId = msg.chat.id;
  console.log('[BOT] /disconnectwallet from', chatId);
  const user = await Promise.resolve(upsertUser({ telegramId: chatId, username: msg.from?.username || null }));
  
  try {
    const success = disconnectWallet(user.id);
    
    if (success) {
      await botInstance.sendMessage(
        chatId,
        '✅ *Wallet Disconnected*\n\nYour wallet has been disconnected successfully. You can connect a different wallet using /connectwallet.',
        { parse_mode: 'Markdown', ...getMainMenu() }
      );
    } else {
      await botInstance.sendMessage(
        chatId,
        '❌ No wallet connected to disconnect.',
        getMainMenu()
      );
    }
  } catch (error) {
    console.error('[BOT] Error disconnecting wallet:', error);
    await botInstance.sendMessage(chatId, '❌ Error disconnecting wallet.', getMainMenu());
  }
}

async function handleAddWallet(msg) {
  const chatId = msg.chat.id;
  console.log('[BOT] /addwallet from', chatId);
  
  // Check if user already has a connected wallet
  const user = await Promise.resolve(upsertUser({ telegramId: chatId, username: msg.from?.username || null }));
  const connectionStatus = getConnectionStatus(user.id);
  
  if (connectionStatus.connected) {
    await botInstance.sendMessage(
      chatId,
      `💳 *Wallet Already Connected*\n\n${connectionStatus.message}\n\nUse /disconnectwallet to disconnect and connect a different wallet.`,
      { parse_mode: 'Markdown', ...getMainMenu() }
    );
    return;
  }
  
  await botInstance.sendMessage(
    chatId,
    `🔗 *Connect Your Wallet Securely*\n\nWe'll help you connect your wallet without ever asking for private keys or seed phrases.\n\n✅ **Secure Connection**\n✅ **No Private Keys Required**\n✅ **Works with MetaMask, WalletConnect, and more**\n\nClick the button below to start:`,
    { 
      parse_mode: 'Markdown', 
      reply_markup: {
        inline_keyboard: [
          [ { text: '🔗 Connect Wallet Securely', callback_data: 'wallet:connect_secure' } ],
          [ { text: '❌ Cancel', callback_data: 'wallet:cancel' } ]
        ]
      }
    }
  );
}

async function handleConnectWallet(msg) {
  const chatId = msg.chat.id;
  console.log('[BOT] /connectwallet from', chatId);
  
  try {
    const user = await Promise.resolve(upsertUser({ telegramId: chatId, username: msg.from?.username || null }));
    
    // Create secure connection session
    const connection = createConnectionSession(user.id, chatId);
    
    await botInstance.sendMessage(
      chatId,
      `🔗 *Secure Wallet Connection*\n\nClick the link below to connect your wallet securely:\n\n🔗 ${connection.connectionUrl}\n\n**What happens next:**\n1️⃣ Click the link above to open in your browser\n2️⃣ Choose your wallet (MetaMask, WalletConnect, etc.)\n3️⃣ Authorize token spending for auto-buy\n4️⃣ Return to Telegram when done\n\n⏰ *Link expires in 15 minutes*\n\n⚠️ *Security:* We never ask for private keys or seed phrases. Your wallet stays secure.`,
      { 
        parse_mode: 'Markdown', 
        reply_markup: {
          inline_keyboard: [
            [ { text: '✅ I\'ve Connected My Wallet', callback_data: 'wallet:check_connection' } ],
            [ { text: '❌ Cancel', callback_data: 'wallet:cancel' } ]
          ]
        }
      }
    );
  } catch (error) {
    console.error('[BOT] Error creating connection:', error);
    await botInstance.sendMessage(chatId, '❌ Error creating connection. Please try again.', getMainMenu());
  }
}

async function handleImportMnemonic(msg) {
  const chatId = msg.chat.id;
  console.log('[BOT] /importmnemonic from', chatId);
  
  setChatState(chatId, { step: 'import_mnemonic' });
  
  await botInstance.sendMessage(
    chatId,
    `📝 *Import Mnemonic Phrase*\n\nPlease send your 12 or 24 word mnemonic phrase:\n\nExample: "word1 word2 word3 ... word12"\n\n⚠️ *Security:* Your mnemonic will be encrypted and stored securely. Make sure you're in a private chat.`,
    { parse_mode: 'Markdown', ...removeKeyboard() }
  );
}

async function handleGenerateWallet(msg) {
  const chatId = msg.chat.id;
  console.log('[BOT] /generatewallet from', chatId);
  const user = await Promise.resolve(upsertUser({ telegramId: chatId, username: msg.from?.username || null }));
  
  try {
    // Generate a new wallet for demo purposes
    const newWallet = generateNewWallet();
    
    const result = addUserWallet(user.id, newWallet.address, newWallet.privateKey);
    
    if (result.success) {
      await botInstance.sendMessage(
        chatId,
        `💳 *New Wallet Generated*\n\nAddress: \`${newWallet.address}\`\nPrivate Key: \`${newWallet.privateKey}\`\n\n⚠️ *IMPORTANT:* Save your private key securely! This is the only time you'll see it.\n\nThis wallet is now active for auto-buy transactions.`,
        { parse_mode: 'Markdown', ...getMainMenu() }
      );
    } else {
      await botInstance.sendMessage(chatId, `❌ Error adding wallet: ${result.error}`, getMainMenu());
    }
  } catch (error) {
    console.error('[BOT] Error adding wallet:', error);
    await botInstance.sendMessage(chatId, '❌ Error adding wallet.', getMainMenu());
  }
}

async function handleSetActiveWallet(msg, match) {
  const chatId = msg.chat.id;
  const walletIndex = match?.[1];
  const idx = Number(walletIndex);
  
  if (!Number.isInteger(idx) || idx < 1) {
    await botInstance.sendMessage(chatId, 'Usage: /setactivewallet <number>. Get numbers from /mywallets.', getMainMenu());
    return;
  }
  
  const user = await Promise.resolve(upsertUser({ telegramId: chatId, username: msg.from?.username || null }));
  const wallets = getUserWallets(user.id);
  
  if (idx > wallets.length) {
    await botInstance.sendMessage(chatId, 'Invalid wallet number. Use /mywallets to see valid numbers.', getMainMenu());
    return;
  }
  
  const walletId = wallets[idx - 1].id;
  const result = setActiveWallet(user.id, walletId);
  
  if (result.success) {
    await botInstance.sendMessage(chatId, `✅ Wallet #${idx} is now active for auto-buy transactions.`, getMainMenu());
  } else {
    await botInstance.sendMessage(chatId, `❌ Error setting active wallet: ${result.error}`, getMainMenu());
  }
}

async function processPrivateKeyImport(chatId, privateKey) {
  try {
    const user = await Promise.resolve(upsertUser({ telegramId: chatId, username: null }));
    
    // Validate private key format
    if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
      await botInstance.sendMessage(
        chatId, 
        '❌ Invalid private key format. Please send a valid private key (starts with 0x, 64 characters long).',
        removeKeyboard()
      );
      return;
    }
    
    // Import wallet from private key
    const wallet = importWalletFromPrivateKey(privateKey);
    const result = addUserWallet(user.id, wallet.address, wallet.privateKey);
    
    if (result.success) {
      clearChatState(chatId);
      await botInstance.sendMessage(
        chatId,
        `✅ *Wallet Imported Successfully!*\n\nAddress: \`${wallet.address}\`\n\nThis wallet is now active for auto-buy transactions.`,
        { parse_mode: 'Markdown', ...getMainMenu() }
      );
    } else {
      await botInstance.sendMessage(chatId, `❌ Error importing wallet: ${result.error}`, removeKeyboard());
    }
  } catch (error) {
    console.error('[BOT] Error importing private key:', error);
    await botInstance.sendMessage(
      chatId, 
      '❌ Invalid private key. Please check and try again.',
      removeKeyboard()
    );
  }
}

async function processMnemonicImport(chatId, mnemonic) {
  try {
    const user = await Promise.resolve(upsertUser({ telegramId: chatId, username: null }));
    
    // Validate mnemonic format
    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      await botInstance.sendMessage(
        chatId, 
        '❌ Invalid mnemonic format. Please send a valid 12 or 24 word mnemonic phrase.',
        removeKeyboard()
      );
      return;
    }
    
    // Import wallet from mnemonic
    const wallet = importWalletFromMnemonic(mnemonic);
    const result = addUserWallet(user.id, wallet.address, wallet.privateKey);
    
    if (result.success) {
      clearChatState(chatId);
      await botInstance.sendMessage(
        chatId,
        `✅ *Wallet Imported Successfully!*\n\nAddress: \`${wallet.address}\`\n\nThis wallet is now active for auto-buy transactions.`,
        { parse_mode: 'Markdown', ...getMainMenu() }
      );
    } else {
      await botInstance.sendMessage(chatId, `❌ Error importing wallet: ${result.error}`, removeKeyboard());
    }
  } catch (error) {
    console.error('[BOT] Error importing mnemonic:', error);
    await botInstance.sendMessage(
      chatId, 
      '❌ Invalid mnemonic phrase. Please check and try again.',
      removeKeyboard()
    );
  }
}

async function handleDeleteAlert(msg, match) {
  const chatId = msg.chat.id;
  const indexStr = match?.[1];
  const idx = Number(indexStr);
  if (!Number.isInteger(idx) || idx < 1) {
    await botInstance.sendMessage(chatId, 'Usage: /deletealert <index>. Get indexes from /myalerts.', getMainMenu());
    return;
  }
  const user = upsertUser({ telegramId: chatId, username: msg.from?.username || null });
  ensureAlertsTable();
  const list = database.prepare('SELECT id FROM alerts WHERE user_id = ? ORDER BY id ASC').all(user.id);
  if (idx > list.length) {
    await botInstance.sendMessage(chatId, 'Invalid index. Use "📊 My Alerts" to see valid indexes.', getMainMenu());
    return;
  }
  const alertId = list[idx - 1].id;
  database.prepare('DELETE FROM alerts WHERE id = ? AND user_id = ?').run(alertId, user.id);
  await botInstance.sendMessage(chatId, `Alert #${idx} deleted.`, getMainMenu());
}

export function initTelegramBot() {
  const token = process.env.TELEGRAM_TOKEN || '';
  if (!token) {
    console.log('[BOT] TELEGRAM_TOKEN not set, bot disabled');
    return null;
  }
  if (botInstance) return botInstance;

  botInstance = new TelegramBot(token, { polling: true });
  console.log('[BOT] Telegram bot started');

  botInstance.onText(/^\/start$/, handleStart);
  botInstance.onText(/^\/setalert$/, (msg) => startSetAlertFlow(msg.chat.id));
  botInstance.onText(/^\/myalerts$/, handleMyAlerts);
  botInstance.onText(/^\/autobuylogs$/, handleAutoBuyLogs);
  botInstance.onText(/^\/mywallets$/, handleMyWallets);
  botInstance.onText(/^\/addwallet$/, handleAddWallet);
  botInstance.onText(/^\/connectwallet$/, handleConnectWallet);
  botInstance.onText(/^\/disconnectwallet$/, handleDisconnectWallet);
  botInstance.onText(/^\/clearalerts$/, handleClearAlerts);
  botInstance.onText(/^\/deletealert\s+(\d+)$/, handleDeleteAlert);
  botInstance.onText(/^\/help$/, handleHelp);
  botInstance.on('message', (msg) => handleInteractiveMessage(msg));
  botInstance.on('callback_query', handleCallbackQuery);

  return botInstance;
}

export async function sendAlert(userId, message) {
  if (!botInstance) {
    console.log('[BOT] sendAlert skipped (bot disabled):', message);
    return;
  }
  const row = database.prepare('SELECT telegram_id FROM users WHERE id = ?').get(userId);
  if (!row?.telegram_id) return;
  console.log('[BOT] sendAlert to', row.telegram_id, message);
  await botInstance.sendMessage(row.telegram_id, message, { parse_mode: 'Markdown' });
}

export function mapFriendlyToApi(friendlyLabel) {
  return FRIENDLY_TO_API[friendlyLabel] || [];
}

export default { initTelegramBot, sendAlert, mapFriendlyToApi };
