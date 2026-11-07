import type { Request, Response } from 'express';
import { failureEnvelope } from '../utils/apiResponse.js';

/**
 * 404 for unknown /api routes (mounted after the API router).
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(failureEnvelope(`Route not found: ${req.method} ${req.originalUrl}`));
}
