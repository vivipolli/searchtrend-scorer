import { Router } from 'express';
import {
  scoreDomain,
  getDomainScore,
  getTopTrendingDomains,
  getDomains,
  getDomainDetails,
  searchDomains,
  getDomainStats,
  getDomainAiAnalysis,
  testDomaApi,
} from '@/controllers/domainController';
import { validateRequest, validateQuery, validateParams, schemas } from '@/middleware/validation';

const router = Router();

// Score a domain
router.post('/score', validateRequest(schemas.scoreDomain), scoreDomain);

// Get domain score
router.get('/:domainName/score', validateParams(schemas.domainName), getDomainScore);

// Get domain AI analysis
router.get('/:domainName/ai-analysis', validateParams(schemas.domainName), getDomainAiAnalysis);

// Get domain details
router.get('/:domainName', validateParams(schemas.domainName), getDomainDetails);

// Get top trending domains
router.get('/trending/top', validateQuery(schemas.pagination), getTopTrendingDomains);

// Search domains
router.get('/search', validateQuery(schemas.pagination), searchDomains);

// Get all domains with filters
router.get('/', validateQuery(schemas.getDomains), getDomains);

// Get domain statistics
router.get('/stats/overview', getDomainStats);

// Test DOMA API (debug endpoint)
router.get('/test-doma/:domainName', testDomaApi);

export default router;
