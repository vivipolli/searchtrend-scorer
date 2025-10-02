import { Router } from 'express';
import domainRoutes from './domainRoutes';
import eventRoutes from './eventRoutes';

const router = Router();

// API version prefix
const API_VERSION = '/api/v1';

// Mount routes
router.use(`${API_VERSION}/domains`, domainRoutes);
router.use(`${API_VERSION}/events`, eventRoutes);

// Root endpoint
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'SearchTrend Scorer API',
    version: '1.0.0',
    endpoints: {
      domains: `${API_VERSION}/domains`,
      events: `${API_VERSION}/events`,
    },
    timestamp: new Date(),
  });
});

// API info endpoint
router.get('/api', (_req, res) => {
  res.json({
    success: true,
    message: 'SearchTrend Scorer API Information',
    version: '1.0.0',
    description: 'AI-driven analytics for domain valuation using DOMA Protocol',
    endpoints: {
      domains: {
        base: `${API_VERSION}/domains`,
        methods: {
          'POST /score': 'Calculate trend score for a domain',
          'GET /:domainName/score': 'Get trend score for a domain',
          'GET /:domainName': 'Get domain details',
          'GET /trending/top': 'Get top trending domains',
          'GET /search': 'Search domains',
          'GET /': 'Get all domains with filters',
          'GET /stats/overview': 'Get domain statistics',
        },
      },
      events: {
        base: `${API_VERSION}/events`,
        methods: {
          'POST /poll': 'Poll events from DOMA API',
          'GET /recent': 'Get recent events',
          'GET /domain/:domainName': 'Get events for a domain',
          'GET /stats': 'Get event statistics',
          'GET /health': 'Health check',
        },
      },
    },
    timestamp: new Date(),
  });
});

export default router;
