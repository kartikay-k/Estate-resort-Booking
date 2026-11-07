import axios from 'axios'

/**
 * Single shared Axios instance.
 *
 * - `baseURL` comes from Vite env vars (see .env / .env.example)
 * - response errors are normalized to plain `Error`s carrying the
 *   API message, so UI code can simply catch and read `.message`.
 */

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001/api'

export const api = axios.create({
  baseURL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiMessage: string | undefined = error?.response?.data?.message
    const message =
      apiMessage ??
      (error instanceof Error ? error.message : 'Unexpected error')
    return Promise.reject(new Error(message))
  },
)

export const API_BASE_URL = baseURL
