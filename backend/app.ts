import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isProduction } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.disable('x-powered-by');

// ── Global middleware ────────────────────────────────────────
app.use(
  cors({
    origin: env.clientOrigins,
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(isProduction ? 'combined' : 'dev'));

// ── Root ping ────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'EstateStay API is up. See /api/health for diagnostics.',
  });
});

// ── API routes ───────────────────────────────────────────────
app.use('/api', apiRouter);

// ── 404 + central error handling (always last) ───────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
