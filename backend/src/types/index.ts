// Domain related types
export interface Domain {
  id: string;
  name: string;
  tokenId?: string | null;
  owner?: string | null;
  claimStatus: 'CLAIMED' | 'UNCLAIMED';
  networkId: string;
  tokenAddress?: string | null;
  createdAt: Date;
  updatedAt: Date;
  mintedAt?: Date | null;
  lastActivityAt?: Date | null;
}

// DOMA API event types
export interface DomaEvent {
  id: number;
  type: DomaEventType;
  name: string;
  eventData?: {
    txHash?: string;
    tokenAddress?: string;
    tokenId?: string;
    networkId?: string;
    payment?: {
      price: string;
    };
  };
  uniqueId: string;
}

export type DomaEventType = 
  | 'NAME_TOKEN_MINTED'
  | 'NAME_TOKEN_TRANSFERRED'
  | 'NAME_RENEWED'
  | 'NAME_UPDATED'
  | 'NAME_DETOKENIZED';

// Trend Score related types
export interface TrendScore {
  domainName: string;
  score: number;
  breakdown: {
    searchVolume: number;
    trendDirection: number;
    onChainActivity: number;
    rarity: number;
  };
  metadata: {
    lastUpdated: Date;
    dataPoints: number;
    confidence: number;
  };
}

export interface AiAnalysisInsight {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  keyHighlights: string[];
  recommendations: string[];
  riskFactors: string[];
  dataPointsUsed: {
    serpApiTrendStrength: number;
    serpApiVolume: number;
    onChainActivityScore: number;
    rarityScore: number;
  };
}

export interface DomainScoreWithAi extends TrendScore {
  // Optional AI analysis enhancements attached to trend score
  aiAnalysis?: AiAnalysisInsight;
  // Additional on-chain metadata resolved from our database/cache layer
  onChain?: {
    owner: string | null;
    tokenId: string | null;
    networkId: string;
    tokenAddress: string | null;
    mintedAt: Date | null;
    lastActivityAt: Date | null;
  };
}

export interface SearchMetrics {
  volume: number;
  trend: number;
  relatedQueries: string[];
  geographicData: Record<string, number>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface OnChainMetrics {
  transactionCount: number;
  uniqueOwners: number;
  averagePrice: number;
  liquidity: number;
  rarity: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request types
export interface ScoreDomainRequest {
  domainName: string;
  forceUpdate?: boolean;
}

export interface GetDomainsRequest {
  page?: number;
  limit?: number;
  sortBy?: 'score' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  filter?: {
    minScore?: number;
    maxScore?: number;
    eventType?: DomaEventType;
    networkId?: string;
  };
}

// Configuration types
export interface AppConfig {
  port: number;
  nodeEnv: string;
  domaApi: {
    baseUrl: string;
    apiKey: string;
  };
  database: {
    path: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  polling: {
    intervalSeconds: number;
    maxEventsPerPoll: number;
  };
  scoring: {
    updateIntervalHours: number;
    trendAnalysisDays: number;
  };
  serpApi: {
    enabled: boolean;
    baseUrl: string;
    apiKey?: string | undefined;
    dailyLimit: number;
    useMockData: boolean;
    requestTimeoutMs: number;
    cacheTtlMinutes: number;
  };
  openAi: {
    enabled: boolean;
    apiKey?: string | undefined;
    model: string;
    maxTokens: number;
    temperature: number;
    timeoutMs: number;
  };
}

// Error types
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Database types
export interface DatabaseEvent {
  id: number;
  uniqueId: string;
  eventType: DomaEventType;
  domainName: string;
  price: number | null;
  txHash: string | null;
  networkId: string | null;
  createdAt: Date;
}

export interface DatabaseTrendScore {
  id: number;
  domainName: string;
  score: number;
  searchVolume: number;
  trendDirection: number;
  onChainActivity: number;
  rarity: number;
  lastUpdated: Date;
  dataPoints: number;
  confidence: number;
}

export interface AiInsightsCacheEntry {
  domainName: string;
  trendScore: number;
  analysis: AiAnalysisInsight;
  createdAt: Date;
}
