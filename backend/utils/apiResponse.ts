import type { Response } from 'express';

/**
 * A consistent response envelope for every API response:
 *
 *   { "success": true,  "message": string | null, "data": <payload> }
 *   { "success": false, "message": string,        "details"? : <payload> }
 *
 * The React app's Axios layer is typed against this shape.
 */

export interface ApiSuccess<T> {
  success: true;
  message: string | null;
  data: T;
}

export interface ApiFailure {
  success: false;
  message: string;
  details?: unknown;
}

export type ApiResponseBody<T> = ApiSuccess<T> | ApiFailure;

export function successEnvelope<T>(data: T, message?: string): ApiSuccess<T> {
  return { success: true, message: message ?? null, data };
}

export function failureEnvelope(message: string, details?: unknown): ApiFailure {
  return { success: false, message, ...(details !== undefined ? { details } : {}) };
}

/** Send `200`-style success responses with the envelope applied. */
export function sendSuccess<T>(
  res: Response,
  status: number,
  data: T,
  message?: string,
): void {
  res.status(status).json(successEnvelope(data, message));
}
