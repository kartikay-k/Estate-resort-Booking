import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from '../utils/apiError.js';

export function validate(schema: ZodType<any>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse({ body: req.body, query: req.query, params: req.params });
    if (!parsed.success) {
      next(ApiError.validation('Request validation failed', parsed.error.flatten()));
      return;
    }
    req.body = parsed.data.body ?? req.body;
    next();
  };
}
