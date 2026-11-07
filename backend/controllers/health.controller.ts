import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { databaseHealth } from '../config/db.js';
import { sendSuccess } from '../utils/apiResponse.js';

export interface HealthCheckResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  database: {
    state: string;
    name?: string;
    host?: string;
  };
}

/**
 * GET /api/health
 *
 * Proves three things at once:
 *   1. the Express server is up,
 *   2. the Axios layer of the React app can reach it,
 *   3. MongoDB connectivity state.
 */
export function getHealth(_req: Request, res: Response): void {
  sendSuccess<HealthCheckResponse>(
    res,
    200,
    {
      status: 'ok',
      service: 'estatestay-api',
      version: env.apiVersion,
      environment: env.nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: databaseHealth(),
    },
    'EstateStay API is running',
  );
}
