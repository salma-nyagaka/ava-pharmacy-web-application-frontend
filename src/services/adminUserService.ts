const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/avapharmacy/api/v1').replace(/\/$/, '')

export interface PharmacistCreatePayload {
  name: string
  email: string
  phone: string
  address?: string
  pharmacistPermissions: string[]
}

export interface AdminUserApi {
  id: number
  first_name?: string
  last_name?: string
  name?: string
  email: string
  phone?: string
  role?: string
  status?: string
  address?: string
  pharmacist_permissions?: string[]
  created_at?: string
}

export class AdminUserError extends Error {
  fieldErrors: Record<string, string>

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'AdminUserError'
    this.fieldErrors = fieldErrors
  }
}

const extractFieldErrors = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') {
    return {}
  }

  const asRecord = payload as Record<string, unknown>
  return Object.entries(asRecord).reduce<Record<string, string>>((acc, [key, value]) => {
    if (key === 'detail' || key === 'error') {
      return acc
    }
    if (Array.isArray(value) && value.length > 0) {
      acc[key] = String(value[0])
      return acc
    }
    if (typeof value === 'string') {
      acc[key] = value
    }
    return acc
  }, {})
}

const extractMessage = (payload: unknown, fallback: string) => {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }
  const asRecord = payload as Record<string, unknown>
  if (typeof asRecord.detail === 'string') {
    return asRecord.detail
  }
  return fallback
}

const getAuthHeaders = () => {
  if (typeof window === 'undefined') return {}
  const token =
    window.localStorage.getItem('ava_access_token') ||
    window.localStorage.getItem('access_token') ||
    window.localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const handleResponse = async <T,>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => null)
  if (response.ok) return payload as T
  throw new AdminUserError(
    extractMessage(payload, 'Request failed.'),
    extractFieldErrors(payload),
  )
}

const splitName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first_name: '', last_name: '' }
  if (parts.length === 1) return { first_name: parts[0], last_name: '' }
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') }
}

export const adminUserService = {
  async listUsers() {
    const response = await fetch(`${API_BASE_URL}/admin/users/`, {
      headers: {
        ...getAuthHeaders(),
      },
    })
    const payload = await handleResponse<AdminUserApi[] | { results: AdminUserApi[] }>(response)
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object' && Array.isArray(payload.results)) return payload.results
    return []
  },

  async suspendUser(id: number) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${id}/suspend/`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
      },
    })
    return handleResponse<AdminUserApi>(response)
  },

  async activateUser(id: number) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${id}/activate/`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
      },
    })
    return handleResponse<AdminUserApi>(response)
  },

  async createPharmacist(payload: PharmacistCreatePayload) {
    const { first_name, last_name } = splitName(payload.name)
    const response = await fetch(`${API_BASE_URL}/admin/users/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        first_name,
        last_name,
        email: payload.email,
        phone: payload.phone,
        role: 'pharmacist',
        address: payload.address,
        pharmacist_permissions: payload.pharmacistPermissions,
      }),
    })
    return handleResponse<AdminUserApi>(response)
  },
}
