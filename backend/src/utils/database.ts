import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { config } from '@/config';
import logger from './logger';
import { Domain, DatabaseEvent, DatabaseTrendScore, AiInsightsCacheEntry } from '@/types';

class DatabaseManager {
  private db: sqlite3.Database;
  private initialized: Promise<void>;

  constructor() {
    // Ensure database directory exists
    const dbDir = path.dirname(config.database.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info(`Created database directory: ${dbDir}`);
    }
    
    this.db = new sqlite3.Database(config.database.path);
    this.initialized = this.initializeTables();
  }

  private async initializeTables(): Promise<void> {
    const run = promisify(this.db.run.bind(this.db));
    const all = promisify(this.db.all.bind(this.db));
    const get = promisify(this.db.get.bind(this.db));

    // Store promisified methods
    (this as any).run = run;
    (this as any).all = all;
    (this as any).get = get;

    try {
      // Events table
      await run(`
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          unique_id TEXT NOT NULL UNIQUE,
          event_type TEXT NOT NULL,
          domain_name TEXT NOT NULL,
          price REAL,
          tx_hash TEXT,
          network_id TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Trend scores table
      await run(`
        CREATE TABLE IF NOT EXISTS trend_scores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          domain_name TEXT NOT NULL UNIQUE,
          score REAL NOT NULL,
          search_volume REAL NOT NULL,
          trend_direction REAL NOT NULL,
          on_chain_activity REAL NOT NULL,
          rarity REAL NOT NULL,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          data_points INTEGER DEFAULT 1,
          confidence REAL DEFAULT 0.5
        )
      `);

      // External API usage tracking
      await run(`
        CREATE TABLE IF NOT EXISTS api_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          service TEXT NOT NULL,
          date TEXT NOT NULL,
          count INTEGER DEFAULT 0,
          UNIQUE(service, date)
        )
      `);

      // Domains table
      await run(`
        CREATE TABLE IF NOT EXISTS domains (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          token_id TEXT,
          owner TEXT,
          claim_status TEXT NOT NULL,
          network_id TEXT NOT NULL,
          token_address TEXT,
          minted_at TIMESTAMP,
          last_activity_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Backfill columns when migrating an existing database
      try {
        await run('ALTER TABLE domains ADD COLUMN minted_at TIMESTAMP');
      } catch (error) {
        logger.debug('Column minted_at already exists or cannot be added', error);
      }

      try {
        await run('ALTER TABLE domains ADD COLUMN last_activity_at TIMESTAMP');
      } catch (error) {
        logger.debug('Column last_activity_at already exists or cannot be added', error);
      }

      // AI insights cache table
      await run(`
        CREATE TABLE IF NOT EXISTS ai_insights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          domain_name TEXT NOT NULL UNIQUE,
          trend_score REAL NOT NULL,
          summary TEXT NOT NULL,
          sentiment TEXT,
          confidence REAL,
          key_highlights TEXT,
          recommendations TEXT,
          risk_factors TEXT,
          data_points_used TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for better performance
      await run(`CREATE INDEX IF NOT EXISTS idx_events_domain_name ON events(domain_name)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_trend_scores_domain_name ON trend_scores(domain_name)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_trend_scores_score ON trend_scores(score)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_trend_scores_last_updated ON trend_scores(last_updated)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_domains_name ON domains(name)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_domains_owner ON domains(owner)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_ai_insights_domain_name ON ai_insights(domain_name)`);

      logger.info('Database tables initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database tables:', error);
      throw error;
    }
  }

  // Events methods
  async insertEvent(event: Omit<DatabaseEvent, 'id'>): Promise<number> {
    await this.initialized;
    const run = (this as any).run;
    const result = await run(
      `INSERT OR IGNORE INTO events 
       (unique_id, event_type, domain_name, price, tx_hash, network_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      event.uniqueId,
      event.eventType,
      event.domainName,
      event.price ?? null,
      event.txHash ?? null,
      event.networkId ?? null,
      event.createdAt.toISOString()
    );
    
    return result.lastID;
  }

  async getEventsByDomain(domainName: string, limit: number = 100): Promise<DatabaseEvent[]> {
    await this.initialized;
    const all = (this as any).all;
    return await all(
      `SELECT * FROM events 
       WHERE domain_name = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      domainName, limit
    );
  }

  async getEventsByKeyword(keyword: string, limit: number = 100): Promise<DatabaseEvent[]> {
    await this.initialized;
    const all = (this as any).all;
    return await all(
      `SELECT * FROM events 
       WHERE domain_name LIKE ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      `%${keyword}%`, limit
    );
  }

  async getRecentEvents(limit: number = 50): Promise<DatabaseEvent[]> {
    await this.initialized;
    const all = (this as any).all;
    return await all(
      `SELECT * FROM events 
       ORDER BY created_at DESC 
       LIMIT ?`,
      limit
    );
  }

  async getDomainActivityStats(): Promise<{
    avgTransactionCount: number;
    maxTransactionCount: number;
    avgPrice: number;
    maxPrice: number;
    totalDomains: number;
  }> {
    await this.initialized;
    const all = (this as any).all;
    
    // Get statistics from events table
    const stats = await all(`
      SELECT 
        AVG(transaction_count) as avg_transaction_count,
        MAX(transaction_count) as max_transaction_count,
        AVG(price) as avg_price,
        MAX(price) as max_price,
        COUNT(DISTINCT domain_name) as total_domains
      FROM (
        SELECT 
          domain_name,
          COUNT(*) as transaction_count,
          AVG(price) as price
        FROM events 
        WHERE price IS NOT NULL
        GROUP BY domain_name
      ) domain_stats
    `);
    
    return {
      avgTransactionCount: stats[0]?.avg_transaction_count || 0,
      maxTransactionCount: stats[0]?.max_transaction_count || 0,
      avgPrice: stats[0]?.avg_price || 0,
      maxPrice: stats[0]?.max_price || 0,
      totalDomains: stats[0]?.total_domains || 0,
    };
  }

  async isEventProcessed(uniqueId: string): Promise<boolean> {
    await this.initialized;
    const get = (this as any).get;
    const result = await get('SELECT 1 FROM events WHERE unique_id = ?', uniqueId);
    return !!result;
  }

  // Trend scores methods
  async insertOrUpdateTrendScore(score: Omit<DatabaseTrendScore, 'id'>): Promise<number> {
    await this.initialized; // Wait for tables to be created
    const run = (this as any).run;
    const result = await run(
      `INSERT OR REPLACE INTO trend_scores 
       (domain_name, score, search_volume, trend_direction, on_chain_activity, rarity, last_updated, data_points, confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      score.domainName,
      score.score,
      score.searchVolume,
      score.trendDirection,
      score.onChainActivity,
      score.rarity,
      score.lastUpdated.toISOString(),
      score.dataPoints,
      score.confidence
    );
    
    return result?.lastID || 0;
  }

  async getTrendScore(domainName: string): Promise<DatabaseTrendScore | null> {
    const get = (this as any).get;
    const result = await get('SELECT * FROM trend_scores WHERE domain_name = ?', domainName);
    return result || null;
  }

  async getTopTrendScores(limit: number = 100): Promise<DatabaseTrendScore[]> {
    await this.initialized; // Wait for tables to be created
    const all = (this as any).all;
    return await all(
      `SELECT * FROM trend_scores 
       ORDER BY score DESC 
       LIMIT ?`,
      limit
    );
  }

  async getStaleTrendScores(hoursOld: number = 6): Promise<DatabaseTrendScore[]> {
    await this.initialized;
    const all = (this as any).all;
    return await all(
      `SELECT * FROM trend_scores 
       WHERE last_updated < datetime('now', '-${hoursOld} hours')
       ORDER BY last_updated ASC`
    );
  }

  // API usage methods
  async incrementApiUsage(service: string, date: string): Promise<void> {
    await this.initialized;
    const run = (this as any).run;
    await run(
      `INSERT INTO api_usage (service, date, count)
       VALUES (?, ?, 1)
       ON CONFLICT(service, date)
       DO UPDATE SET count = count + 1`,
      service,
      date
    );
  }

  async getApiUsage(service: string, date: string): Promise<number> {
    await this.initialized;
    const get = (this as any).get;
    const result = await get(
      `SELECT count FROM api_usage WHERE service = ? AND date = ?`,
      service,
      date
    );
    return result?.count || 0;
  }


  // Domains methods
  async insertOrUpdateDomain(domain: {
    name: string;
    tokenId?: string | null;
    owner?: string | null;
    claimStatus: string;
    networkId: string;
    tokenAddress?: string | null;
    mintedAt?: Date | null;
    lastActivityAt?: Date | null;
  }): Promise<number> {
    await this.initialized;
    const run = (this as any).run;
    const mintedAtIso = domain.mintedAt ? domain.mintedAt.toISOString() : null;
    const lastActivityIso = domain.lastActivityAt ? domain.lastActivityAt.toISOString() : null;

    const result = await run(
      `INSERT INTO domains 
       (name, token_id, owner, claim_status, network_id, token_address, minted_at, last_activity_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(name) DO UPDATE SET
         token_id = excluded.token_id,
         owner = excluded.owner,
         claim_status = excluded.claim_status,
         network_id = excluded.network_id,
         token_address = excluded.token_address,
         minted_at = COALESCE(excluded.minted_at, domains.minted_at),
         last_activity_at = COALESCE(excluded.last_activity_at, domains.last_activity_at),
         updated_at = CURRENT_TIMESTAMP`,
      domain.name,
      domain.tokenId,
      domain.owner,
      domain.claimStatus,
      domain.networkId,
      domain.tokenAddress,
      mintedAtIso,
      lastActivityIso,
    );

    return result?.lastID ?? 0;
  }

  async getDomain(name: string): Promise<Domain | null> {
    await this.initialized;
    const get = (this as any).get;
    const row = await get('SELECT * FROM domains WHERE name = ?', name);
    return row ? this.mapDomainRow(row) : null;
  }

  async getAllDomains(limit: number = 100, offset: number = 0): Promise<Domain[]> {
    await this.initialized;
    const all = (this as any).all;
    const rows = await all(
      `SELECT * FROM domains 
       ORDER BY updated_at DESC 
       LIMIT ? OFFSET ?`,
      limit, offset,
    );

    return rows.map((row: any) => this.mapDomainRow(row));
  }

  // AI insights methods
  async saveAiInsight(entry: AiInsightsCacheEntry): Promise<void> {
    await this.initialized;
    const run = (this as any).run;
    await run(
      `INSERT OR REPLACE INTO ai_insights (
        domain_name, trend_score, summary, sentiment, confidence, key_highlights,
        recommendations, risk_factors, data_points_used, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      entry.domainName,
      entry.trendScore,
      entry.analysis.summary,
      entry.analysis.sentiment,
      entry.analysis.confidence,
      JSON.stringify(entry.analysis.keyHighlights ?? []),
      JSON.stringify(entry.analysis.recommendations ?? []),
      JSON.stringify(entry.analysis.riskFactors ?? []),
      JSON.stringify(entry.analysis.dataPointsUsed ?? {}),
      entry.createdAt.toISOString()
    );
  }

  async getAiInsight(domainName: string): Promise<AiInsightsCacheEntry | null> {
    await this.initialized;
    const get = (this as any).get;
    const row = await get(
      `SELECT * FROM ai_insights WHERE domain_name = ?`,
      domainName
    );

    if (!row) {
      return null;
    }

    return {
      domainName: row.domain_name,
      trendScore: row.trend_score,
      createdAt: new Date(row.created_at),
      analysis: {
        summary: row.summary,
        sentiment: row.sentiment,
        confidence: row.confidence,
        keyHighlights: JSON.parse(row.key_highlights || '[]'),
        recommendations: JSON.parse(row.recommendations || '[]'),
        riskFactors: JSON.parse(row.risk_factors || '[]'),
        dataPointsUsed: JSON.parse(row.data_points_used || '{}'),
      },
    };
  }

  // Utility methods
  async getStats(): Promise<{
    totalEvents: number;
    totalDomains: number;
    totalTrendScores: number;
    lastEventDate: string | null;
  }> {
    await this.initialized;
    const get = (this as any).get;
    const eventsCount = await get('SELECT COUNT(*) as count FROM events');
    const domainsCount = await get('SELECT COUNT(*) as count FROM domains');
    const scoresCount = await get('SELECT COUNT(*) as count FROM trend_scores');
    const lastEvent = await get('SELECT MAX(created_at) as last_date FROM events');

    return {
      totalEvents: eventsCount.count,
      totalDomains: domainsCount.count,
      totalTrendScores: scoresCount.count,
      lastEventDate: lastEvent.last_date,
    };
  }

  private mapDomainRow(row: any): Domain {
    return {
      id: row.name,
      name: row.name,
      tokenId: row.token_id ?? null,
      owner: row.owner ?? null,
      claimStatus: (row.claim_status as Domain['claimStatus']) ?? 'UNCLAIMED',
      networkId: row.network_id ?? 'unknown',
      tokenAddress: row.token_address ?? null,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
      mintedAt: row.minted_at ? new Date(row.minted_at) : null,
      lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at) : null,
    };
  }

  close(): void {
    this.db.close();
  }
}

// Export singleton instance
export const db = new DatabaseManager();
export default db;