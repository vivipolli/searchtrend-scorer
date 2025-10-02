import { Router } from 'express';
import { getAllDomains, createDomain } from '../models/domain.js';

const router = Router();

// Basic routes for listing and creating domains
router.get('/', (req, res) => {
  const domains = getAllDomains();
  res.json(domains);
});

router.post('/', (req, res) => {
  const { name, event_type, price, tx_hash } = req.body || {};

  if (!name || !event_type) {
    return res.status(400).json({ error: 'name and event_type are required' });
  }

  try {
    const created = createDomain({ name, event_type, price, tx_hash });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create domain' });
  }
});

export default router;
