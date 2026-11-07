import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'
import type { ApiEnvelope, HealthCheckResponse } from '../types/api'

export type HealthStatus = 'checking' | 'online' | 'offline'

export interface HealthState {
  status: HealthStatus
  health: HealthCheckResponse | null
  error: string | null
  refresh: () => void
}

/**
 * Live health of the API, shown on the home page until real
 * features (Phase 2+) replace it. Manual refresh via `refresh()`.
 */
export function useHealth(): HealthState {
  const [status, setStatus] = useState<HealthStatus>('checking')
  const [health, setHealth] = useState<HealthCheckResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('checking')

    api
      .get<ApiEnvelope<HealthCheckResponse>>('/health')
      .then((res) => {
        if (cancelled) return
        const body = res.data
        if (body.success) {
          setHealth(body.data)
          setError(null)
          setStatus('online')
        } else {
          throw new Error(body.message || 'API returned an error')
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Request failed')
        setStatus('offline')
      })

    return () => {
      cancelled = true
    }
  }, [tick])

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  return { status, health, error, refresh }
}
