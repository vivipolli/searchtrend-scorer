import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { domaService } from '@/services/domaService';
import { trendScorerService } from '@/services/trendScorerService';
import { db } from '@/utils/database';
import logger from '@/utils/logger';
import { ApiResponse, PaginatedResponse, GetDomainsRequest } from '@/types';

export const scoreDomain = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { domainName, forceUpdate } = req.body;

  logger.info(`Scoring domain request: ${domainName}`, { forceUpdate });

  try {
    // Try to get domain info from DOMA API (optional, won't fail if not found)
    const domainInfo = await domaService.getDomainByName(domainName);
    
    if (domainInfo) {
      logger.info(`Domain ${domainName} found in DOMA registry`);
      // Store/update domain in local database
      db.insertOrUpdateDomain({
        name: domainInfo.name,
        tokenId: domainInfo.tokenId,
        owner: domainInfo.owner,
        claimStatus: domainInfo.claimStatus,
        networkId: domainInfo.networkId,
        tokenAddress: domainInfo.tokenAddress,
      });
    } else {
      logger.warn(`Domain ${domainName} not found in DOMA registry, calculating score with available data`);
    }

    // Calculate trend score (works with or without DOMA data)
    const trendScore = await trendScorerService.updateTrendScore(domainName, forceUpdate);

    const response: ApiResponse<typeof trendScore> = {
      success: true,
      data: trendScore,
      message: `Trend score calculated for ${domainName}`,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    logger.error(`Failed to score domain ${domainName}:`, error);
    throw error;
  }
});

export const getDomainScore = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { domainName } = req.params;

  logger.info(`Getting domain score: ${domainName}`);

  try {
    const trendScore = await trendScorerService.updateTrendScore(domainName, false);

    if (!trendScore) {
      res.status(404).json({
        success: false,
        error: `No trend score found for domain ${domainName}`,
        timestamp: new Date(),
      } as ApiResponse<null>);
      return;
    }

    const aiInsight = await db.getAiInsight(domainName);

    const response: ApiResponse<typeof trendScore> = {
      success: true,
      data: {
        domainName: trendScore.domainName,
        score: trendScore.score,
        breakdown: trendScore.breakdown,
        metadata: trendScore.metadata,
        aiAnalysis: aiInsight?.analysis,
      },
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    logger.error(`Failed to get domain score for ${domainName}:`, error);
    throw error;
  }
});

export const getDomainAiAnalysis = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { domainName } = req.params;

  logger.info(`Getting AI analysis for domain: ${domainName}`);

  try {
    const insight = await db.getAiInsight(domainName);

    if (!insight) {
      res.status(404).json({
        success: false,
        error: `No AI analysis found for domain ${domainName}`,
        timestamp: new Date(),
      } as ApiResponse<null>);
      return;
    }

    res.json({
      success: true,
      data: insight,
      timestamp: new Date(),
    } satisfies ApiResponse<typeof insight>);
  } catch (error) {
    logger.error(`Failed to get AI analysis for ${domainName}:`, error);
    throw error;
  }
});

export const getTopTrendingDomains = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { limit = 100 } = req.query;

  logger.info(`Getting top trending domains`, { limit });

  try {
    const trendingDomains = await trendScorerService.getTopTrendingDomains(Number(limit));

    const response: ApiResponse<typeof trendingDomains> = {
      success: true,
      data: trendingDomains,
      message: `Retrieved ${trendingDomains.length} trending domains`,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get top trending domains:', error);
    throw error;
  }
});

export const getDomains = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const query = req.query as GetDomainsRequest;
  const {
    page = 1,
    limit = 20,
    sortBy = 'score',
    sortOrder = 'desc',
    minScore,
    maxScore,
    eventType,
    networkId,
  } = query;

  logger.info('Getting domains with filters', { query });

  try {
    // Get domains from local database
    const offset = (page - 1) * limit;
    const domains = db.getAllDomains(limit, offset);

    // Apply filters
    let filteredDomains = domains;

    if (minScore !== undefined || maxScore !== undefined) {
      filteredDomains = domains.filter(domain => {
        const score = db.getTrendScore(domain.name);
        if (!score) return false;
        
        if (minScore !== undefined && score.score < minScore) return false;
        if (maxScore !== undefined && score.score > maxScore) return false;
        
        return true;
      });
    }

    // Get total count for pagination
    const total = filteredDomains.length;
    const totalPages = Math.ceil(total / limit);

    const response: PaginatedResponse<typeof filteredDomains> = {
      success: true,
      data: filteredDomains,
      message: `Retrieved ${filteredDomains.length} domains`,
      timestamp: new Date(),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get domains:', error);
    throw error;
  }
});

export const getDomainDetails = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { domainName } = req.params;

  logger.info(`Getting domain details: ${domainName}`);

  try {
    // Get domain from local database
    const domain = db.getDomain(domainName);
    
    if (!domain) {
      res.status(404).json({
        success: false,
        error: `Domain ${domainName} not found in local database`,
        timestamp: new Date(),
      } as ApiResponse<null>);
      return;
    }

    // Get trend score
    const trendScore = db.getTrendScore(domainName);

    // Get recent events
    const events = db.getEventsByDomain(domainName, 10);

    const response: ApiResponse<{
      domain: typeof domain;
      trendScore: typeof trendScore;
      recentEvents: typeof events;
    }> = {
      success: true,
      data: {
        domain,
        trendScore,
        recentEvents: events,
      },
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    logger.error(`Failed to get domain details for ${domainName}:`, error);
    throw error;
  }
});

export const searchDomains = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { query, limit = 20 } = req.query;

  if (!query || typeof query !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Search query is required',
      timestamp: new Date(),
    } as ApiResponse<null>);
    return;
  }

  logger.info(`Searching domains: ${query}`);

  try {
    // Search in local database
    const allDomains = db.getAllDomains(1000, 0); // Get more domains for search
    const searchResults = allDomains.filter(domain => 
      domain.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, Number(limit));

    const response: ApiResponse<typeof searchResults> = {
      success: true,
      data: searchResults,
      message: `Found ${searchResults.length} domains matching "${query}"`,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    logger.error(`Failed to search domains with query "${query}":`, error);
    throw error;
  }
});

export const getDomainStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.info('Getting domain statistics');

  try {
    const stats = db.getStats();

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
      message: 'Domain statistics retrieved successfully',
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get domain statistics:', error);
    throw error;
  }
});
