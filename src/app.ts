import express, { NextFunction, type Application, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { config } from "./app/config";
import { globalLimiter } from "./app/middleware/rateLimiter";
import globalErrorHandler from "./app/middleware/globalErrorHandler";
import notFound from "./app/middleware/notFound";
import routes from "./app/routes";

const app: Application = express();

// Security Middlewares
app.use(helmet());
const allowedOrigins = [
  config.stripe.client_url,
  "https://devjudgelivecoding.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.startsWith("http://localhost:")
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);

// Logging & Rate Limiting
if (config.env === "development") {
  app.use(morgan("dev"));
}
app.use(globalLimiter);

// Parsers
app.use(cookieParser());
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.originalUrl === "/api/v1/payments/webhook") next();
  else express.json()(req, res, next);
});
app.use(express.urlencoded({ extended: true }));

// Root health check endpoint
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Welcome to DevJudge API - Developer Assessment & Coding Platform",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Application Routes
app.use("/api/v1", routes);

// Error Handlers
app.use(globalErrorHandler);
app.use(notFound);

export default app;
