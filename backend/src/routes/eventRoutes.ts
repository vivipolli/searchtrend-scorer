import { Router } from 'express';
import {
  pollEvents,
  getRecentEvents,
  getEventsByDomain,
  getEventStats,
  healthCheck,
} from '@/controllers/eventController';
import { validateQuery, validateParams, schemas } from '@/middleware/validation';

const router = Router();

// Poll events from DOMA API
router.post('/poll', validateQuery(schemas.pagination), pollEvents);

// Get recent events
router.get('/recent', validateQuery(schemas.pagination), getRecentEvents);

// Get events by domain
router.get('/domain/:domainName', validateParams(schemas.domainName), getEventsByDomain);

// Get event statistics
router.get('/stats', getEventStats);

// Health check
router.get('/health', healthCheck);

export default router;
