import { config } from '@/config';
import logger from '@/utils/logger';
import { AiAnalysisInsight, TrendScore, SearchMetrics, OnChainMetrics } from '@/types';
import OpenAI from 'openai';

interface GenerateAnalysisParams {
  domainName: string;
  trendScore: TrendScore;
  searchMetrics: SearchMetrics;
  onChainMetrics: OnChainMetrics;
}

class LlmAnalysisService {
  private client: OpenAI | null;

  constructor() {
    if (config.openAi.enabled && config.openAi.apiKey) {
      this.client = new OpenAI({
        apiKey: config.openAi.apiKey,
        timeout: config.openAi.timeoutMs,
      });

      logger.info('LLM Analysis service initialized', {
        enabled: true,
        model: config.openAi.model,
      });
    } else {
      this.client = null;
      logger.warn('LLM Analysis service disabled - no API key configured');
    }
  }

  public isEnabled(): boolean {
    const enabled = Boolean(this.client && config.openAi.enabled);
    logger.info('LLM service enabled check', { 
      enabled, 
      hasClient: Boolean(this.client), 
      configEnabled: config.openAi.enabled 
    });
    return enabled;
  }

  private buildPrompt({ domainName, trendScore, searchMetrics, onChainMetrics }: GenerateAnalysisParams): string {
    const trendDirectionLabel = trendScore.breakdown.trendDirection >= 66
      ? 'growing'
      : trendScore.breakdown.trendDirection <= 33
        ? 'declining'
        : 'stable';

    return `You are an AI analyst for domain investment insights. Analyze the domain "${domainName}" combining off-chain search trend data and on-chain activity from the DOMA protocol.

Search Trend Metrics (SerpApi Google Trends):
- Trend Score: ${trendScore.breakdown.trendDirection.toFixed(2)} / 100 (${trendDirectionLabel})
- Search Volume Score: ${trendScore.breakdown.searchVolume.toFixed(2)} / 100
- Trend Strength: ${(searchMetrics.trend * 100).toFixed(2)}%
- Related Queries Count: ${searchMetrics.relatedQueries.length}
- Geographic Diversity: ${Object.keys(searchMetrics.geographicData).length} regions

On-chain Metrics (DOMA Protocol):
- Activity Score: ${trendScore.breakdown.onChainActivity.toFixed(2)} / 100
- Transactions: ${onChainMetrics.transactionCount}
- Unique Owners: ${onChainMetrics.uniqueOwners}
- Average Price: ${onChainMetrics.averagePrice}
- Liquidity Score: ${onChainMetrics.liquidity.toFixed(2)}
- Rarity Score: ${trendScore.breakdown.rarity.toFixed(2)} / 100

Overall Trend Score: ${trendScore.score.toFixed(2)} / 100
Confidence Level: ${(trendScore.metadata.confidence * 100).toFixed(0)}%

IMPORTANT: You must respond with valid JSON only. Do not include any text before or after the JSON.

Provide a JSON response with the following structure:
{
  "summary": "high-level narrative on the domain opportunity (max 3 sentences)",
  "sentiment": "positive" | "neutral" | "negative",
  "confidence": 0.0-1.0,
  "keyHighlights": ["bullet point 1", "bullet point 2", "bullet point 3"],
  "recommendations": ["action 1", "action 2", "action 3"],
  "riskFactors": ["risk 1", "risk 2", "risk 3"],
  "dataPointsUsed": {
    "serpApiTrendStrength": 0.0,
    "serpApiVolume": 0.0,
    "onChainActivityScore": 0.0,
    "rarityScore": 0.0
  }
}

The tone should be analytical, concise, and helpful for investors evaluating the domain.`;
  }

  public async generateAnalysis(params: GenerateAnalysisParams): Promise<AiAnalysisInsight | null> {
    logger.info('Starting AI analysis generation', { domainName: params.domainName });
    
    if (!this.isEnabled()) {
      logger.warn('LLM service not enabled');
      return null;
    }

    if (!this.client) {
      logger.warn('LLM client not initialized');
      return null;
    }

    try {
      const prompt = this.buildPrompt(params);

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`OpenAI API request timed out after ${config.openAi.timeoutMs}ms`));
        }, config.openAi.timeoutMs);
      });

      // Create the API request promise
      const apiPromise = this.client.chat.completions.create({
        model: config.openAi.model,
        max_tokens: config.openAi.maxTokens,
        temperature: config.openAi.temperature,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      });

      // Race between API call and timeout
      const response = await Promise.race([apiPromise, timeoutPromise]);

      const outputText = response.choices[0]?.message?.content?.trim();
      if (!outputText) {
        throw new Error('LLM returned empty response');
      }

      const parsed = JSON.parse(outputText) as AiAnalysisInsight;

      if (!parsed.summary || !parsed.keyHighlights || !parsed.recommendations) {
        throw new Error('LLM response missing required fields');
      }

      logger.info('AI analysis generated successfully', { domainName: params.domainName });
      return {
        summary: parsed.summary,
        sentiment: parsed.sentiment ?? 'neutral',
        confidence: parsed.confidence ?? params.trendScore.metadata.confidence,
        keyHighlights: parsed.keyHighlights?.slice?.(0, 5) ?? [],
        recommendations: parsed.recommendations?.slice?.(0, 3) ?? [],
        riskFactors: parsed.riskFactors?.slice?.(0, 3) ?? [],
        dataPointsUsed: {
          serpApiTrendStrength: params.searchMetrics.trend,
          serpApiVolume: params.searchMetrics.volume,
          onChainActivityScore: params.trendScore.breakdown.onChainActivity,
          rarityScore: params.trendScore.breakdown.rarity,
        },
      } satisfies AiAnalysisInsight;
    } catch (error) {
      logger.error('Failed to generate AI analysis', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        domainName: params.domainName,
        model: config.openAi.model,
      });
      return null;
    }
  }
}

export const llmAnalysisService = new LlmAnalysisService();
