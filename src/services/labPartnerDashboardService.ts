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

interface ApiLaboratoryFacility {
  id?: number
  reference?: string
  name?: string
  email?: string
  phone?: string
  county?: string
  address?: string
  accreditation?: string
  license_number?: string
  license_expiry?: string | null
  supported_counties?: string[]
  operating_hours?: Record<string, string>
  home_collection_enabled?: boolean
  physical_result_pickup_enabled?: boolean
  pickup_instructions?: string
  status?: string
  status_note?: string
  is_active?: boolean
  technicians?: ApiLabTechnician[]
  offerings?: Array<{
    id?: number
    test?: number
    test_name?: string
    sample_type?: string
    price?: string | number
    turnaround?: string
    home_collection_available?: boolean
    is_active?: boolean
  }>
  documents?: Array<{ id?: number; name?: string; status?: string; download_url?: string; uploaded_at?: string }>
}

export interface LabPartnerFacility {
  id: number
  reference: string
  name: string
  email: string
  phone: string
  county: string
  address: string
  accreditation: string
  licenseNumber: string
  licenseExpiry: string | null
  supportedCounties: string[]
  operatingHours: Record<string, string>
  homeCollectionEnabled: boolean
  physicalResultPickupEnabled: boolean
  pickupInstructions: string
  status: string
  statusNote: string
  isActive: boolean
  technicianIds: number[]
  offerings: Array<{ testId: number; testName: string; price: number; turnaround: string }>
  documents: Array<{ id: number; name: string; status: string; downloadUrl: string }>
}

export interface CreateLabPartnerFacilityPayload {
  name: string
  email?: string
  phone: string
  county: string
  address: string
  accreditation?: string
  license_number: string
  license_expiry?: string | null
  supported_counties: string[]
  operating_hours?: Record<string, string>
  home_collection_enabled: boolean
  physical_result_pickup_enabled: boolean
  pickup_instructions?: string
  test_ids: number[]
  test_offerings?: Array<{
    test: number
    price: number
    turnaround: string
    home_collection_available: boolean
  }>
  technician_ids: number[]
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
    facilitiesTotal: number
    facilitiesVerified: number
    techniciansTotal: number
    techniciansActive: number
    techniciansPending: number
    requestsTotal: number
    requestsPending: number
    requestsCompleted: number
  }
  technicians: LabPartnerTechnician[]
  facilities: LabPartnerFacility[]
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

const mapFacility = (facility: ApiLaboratoryFacility): LabPartnerFacility => ({
  id: Number(facility.id ?? 0),
  reference: facility.reference || '',
  name: facility.name || 'Unnamed laboratory',
  email: facility.email || '',
  phone: facility.phone || '',
  county: facility.county || '',
  address: facility.address || '',
  accreditation: facility.accreditation || '',
  licenseNumber: facility.license_number || '',
  licenseExpiry: facility.license_expiry || null,
  supportedCounties: Array.isArray(facility.supported_counties) ? facility.supported_counties : [],
  operatingHours: facility.operating_hours || {},
  homeCollectionEnabled: Boolean(facility.home_collection_enabled),
  physicalResultPickupEnabled: Boolean(facility.physical_result_pickup_enabled),
  pickupInstructions: facility.pickup_instructions || '',
  status: facility.status || 'pending',
  statusNote: facility.status_note || '',
  isActive: facility.is_active !== false,
  technicianIds: Array.isArray(facility.technicians) ? facility.technicians.map((tech) => Number(tech.id ?? 0)) : [],
  offerings: Array.isArray(facility.offerings) ? facility.offerings.map((offering) => ({
    testId: Number(offering.test ?? 0),
    testName: offering.test_name || 'Lab test',
    price: Number(offering.price ?? 0),
    turnaround: offering.turnaround || '',
  })) : [],
  documents: Array.isArray(facility.documents) ? facility.documents.map((document) => ({
    id: Number(document.id ?? 0),
    name: document.name || 'Facility document',
    status: document.status || 'submitted',
    downloadUrl: document.download_url || '',
  })) : [],
})

const mapDashboard = (payload: { partner?: ApiLabPartner; facilities?: ApiLaboratoryFacility[]; stats?: Record<string, number>; recent_requests?: ApiLabRequest[] }): LabPartnerDashboardData => {
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
      facilitiesTotal: Number(payload.stats?.facilities_total ?? payload.facilities?.length ?? 0),
      facilitiesVerified: Number(payload.stats?.facilities_verified ?? 0),
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
    facilities: Array.isArray(payload.facilities) ? payload.facilities.map(mapFacility) : [],
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
    const payload = await handleResponse<{ partner?: ApiLabPartner; facilities?: ApiLaboratoryFacility[]; stats?: Record<string, number>; recent_requests?: ApiLabRequest[] }>(response)
    return mapDashboard(payload)
  },

  async addFacility(payload: CreateLabPartnerFacilityPayload) {
    const response = await fetch(`${API_BASE_URL}/lab/partner/facilities/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    })
    return handleResponse<ApiLaboratoryFacility>(response)
  },

  async updateFacility(id: number, payload: Partial<CreateLabPartnerFacilityPayload> & { is_active?: boolean }) {
    const response = await fetch(`${API_BASE_URL}/lab/partner/facilities/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    })
    return handleResponse<ApiLaboratoryFacility>(response)
  },

  async uploadFacilityDocument(facilityId: number, file: File, name = 'Facility licence') {
    const form = new FormData()
    form.append('name', name)
    form.append('file', file)
    const response = await fetch(`${API_BASE_URL}/lab/partner/facilities/${facilityId}/documents/`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: form,
    })
    return handleResponse(response)
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
