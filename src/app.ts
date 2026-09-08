import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { config } from './app/config';
import { globalLimiter } from './app/middleware/rateLimiter';
import globalErrorHandler from './app/middleware/globalErrorHandler';
import notFound from './app/middleware/notFound';
import routes from './app/routes';

const app: Application = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: [config.stripe.client_url, 'http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  }),
);

// Logging & Rate Limiting
if (config.env === 'development') {
  app.use(morgan('dev'));
}
app.use(globalLimiter);

// Parsers
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to DevJudge API - Developer Assessment & Coding Platform',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Application Routes
app.use('/api/v1', routes);

// Error Handlers
app.use(globalErrorHandler);
app.use(notFound);

export default app;
