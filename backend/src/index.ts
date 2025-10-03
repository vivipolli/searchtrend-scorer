import express from 'express';
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
    // Simple CORS middleware - MUST be first
    this.app.use((req, res, next) => {
      console.log('🔍 CORS Middleware - Origin:', req.headers.origin);
      console.log('🔍 CORS Middleware - Method:', req.method);
      console.log('🔍 CORS Middleware - URL:', req.url);
      
      const origin = req.headers.origin;
      
      // Allow specific origins
      if (origin === 'https://searchtrend-scorer.vercel.app' || 
          origin === 'http://localhost:3000' || 
          origin === 'http://localhost:5173') {
        res.header('Access-Control-Allow-Origin', origin);
        console.log('✅ CORS - Allowed origin:', origin);
      } else {
        res.header('Access-Control-Allow-Origin', '*');
        console.log('✅ CORS - Wildcard origin');
      }
      
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Api-Key, X-Requested-With, Accept, Origin');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400'); // 24 hours
      
      console.log('✅ CORS Headers set');
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        console.log('✅ CORS - Handling OPTIONS preflight');
        res.status(200).end();
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
    this.app.get('/health', (req, res) => {
      console.log('🔍 Health endpoint called - Origin:', req.headers.origin);
      console.log('🔍 Health endpoint - Headers:', req.headers);
      
      try {
        const response = {
          success: true,
          message: 'SearchTrend Scorer API is running',
          timestamp: new Date(),
          uptime: process.uptime(),
          environment: process.env['NODE_ENV'] || 'development',
          version: '1.0.0',
        };
        
        console.log('✅ Health response:', response);
        res.json(response);
      } catch (error) {
        console.error('❌ Health check error:', error);
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

    // CORS test endpoint
    this.app.get('/cors-test', (req, res) => {
      res.json({
        success: true,
        message: 'CORS test successful',
        origin: req.headers.origin,
        timestamp: new Date(),
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
    
    console.log('🚀 Starting server on port:', port);
    console.log('🚀 Environment:', config.nodeEnv);
    
    try {
      this.app.listen(port, () => {
        console.log(`🚀 SearchTrend Scorer API started successfully on port ${port}`);
        console.log(`🚀 Environment: ${config.nodeEnv}`);
        console.log(`🚀 Version: 1.0.0`);

        // Start polling service
        pollingService.start();

        // Graceful shutdown handling
        process.on('SIGTERM', this.gracefulShutdown);
        process.on('SIGINT', this.gracefulShutdown);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
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
console.log('🚀 Creating App instance...');
const app = new App();
console.log('🚀 App instance created, starting server...');
app.listen();

export default app;
