export function logNewEventAlert({ name, event_type, price, tx_hash }) {
  const parts = [
    `New event: ${event_type}`,
    name ? `name=${name}` : null,
    price != null ? `price=${price}` : null,
    tx_hash ? `tx=${tx_hash}` : null,
  ].filter(Boolean);
  console.log(`[ALERT] ${parts.join(' | ')}`);
}

export default { logNewEventAlert };
