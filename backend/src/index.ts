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
    // Security middleware
    this.app.use(helmet());

    // CORS configuration
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
      optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
    }));

    // Handle preflight requests
    this.app.options('*', (req, res) => {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Api-Key, X-Requested-With');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.sendStatus(200);
    });

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
    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({
        success: true,
        message: 'SearchTrend Scorer API is running',
        timestamp: new Date(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        version: '1.0.0',
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
