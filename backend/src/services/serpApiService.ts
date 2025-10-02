import axios from 'axios';
import { config } from '@/config';
import logger from '@/utils/logger';
import { SearchMetrics } from '@/types';
import { db } from '@/utils/database';

interface CachedEntry {
  expiresAt: number;
  data: SearchMetrics;
}

interface SerpApiTimeSeriesPoint {
  timestamp: string;
  values: Array<{
    query: string;
    extracted_value: number;
    value?: number;
  }>;
}

export class SerpApiService {
  private readonly client = axios.create({
    baseURL: config.serpApi.baseUrl,
    timeout: config.serpApi.requestTimeoutMs,
  });

  private cache: Map<string, CachedEntry> = new Map();
  private readonly serviceName = 'serpapi-google-trends';

  constructor() {
    logger.info('SerpApiService initialized', {
      enabled: config.serpApi.enabled,
      useMockData: config.serpApi.useMockData,
      cacheTtlMinutes: config.serpApi.cacheTtlMinutes,
      dailyLimit: config.serpApi.dailyLimit,
      apiKeyConfigured: Boolean(config.serpApi.apiKey),
    });
  }

  async getSearchMetrics(domainName: string): Promise<SearchMetrics> {
    const keyword = this.extractKeyword(domainName);
    const cacheKey = keyword;

    logger.info('SerpApi metrics requested', {
      domainName,
      keyword,
      enabled: config.serpApi.enabled,
      useMockData: config.serpApi.useMockData,
      apiKeyConfigured: Boolean(config.serpApi.apiKey),
    });

    const cached = this.getFromCache(cacheKey);
    if (cached) {
      logger.info('SerpApi cache hit', { keyword, cacheKey });
      return cached;
    }

    if (config.serpApi.useMockData || !config.serpApi.enabled || !config.serpApi.apiKey) {
      logger.warn('SerpApi mock mode active', {
        domainName,
        keyword,
        useMockData: config.serpApi.useMockData,
        enabled: config.serpApi.enabled,
        apiKeyConfigured: Boolean(config.serpApi.apiKey),
      });
      const mock = this.generateMockMetrics(domainName);
      this.saveToCache(cacheKey, mock);
      return mock;
    }

    await this.ensureWithinDailyLimit();

    try {
      logger.info('SerpApi request dispatch', {
        keyword,
        trendAnalysisDays: config.scoring.trendAnalysisDays,
        timeoutMs: config.serpApi.requestTimeoutMs,
      });

      const response = await this.client.get('', {
        params: {
          engine: 'google_trends',
          q: keyword,
          data_type: 'TIMESERIES',
          api_key: config.serpApi.apiKey!,
        },
      });

      if (!response?.data) {
        throw new Error('SerpApi returned no data payload');
      }

      const metrics = this.mapResponseToMetrics(domainName, response.data);
    logger.debug('SerpApi raw response snippet', {
      domainName,
      hasTimeline: Boolean(response.data?.interest_over_time?.timeline_data?.length),
      hasAverages: Boolean(response.data?.interest_over_time?.averages?.length),
      relatedQueriesCount: response.data?.related_queries?.rising?.length
        ?? response.data?.related_queries?.top?.length
        ?? 0,
    });
      this.saveToCache(cacheKey, metrics);
      await this.trackUsage();
      logger.info('SerpApi metrics retrieved', {
        domainName,
        keyword,
        timelinePoints: metrics?.relatedQueries?.length ?? 0,
        volume: metrics?.volume,
        trend: metrics?.trend,
      });
      return metrics;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`SerpApi request failed for ${domainName}: ${message}`);
      if (message.includes('limit') || message.includes('429')) {
        logger.warn('SerpApi rate limit reached, switching to mock metrics');
      }
      const mock = this.generateMockMetrics(domainName);
      this.saveToCache(cacheKey, mock);
      return mock;
    }
  }

  private extractKeyword(domainName: string): string {
    return domainName.split('.')[0]?.toLowerCase() || domainName.toLowerCase();
  }

  private getTodayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private async ensureWithinDailyLimit(): Promise<void> {
    const today = this.getTodayKey();
    const usage = await db.getApiUsage(this.serviceName, today);
    logger.info('SerpApi daily usage check', {
      date: today,
      usage,
      limit: config.serpApi.dailyLimit,
    });
    if (usage >= config.serpApi.dailyLimit) {
      throw new Error('SerpApi daily request limit reached');
    }
  }

  private async trackUsage(): Promise<void> {
    const today = this.getTodayKey();
    await db.incrementApiUsage(this.serviceName, today);
    logger.info('SerpApi usage incremented', {
      date: today,
      limit: config.serpApi.dailyLimit,
    });
  }

  private getFromCache(cacheKey: string): SearchMetrics | undefined {
    const entry = this.cache.get(cacheKey);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return undefined;
    }
    return entry.data;
  }

  private saveToCache(cacheKey: string, data: SearchMetrics): void {
    const ttlMs = config.serpApi.cacheTtlMinutes * 60 * 1000;
    this.cache.set(cacheKey, {
      expiresAt: Date.now() + ttlMs,
      data,
    });
  }

  private mapResponseToMetrics(_domainName: string, payload: any): SearchMetrics {
    const timeline: SerpApiTimeSeriesPoint[] = payload?.interest_over_time?.timeline_data ?? [];
    const averages = payload?.interest_over_time?.averages ?? [];

    const values = timeline
      .map((item) => {
        const point = item.values?.[0];
        const rawValue = point?.extracted_value ?? point?.value;
        return Number(rawValue ?? 0);
      })
      .filter((value) => !Number.isNaN(value));

    const trend = this.calculateTrend(values);
    const volume = this.calculateVolume(values, averages);
    const relatedQueries = this.extractRelatedQueries(payload);
    const geographicData = this.extractGeoData(payload);

    return {
      volume,
      trend,
      relatedQueries,
      geographicData,
      timeRange: {
        start: new Date(Date.now() - config.scoring.trendAnalysisDays * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
    };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 4) return 0;
    const half = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, half);
    const secondHalf = values.slice(values.length - half);

    const firstAvg = this.average(firstHalf);
    const secondAvg = this.average(secondHalf);

    if (firstAvg === 0) return 0;
    const delta = (secondAvg - firstAvg) / firstAvg;
    return Math.max(-1, Math.min(1, delta));
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private calculateVolume(values: number[], averages: Array<{ value: number }>): number {
    if (averages?.[0]?.value) {
      return Math.round(Number(averages[0].value));
    }
    if (values.length === 0) return 0;

    const sum = values.reduce((total, value) => total + value, 0);
    return Math.round(sum / values.length);
  }

  private extractRelatedQueries(payload: any): string[] {
    const primary = payload?.related_queries?.rising ?? payload?.related_queries?.top ?? [];

    return primary
      .filter((item: any) => item?.query)
      .slice(0, 5)
      .map((item: any) => String(item.query));
  }

  private extractGeoData(payload: any): Record<string, number> {
    const regionData = payload?.interest_by_region?.map_data ?? payload?.interest_by_region?.geo_map_data;
    if (!Array.isArray(regionData)) return {};

    const result: Record<string, number> = {};
    regionData.forEach((item: any) => {
      const region = item?.geo_name ?? item?.location ?? item?.name;
      const rawValue = item?.value ?? item?.extracted_value;
      const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
      const numValue = Number(value);
      if (region && !Number.isNaN(numValue)) {
        result[String(region)] = numValue;
      }
    });

    return result;
  }

  private generateMockMetrics(domainName: string): SearchMetrics {
    const baseName = this.extractKeyword(domainName);
    const hash = this.simpleHash(baseName);

    const volume = 40 + (hash % 60);
    const trend = ((hash % 200) / 100) - 1;
    const relatedQueries = [
      `${baseName} domain`,
      `${baseName} price`,
      `${baseName} web3`,
      `${baseName} market share`,
      `${baseName} analytics`,
    ].slice(0, 5);

    const geographicData: Record<string, number> = {
      US: 40 + (hash % 15),
      UK: 20 + (hash % 10),
      DE: 15 + (hash % 10),
      SG: 10 + (hash % 5),
      JP: 10 + (hash % 7),
    };

    return {
      volume: Math.min(100, Math.max(0, volume)),
      trend: Math.max(-1, Math.min(1, trend)),
      relatedQueries,
      geographicData,
      timeRange: {
        start: new Date(Date.now() - config.scoring.trendAnalysisDays * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
    };
  }

  private simpleHash(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return hash;
  }
}

export const serpApiService = new SerpApiService();
export default serpApiService;
