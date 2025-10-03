import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { domaService } from '@/services/domaService';
import { db } from '@/utils/database';
import logger from '@/utils/logger';
import { ApiResponse, PaginatedResponse, DatabaseEvent } from '@/types';

export const pollEvents = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { limit = 25, finalizedOnly = true } = req.query;

  logger.info('Manual event polling requested', { limit, finalizedOnly });

  try {
    // Poll events from DOMA API
    const result = await domaService.pollEvents(Number(limit), finalizedOnly === 'true');

    // Process and store events
    const processedEvents: DatabaseEvent[] = [];
    for (const event of result.events) {
      // Check if event already processed
      if (await db.isEventProcessed(event.uniqueId)) {
        continue;
      }

      // Extract event data
      const price = domaService.extractPriceFromEvent(event);
      const networkId = domaService.extractNetworkIdFromEvent(event);
      const txHash = event.eventData?.txHash ?? null;

      // Store event in database
      const eventId = await db.insertEvent({
        uniqueId: event.uniqueId,
        eventType: event.type,
        domainName: event.name,
        price,
        txHash,
        networkId,
        createdAt: new Date(),
      });

      if (eventId) {
        processedEvents.push({
          id: eventId,
          uniqueId: event.uniqueId,
          eventType: event.type,
          domainName: event.name,
          price: price ?? null,
          txHash,
          networkId: networkId ?? null,
          createdAt: new Date(),
        });
      }
    }

    // Acknowledge processed events
    if (result.lastId) {
      await domaService.acknowledgeEvents(result.lastId);
    }

    const response: ApiResponse<{
      processedEvents: typeof processedEvents;
      totalEvents: result.events.length;
      lastId: result.lastId;
      hasMoreEvents: result.hasMoreEvents;
    }> = {
      success: true,
      data: {
        processedEvents,
        totalEvents: result.events.length,
        lastId: result.lastId,
        hasMoreEvents: result.hasMoreEvents,
      },
      message: `Processed ${processedEvents.length} new events`,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to poll events:', error);
    throw error;
  }
});

export const getRecentEvents = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { limit = 50 } = req.query;

  logger.info('Getting recent events', { limit });

  try {
    const events = await db.getRecentEvents(Number(limit));

    const response: ApiResponse<typeof events> = {
      success: true,
      data: events,
      message: `Retrieved ${events.length} recent events`,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get recent events:', error);
    throw error;
  }
});

export const getEventsByDomain = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { domainName } = req.params;
  const { limit = 100 } = req.query;

  logger.info(`Getting events for domain: ${domainName}`, { limit });

  try {
    if (!domainName) {
      res.status(400).json({
        success: false,
        error: 'Domain name is required',
        timestamp: new Date(),
      } satisfies ApiResponse<null>);
      return;
    }

    const events = await db.getEventsByDomain(domainName, Number(limit));

    const response: ApiResponse<typeof events> = {
      success: true,
      data: events,
      message: `Retrieved ${events.length} events for domain ${domainName}`,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    logger.error(`Failed to get events for domain ${domainName}:`, error);
    throw error;
  }
});

export const getEventStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.info('Getting event statistics');

  try {
    const stats = await db.getStats();

    const response: ApiResponse<{
      totalEvents: number;
      totalDomains: number;
      lastEventDate: string | null;
    }> = {
      success: true,
      data: {
        totalEvents: stats.totalEvents,
        totalDomains: stats.totalDomains,
        lastEventDate: stats.lastEventDate,
      },
      message: 'Event statistics retrieved successfully',
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get event statistics:', error);
    throw error;
  }
});

export const healthCheck = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  logger.info('Health check requested');

  try {
    // Check DOMA API health
    const domaApiHealthy = await domaService.healthCheck();
    
    // Check database health
    const dbStats = await db.getStats();
    const dbHealthy = dbStats.totalEvents >= 0; // Simple check

    const healthStatus = {
      status: domaApiHealthy && dbHealthy ? 'healthy' : 'unhealthy',
      services: {
        domaApi: domaApiHealthy ? 'healthy' : 'unhealthy',
        database: dbHealthy ? 'healthy' : 'unhealthy',
      },
      timestamp: new Date(),
      uptime: process.uptime(),
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    const response: ApiResponse<typeof healthStatus> = {
      success: healthStatus.status === 'healthy',
      data: healthStatus,
      message: `Service is ${healthStatus.status}`,
      timestamp: new Date(),
    };

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Health check failed:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'Health check failed',
      timestamp: new Date(),
    };

    res.status(503).json(response);
  }
});
