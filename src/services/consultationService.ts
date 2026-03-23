import { apiClient } from '../lib/apiClient'
import { loadDoctorProfiles } from '../data/telemedicine'

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

type StoredUser = {
  id?: number
  name?: string
  email?: string
  phone?: string
}

const LOCAL_CONSULTATIONS_KEY = 'ava_consultation_service_records'
const USE_LOCAL_CONSULTATION_FLOW = true

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

function shouldUseLocalFallback(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status
  return status == null || status === 404 || status === 405 || status >= 500
}

function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem('ava_user')
    if (!raw) return null
    return JSON.parse(raw) as StoredUser
  } catch {
    return null
  }
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase()
}

function loadLocalConsultations(): ConsultationRecord[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(LOCAL_CONSULTATIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ConsultationRecord[]) : []
  } catch {
    return []
  }
}

function saveLocalConsultations(records: ConsultationRecord[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_CONSULTATIONS_KEY, JSON.stringify(records))
}

function nextConsultationId(records: ConsultationRecord[]): number {
  return records.reduce((max, record) => Math.max(max, record.id), 3000) + 1
}

function nextMessageId(records: ConsultationRecord[]): number {
  return records.reduce((max, record) => {
    const recordMax = record.messages.reduce((messageMax, message) => Math.max(messageMax, message.id), max)
    return Math.max(max, recordMax)
  }, 0) + 1
}

function clinicianIdToNumber(reference: string): number {
  const digits = Number.parseInt(reference.replace(/\D/g, ''), 10)
  if (!Number.isFinite(digits)) return 0
  return reference.toUpperCase().startsWith('PED') ? 2000 + digits : 1000 + digits
}

function mapFallbackClinicians(type: 'Doctor' | 'Pediatrician'): ClinicianSummary[] {
  return loadDoctorProfiles()
    .filter((profile) => profile.type === type && profile.status !== 'Suspended')
    .map((profile) => ({
      id: clinicianIdToNumber(profile.id),
      reference: profile.id,
      name: profile.name,
      specialty: profile.specialty,
      facility: profile.facility,
      consultFee: profile.consultFee,
      rating: profile.rating,
      availability: profile.availability,
      status: 'active',
    }))
}

function findFallbackClinician(id: number | null | undefined, isPediatric: boolean): ClinicianSummary | null {
  if (!id) return null
  const clinicians = mapFallbackClinicians(isPediatric ? 'Pediatrician' : 'Doctor')
  return clinicians.find((clinician) => clinician.id === id) ?? null
}

function pickFallbackClinicianForRecord(record: ConsultationRecord): ClinicianSummary | null {
  const clinicians = mapFallbackClinicians(record.isPediatric ? 'Pediatrician' : 'Doctor')
  const assignedId = record.isPediatric ? record.pediatrician : record.doctor
  const exactMatch = assignedId ? clinicians.find((clinician) => clinician.id === assignedId) : null
  if (exactMatch) return exactMatch

  const specialty = normalizeText(record.doctorSpecialty)
  if (specialty) {
    const specialtyMatch = clinicians.find((clinician) => normalizeText(clinician.specialty) === specialty)
    if (specialtyMatch) return specialtyMatch
  }

  return clinicians[0] ?? null
}

function createSystemMessage(id: number, senderName: string, message: string, sentAt: string): ConsultationMessage {
  return {
    id,
    sender: null,
    senderName,
    message,
    sentAt,
  }
}

function buildGreetingMessage(record: ConsultationRecord, clinicianName: string): string {
  if (record.isPediatric) {
    return `Hello ${record.guardianName || record.patientName}, I’m ${clinicianName}. I’ve joined the consultation for ${record.childName || 'your child'}. Please tell me what symptoms you are most concerned about right now.`
  }

  return `Hello ${record.patientName || 'there'}, I’m ${clinicianName}. I’ve joined your consultation. I’m reviewing your symptoms now, and I’m here to help.`
}

function buildAutomatedReply(record: ConsultationRecord, input: string, clinicianName: string): string {
  const normalized = normalizeText(input)

  if (normalized.includes('fever')) {
    return `${clinicianName}: noted the fever. Please share when it started, the highest temperature recorded, and whether there are any chills or body aches.`
  }

  if (normalized.includes('pain')) {
    return `${clinicianName}: please rate the pain from 1 to 10 and tell me where exactly it is located, plus anything that makes it better or worse.`
  }

  if (normalized.includes('cough') || normalized.includes('flu')) {
    return `${clinicianName}: thanks. Tell me whether the cough is dry or productive, and if there is any shortness of breath, wheezing, or chest tightness.`
  }

  if (record.isPediatric) {
    return `${clinicianName}: thank you. I’m noting that for ${record.childName || 'your child'}. Please also mention appetite, activity level, and whether there have been any recent medications or vaccinations.`
  }

  return `${clinicianName}: thank you, I’ve noted that. Please add any other symptoms, current medications, allergies, or medical conditions that may help with the assessment.`
}

function ensureLocalConsultationConnected(record: ConsultationRecord, baseMessageId = 0): ConsultationRecord {
  const clinician = pickFallbackClinicianForRecord(record)
  const clinicianName = clinician?.name ?? (record.doctorName || (record.isPediatric ? 'Assigned pediatrician' : 'Assigned doctor'))
  const clinicianSpecialty = clinician?.specialty ?? (record.doctorSpecialty || (record.isPediatric ? 'Pediatrics' : 'General medicine'))
  const assignedDoctorId = record.isPediatric ? null : clinician?.id ?? record.doctor
  const assignedPediatricianId = record.isPediatric ? clinician?.id ?? record.pediatrician : null
  const needsGreeting = record.messages.length === 0
  const shouldActivate = record.status === 'waiting' || needsGreeting

  if (!shouldActivate && record.doctorName && record.doctorSpecialty) {
    return record
  }

  const now = new Date().toISOString()
  return {
    ...record,
    doctor: assignedDoctorId,
    pediatrician: assignedPediatricianId,
    doctorName: clinicianName,
    doctorSpecialty: clinicianSpecialty,
    status: shouldActivate ? 'in_progress' : record.status,
    consentStatus: record.isPediatric ? 'granted' : record.consentStatus,
    lastMessageAt: shouldActivate ? now : record.lastMessageAt,
    updatedAt: shouldActivate ? now : record.updatedAt,
    messages: needsGreeting
      ? [createSystemMessage(baseMessageId + 1, clinicianName, buildGreetingMessage(record, clinicianName), now)]
      : record.messages,
  }
}

function hydrateLocalConsultations(): ConsultationRecord[] {
  const records = loadLocalConsultations()
  let changed = false
  let messageCursor = nextMessageId(records) - 1

  const nextRecords = records.map((record) => {
    const hydrated = ensureLocalConsultationConnected(record, messageCursor)
    if (hydrated !== record) {
      changed = true
      messageCursor = hydrated.messages.reduce((max, message) => Math.max(max, message.id), messageCursor)
    }
    return hydrated
  })

  if (changed) {
    saveLocalConsultations(nextRecords)
  }

  return nextRecords
}

function filterConsultationsForCurrentUser(records: ConsultationRecord[]): ConsultationRecord[] {
  const user = getStoredUser()
  if (!user) return []

  const userEmail = normalizeText(user.email)
  const userName = normalizeText(user.name)

  return records.filter((record) => {
    if (userEmail && normalizeText(record.patientEmail) === userEmail) return true
    if (userName && normalizeText(record.patientName) === userName) return true
    if (userName && record.isPediatric && normalizeText(record.guardianName) === userName) return true
    return false
  })
}

function getLocalConsultation(id: number): ConsultationRecord {
  const record = hydrateLocalConsultations().find((item) => item.id === id)
  if (!record) {
    throw new Error('Consultation not found.')
  }
  return record
}

function createLocalConsultation(payload: CreateConsultationPayload): ConsultationRecord {
  const records = loadLocalConsultations()
  const user = getStoredUser()
  const isPediatric = Boolean(payload.is_pediatric || payload.pediatrician)
  const clinicianId = isPediatric ? payload.pediatrician ?? null : payload.doctor ?? null
  const clinician = findFallbackClinician(clinicianId, isPediatric) ?? mapFallbackClinicians(isPediatric ? 'Pediatrician' : 'Doctor')[0] ?? null
  const now = new Date().toISOString()
  const nextId = nextConsultationId(records)

  const record: ConsultationRecord = {
    id: nextId,
    reference: `CONS-${nextId}`,
    doctor: isPediatric ? null : clinician?.id ?? clinicianId,
    pediatrician: isPediatric ? clinician?.id ?? clinicianId : null,
    doctorName: clinician?.name ?? '',
    doctorSpecialty: clinician?.specialty ?? (isPediatric ? 'Paediatrics' : 'General medicine'),
    patient: user?.id ?? null,
    patientName: payload.patient_name?.trim() ?? user?.name?.trim() ?? '',
    patientEmail: payload.patient_email?.trim() ?? user?.email?.trim() ?? '',
    patientPhone: payload.patient_phone?.trim() ?? user?.phone?.trim() ?? '',
    patientAge: payload.patient_age ?? null,
    issue: payload.issue.trim(),
    status: 'waiting',
    priority: payload.priority ?? 'routine',
    channel: 'chat',
    scheduledAt: payload.scheduled_at ?? now,
    isPediatric,
    guardianName: payload.guardian_name?.trim() ?? '',
    childName: payload.child_name?.trim() ?? '',
    childAge: payload.child_age ?? null,
    weightKg: payload.weight_kg == null ? null : String(payload.weight_kg),
    consentStatus: isPediatric ? 'pending' : 'granted',
    dosageAlert: false,
    lastMessageAt: null,
    messages: [],
    createdAt: now,
    updatedAt: now,
  }

  const connectedRecord = ensureLocalConsultationConnected(record, nextMessageId(records) - 1)
  saveLocalConsultations([connectedRecord, ...records])
  return connectedRecord
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
  if (USE_LOCAL_CONSULTATION_FLOW) {
    return mapFallbackClinicians('Doctor')
  }
  try {
    return await fetchClinicians('/doctors/')
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error
    return mapFallbackClinicians('Doctor')
  }
}

export async function fetchPediatricians(): Promise<ClinicianSummary[]> {
  if (USE_LOCAL_CONSULTATION_FLOW) {
    return mapFallbackClinicians('Pediatrician')
  }
  try {
    return await fetchClinicians('/pediatricians/')
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error
    return mapFallbackClinicians('Pediatrician')
  }
}

export async function fetchMyConsultations(): Promise<ConsultationRecord[]> {
  if (USE_LOCAL_CONSULTATION_FLOW) {
    return filterConsultationsForCurrentUser(hydrateLocalConsultations())
  }
  try {
    const res = await apiClient.get('/consultations/')
    const payload = unwrap<unknown>(res.data, [])
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { results?: unknown[] })?.results)
        ? (payload as { results: unknown[] }).results
        : []
    return list.map((item) => mapConsultation(item as Record<string, unknown>))
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error
    return filterConsultationsForCurrentUser(loadLocalConsultations())
  }
}

export async function fetchConsultation(id: number): Promise<ConsultationRecord> {
  if (USE_LOCAL_CONSULTATION_FLOW) {
    return getLocalConsultation(id)
  }
  try {
    const res = await apiClient.get(`/consultations/${id}/`)
    return mapConsultation(unwrap<Record<string, unknown>>(res.data, {}))
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error
    return getLocalConsultation(id)
  }
}

export async function createConsultation(payload: CreateConsultationPayload): Promise<ConsultationRecord> {
  if (USE_LOCAL_CONSULTATION_FLOW) {
    return createLocalConsultation(payload)
  }
  try {
    const res = await apiClient.post('/consultations/', payload)
    return mapConsultation(unwrap<Record<string, unknown>>(res.data, {}))
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error
    return createLocalConsultation(payload)
  }
}

export async function updateConsultation(id: number, payload: Partial<Pick<ConsultationRecord, 'status' | 'consentStatus' | 'dosageAlert'>>): Promise<ConsultationRecord> {
  const body: Record<string, unknown> = {}
  if (payload.status) body.status = payload.status
  if (payload.consentStatus) body.consent_status = payload.consentStatus
  if (typeof payload.dosageAlert === 'boolean') body.dosage_alert = payload.dosageAlert
  if (USE_LOCAL_CONSULTATION_FLOW) {
    const records = loadLocalConsultations()
    const updatedAt = new Date().toISOString()
    let updatedRecord: ConsultationRecord | null = null

    const nextRecords = records.map((record) => {
      if (record.id !== id) return record
      updatedRecord = {
        ...record,
        status: payload.status ?? record.status,
        consentStatus: payload.consentStatus ?? record.consentStatus,
        dosageAlert: typeof payload.dosageAlert === 'boolean' ? payload.dosageAlert : record.dosageAlert,
        updatedAt,
      }
      return updatedRecord
    })

    if (!updatedRecord) {
      throw new Error('Consultation not found.')
    }

    saveLocalConsultations(nextRecords)
    return updatedRecord
  }
  try {
    const res = await apiClient.patch(`/consultations/${id}/`, body)
    return mapConsultation(unwrap<Record<string, unknown>>(res.data, {}))
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error

    const records = loadLocalConsultations()
    const updatedAt = new Date().toISOString()
    let updatedRecord: ConsultationRecord | null = null

    const nextRecords = records.map((record) => {
      if (record.id !== id) return record
      updatedRecord = {
        ...record,
        status: payload.status ?? record.status,
        consentStatus: payload.consentStatus ?? record.consentStatus,
        dosageAlert: typeof payload.dosageAlert === 'boolean' ? payload.dosageAlert : record.dosageAlert,
        updatedAt,
      }
      return updatedRecord
    })

    if (!updatedRecord) {
      throw new Error('Consultation not found.')
    }

    saveLocalConsultations(nextRecords)
    return updatedRecord
  }
}

export async function sendConsultationMessage(id: number, message: string): Promise<ConsultationMessage> {
  if (USE_LOCAL_CONSULTATION_FLOW) {
    const records = hydrateLocalConsultations()
    const target = records.find((record) => record.id === id)
    if (!target) {
      throw new Error('Consultation not found.')
    }

    const user = getStoredUser()
    const patientSentAt = new Date().toISOString()
    const patientMessageId = nextMessageId(records)
    const patientMessage: ConsultationMessage = {
      id: patientMessageId,
      sender: user?.id ?? null,
      senderName: user?.name?.trim() || 'Patient',
      message,
      sentAt: patientSentAt,
    }

    const clinician = pickFallbackClinicianForRecord(target)
    const clinicianName = clinician?.name ?? (target.doctorName || (target.isPediatric ? 'Assigned pediatrician' : 'Assigned doctor'))
    const clinicianReplyAt = new Date(Date.now() + 1000).toISOString()
    const clinicianMessage = createSystemMessage(
      patientMessageId + 1,
      clinicianName,
      buildAutomatedReply(target, message, clinicianName),
      clinicianReplyAt,
    )

    const nextRecords: ConsultationRecord[] = records.map((record) =>
      record.id === id
        ? {
          ...record,
          status: 'in_progress' as ConsultationStatus,
          doctor: record.isPediatric ? null : clinician?.id ?? record.doctor,
          pediatrician: record.isPediatric ? clinician?.id ?? record.pediatrician : null,
          doctorName: clinicianName,
          doctorSpecialty: clinician?.specialty ?? record.doctorSpecialty,
          consentStatus: record.isPediatric ? 'granted' : record.consentStatus,
          lastMessageAt: clinicianReplyAt,
          updatedAt: clinicianReplyAt,
          messages: [...record.messages, patientMessage, clinicianMessage],
        }
        : record
    )

    saveLocalConsultations(nextRecords)
    return patientMessage
  }
  try {
    const res = await apiClient.post(`/consultations/${id}/messages/`, { message })
    return mapMessage(unwrap<Record<string, unknown>>(res.data, {}))
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error

    const records = loadLocalConsultations()
    const sentAt = new Date().toISOString()
    const user = getStoredUser()
    const fallbackMessage: ConsultationMessage = {
      id: nextMessageId(records),
      sender: user?.id ?? null,
      senderName: user?.name?.trim() || 'Patient',
      message,
      sentAt,
    }

    const nextRecords = records.map((record) =>
      record.id === id
        ? {
          ...record,
          status: record.status === 'waiting' ? 'in_progress' : record.status,
          lastMessageAt: sentAt,
          updatedAt: sentAt,
          messages: [...record.messages, fallbackMessage],
        }
        : record
    )

    saveLocalConsultations(nextRecords)
    return fallbackMessage
  }
}

export async function grantConsultationConsent(id: number): Promise<void> {
  if (USE_LOCAL_CONSULTATION_FLOW) {
    const updatedAt = new Date().toISOString()
    const nextRecords = loadLocalConsultations().map((record) =>
      record.id === id
        ? {
          ...record,
          consentStatus: 'granted' as ConsultationConsentStatus,
          updatedAt,
        }
        : record
    )

    saveLocalConsultations(nextRecords)
    return
  }
  try {
    await apiClient.post(`/consultations/${id}/consent/`)
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error

    const updatedAt = new Date().toISOString()
    const nextRecords = loadLocalConsultations().map((record) =>
      record.id === id
        ? {
          ...record,
          consentStatus: 'granted' as ConsultationConsentStatus,
          updatedAt,
        }
        : record
    )

    saveLocalConsultations(nextRecords)
  }
}
