import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

export interface AuthRequest extends Request {
  user?: { id: string; role: 'guest' | 'reservations_staff' };
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(ApiError.unauthorized('Bearer token required'));
  try {
    const payload = jwt.verify(header.slice(7), env.jwtSecret) as jwt.JwtPayload;
    if (typeof payload.sub !== 'string' || !['guest', 'reservations_staff'].includes(String(payload.role))) {
      return next(ApiError.unauthorized('Invalid access token'));
    }
    req.user = { id: payload.sub, role: payload.role as 'guest' | 'reservations_staff' };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired access token'));
  }
}

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (req.user?.role !== 'reservations_staff') return next(ApiError.forbidden('Reservations Staff access required'));
  next();
}
