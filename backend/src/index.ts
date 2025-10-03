import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from '@/config';
import logger from '@/utils/logger';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import routes from '@/routes';
import { pollingService } from '@/services/pollingService';

class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // CORS configuration - MUST be first
    this.app.use(cors({
      origin: [
        'https://searchtrend-scorer.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173',
        process.env['CORS_ORIGIN'] || '*'
      ].filter(Boolean),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Api-Key', 'X-Requested-With'],
      credentials: true,
      optionsSuccessStatus: 200,
    }));

    // Simple CORS middleware
    this.app.use((req, res, next) => {
      const allowedOrigins = [
        'https://searchtrend-scorer.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173'
      ];
      
      const origin = req.headers.origin;
      if (allowedOrigins.includes(origin as string)) {
        res.header('Access-Control-Allow-Origin', origin);
      } else {
        res.header('Access-Control-Allow-Origin', '*');
      }
      
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Api-Key, X-Requested-With');
      res.header('Access-Control-Allow-Credentials', 'true');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }
      
      next();
    });

    // Security middleware
    this.app.use(helmet());

    // Body parsing middleware (before compression)
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression middleware
    // @ts-ignore - Type mismatch between compression and express versions
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        timestamp: new Date(),
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Simple request logging
    this.app.use((req, _res, next) => {
      logger.info(`${req.method} ${req.url}`, { ip: req.ip });
      next();
    });
  }

  private initializeRoutes(): void {
    // Simple health check endpoint
    this.app.get('/health', (_req, res) => {
      try {
        res.json({
          success: true,
          message: 'SearchTrend Scorer API is running',
          timestamp: new Date(),
          uptime: process.uptime(),
          environment: config.nodeEnv,
          version: '1.0.0',
        });
      } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          timestamp: new Date(),
        });
      }
    });

    // Debug endpoint
    this.app.get('/debug', (_req, res) => {
      res.json({
        success: true,
        message: 'Debug endpoint working',
        timestamp: new Date(),
        environment: process.env['NODE_ENV'],
        port: process.env['PORT'],
        corsOrigin: process.env['CORS_ORIGIN'],
      });
    });

    // API routes
    this.app.use('/', routes);
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public listen(): void {
    const port = config.port;
    
    try {
      this.app.listen(port, () => {
        logger.info(`🚀 SearchTrend Scorer API started successfully`, {
          port,
          environment: config.nodeEnv,
          version: '1.0.0',
        });

        // Start polling service
        pollingService.start();

        // Graceful shutdown handling
        process.on('SIGTERM', this.gracefulShutdown);
        process.on('SIGINT', this.gracefulShutdown);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private gracefulShutdown = (signal: string): void => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    // Stop polling service
    pollingService.stop();

    // Close database connections
    // db.close(); // Uncomment if needed

    logger.info('Graceful shutdown completed');
    process.exit(0);
  };
}

// Create and start the application
const app = new App();
app.listen();

export default app;
