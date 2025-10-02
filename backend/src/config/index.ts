import dotenv from 'dotenv';
import { AppConfig } from '@/types';

// Load environment variables
dotenv.config();

const requiredEnvVars = [
  'DOMA_API_BASE',
  'DOMA_API_KEY',
] as const;

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config: AppConfig = {
  port: parseInt(process.env['PORT'] || '3001', 10),
  nodeEnv: process.env['NODE_ENV'] || 'development',
  
  domaApi: {
    baseUrl: process.env['DOMA_API_BASE']!,
    apiKey: process.env['DOMA_API_KEY']!,
  },
  
  database: {
    path: process.env['DATABASE_PATH'] || './data/searchtrend.db',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10),
  },
  
  polling: {
    intervalSeconds: parseInt(process.env['POLL_INTERVAL_SECONDS'] || '30', 10),
    maxEventsPerPoll: parseInt(process.env['MAX_EVENTS_PER_POLL'] || '50', 10),
  },
  
  scoring: {
    updateIntervalHours: parseInt(process.env['SCORE_UPDATE_INTERVAL_HOURS'] || '6', 10),
    trendAnalysisDays: parseInt(process.env['TREND_ANALYSIS_DAYS'] || '30', 10),
  },

  serpApi: {
    enabled: process.env['SERPAPI_ENABLED'] === 'true',
    baseUrl: process.env['SERPAPI_BASE_URL'] || 'https://serpapi.com/search',
    apiKey: process.env['SERPAPI_API_KEY'] ?? undefined,
    dailyLimit: parseInt(process.env['SERPAPI_DAILY_LIMIT'] || '10', 10),
    useMockData: process.env['SERPAPI_USE_MOCK'] !== 'false',
    requestTimeoutMs: parseInt(process.env['SERPAPI_TIMEOUT_MS'] || '8000', 10),
    cacheTtlMinutes: parseInt(process.env['SERPAPI_CACHE_TTL_MINUTES'] || '60', 10),
  },
  openAi: {
    enabled: process.env['OPENAI_ENABLED'] === 'true',
    apiKey: process.env['OPENAI_API_KEY'] || undefined,
    model: process.env['OPENAI_MODEL'] || 'gpt-4o-mini',
    maxTokens: parseInt(process.env['OPENAI_MAX_TOKENS'] || '400', 10),
    temperature: parseFloat(process.env['OPENAI_TEMPERATURE'] || '0.3'),
    timeoutMs: parseInt(process.env['OPENAI_TIMEOUT_MS'] || '20000', 10), // 20 seconds
  },
};

export default config;
