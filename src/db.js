import Database from 'better-sqlite3';

const databasePath = process.env.DB_PATH || './doma.db';

const database = new Database(databasePath);
database.pragma('journal_mode = WAL');

// Ensure base table exists
database.exec(`
  CREATE TABLE IF NOT EXISTS domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    price REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

// Safe migration: add tx_hash column if missing
try {
  const columns = database.prepare("PRAGMA table_info(domains)").all();
  const hasTxHash = columns.some((c) => c.name === 'tx_hash');
  if (!hasTxHash) {
    database.exec("ALTER TABLE domains ADD COLUMN tx_hash TEXT");
  }
} catch (e) {
  // no-op: migration best-effort
}

// Ensure users table
try {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT UNIQUE NOT NULL,
      username TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
} catch (e) {}

// Ensure alerts table
try {
  database.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      filter_price TEXT,
      filter_score TEXT,
      domain_filter TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
} catch (e) {}

// Safe migration: add domain_filter to alerts if missing
try {
  const columns = database.prepare("PRAGMA table_info(alerts)").all();
  const hasDomainFilter = columns.some((c) => c.name === 'domain_filter');
  if (!hasDomainFilter) {
    database.exec("ALTER TABLE alerts ADD COLUMN domain_filter TEXT");
  }
} catch (e) {}

// Safe migration: add auto_buy to alerts if missing
try {
  const columns = database.prepare("PRAGMA table_info(alerts)").all();
  const hasAutoBuy = columns.some((c) => c.name === 'auto_buy');
  if (!hasAutoBuy) {
    database.exec("ALTER TABLE alerts ADD COLUMN auto_buy BOOLEAN DEFAULT 0");
  }
} catch (e) {}

// Processed events for deduplication by uniqueId
try {
  database.exec(`
    CREATE TABLE IF NOT EXISTS processed_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unique_id TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
} catch (e) {}

// Auto-buy logs table
try {
  database.exec(`
    CREATE TABLE IF NOT EXISTS auto_buy_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      domain_name TEXT NOT NULL,
      order_id TEXT,
      amount TEXT,
      success BOOLEAN NOT NULL,
      error TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
} catch (e) {}

// User wallets table
try {
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      wallet_address TEXT NOT NULL,
      private_key_encrypted TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
} catch (e) {}

export default database;
