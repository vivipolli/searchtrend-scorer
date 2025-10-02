import database from '../db.js';

export function getAllDomains() {
  const query = database.prepare(
    'SELECT id, name, event_type, price, tx_hash, created_at FROM domains ORDER BY id DESC'
  );
  return query.all();
}

export function createDomain({ name, event_type, price = null, tx_hash = null }) {
  const insert = database.prepare(
    'INSERT INTO domains (name, event_type, price, tx_hash) VALUES (?, ?, ?, ?)'
  );
  const result = insert.run(name, event_type, price, tx_hash);
  return {
    id: Number(result.lastInsertRowid),
    name,
    event_type,
    price,
    tx_hash,
  };
}
