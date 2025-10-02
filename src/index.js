import dotenv from 'dotenv';
import express from 'express';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import './db.js';
import domainsRouter from './routes/domains.js';
import walletRouter from './routes/wallet.js';
import { pollOnce } from './poller.js';
import { initTelegramBot } from './bot/telegram.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: './config/.env' });

const app = express();
const port = Number(process.env.PORT || 3000);
const pollIntervalSeconds = Number(process.env.POLL_INTERVAL_SECONDS || 15);

// Basic request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/domains', domainsRouter);
app.use('/api/wallet', walletRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Start Telegram bot if token is provided
initTelegramBot();

// Schedule poller
const scheduleExpr = `*/${pollIntervalSeconds} * * * * *`;
cron.schedule(scheduleExpr, async () => {
  try {
    const result = await pollOnce();
    if (result?.count) {
      console.log(`[POLLER] Fetched ${result.count} events`);
    }
  } catch (err) {
    console.error('[POLLER] Error:', err?.message || err);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
