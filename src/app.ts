import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
// import config from './app/config';
// import routes from './app/routes';
// import globalErrorHandler from './app/middlewares/globalErrorHandler';
// import notFound from './app/middlewares/notFound';
// import { globalLimiter } from './app/middlewares/rateLimiter';

const app: Application = express();

// Security Middlewares
app.use(helmet());
// app.use(
//   cors({
//     origin: [config.stripe.client_url, 'http://localhost:3000', 'http://localhost:5173'],
//     credentials: true,
//   }),
// );

// Logging & Rate Limiting
// if (config.env === 'development') {
//   app.use(morgan('dev'));
// }
// app.use(globalLimiter);

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
    documentation: '/api/v1/docs',
    timestamp: new Date().toISOString(),
  });
});

// Application Routes
// app.use('/api/v1', routes);

// Error Handlers
// app.use(globalErrorHandler);
// app.use(notFound);

export default app;
