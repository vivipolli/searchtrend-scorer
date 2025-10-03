import { config } from '@/config';
import logger from '@/utils/logger';
import { TrendScore, SearchMetrics, OnChainMetrics, AiAnalysisInsight, DomainScoreWithAi } from '@/types';
import { db } from '@/utils/database';
import serpApiService from './serpApiService';
import { llmAnalysisService } from './llmAnalysisService';
import { domaService } from './domaService';
import {
  analyzeSearchVolume,
  analyzeTrendDirection,
  generateRelatedQueries,
  analyzeGeographicData,
  calculateDomainRarity,
  calculateLiquidity,
  normalizeSearchVolume,
  calculateTrendDirection,
  calculateOnChainActivity,
  calculateWeightedScore,
  calculateConfidence,
  DomainRarityContext,
} from '@/utils/domainAnalysis';

class TrendScorerService {
  /**
   * Calculate comprehensive trend score for a domain
   */
  async calculateTrendScore(domainName: string): Promise<TrendScore> {
    try {
      logger.info(`Calculating trend score for domain: ${domainName}`);

      // Get search metrics
      const searchMetrics = await this.getSearchMetrics(domainName);
      logger.info('Search metrics obtained', {
        domainName,
        volume: searchMetrics.volume,
        trend: searchMetrics.trend,
        relatedQueriesCount: searchMetrics.relatedQueries.length,
        geographicRegions: Object.keys(searchMetrics.geographicData).length,
        source: config.serpApi.useMockData || !config.serpApi.enabled ? 'mock/fallback' : 'serpapi',
      });

      // Get on-chain metrics
      const onChainMetrics = await this.getOnChainMetrics(domainName);
      logger.info('On-chain metrics obtained', {
        domainName,
        transactionCount: onChainMetrics.transactionCount,
        uniqueOwners: onChainMetrics.uniqueOwners,
        averagePrice: onChainMetrics.averagePrice,
        liquidity: onChainMetrics.liquidity,
        rarity: onChainMetrics.rarity,
      });

      // Calculate individual components
      const searchVolume = normalizeSearchVolume(searchMetrics.volume);
      const trendDirection = calculateTrendDirection(searchMetrics.trend);
      const onChainActivity = calculateOnChainActivity(onChainMetrics);
      const rarity = onChainMetrics.rarity;

      // Calculate weighted final score (0-100)
      const score = calculateWeightedScore({
        searchVolume,
        trendDirection,
        onChainActivity,
        rarity,
      });

      const trendScore: TrendScore = {
        domainName,
        score,
        breakdown: {
          searchVolume,
          trendDirection,
          onChainActivity,
          rarity,
        },
        metadata: {
          lastUpdated: new Date(),
          dataPoints: searchMetrics.relatedQueries.length + onChainMetrics.transactionCount,
          confidence: calculateConfidence(searchMetrics, onChainMetrics),
        },
      };

      logger.info(`Trend score calculated for ${domainName}: ${score.toFixed(2)}`);
      logger.debug('Trend score breakdown', {
        domainName,
        breakdown: trendScore.breakdown,
        metadata: trendScore.metadata,
      });

      // Generate AI analysis asynchronously (non-blocking)
      logger.info(`Starting AI analysis generation for ${domainName}`);
      this.generateAiAnalysis(domainName, trendScore, searchMetrics, onChainMetrics)
        .then((aiAnalysis) => {
          if (aiAnalysis) {
            logger.info(`AI analysis generated for ${domainName}`);
            // Store the AI analysis in the database for future requests
            db.saveAiInsight({
              domainName,
              trendScore: trendScore.score,
              analysis: aiAnalysis,
              createdAt: new Date(),
            }).catch((dbError: unknown) => {
              logger.error(`Failed to persist AI analysis for ${domainName}`, dbError);
            });
          } else {
            logger.warn(`AI analysis returned null for ${domainName}`);
          }
        })
        .catch((error) => {
          logger.warn(`AI analysis failed for ${domainName}:`, error);
        });

      return trendScore;
    } catch (error) {
      logger.error(`Failed to calculate trend score for ${domainName}:`, error);
      throw error;
    }
  }

  /**
   * Get search metrics for a domain prioritizing SerpApi with fallback
   */
  private async getSearchMetrics(domainName: string): Promise<SearchMetrics> {
    try {
      const metrics = await serpApiService.getSearchMetrics(domainName);
      logger.info(`Using SerpApi metrics for ${domainName}`);
      return metrics;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`SerpApi unavailable, using fallback analysis for ${domainName}: ${message}`);
      return this.getFallbackSearchMetrics(domainName);
    }
  }

  /**
   * Fallback search metrics when real data is not available
   */
  private getFallbackSearchMetrics(domainName: string): SearchMetrics {
    return {
      volume: analyzeSearchVolume(domainName),
      trend: analyzeTrendDirection(domainName),
      relatedQueries: generateRelatedQueries(domainName),
      geographicData: analyzeGeographicData(domainName),
      timeRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
    };
  }

  /**
   * Get on-chain metrics for a domain
   */
  private async getOnChainMetrics(domainName: string): Promise<OnChainMetrics> {
    try {
      // Extract keyword from domain name (e.g., "crypto.eth" -> "crypto")
      const keyword = domainName.split('.')[0]?.toLowerCase() || domainName.toLowerCase();
      
      // Get events by exact domain name first
      let events = await db.getEventsByDomain(domainName);
      
      // If no events found for exact domain, search by keyword
      if (events.length === 0) {
        logger.info(`No events found for exact domain ${domainName}, searching by keyword: ${keyword}`);
        events = await db.getEventsByKeyword(keyword);
      }
      
      // Try to get domain info from database
      let domain = await db.getDomain(domainName);
      
      // If domain not found in database, try to fetch from DOMA API
      if (!domain) {
        logger.info(`Domain ${domainName} not found in database, fetching from DOMA API`);
        try {
          const domaDomain = await domaService.getDomainByName(domainName);
          if (domaDomain) {
            // Store domain info in database for future use
            await db.insertOrUpdateDomain({
              name: domaDomain.name,
              tokenId: domaDomain.tokenId ?? null,
              owner: domaDomain.owner ?? null,
              claimStatus: domaDomain.claimStatus,
              networkId: domaDomain.networkId,
              tokenAddress: domaDomain.tokenAddress ?? null,
              mintedAt: domaDomain.mintedAt ?? null,
              lastActivityAt: domaDomain.lastActivityAt ?? null,
            });
            domain = domaDomain;
          }
        } catch (domaError) {
          logger.warn(`Failed to fetch domain ${domainName} from DOMA API:`, domaError);
        }
      }

      const transactionCount = events.length;
      const uniqueOwners = new Set(events.map((event) => event.txHash ?? event.networkId ?? event.domainName)).size;
      const prices = events.map((event) => event.price).filter((price): price is number => price !== null);
      const averagePrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

      const liquidity = calculateLiquidity(events, domain?.lastActivityAt ?? null);

      const rarityContext: DomainRarityContext = {
        domainName,
        mintedAt: domain?.mintedAt ?? null,
        lastActivityAt: domain?.lastActivityAt ?? null,
        owner: domain?.owner ?? null,
        tokenId: domain?.tokenId ?? null,
      };

      const rarity = calculateDomainRarity(rarityContext);

      logger.info(`On-chain metrics for ${domainName}: ${transactionCount} transactions, ${uniqueOwners} unique owners, ${events.length > 0 ? 'found' : 'no'} events`);

      return {
        transactionCount,
        uniqueOwners,
        averagePrice,
        liquidity,
        rarity,
      };
    } catch (error) {
      logger.error(`Failed to get on-chain metrics for ${domainName}:`, error);
      return {
        transactionCount: 0,
        uniqueOwners: 0,
        averagePrice: 0,
        liquidity: 0,
        rarity: 0,
      };
    }
  }

  /**
   * Update trend score in database
   */
  async updateTrendScore(domainName: string, forceUpdate: boolean = false): Promise<TrendScore> {
    try {
      // Check if we need to update
      if (!forceUpdate) {
        const existing = await db.getTrendScore(domainName);
        if (existing) {
          const hoursSinceUpdate =
            (Date.now() - new Date(existing.lastUpdated).getTime()) / (1000 * 60 * 60);
          if (hoursSinceUpdate < 6) {
            logger.debug(`Trend score for ${domainName} is still fresh, skipping update`);
            const baseScore: TrendScore = {
              domainName,
              score: existing.score,
              breakdown: {
                searchVolume: existing.searchVolume,
                trendDirection: existing.trendDirection,
                onChainActivity: existing.onChainActivity,
                rarity: existing.rarity,
              },
              metadata: {
                lastUpdated: new Date(existing.lastUpdated),
                dataPoints: existing.dataPoints,
                confidence: existing.confidence,
              },
            };

            const aiInsight = await db.getAiInsight(domainName);
            if (aiInsight) {
              return {
                ...baseScore,
                aiAnalysis: aiInsight.analysis,
              } as DomainScoreWithAi;
            }

            return baseScore;
          }
        }
      }

      // Calculate new score
      const trendScore = await this.calculateTrendScore(domainName);

      // Save to database
      await db.insertOrUpdateTrendScore({
        domainName: trendScore.domainName,
        score: trendScore.score,
        searchVolume: trendScore.breakdown.searchVolume,
        trendDirection: trendScore.breakdown.trendDirection,
        onChainActivity: trendScore.breakdown.onChainActivity,
        rarity: trendScore.breakdown.rarity,
        lastUpdated: trendScore.metadata.lastUpdated,
        dataPoints: trendScore.metadata.dataPoints,
        confidence: trendScore.metadata.confidence,
      });

      logger.info(`Updated trend score for ${domainName}: ${trendScore.score}`);
      return trendScore;
    } catch (error) {
      logger.error(`Failed to update trend score for ${domainName}:`, error);
      throw error;
    }
  }

  /**
   * Get top trending domains
   */
  async getTopTrendingDomains(limit: number = 100): Promise<TrendScore[]> {
    try {
      const scores = await db.getTopTrendScores(limit);

      return scores.map((score: any) => ({
        domainName: score.domain_name,
        score: score.score,
        breakdown: {
          searchVolume: score.search_volume,
          trendDirection: score.trend_direction,
          onChainActivity: score.on_chain_activity,
          rarity: score.rarity,
        },
        metadata: {
          lastUpdated: new Date(score.last_updated),
          dataPoints: score.data_points,
          confidence: score.confidence,
        },
      }));
    } catch (error) {
      logger.error('Failed to get top trending domains:', error);
      return [];
    }
  }

  private async generateAiAnalysis(
    domainName: string,
    trendScore: TrendScore,
    searchMetrics: SearchMetrics,
    onChainMetrics: OnChainMetrics,
  ): Promise<AiAnalysisInsight | undefined> {
    logger.info(`generateAiAnalysis called for ${domainName}`);
    
    if (!llmAnalysisService.isEnabled()) {
      logger.warn(`LLM service not enabled for ${domainName}`);
      return undefined;
    }

    try {
      const cached = await db.getAiInsight(domainName);
      if (cached) {
        const ageHours = (Date.now() - new Date(cached.createdAt).getTime()) / (1000 * 60 * 60);
        if (ageHours < 6) {
          logger.debug(`Returning cached AI analysis for ${domainName}`);
          return cached.analysis;
        }
      }

      const analysis = await llmAnalysisService.generateAnalysis({
        domainName,
        trendScore,
        searchMetrics,
        onChainMetrics,
      });

      if (analysis) {
        await db.saveAiInsight({
          domainName,
          trendScore: trendScore.score,
          analysis,
          createdAt: new Date(),
        });
        return analysis;
      }
    } catch (error) {
      logger.error(`Failed to generate or save AI insight for ${domainName}:`, error);
    }

    return undefined;
  }
}

// Export singleton instance
export const trendScorerService = new TrendScorerService();
export default trendScorerService;
