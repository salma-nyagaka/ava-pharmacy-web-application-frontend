import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
type ApiPayload = Record<string, unknown>

function isApiPayload(value: unknown): value is ApiPayload {
  return typeof value === 'object' && value !== null
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

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
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
