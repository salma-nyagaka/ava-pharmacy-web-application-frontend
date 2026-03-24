const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/avapharmacy/api/v1').replace(/\/$/, '')

interface ApiLabDocument {
  id?: number
  name?: string
  file?: string
}

interface ApiLabTechnician {
  id?: number
  user?: number | null
  user_email?: string
  name?: string
  email?: string
  phone?: string
  status?: string
  specialty?: string
  status_note?: string
  rejection_note?: string
}

interface ApiLabPartner {
  id?: number
  reference?: string
  name?: string
  email?: string
  phone?: string
  location?: string
  contact_name?: string
  accreditation?: string
  license_number?: string
  status?: string
  status_note?: string
  rejection_note?: string
  payout_method?: string
  payout_account?: string
  documents?: ApiLabDocument[]
  technicians?: ApiLabTechnician[]
}

interface ApiLabRequest {
  id?: number
  reference?: string
  patient_name?: string
  test_name?: string
  status?: string
  requested_at?: string
  technician_name?: string
}

export interface LabPartnerTechnician {
  id: number
  name: string
  email: string
  phone: string
  specialty: string
  status: 'Active' | 'Pending' | 'Suspended'
  accountProvisioned: boolean
  note: string
}

export interface LabPartnerDashboardData {
  partner: {
    id: number
    name: string
    reference: string
    contactName: string
    email: string
    phone: string
    location: string
    accreditation: string
    licenseNumber: string
    payoutMethod: 'M-Pesa' | 'Bank Transfer'
    payoutAccount: string
    status: string
    statusNote: string
    rejectionNote: string
    documents: string[]
  }
  stats: {
    techniciansTotal: number
    techniciansActive: number
    techniciansPending: number
    requestsTotal: number
    requestsPending: number
    requestsCompleted: number
  }
  technicians: LabPartnerTechnician[]
  recentRequests: Array<{
    id: number
    reference: string
    patientName: string
    testName: string
    technicianName: string
    status: string
    requestedAt: string
  }>
}

export class LabPartnerDashboardError extends Error {
  fieldErrors: Record<string, string>

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'LabPartnerDashboardError'
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
    if (key === 'detail' || key === 'message') return acc
    if (Array.isArray(value) && value.length > 0) acc[key] = String(value[0])
    else if (typeof value === 'string') acc[key] = value
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
  throw new LabPartnerDashboardError(extractMessage(payload, 'Request failed.'), extractFieldErrors(payload))
}

const toStatus = (value?: string): 'Active' | 'Pending' | 'Suspended' => {
  const normalized = (value || '').toLowerCase()
  if (normalized === 'active') return 'Active'
  if (normalized === 'suspended') return 'Suspended'
  return 'Pending'
}

const formatDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })
}

const mapDashboard = (payload: { partner?: ApiLabPartner; stats?: Record<string, number>; recent_requests?: ApiLabRequest[] }): LabPartnerDashboardData => {
  const partner = payload.partner ?? {}
  const techniciansRaw = Array.isArray(partner.technicians) ? partner.technicians : []
  return {
    partner: {
      id: Number(partner.id ?? 0),
      name: partner.name || 'Lab Partner',
      reference: partner.reference || '',
      contactName: partner.contact_name || '',
      email: partner.email || '',
      phone: partner.phone || '',
      location: partner.location || '',
      accreditation: partner.accreditation || '',
      licenseNumber: partner.license_number || '',
      payoutMethod: partner.payout_method === 'bank_transfer' ? 'Bank Transfer' : 'M-Pesa',
      payoutAccount: partner.payout_account || '',
      status: partner.status || '',
      statusNote: partner.status_note || '',
      rejectionNote: partner.rejection_note || '',
      documents: Array.isArray(partner.documents) ? partner.documents.map((doc) => doc.name || 'Document') : [],
    },
    stats: {
      techniciansTotal: Number(payload.stats?.technicians_total ?? techniciansRaw.length),
      techniciansActive: Number(payload.stats?.technicians_active ?? 0),
      techniciansPending: Number(payload.stats?.technicians_pending ?? 0),
      requestsTotal: Number(payload.stats?.requests_total ?? 0),
      requestsPending: Number(payload.stats?.requests_pending ?? 0),
      requestsCompleted: Number(payload.stats?.requests_completed ?? 0),
    },
    technicians: techniciansRaw.map((tech) => ({
      id: Number(tech.id ?? 0),
      name: tech.name || 'Unnamed technician',
      email: tech.email || tech.user_email || '',
      phone: tech.phone || '',
      specialty: tech.specialty || '',
      status: toStatus(tech.status),
      accountProvisioned: Boolean(tech.user || tech.user_email),
      note: tech.status_note || tech.rejection_note || '',
    })),
    recentRequests: Array.isArray(payload.recent_requests)
      ? payload.recent_requests.map((item) => ({
          id: Number(item.id ?? 0),
          reference: item.reference || '',
          patientName: item.patient_name || '—',
          testName: item.test_name || '—',
          technicianName: item.technician_name || 'Unassigned',
          status: item.status || '—',
          requestedAt: formatDate(item.requested_at),
        }))
      : [],
  }
}

export const labPartnerDashboardService = {
  async getDashboard() {
    const response = await fetch(`${API_BASE_URL}/lab/partner/dashboard/`, { headers: { ...getAuthHeaders() } })
    const payload = await handleResponse<{ partner?: ApiLabPartner; stats?: Record<string, number>; recent_requests?: ApiLabRequest[] }>(response)
    return mapDashboard(payload)
  },

  async addTechnician(payload: { name: string; email: string; phone?: string; specialty?: string }) {
    const response = await fetch(`${API_BASE_URL}/lab/partner/technicians/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    })
    return handleResponse(response)
  },

  async provisionTechnician(id: number) {
    const response = await fetch(`${API_BASE_URL}/lab/partner/technicians/${id}/provision-account/`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    })
    return handleResponse<{ detail: string; activation_email?: { sent_to?: string } }>(response)
  },

  async setTechnicianStatus(id: number, action: 'activate' | 'suspend', note?: string) {
    const response = await fetch(`${API_BASE_URL}/lab/partner/technicians/${id}/action/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(note ? { action, note } : { action }),
    })
    return handleResponse(response)
  },
}
