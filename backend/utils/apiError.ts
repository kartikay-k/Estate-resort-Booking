/**
 * Typed HTTP error used everywhere in the API.
 * Throw this from controllers/services and the central error
 * middleware turns it into a consistent JSON response.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Unauthorized', details?: unknown) {
    return new ApiError(401, message, details);
  }

  static forbidden(message = 'Forbidden', details?: unknown) {
    return new ApiError(403, message, details);
  }

  static notFound(message = 'Resource not found', details?: unknown) {
    return new ApiError(404, message, details);
  }

  static conflict(message = 'Conflict', details?: unknown) {
    return new ApiError(409, message, details);
  }

  static validation(message = 'Validation failed', details?: unknown) {
    return new ApiError(422, message, details);
  }

  static internal(message = 'Internal server error', details?: unknown) {
    return new ApiError(500, message, details);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message);
  }
}
