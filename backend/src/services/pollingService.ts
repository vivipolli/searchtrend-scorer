import cron from 'node-cron';
import { config } from '@/config';
import logger from '@/utils/logger';
import { domaService } from './domaService';
import { trendScorerService } from './trendScorerService';
import { db } from '@/utils/database';

class PollingService {
  private isRunning: boolean = false;
  private pollingTask: cron.ScheduledTask | null = null;

  /**
   * Start the polling service
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Polling service is already running');
      return;
    }

    logger.info('Starting polling service', {
      interval: config.polling.intervalSeconds,
      maxEvents: config.polling.maxEventsPerPoll,
    });

    // Schedule polling task
    const cronExpression = `*/${config.polling.intervalSeconds} * * * * *`;
    
    this.pollingTask = cron.schedule(cronExpression, async () => {
      await this.pollAndProcessEvents();
    }, {
      scheduled: false,
    });

    this.pollingTask.start();
    this.isRunning = true;

    logger.info('Polling service started successfully');
  }

  /**
   * Stop the polling service
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Polling service is not running');
      return;
    }

    if (this.pollingTask) {
      this.pollingTask.stop();
      this.pollingTask = null;
    }

    this.isRunning = false;
    logger.info('Polling service stopped');
  }

  /**
   * Poll and process events from DOMA API
   */
  private async pollAndProcessEvents(): Promise<void> {
    try {
      logger.debug('Starting event polling cycle');

      // Poll events from DOMA API
      const result = await domaService.pollEvents(
        config.polling.maxEventsPerPoll,
        true // finalizedOnly
      );

      if (result.events.length === 0) {
        logger.debug('No new events found');
        return;
      }

      logger.info(`Polled ${result.events.length} events from DOMA API`);

      // Process each event
      let processedCount = 0;
      const domainsToUpdate = new Set<string>();

      for (const event of result.events) {
        try {
          // Skip events with null or undefined uniqueId
          if (!event.uniqueId) {
            logger.warn(`Skipping event with null uniqueId for domain: ${event.name}`);
            continue;
          }

          // Check if event already processed
          if (await db.isEventProcessed(event.uniqueId)) {
            continue;
          }

          // Extract event data
          const price = domaService.extractPriceFromEvent(event);
          const networkId = domaService.extractNetworkIdFromEvent(event);
          const txHash = event.eventData?.txHash;

          // Store event in database
          const eventId = await db.insertEvent({
            uniqueId: event.uniqueId,
            eventType: event.type,
            domainName: event.name,
            price,
            txHash: txHash ?? null,
            networkId: networkId ?? null,
            createdAt: new Date(),
          });

          if (eventId) {
            processedCount++;
            domainsToUpdate.add(event.name);

            logger.debug(`Processed event ${event.uniqueId} for domain ${event.name}`, {
              eventType: event.type,
              price,
              networkId,
            });
          }
        } catch (error) {
          logger.error(`Failed to process event ${event.uniqueId}:`, error);
        }
      }

      // Update trend scores for affected domains
      if (domainsToUpdate.size > 0) {
        logger.info(`Updating trend scores for ${domainsToUpdate.size} domains`);
        
        for (const domainName of domainsToUpdate) {
          try {
            await trendScorerService.updateTrendScore(domainName, false);
          } catch (error) {
            logger.error(`Failed to update trend score for ${domainName}:`, error);
          }
        }
      }

      // Acknowledge processed events
      if (result.lastId && processedCount > 0) {
        await domaService.acknowledgeEvents(result.lastId);
        logger.debug(`Acknowledged events up to ID: ${result.lastId}`);
      }

      logger.info(`Event polling cycle completed`, {
        totalEvents: result.events.length,
        processedEvents: processedCount,
        domainsUpdated: domainsToUpdate.size,
      });

    } catch (error) {
      logger.error('Event polling cycle failed:', error);
    }
  }

  /**
   * Get polling service status
   */
  getStatus(): {
    isRunning: boolean;
    interval: number;
    maxEventsPerPoll: number;
  } {
    return {
      isRunning: this.isRunning,
      interval: config.polling.intervalSeconds,
      maxEventsPerPoll: config.polling.maxEventsPerPoll,
    };
  }

  /**
   * Trigger manual polling
   */
  async triggerPolling(): Promise<{
    success: boolean;
    processedEvents: number;
    error?: string;
  }> {
    try {
      logger.info('Manual polling triggered');
      
      const initialStats = await db.getStats();
      await this.pollAndProcessEvents();
      const finalStats = await db.getStats();
      
      const processedEvents = finalStats.totalEvents - initialStats.totalEvents;

      return {
        success: true,
        processedEvents,
      };
    } catch (error) {
      logger.error('Manual polling failed:', error);
      return {
        success: false,
        processedEvents: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update stale trend scores
   */
  async updateStaleScores(): Promise<void> {
    try {
      logger.info('Updating stale trend scores');

      const staleScores = await db.getStaleTrendScores(config.scoring.updateIntervalHours);
      
      if (staleScores.length === 0) {
        logger.debug('No stale trend scores found');
        return;
      }

      logger.info(`Found ${staleScores.length} stale trend scores to update`);

      for (const score of staleScores) {
        try {
          await trendScorerService.updateTrendScore(score.domainName, true);
          logger.debug(`Updated stale trend score for ${score.domainName}`);
        } catch (error) {
          logger.error(`Failed to update stale trend score for ${score.domainName}:`, error);
        }
      }

      logger.info('Stale trend scores update completed');
    } catch (error) {
      logger.error('Failed to update stale trend scores:', error);
    }
  }
}

// Export singleton instance
export const pollingService = new PollingService();
export default pollingService;
