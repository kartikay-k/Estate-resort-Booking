/** Shared API contract types — kept in sync with server DTOs. */

export interface HealthCheckResponse {
  status: string
  service: string
  version: string
  environment: string
  uptimeSeconds: number
  timestamp: string
  database: {
    state: string
    name?: string
    host?: string
  }
}

/** Every API response is wrapped in this envelope. */
export interface ApiSuccess<T> {
  success: true
  message: string | null
  data: T
}

export interface ApiFailure {
  success: false
  message: string
  details?: unknown
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure
