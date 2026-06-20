const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/avapharmacy/api/v1').replace(/\/$/, '')

export interface AdminDoctorApi {
  id?: number | string
  name?: string
  first_name?: string
  last_name?: string
  full_name?: string
  reference?: string
  application_id?: number | string
  uuid?: string
  email?: string
  phone?: string
  type?: string
  registration_type?: string
  professional_type?: string
  specialty?: string
  license_number?: string
  license?: string
  facility?: string
  status?: string
  application_status?: string
  state?: string
  submitted_at?: string
  created_at?: string
  updated_at?: string
  fee?: number | string
  consult_fee?: number | string
  commission?: number | string
  rating?: number | string
  availability?: string
  languages?: string[] | string
  doc_checklist?: string[] | string
  documents?: Array<{ name?: string; status?: string; note?: string; file?: string } | string>
  status_note?: string
  rejection_note?: string
  note?: string
  [key: string]: unknown
}

export interface AdminNotificationApi {
  id: number | string
  type?: string
  title?: string
  message?: string
  data?: Record<string, unknown>
  is_read?: boolean
  created_at?: string
}

export type DoctorAction = 'approve' | 'request_docs' | 'reject'
export type AdminProfessionalType = 'Doctor' | 'Pediatrician'

export class AdminDoctorError extends Error {
  fieldErrors: Record<string, string>

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'AdminDoctorError'
    this.fieldErrors = fieldErrors
  }
}

const extractFieldErrors = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') {
    return {}
  }

  const asRecord = payload as Record<string, unknown>
  const details = asRecord.errors && typeof asRecord.errors === 'object'
    ? (asRecord.errors as Record<string, unknown>).details
    : undefined
  const source = details && typeof details === 'object' ? details as Record<string, unknown> : asRecord

  return Object.entries(source).reduce<Record<string, string>>((acc, [key, value]) => {
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
  if (typeof asRecord.message === 'string') {
    return asRecord.message
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

const handleResponse = async <T,>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => null)
  if (response.ok) return payload as T
  throw new AdminDoctorError(
    extractMessage(payload, 'Request failed.'),
    extractFieldErrors(payload),
  )
}

const unwrapList = <T,>(payload: T[] | { data?: T[]; results?: T[] } | null | undefined): T[] => {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data
    if (Array.isArray(payload.results)) return payload.results
  }
  return []
}

const unwrapItem = <T,>(payload: T | { data?: T } | null | undefined): T => {
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data && !Array.isArray(payload.data)) {
    return payload.data as T
  }
  return payload as T
}

export const adminDoctorService = {
  async listDoctors() {
    const response = await fetch(`${API_BASE_URL}/admin/doctors/`, {
      headers: {
        ...getAuthHeaders(),
      },
    })
    const payload = await handleResponse<AdminDoctorApi[] | { data?: AdminDoctorApi[]; results?: AdminDoctorApi[] }>(response)
    return unwrapList(payload).map((item) => ({ ...item, type: item.type ?? 'doctor' }))
  },

  async listPediatricians() {
    const response = await fetch(`${API_BASE_URL}/admin/pediatricians/`, {
      headers: {
        ...getAuthHeaders(),
      },
    })
    const payload = await handleResponse<AdminDoctorApi[] | { data?: AdminDoctorApi[]; results?: AdminDoctorApi[] }>(response)
    return unwrapList(payload).map((item) => ({ ...item, type: item.type ?? 'pediatrician' }))
  },

  async listNotifications() {
    const response = await fetch(`${API_BASE_URL}/notifications/`, {
      headers: {
        ...getAuthHeaders(),
      },
    })
    const payload = await handleResponse<AdminNotificationApi[] | { data?: AdminNotificationApi[]; results?: AdminNotificationApi[] }>(response)
    return unwrapList(payload)
  },

  async getDoctor(id: number | string, professionalType: AdminProfessionalType = 'Doctor') {
    const resource = professionalType === 'Pediatrician' ? 'pediatricians' : 'doctors'
    const response = await fetch(`${API_BASE_URL}/admin/${resource}/${id}/`, {
      headers: {
        ...getAuthHeaders(),
      },
    })
    const payload = await handleResponse<AdminDoctorApi | { data?: AdminDoctorApi }>(response)
    return { ...unwrapItem<AdminDoctorApi>(payload), type: professionalType === 'Pediatrician' ? 'pediatrician' : 'doctor' }
  },

  async updateDoctor(id: number | string, payload: Pick<AdminDoctorApi, 'consult_fee' | 'commission'>, professionalType: AdminProfessionalType = 'Doctor') {
    const resource = professionalType === 'Pediatrician' ? 'pediatricians' : 'doctors'
    const response = await fetch(`${API_BASE_URL}/admin/${resource}/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    })
    const responsePayload = await handleResponse<AdminDoctorApi | { data?: AdminDoctorApi }>(response)
    return { ...unwrapItem<AdminDoctorApi>(responsePayload), type: professionalType === 'Pediatrician' ? 'pediatrician' : 'doctor' }
  },

  async actionDoctor(id: number | string, payload: { action: DoctorAction; note?: string }, professionalType: AdminProfessionalType = 'Doctor') {
    const resource = professionalType === 'Pediatrician' ? 'pediatricians' : 'doctors'
    const response = await fetch(`${API_BASE_URL}/admin/${resource}/${id}/action/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    })
    const responsePayload = await handleResponse<AdminDoctorApi | { data?: AdminDoctorApi }>(response)
    return { ...unwrapItem<AdminDoctorApi>(responsePayload), type: professionalType === 'Pediatrician' ? 'pediatrician' : 'doctor' }
  },

  async provisionAccount(id: number | string, professionalType: AdminProfessionalType = 'Doctor') {
    const resource = professionalType === 'Pediatrician' ? 'pediatricians' : 'doctors'
    const response = await fetch(`${API_BASE_URL}/admin/${resource}/${id}/provision-account/`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
      },
    })
    const payload = await handleResponse<AdminDoctorApi | { data?: AdminDoctorApi }>(response)
    return { ...unwrapItem<AdminDoctorApi>(payload), type: professionalType === 'Pediatrician' ? 'pediatrician' : 'doctor' }
  },
}
