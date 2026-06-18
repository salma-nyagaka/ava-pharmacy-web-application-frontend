const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/avapharmacy/api/v1').replace(/\/$/, '')

export interface PharmacistCreatePayload {
  firstName: string
  lastName: string
  email: string
  phone: string
  licenseNumber: string
  branchLocation: string
  position: string
  address?: string
  pharmacistPermissions: string[]
}

export interface AdminUserApi {
  id: number
  first_name?: string
  last_name?: string
  full_name?: string
  name?: string
  email: string
  phone?: string
  role?: string
  status?: string
  is_active?: boolean
  address?: string
  pharmacist_permissions?: string[]
  pharmacist_license_number?: string
  pharmacist_branch_location?: string
  pharmacist_position?: string
  created_at?: string
  date_joined?: string
  total_orders?: number
  last_order_date?: string | null
  total_spend?: string | number
  recent_orders?: Array<{
    id: number
    order_number: string
    status: string
    payment_status: string
    total: string
    created_at: string
  }>
}

export interface AdminUserUpdatePayload {
  email?: string
  password?: string
  phone?: string
  address?: string
}

export class AdminUserError extends Error {
  fieldErrors: Record<string, string>

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'AdminUserError'
    this.fieldErrors = fieldErrors
  }
}

const stringifyErrorValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.map(stringifyErrorValue).filter(Boolean).join('\n')
  }
  if (typeof value === 'string') {
    return value
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.detail === 'string') return record.detail
    if (typeof record.message === 'string') return record.message
    if (typeof record.error === 'string') return record.error
  }
  return ''
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
)

const getErrorRecord = (payload: unknown): Record<string, unknown> | null => {
  if (!isObjectRecord(payload)) {
    return null
  }

  const asRecord = payload
  if (isObjectRecord(asRecord.error)) {
    if (isObjectRecord(asRecord.error.details)) {
      return asRecord.error.details
    }
    if (isObjectRecord(asRecord.error.errors)) {
      return asRecord.error.errors
    }
    return asRecord.error
  }
  if (isObjectRecord(asRecord.errors)) {
    if (isObjectRecord(asRecord.errors.details)) {
      return asRecord.errors.details
    }
    return asRecord.errors
  }
  if (isObjectRecord(asRecord.detail)) {
    return asRecord.detail
  }
  if (isObjectRecord(asRecord.data)) {
    return asRecord.data
  }
  return asRecord
}

const extractFieldErrors = (payload: unknown) => {
  const record = getErrorRecord(payload)
  if (!record) return {}

  return Object.entries(record).reduce<Record<string, string>>((acc, [key, value]) => {
    if (key === 'code' || key === 'detail' || key === 'error' || key === 'message') {
      return acc
    }
    const message = stringifyErrorValue(value)
    if (message) {
      acc[key] = message
    }
    return acc
  }, {})
}

const extractMessage = (payload: unknown, fallback: string) => {
  if (!isObjectRecord(payload)) {
    return fallback
  }
  const asRecord = payload
  if (isObjectRecord(asRecord.error)) {
    if (typeof asRecord.error.message === 'string') {
      return asRecord.error.message
    }
    if (Array.isArray(asRecord.error.message)) {
      return stringifyErrorValue(asRecord.error.message) || fallback
    }
    if (typeof asRecord.error.detail === 'string') {
      return asRecord.error.detail
    }
    if (Array.isArray(asRecord.error.detail)) {
      return stringifyErrorValue(asRecord.error.detail) || fallback
    }
    return stringifyErrorValue(asRecord.error.details) || fallback
  }
  if (isObjectRecord(asRecord.errors)) {
    if (typeof asRecord.errors.message === 'string') {
      return asRecord.errors.message
    }
    return stringifyErrorValue(asRecord.errors.details) || fallback
  }
  if (typeof asRecord.detail === 'string') {
    return asRecord.detail
  }
  if (Array.isArray(asRecord.detail)) {
    return stringifyErrorValue(asRecord.detail) || fallback
  }
  if (typeof asRecord.error === 'string') {
    return asRecord.error
  }
  if (Array.isArray(asRecord.error)) {
    return stringifyErrorValue(asRecord.error) || fallback
  }
  if (typeof asRecord.message === 'string') {
    return asRecord.message
  }
  if (Array.isArray(asRecord.message)) {
    return stringifyErrorValue(asRecord.message) || fallback
  }
  if (Array.isArray(asRecord.non_field_errors)) {
    return stringifyErrorValue(asRecord.non_field_errors) || fallback
  }
  return fallback
}

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}
  const token =
    window.localStorage.getItem('ava_access_token') ||
    window.localStorage.getItem('access_token') ||
    window.localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const normalizeAdminUsersPayload = (payload: unknown): AdminUserApi[] => {
  if (Array.isArray(payload)) return payload as AdminUserApi[]
  if (!payload || typeof payload !== 'object') return []

  const record = payload as Record<string, unknown>
  if (Array.isArray(record.results)) return record.results as AdminUserApi[]
  if (Array.isArray(record.data)) return record.data as AdminUserApi[]
  if (record.data && typeof record.data === 'object' && Array.isArray((record.data as Record<string, unknown>).results)) {
    return (record.data as Record<string, unknown>).results as AdminUserApi[]
  }
  return []
}

const normalizeAdminUserPayload = (payload: unknown): AdminUserApi => {
  if (!payload || typeof payload !== 'object') {
    throw new AdminUserError('Invalid user payload.')
  }
  const record = payload as Record<string, unknown>
  if (record.user && typeof record.user === 'object') return record.user as AdminUserApi
  if (record.data && typeof record.data === 'object' && !Array.isArray(record.data)) return record.data as AdminUserApi
  return record as unknown as AdminUserApi
}

const handleResponse = async <T,>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => null)
  if (response.ok) return payload as T
  throw new AdminUserError(
    extractMessage(payload, 'Request failed.'),
    extractFieldErrors(payload),
  )
}

export const adminUserService = {
  async listUsers() {
    const response = await fetch(`${API_BASE_URL}/admin/users/`, {
      headers: {
        ...getAuthHeaders(),
      },
    })
    const payload = await handleResponse<unknown>(response)
    return normalizeAdminUsersPayload(payload)
  },

  async getUser(id: number) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${id}/`, {
      headers: {
        ...getAuthHeaders(),
      },
    })
    const responsePayload = await handleResponse<unknown>(response)
    return normalizeAdminUserPayload(responsePayload)
  },

  async updateUser(id: number, payload: AdminUserUpdatePayload) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    })
    const body = await handleResponse<unknown>(response)
    return normalizeAdminUserPayload(body)
  },

  async suspendUser(id: number) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${id}/suspend/`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
      },
    })
    const payload = await handleResponse<unknown>(response)
    return normalizeAdminUserPayload(payload)
  },

  async activateUser(id: number) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${id}/activate/`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
      },
    })
    const payload = await handleResponse<unknown>(response)
    return normalizeAdminUserPayload(payload)
  },

  async createPharmacist(payload: PharmacistCreatePayload) {
    const response = await fetch(`${API_BASE_URL}/admin/users/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        first_name: payload.firstName,
        last_name: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        role: 'pharmacist',
        address: payload.address || payload.branchLocation,
        pharmacist_license_number: payload.licenseNumber,
        pharmacist_branch_location: payload.branchLocation,
        pharmacist_position: payload.position,
        pharmacist_permissions: payload.pharmacistPermissions,
      }),
    })
    const responsePayload = await handleResponse<unknown>(response)
    return normalizeAdminUserPayload(responsePayload)
  },

  async resendActivation(id: number) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${id}/resend-activation/`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    })
    return handleResponse<{ detail: string }>(response)
  },

  async activateStaffPassword(payload: { token: string; new_password: string; new_password_confirm: string; accepted_terms: boolean }) {
    const response = await fetch(`${API_BASE_URL}/auth/professional/activate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return handleResponse<{ detail: string }>(response)
  },
}
