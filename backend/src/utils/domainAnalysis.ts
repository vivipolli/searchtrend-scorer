/**
 * Domain analysis utilities for SearchTrend Scorer
 */

import { SearchMetrics } from '@/types';

/**
 * Analyze search volume based on domain characteristics and market trends
 */
export function analyzeSearchVolume(domainName: string): number {
  const tld = domainName.split('.').pop()?.toLowerCase() || '';
  const name = domainName.split('.')[0]?.toLowerCase() || domainName.toLowerCase();
  
  let volume = 50; // Base volume
  
  // TLD analysis based on real market data
  const tldMultipliers: Record<string, number> = {
    'com': 2.5,    // Most searched TLD
    'org': 1.8,    // High trust factor
    'net': 1.4,    // Technical domains
    'eth': 2.2,    // Crypto native
    'crypto': 1.9, // Crypto focused
    'nft': 1.7,    // NFT market
    'dao': 1.6,    // DAO ecosystem
    'defi': 1.8,   // DeFi sector
    'ai': 2.0,     // AI trend
    'web3': 1.9,   // Web3 movement
  };
  
  volume *= tldMultipliers[tld] || 1.0;
  
  // Length analysis (shorter domains = higher search potential)
  const lengthFactor = Math.max(0.2, 1 - (name.length - 3) * 0.08);
  volume *= lengthFactor;
  
  // Keyword analysis based on current market trends
  const trendingKeywords = {
    'crypto': 1.6, 'nft': 1.5, 'dao': 1.4, 'defi': 1.5,
    'web3': 1.6, 'blockchain': 1.4, 'ai': 1.7, 'metaverse': 1.3,
    'game': 1.3, 'token': 1.4, 'coin': 1.3, 'swap': 1.2
  };
  
  let keywordMultiplier = 1.0;
  for (const [keyword, multiplier] of Object.entries(trendingKeywords)) {
    if (name.includes(keyword)) {
      keywordMultiplier *= multiplier;
    }
  }
  volume *= keywordMultiplier;
  
  // Brandability factor (memorable, pronounceable)
  const brandabilityFactor = calculateBrandability(name);
  volume *= brandabilityFactor;
  
  return Math.round(Math.min(1000, volume));
}

/**
 * Analyze trend direction based on market indicators
 */
export function analyzeTrendDirection(domainName: string): number {
  const name = domainName.split('.')[0]?.toLowerCase() || domainName.toLowerCase();
  const tld = domainName.split('.').pop()?.toLowerCase() || '';
  
  let trend = 0;
  
  // Current trending sectors (positive trend)
  const trendingSectors = {
    'ai': 0.4, 'artificial': 0.4, 'machine': 0.3, 'learning': 0.3,
    'crypto': 0.3, 'bitcoin': 0.4, 'ethereum': 0.3, 'blockchain': 0.2,
    'nft': 0.2, 'dao': 0.3, 'defi': 0.3, 'web3': 0.3,
    'metaverse': 0.2, 'vr': 0.2, 'ar': 0.2, 'gaming': 0.1
  };
  
  // Declining sectors (negative trend)
  const decliningSectors = {
    'old': -0.2, 'legacy': -0.2, 'traditional': -0.1
  };
  
  // Check for trending keywords
  for (const [keyword, trendValue] of Object.entries(trendingSectors)) {
    if (name.includes(keyword)) {
      trend += trendValue;
    }
  }
  
  // Check for declining keywords
  for (const [keyword, trendValue] of Object.entries(decliningSectors)) {
    if (name.includes(keyword)) {
      trend += trendValue;
    }
  }
  
  // TLD trend analysis
  const tldTrends: Record<string, number> = {
    'ai': 0.3, 'crypto': 0.2, 'nft': 0.1, 'dao': 0.2,
    'defi': 0.2, 'web3': 0.2, 'eth': 0.1
  };
  
  trend += tldTrends[tld] || 0;
  
  // Length trend (shorter domains trending up)
  if (name.length <= 4) trend += 0.1;
  else if (name.length >= 10) trend -= 0.1;
  
  return Math.max(-1, Math.min(1, trend));
}

/**
 * Generate related queries
 */
export function generateRelatedQueries(domainName: string): string[] {
  const name = domainName.split('.')[0]?.toLowerCase() || domainName.toLowerCase();
  const tld = domainName.split('.').pop()?.toLowerCase() || '';
  
  const queries = [
    `${name}`,
    `${name} ${tld}`,
    `buy ${name}`,
    `${name} price`,
  ];
  
  // Add domain-specific queries
  if (name.includes('crypto')) {
    queries.push(`${name} cryptocurrency`, `${name} blockchain`);
  }
  if (name.includes('nft')) {
    queries.push(`${name} nft collection`, `${name} digital art`);
  }
  
  return queries.slice(0, 5); // Return top 5
}

/**
 * Analyze geographic data based on domain characteristics
 */
export function analyzeGeographicData(domainName: string): Record<string, number> {
  const name = domainName.split('.')[0]?.toLowerCase() || domainName.toLowerCase();
  const tld = domainName.split('.').pop()?.toLowerCase() || '';
  
  // Base geographic distribution
  const baseDistribution = {
    'US': 40,
    'UK': 15,
    'DE': 10,
    'JP': 8,
    'CA': 7,
    'AU': 5,
    'FR': 4,
    'NL': 3,
    'SG': 3,
    'CH': 2,
    'OTHER': 3
  };
  
  // Adjust based on domain characteristics
  const adjusted = { ...baseDistribution };
  
  // Crypto domains tend to be more global
  if (name.includes('crypto') || name.includes('bitcoin') || tld === 'crypto') {
    adjusted['US'] += 10;
    adjusted['SG'] += 5;
    adjusted['CH'] += 3;
  }
  
  // AI domains popular in tech hubs
  if (name.includes('ai') || name.includes('artificial') || tld === 'ai') {
    adjusted['US'] += 15;
    adjusted['JP'] += 5;
    adjusted['SG'] += 3;
  }
  
  // European domains
  if (name.includes('euro') || name.includes('eu')) {
    adjusted['DE'] += 10;
    adjusted['FR'] += 5;
    adjusted['NL'] += 3;
  }
  
  return adjusted;
}

/**
 * Calculate domain rarity based on market analysis
 */
export function calculateDomainRarity(domainName: string): number {
  const name = domainName.split('.')[0]?.toLowerCase() || domainName.toLowerCase();
  const tld = domainName.split('.').pop()?.toLowerCase() || '';
  
  let rarity = 30; // Base rarity
  
  // Length analysis (shorter = rarer and more valuable)
  if (name.length <= 2) rarity += 40;      // Ultra rare
  else if (name.length <= 3) rarity += 35; // Very rare
  else if (name.length <= 4) rarity += 25; // Rare
  else if (name.length <= 5) rarity += 15; // Uncommon
  else if (name.length <= 6) rarity += 10; // Somewhat rare
  else if (name.length <= 7) rarity += 5;  // Slightly rare
  
  // TLD rarity analysis
  const tldRarity: Record<string, number> = {
    'com': 0,     // Most common
    'org': 5,     // Common
    'net': 5,     // Common
    'eth': 20,    // Crypto native
    'crypto': 25, // Crypto focused
    'nft': 20,    // NFT specific
    'dao': 25,    // DAO specific
    'defi': 20,   // DeFi specific
    'ai': 30,     // AI specific
    'web3': 25,   // Web3 specific
  };
  
  rarity += tldRarity[tld] || 15; // Unknown TLDs get bonus
  
  // Pattern analysis
  if (/^[a-z]+$/.test(name)) rarity += 5;        // Pure letters
  if (/^\d+$/.test(name)) rarity += 15;          // Pure numbers
  if (/^[a-z]+\d+$/.test(name)) rarity += 10;    // Letters + numbers
  if (name.includes('-')) rarity -= 5;           // Hyphens reduce value
  if (name.includes('_')) rarity -= 8;           // Underscores reduce value
  
  // Brandability analysis
  const brandability = calculateBrandability(name);
  rarity += brandability * 10; // Brandable domains are rarer
  
  // Dictionary word analysis
  if (isDictionaryWord(name)) rarity += 10;
  
  return Math.max(0, Math.min(100, rarity));
}

/**
 * Calculate brandability factor
 */
export function calculateBrandability(name: string): number {
  let score = 0.5; // Base score
  
  // Length factor (4-8 characters optimal)
  if (name.length >= 4 && name.length <= 8) score += 0.2;
  else if (name.length < 4 || name.length > 10) score -= 0.1;
  
  // Pronounceability (vowel/consonant ratio)
  const vowels = name.match(/[aeiou]/g)?.length || 0;
  const vowelRatio = vowels / name.length;
  
  if (vowelRatio >= 0.2 && vowelRatio <= 0.4) score += 0.2; // Good ratio
  else if (vowelRatio < 0.1 || vowelRatio > 0.6) score -= 0.1;
  
  // Avoid difficult combinations
  if (name.includes('xq') || name.includes('zx') || name.includes('qj')) score -= 0.1;
  
  // Memorable patterns
  if (name.match(/(.)\1/)) score += 0.1; // Double letters
  if (name.match(/^[bcdfghjklmnpqrstvwxyz][aeiou]/)) score += 0.1; // CVC pattern
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Check if name is a dictionary word
 */
export function isDictionaryWord(name: string): boolean {
  // Simple dictionary check (in production, use a real dictionary)
  const commonWords = [
    'crypto', 'nft', 'dao', 'defi', 'web3', 'ai', 'art', 'game', 'token',
    'coin', 'swap', 'trade', 'market', 'finance', 'tech', 'digital', 'meta'
  ];
  
  return commonWords.includes(name.toLowerCase());
}

/**
 * Calculate liquidity based on events
 */
export function calculateLiquidity(events: any[]): number {
  if (events.length === 0) return 0;
  
  // Simple liquidity calculation based on transaction frequency
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const recentEvents = events.filter(e => new Date(e.createdAt) > thirtyDaysAgo);
  const liquidity = Math.min(100, (recentEvents.length / 30) * 100);
  
  return liquidity;
}

/**
 * Normalize search volume to 0-100 scale
 */
export function normalizeSearchVolume(volume: number): number {
  // Simple normalization - in production, use proper scaling
  return Math.min(100, (volume / 1000) * 100);
}

/**
 * Calculate trend direction score
 */
export function calculateTrendDirection(trend: number): number {
  // Convert trend (-1 to 1) to score (0 to 100)
  return ((trend + 1) / 2) * 100;
}

/**
 * Calculate on-chain activity score
 */
export function calculateOnChainActivity(metrics: {
  transactionCount: number;
  liquidity: number;
  averagePrice: number;
}): number {
  // Weighted combination of transaction count, liquidity, and price
  const transactionScore = Math.min(100, metrics.transactionCount * 10);
  const liquidityScore = metrics.liquidity;
  const priceScore = Math.min(100, metrics.averagePrice * 10);
  
  return (transactionScore * 0.4 + liquidityScore * 0.4 + priceScore * 0.2);
}

/**
 * Calculate weighted final score
 */
export function calculateWeightedScore(components: {
  searchVolume: number;
  trendDirection: number;
  onChainActivity: number;
  rarity: number;
}): number {
  // Weighted combination
  const weights = {
    searchVolume: 0.3,
    trendDirection: 0.25,
    onChainActivity: 0.25,
    rarity: 0.2,
  };
  
  const score = 
    components.searchVolume * weights.searchVolume +
    components.trendDirection * weights.trendDirection +
    components.onChainActivity * weights.onChainActivity +
    components.rarity * weights.rarity;
  
  return Math.round(score * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate confidence score
 */
export function calculateConfidence(
  searchMetrics: { relatedQueries: string[]; timeRange: { end: Date } },
  onChainMetrics: { transactionCount: number; uniqueOwners: number }
): number {
  let confidence = 0.5; // Base confidence
  
  // More data points = higher confidence
  if (searchMetrics.relatedQueries.length > 3) confidence += 0.1;
  if (onChainMetrics.transactionCount > 5) confidence += 0.2;
  if (onChainMetrics.uniqueOwners > 2) confidence += 0.1;
  
  // Recent data = higher confidence
  const daysSinceLastUpdate = (Date.now() - searchMetrics.timeRange.end.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLastUpdate < 7) confidence += 0.1;
  
  return Math.min(1, confidence);
}

export function mapSearchMetricsToComponents(metrics: SearchMetrics) {
  const normalizedVolume = normalizeSearchVolume(metrics.volume);
  const trendDirection = calculateTrendDirection(metrics.trend);
  return {
    searchVolume: normalizedVolume,
    trendDirection,
  };
}
