const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/avapharmacy/api/v1').replace(/\/$/, '')

export interface AdminLabDocumentApi {
  id?: number
  name?: string
  file?: string
  status?: string
  uploaded_at?: string
}

export interface AdminLabTechnicianApi {
  id?: number
  user?: number | null
  user_name?: string
  user_email?: string
  user_phone?: string
  name?: string
  email?: string
  phone?: string
  partner?: number | null
  specialty?: string
  license_number?: string
  license_board?: string
  license_country?: string
  license_expiry?: string | null
  id_number?: string
  availability?: string
  years_experience?: number | null
  county?: string
  address?: string
  bio?: string
  references?: Array<Record<string, unknown>>
  document_checklist?: string[]
  payout_method?: string
  payout_account?: string
  background_consent?: boolean
  compliance_declaration?: boolean
  agreed_to_terms?: boolean
  status?: string
  status_note?: string
  rejection_note?: string
  submitted_at?: string | null
  created_at?: string
  updated_at?: string
  documents?: AdminLabDocumentApi[]
}

export interface AdminLabPartnerApi {
  id?: number
  reference?: string
  user?: number | null
  user_email?: string
  name?: string
  email?: string
  phone?: string
  location?: string
  contact_name?: string
  accreditation?: string
  license_number?: string
  license_expiry?: string | null
  id_number?: string
  county?: string
  address?: string
  years_in_operation?: number | null
  references?: Array<Record<string, unknown>>
  document_checklist?: string[]
  payout_method?: string
  payout_account?: string
  background_consent?: boolean
  compliance_declaration?: boolean
  agreed_to_terms?: boolean
  status?: string
  status_note?: string
  rejection_note?: string
  notes?: string
  submitted_at?: string
  created_at?: string
  updated_at?: string
  verified_at?: string | null
  documents?: AdminLabDocumentApi[]
  technicians?: AdminLabTechnicianApi[]
}

export type LabPartnerAction = 'verify' | 'request_docs' | 'reject' | 'suspend'
export type LabTechnicianAction = 'approve' | 'request_docs' | 'reject'

export interface AdminLabPartnerCreatePayload {
  name: string
  email: string
  phone: string
  location?: string
  contact_name?: string
  accreditation?: string
  license_number?: string
  payout_method?: 'mpesa' | 'bank_transfer'
  payout_account?: string
  notes?: string
}

export interface AdminLabPartnerUpdatePayload {
  status?: 'pending' | 'verified' | 'suspended'
  payout_method?: 'mpesa' | 'bank_transfer'
  payout_account?: string
  notes?: string
}

export interface AdminLabTechnicianCreatePayload {
  name: string
  email: string
  phone?: string
  specialty?: string
  payout_method?: 'mpesa' | 'bank_transfer'
  payout_account?: string
}

export class AdminLabPartnerError extends Error {
  fieldErrors: Record<string, string>

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'AdminLabPartnerError'
    this.fieldErrors = fieldErrors
  }
}

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}
  const token =
    window.localStorage.getItem('ava_access_token') ||
    window.localStorage.getItem('access_token') ||
    window.localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const extractFieldErrors = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return {}

  const asRecord = payload as Record<string, unknown>
  return Object.entries(asRecord).reduce<Record<string, string>>((acc, [key, value]) => {
    if (key === 'detail' || key === 'error' || key === 'message') return acc
    if (Array.isArray(value) && value.length > 0) {
      acc[key] = String(value[0])
    } else if (typeof value === 'string') {
      acc[key] = value
    }
    return acc
  }, {})
}

const extractMessage = (payload: unknown, fallback: string) => {
  if (!payload || typeof payload !== 'object') return fallback
  const asRecord = payload as Record<string, unknown>
  if (typeof asRecord.detail === 'string') return asRecord.detail
  if (typeof asRecord.message === 'string') return asRecord.message
  return fallback
}

const handleResponse = async <T,>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => null)
  if (response.ok) return payload as T
  throw new AdminLabPartnerError(
    extractMessage(payload, 'Request failed.'),
    extractFieldErrors(payload),
  )
}

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
  ...getAuthHeaders(),
})

export const adminLabPartnerService = {
  async listPartners() {
    const response = await fetch(`${API_BASE_URL}/admin/lab/partners/`, {
      headers: { ...getAuthHeaders() },
    })
    const payload = await handleResponse<AdminLabPartnerApi[] | { results?: AdminLabPartnerApi[] }>(response)
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object' && Array.isArray(payload.results)) return payload.results
    return []
  },

  async createPartner(payload: AdminLabPartnerCreatePayload) {
    const response = await fetch(`${API_BASE_URL}/admin/lab/partners/`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    })
    return handleResponse<AdminLabPartnerApi>(response)
  },

  async updatePartner(id: number | string, payload: AdminLabPartnerUpdatePayload) {
    const response = await fetch(`${API_BASE_URL}/admin/lab/partners/${id}/`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    })
    return handleResponse<AdminLabPartnerApi>(response)
  },

  async actionPartner(id: number | string, payload: { action: LabPartnerAction; note?: string }) {
    const response = await fetch(`${API_BASE_URL}/admin/lab/partners/${id}/action/`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    })
    return handleResponse<AdminLabPartnerApi>(response)
  },

  async provisionPartnerAccount(id: number | string) {
    const response = await fetch(`${API_BASE_URL}/admin/lab/partners/${id}/provision-account/`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    })
    return handleResponse<{
      detail: string
      application: AdminLabPartnerApi
      user?: { id?: number; email?: string }
      activation_email?: { sent_to?: string; expires_at?: string }
    }>(response)
  },

  async createTechnician(partnerId: number | string, payload: AdminLabTechnicianCreatePayload) {
    const response = await fetch(`${API_BASE_URL}/admin/lab/partners/${partnerId}/technicians/`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    })
    return handleResponse<AdminLabTechnicianApi>(response)
  },

  async actionTechnician(id: number | string, payload: { action: LabTechnicianAction; note?: string }) {
    const response = await fetch(`${API_BASE_URL}/admin/lab/technicians/${id}/action/`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    })
    return handleResponse<AdminLabTechnicianApi>(response)
  },

  async provisionTechnicianAccount(id: number | string) {
    const response = await fetch(`${API_BASE_URL}/admin/lab/technicians/${id}/provision-account/`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    })
    return handleResponse<{
      detail: string
      application: AdminLabTechnicianApi
      user?: { id?: number; email?: string }
      activation_email?: { sent_to?: string; expires_at?: string }
    }>(response)
  },
}
