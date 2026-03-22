import { apiClient } from '../lib/apiClient'

export type ConsultationStatus = 'waiting' | 'in_progress' | 'completed' | 'cancelled'
export type ConsultationPriority = 'routine' | 'priority'
export type ConsultationConsentStatus = 'pending' | 'granted'

export interface ClinicianSummary {
  id: number
  reference: string
  name: string
  specialty: string
  facility: string
  consultFee: number
  rating: number
  availability: string
  status: string
}

export interface ConsultationMessage {
  id: number
  sender: number | null
  senderName: string
  message: string
  sentAt: string
}

export interface ConsultationRecord {
  id: number
  reference: string
  doctor: number | null
  pediatrician: number | null
  doctorName: string
  doctorSpecialty: string
  patient: number | null
  patientName: string
  patientEmail: string
  patientPhone: string
  patientAge: number | null
  issue: string
  status: ConsultationStatus
  priority: ConsultationPriority
  channel: string
  scheduledAt: string | null
  isPediatric: boolean
  guardianName: string
  childName: string
  childAge: number | null
  weightKg: string | null
  consentStatus: ConsultationConsentStatus
  dosageAlert: boolean
  lastMessageAt: string | null
  messages: ConsultationMessage[]
  createdAt: string
  updatedAt: string
}

export interface CreateConsultationPayload {
  doctor?: number | null
  pediatrician?: number | null
  patient_name?: string
  patient_email?: string
  patient_phone?: string
  patient_age?: number | null
  issue: string
  priority?: ConsultationPriority
  scheduled_at?: string | null
  is_pediatric?: boolean
  guardian_name?: string
  child_name?: string
  child_age?: number | null
  weight_kg?: number | null
}

function unwrap<T>(value: unknown, fallback: T): T {
  if (value && typeof value === 'object' && 'data' in (value as Record<string, unknown>)) {
    return ((value as Record<string, unknown>).data as T) ?? fallback
  }
  return (value as T) ?? fallback
}

function normalizeNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapClinician(raw: Record<string, unknown>): ClinicianSummary {
  return {
    id: Number(raw.id ?? 0),
    reference: String(raw.reference ?? ''),
    name: String(raw.name ?? ''),
    specialty: String(raw.specialty ?? ''),
    facility: String(raw.facility ?? ''),
    consultFee: normalizeNumber(raw.consult_fee),
    rating: normalizeNumber(raw.rating),
    availability: String(raw.availability ?? ''),
    status: String(raw.status ?? ''),
  }
}

function mapMessage(raw: Record<string, unknown>): ConsultationMessage {
  return {
    id: Number(raw.id ?? 0),
    sender: raw.sender == null ? null : Number(raw.sender),
    senderName: String(raw.sender_name ?? ''),
    message: String(raw.message ?? ''),
    sentAt: String(raw.sent_at ?? ''),
  }
}

function mapConsultation(raw: Record<string, unknown>): ConsultationRecord {
  const messages = Array.isArray(raw.messages) ? raw.messages.map((item) => mapMessage(item as Record<string, unknown>)) : []
  return {
    id: Number(raw.id ?? 0),
    reference: String(raw.reference ?? ''),
    doctor: raw.doctor == null ? null : Number(raw.doctor),
    pediatrician: raw.pediatrician == null ? null : Number(raw.pediatrician),
    doctorName: String(raw.doctor_name ?? ''),
    doctorSpecialty: String(raw.doctor_specialty ?? ''),
    patient: raw.patient == null ? null : Number(raw.patient),
    patientName: String(raw.patient_name ?? ''),
    patientEmail: String(raw.patient_email ?? ''),
    patientPhone: String(raw.patient_phone ?? ''),
    patientAge: raw.patient_age == null ? null : Number(raw.patient_age),
    issue: String(raw.issue ?? ''),
    status: String(raw.status ?? 'waiting') as ConsultationStatus,
    priority: String(raw.priority ?? 'routine') as ConsultationPriority,
    channel: String(raw.channel ?? 'chat'),
    scheduledAt: raw.scheduled_at ? String(raw.scheduled_at) : null,
    isPediatric: Boolean(raw.is_pediatric),
    guardianName: String(raw.guardian_name ?? ''),
    childName: String(raw.child_name ?? ''),
    childAge: raw.child_age == null ? null : Number(raw.child_age),
    weightKg: raw.weight_kg == null ? null : String(raw.weight_kg),
    consentStatus: String(raw.consent_status ?? 'pending') as ConsultationConsentStatus,
    dosageAlert: Boolean(raw.dosage_alert),
    lastMessageAt: raw.last_message_at ? String(raw.last_message_at) : null,
    messages,
    createdAt: String(raw.created_at ?? ''),
    updatedAt: String(raw.updated_at ?? ''),
  }
}

async function fetchClinicians(endpoint: string): Promise<ClinicianSummary[]> {
  const res = await apiClient.get(endpoint)
  const payload = unwrap<unknown>(res.data, [])
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { results?: unknown[] })?.results)
      ? (payload as { results: unknown[] }).results
      : []
  return list.map((item) => mapClinician(item as Record<string, unknown>))
}

export async function fetchDoctors(): Promise<ClinicianSummary[]> {
  return fetchClinicians('/doctors/')
}

export async function fetchPediatricians(): Promise<ClinicianSummary[]> {
  return fetchClinicians('/pediatricians/')
}

export async function fetchMyConsultations(): Promise<ConsultationRecord[]> {
  const res = await apiClient.get('/consultations/')
  const payload = unwrap<unknown>(res.data, [])
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { results?: unknown[] })?.results)
      ? (payload as { results: unknown[] }).results
      : []
  return list.map((item) => mapConsultation(item as Record<string, unknown>))
}

export async function fetchConsultation(id: number): Promise<ConsultationRecord> {
  const res = await apiClient.get(`/consultations/${id}/`)
  return mapConsultation(unwrap<Record<string, unknown>>(res.data, {}))
}

export async function createConsultation(payload: CreateConsultationPayload): Promise<ConsultationRecord> {
  const res = await apiClient.post('/consultations/', payload)
  return mapConsultation(unwrap<Record<string, unknown>>(res.data, {}))
}

export async function updateConsultation(id: number, payload: Partial<Pick<ConsultationRecord, 'status' | 'consentStatus' | 'dosageAlert'>>): Promise<ConsultationRecord> {
  const body: Record<string, unknown> = {}
  if (payload.status) body.status = payload.status
  if (payload.consentStatus) body.consent_status = payload.consentStatus
  if (typeof payload.dosageAlert === 'boolean') body.dosage_alert = payload.dosageAlert
  const res = await apiClient.patch(`/consultations/${id}/`, body)
  return mapConsultation(unwrap<Record<string, unknown>>(res.data, {}))
}

export async function sendConsultationMessage(id: number, message: string): Promise<ConsultationMessage> {
  const res = await apiClient.post(`/consultations/${id}/messages/`, { message })
  return mapMessage(unwrap<Record<string, unknown>>(res.data, {}))
}

export async function grantConsultationConsent(id: number): Promise<void> {
  await apiClient.post(`/consultations/${id}/consent/`)
}
