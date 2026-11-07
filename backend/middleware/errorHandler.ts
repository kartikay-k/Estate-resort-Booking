import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../utils/apiError.js';
import {
  failureEnvelope,
  type ApiFailure,
} from '../utils/apiResponse.js';
import { isProduction } from '../config/env.js';

interface NormalizedError {
  status: number;
  message: string;
  details?: unknown;
}

function normalize(err: unknown): NormalizedError {
  if (err instanceof ApiError) {
    return { status: err.status, message: err.message, details: err.details };
  }

  // Mongoose schema validation → 422
  if (err instanceof mongoose.Error.ValidationError) {
    return {
      status: 422,
      message: 'Validation failed',
      details: Object.fromEntries(
        Object.entries(err.errors).map(([field, e]) => [field, e.message]),
      ),
    };
  }

  // Invalid ObjectId, bad enum value, etc. → 400
  if (err instanceof mongoose.Error.CastError) {
    return {
      status: 400,
      message: `Invalid value for "${err.path}"`,
    };
  }

  // MongoDB duplicate key (unique index) → 409
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 11000
  ) {
    return {
      status: 409,
      message: 'Duplicate value',
      details: err,
    };
  }

  // Unknown errors never leak internals in production.
  const status = 500;
  const message =
    err instanceof Error && !isProduction ? err.message : 'Internal server error';
  return { status, message };
}

/**
 * Central error handler — every thrown/rejected error ends up here.
 * Keep it as the LAST middleware in app.ts.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const { status, message, details } = normalize(err);

  if (status >= 500) {
    console.error('[error]',req?.method, req?.originalUrl, '-', err);
  }

  const body: ApiFailure = failureEnvelope(message, details);
  res.status(status).json(body);
}
