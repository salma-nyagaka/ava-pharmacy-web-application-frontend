import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
type ApiPayload = Record<string, unknown>

function isApiPayload(value: unknown): value is ApiPayload {
  return typeof value === 'object' && value !== null
}

function cleanMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const message = value.trim()
  return message ? message : null
}

function firstNestedMessage(value: unknown): string | null {
  const direct = cleanMessage(value)
  if (direct) return direct

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstNestedMessage(item)
      if (message) return message
    }
    return null
  }

  if (isApiPayload(value)) {
    for (const key of ['message', 'detail', 'non_field_errors']) {
      const message = firstNestedMessage(value[key])
      if (message) return message
    }

    for (const item of Object.values(value)) {
      const message = firstNestedMessage(item)
      if (message) return message
    }
  }

  return null
}

function payloadFromError(error: unknown): unknown {
  if (axios.isAxiosError(error)) {
    return error.response?.data
  }
  return error
}

function unwrapErrorPayload(payload: unknown): unknown {
  if (!isApiPayload(payload)) return payload

  const nestedError = payload.error
  if (isApiPayload(nestedError)) return nestedError

  return payload
}

function detailSources(payload: unknown): unknown[] {
  if (!isApiPayload(payload)) return []

  const error = isApiPayload(payload.error) ? payload.error : undefined
  const errors = isApiPayload(payload.errors) ? payload.errors : undefined
  const data = isApiPayload(payload.data) ? payload.data : undefined
  const errorDetails = isApiPayload(error?.details) ? error.details : undefined
  const nestedErrorDetails = isApiPayload(errorDetails?.errors) ? errorDetails.errors : undefined

  return [
    nestedErrorDetails?.details,
    errorDetails?.details,
    error?.details,
    errors?.details,
    payload.details,
    errors,
    data,
    payload,
  ].filter(Boolean)
}

function humanizeFieldName(field: string): string {
  if (field === 'non_field_errors' || field === 'detail' || field === 'message') return ''
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function extractApiFieldErrors(errorOrPayload: unknown): Record<string, string> {
  const payload = payloadFromError(errorOrPayload)
  const output: Record<string, string> = {}

  for (const source of detailSources(payload)) {
    if (!isApiPayload(source)) continue

    for (const [field, value] of Object.entries(source)) {
      if (['error', 'errors', 'data', 'detail', 'message', 'code'].includes(field)) continue
      const message = firstNestedMessage(value)
      if (message && !output[field]) output[field] = message
    }

    if (Object.keys(output).length > 0) break
  }

  return output
}

export function extractApiErrorMessage(errorOrPayload: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const payload = payloadFromError(errorOrPayload)
  const unwrapped = unwrapErrorPayload(payload)

  if (isApiPayload(unwrapped)) {
    const explicitMessage =
      firstNestedMessage(unwrapped.message)
      ?? firstNestedMessage(unwrapped.detail)
      ?? firstNestedMessage(unwrapped.error)

    if (explicitMessage) return explicitMessage
  }

  const fieldErrors = extractApiFieldErrors(payload)
  const fieldMessages = Object.entries(fieldErrors)
    .map(([field, message]) => {
      const label = humanizeFieldName(field)
      return label ? `${label}: ${message}` : message
    })

  if (fieldMessages.length > 0) return fieldMessages.join(' ')

  const nestedMessage = firstNestedMessage(payload)
  if (nestedMessage) return nestedMessage

  if (axios.isAxiosError(errorOrPayload)) {
    if (errorOrPayload.response?.status === 401) return 'Your session has expired. Please sign in again.'
    if (errorOrPayload.message === 'Network Error') return 'We could not reach the server. Check your connection and try again.'
  }

  if (errorOrPayload instanceof Error && errorOrPayload.message.trim()) {
    return errorOrPayload.message.trim()
  }

  return fallback
}

function normalizeToken(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const token = value.trim()
  if (!token || token === 'undefined' || token === 'null') return null
  return token
}

function pickToken(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    const token = normalizeToken(candidate)
    if (token) return token
  }
  return null
}

export function extractAuthTokens(payload: unknown): { access: string | null; refresh: string | null } {
  const root = isApiPayload(payload) ? payload : {}
  const nestedData = isApiPayload(root['data']) ? root['data'] : {}
  const nestedTokens = isApiPayload(root['tokens']) ? root['tokens'] : {}
  const nestedDataTokens = isApiPayload(nestedData['tokens']) ? nestedData['tokens'] : {}

  return {
    access: pickToken(
      root['access'],
      root['access_token'],
      nestedTokens['access'],
      nestedTokens['access_token'],
      nestedData['access'],
      nestedData['access_token'],
      nestedDataTokens['access'],
      nestedDataTokens['access_token'],
    ),
    refresh: pickToken(
      root['refresh'],
      root['refresh_token'],
      nestedTokens['refresh'],
      nestedTokens['refresh_token'],
      nestedData['refresh'],
      nestedData['refresh_token'],
      nestedDataTokens['refresh'],
      nestedDataTokens['refresh_token'],
    ),
  }
}


export function getApiOrigin(): string {
  try {
    return new URL(BASE_URL).origin
  } catch {
    if (typeof window !== 'undefined') return window.location.origin
    return ''
  }
}

export function resolveMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed
  }
  const origin = getApiOrigin()
  if (!origin) return trimmed
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData && config.headers) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type')
    } else {
      delete (config.headers as Record<string, unknown>)['Content-Type']
    }
  }

  const token = localStorage.getItem('ava_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401 try a token refresh; on failure clear session and redirect
let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token as string)
    }
  })
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    const hadAccessToken = !!localStorage.getItem('ava_access_token')
    if (error.response?.status === 401 && !originalRequest._retry && hadAccessToken) {
      const refreshToken = localStorage.getItem('ava_refresh_token')
      if (!refreshToken) {
        clearSession()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return apiClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const newAccess = await refreshAccessToken(refreshToken)
        processQueue(null, newAccess)
        originalRequest.headers.Authorization = `Bearer ${newAccess}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearSession()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

function clearSession() {
  localStorage.removeItem('ava_access_token')
  localStorage.removeItem('ava_refresh_token')
  localStorage.removeItem('ava_user')
  window.dispatchEvent(new Event('ava:session-expired'))
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const currentRefreshToken = normalizeToken(refreshToken)
  if (!currentRefreshToken) {
    clearSession()
    throw new Error('Missing refresh token')
  }

  try {
    const res = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh: currentRefreshToken })
    const data = res.data?.data ?? res.data
    const { access, refresh } = extractAuthTokens(data)

    if (!access) {
      throw new Error('Refresh response did not include an access token')
    }

    saveTokens(access, refresh ?? currentRefreshToken)
    return access
  } catch (error) {
    clearSession()
    throw error
  }
}

export function saveTokens(access: string | null | undefined, refresh: string | null | undefined) {
  const nextAccess = normalizeToken(access)
  const nextRefresh = normalizeToken(refresh)

  if (nextAccess) localStorage.setItem('ava_access_token', nextAccess)
  else localStorage.removeItem('ava_access_token')

  if (nextRefresh) localStorage.setItem('ava_refresh_token', nextRefresh)
  else localStorage.removeItem('ava_refresh_token')
}

export function clearTokens() {
  localStorage.removeItem('ava_access_token')
  localStorage.removeItem('ava_refresh_token')
}
