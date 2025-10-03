import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { domaService } from '@/services/domaService';
import { trendScorerService } from '@/services/trendScorerService';
import { db } from '@/utils/database';
import logger from '@/utils/logger';
import {
  ApiResponse,
  PaginatedResponse,
  GetDomainsRequest,
  DomainScoreWithAi,
  Domain,
} from '@/types';

export const scoreDomain = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { domainName, forceUpdate } = req.body;

  if (typeof domainName !== 'string' || domainName.trim() === '') {
    res.status(400).json({
      success: false,
      error: 'Domain name is required',
      timestamp: new Date(),
    } satisfies ApiResponse<null>);
    return;
  }

  logger.info(`Scoring domain request: ${domainName}`, { forceUpdate });

  try {
    // Try to get domain info from DOMA API (optional, won't fail if not found)
    const domainInfo = await domaService.getDomainByName(domainName);
    
    if (domainInfo) {
      logger.info(`Domain ${domainName} found in DOMA registry`);
      await db.insertOrUpdateDomain({
        name: domainInfo.name,
        tokenId: domainInfo.tokenId ?? null,
        owner: domainInfo.owner ?? null,
        claimStatus: domainInfo.claimStatus,
        networkId: domainInfo.networkId,
        tokenAddress: domainInfo.tokenAddress ?? null,
        mintedAt: domainInfo.mintedAt ?? null,
        lastActivityAt: domainInfo.lastActivityAt ?? null,
      });
    } else {
      logger.warn(`Domain ${domainName} not found in DOMA registry, calculating score with available data`);
    }

    // Calculate trend score (works with or without DOMA data)
    const trendScore = await trendScorerService.updateTrendScore(domainName, Boolean(forceUpdate));

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

  if (!domainName) {
    res.status(400).json({
      success: false,
      error: 'Domain name is required',
      timestamp: new Date(),
    } satisfies ApiResponse<null>);
    return;
  }

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
    const domainRecord = await db.getDomain(domainName);

    const response: ApiResponse<DomainScoreWithAi> = {
      success: true,
      data: {
        ...trendScore,
        ...(aiInsight?.analysis && { aiAnalysis: aiInsight.analysis }),
        ...(domainRecord && {
          onChain: {
            owner: domainRecord.owner ?? null,
            tokenId: domainRecord.tokenId ?? null,
            networkId: domainRecord.networkId,
            tokenAddress: domainRecord.tokenAddress ?? null,
            mintedAt: domainRecord.mintedAt ?? null,
            lastActivityAt: domainRecord.lastActivityAt ?? null,
          }
        }),
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

  if (!domainName) {
    res.status(400).json({
      success: false,
      error: 'Domain name is required',
      timestamp: new Date(),
    } satisfies ApiResponse<null>);
    return;
  }

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
  } = query;

  logger.info('Getting domains with filters', { query });

  try {
    // Get domains from local database
    const offset = (page - 1) * limit;
    const domains = await db.getAllDomains(limit, offset);

    // Apply filters
    const filteredDomains = domains; // Filtering temporarily disabled until other filters implemented

    // Get total count for pagination
    const total = filteredDomains.length;
    const totalPages = Math.ceil(total / limit);

    const response: PaginatedResponse<Domain> = {
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

  if (!domainName) {
    res.status(400).json({
      success: false,
      error: 'Domain name is required',
      timestamp: new Date(),
    } satisfies ApiResponse<null>);
    return;
  }

  logger.info(`Getting domain details: ${domainName}`);

  try {
    // Get domain from local database
    const domain = await db.getDomain(domainName);
    
    if (!domain) {
      res.status(404).json({
        success: false,
        error: `Domain ${domainName} not found in local database`,
        timestamp: new Date(),
      } as ApiResponse<null>);
      return;
    }

    // Get trend score
    const trendScore = await db.getTrendScore(domainName);

    // Get recent events
    const events = await db.getEventsByDomain(domainName, 10);

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

interface SearchDomainsQuery {
  query?: string;
  limit?: number | string;
}

export const searchDomains = asyncHandler(async (req: Request<unknown, unknown, unknown, SearchDomainsQuery>, res: Response): Promise<void> => {
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
    const allDomains = await db.getAllDomains(1000, 0); // Get more domains for search
    const normalizedLimit = typeof limit === 'string' ? Number(limit) : limit;
    const safeLimit = Number.isFinite(normalizedLimit) ? normalizedLimit : 20;

    const searchResults = allDomains
      .filter(domain => domain.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, safeLimit);

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

export const getDomainStats = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  logger.info('Getting domain statistics');

  try {
    const stats = await db.getStats();

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
