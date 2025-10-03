import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Debug log to check the BASE_URL
console.log('🔍 API Base URL:', BASE_URL);

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Debug interceptor to log requests
api.interceptors.request.use(
  (config) => {
    console.log('🚀 Making request to:', config.baseURL + config.url);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface DomainScoreResponse {
  success: boolean;
  data: {
    domainName: string;
    score: number;
    breakdown: {
      searchVolume: number;
      trendDirection: number;
      onChainActivity: number;
      rarity: number;
    };
    metadata: {
      lastUpdated: string;
      dataPoints: number;
      confidence: number;
      source?: string;
    };
    onChain?: {
      owner: string | null;
      tokenId: string | null;
      networkId: string;
      tokenAddress: string | null;
      mintedAt: string | null;
      lastActivityAt: string | null;
    };
    aiAnalysis?: AiAnalysisResponse['analysis'];
  };
}

export interface AiAnalysisResponse {
  domainName: string;
  trendScore: number;
  analysis: {
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
  };
  createdAt: string;
}

export interface TrendingDomain {
  domainName: string;
  score: number;
  breakdown: {
    searchVolume: number;
    trendDirection: number;
    onChainActivity: number;
    rarity: number;
  };
  metadata: {
    lastUpdated: string;
    dataPoints: number;
    confidence: number;
    source?: string;
  };
}

export interface TrendingResponse {
  success: boolean;
  data: TrendingDomain[];
}

export const fetchHealth = async () => {
  const response = await api.get('/health', {
    params: { t: Date.now() } // Force fresh request
  });
  return response.data;
};

export const fetchTrendingDomains = async (limit = 10) => {
  const response = await api.get<TrendingResponse>(`/api/v1/domains/trending/top`, {
    params: { limit },
  });
  return response.data;
};

export const fetchDomainScore = async (domainName: string, forceUpdate = true) => {
  const response = await api.post<DomainScoreResponse>(`/api/v1/domains/score`, {
    domainName,
    forceUpdate,
  });
  return response.data;
};

export interface AiAnalysisPending {
  status: 'pending';
}

export const fetchDomainAiAnalysis = async (domainName: string): Promise<
  ApiResponse<AiAnalysisResponse> | AiAnalysisPending
> => {
  try {
    const response = await api.get<ApiResponse<AiAnalysisResponse>>(
      `/api/v1/domains/${encodeURIComponent(domainName)}/ai-analysis`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return { status: 'pending' };
    }
    throw error;
  }
};

