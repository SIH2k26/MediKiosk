import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { router } from './routes';
import { openApiSpec } from './docs/openapi';

export function createApp(): Application {
  const app = express();

  // -------------------------------------------------------------------------
  // Security Middleware
  // -------------------------------------------------------------------------
  app.use(helmet());

  app.use(
    cors({
      origin: [
        process.env.KIOSK_URL ?? 'http://localhost:3000',
        process.env.DOCTOR_URL ?? 'http://localhost:3001',
        process.env.ADMIN_URL ?? 'http://localhost:3002',
      ],
      credentials: true,
    })
  );

  // Rate limiting — 100 requests per minute per IP
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
  });
  app.use('/api', limiter);

  // -------------------------------------------------------------------------
  // Parsing Middleware
  // -------------------------------------------------------------------------
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // -------------------------------------------------------------------------
  // Logging
  // -------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }
  app.use(requestLogger);

  // -------------------------------------------------------------------------
  // Health Check
  // -------------------------------------------------------------------------
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'medikiosk-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'development',
    });
  });

  // -------------------------------------------------------------------------
  // API Documentation (Swagger UI)
  // -------------------------------------------------------------------------
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.get('/api/openapi.json', (_req, res) => res.json(openApiSpec));

  // -------------------------------------------------------------------------
  // API Routes
  // -------------------------------------------------------------------------
  app.use('/api', router);

  // -------------------------------------------------------------------------
  // Error Handling (must be last)
  // -------------------------------------------------------------------------
  app.use(errorHandler);

  return app;
}
