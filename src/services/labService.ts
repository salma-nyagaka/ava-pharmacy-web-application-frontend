import { apiClient } from '../lib/apiClient'

export type LabPriority = 'routine' | 'priority'
export type LabPaymentStatus = 'pending' | 'paid'
export type LabRequestStatus = 'awaiting_sample' | 'sample_collected' | 'processing' | 'result_ready' | 'completed' | 'cancelled'
export type LabChannel = 'walk_in' | 'collection'
export type LabResultDeliveryMethod = 'digital' | 'physical_pickup'

export interface LabTest {
  id: number; reference: string; name: string; category: string; categoryLabel: string
  price: number; turnaround: string; sampleType: string; description: string; isActive: boolean; createdAt: string
}

export interface LabAuditLog {
  id: number; action: string; performedBy: number | null; performedByName: string; timestamp: string
}

export interface LabResult {
  id: number; reference: string; summary: string; file: string | null; filename: string; flags: string[]
  isAbnormal: boolean; recommendation: string; reviewedBy: number | null; reviewedByName: string; uploadedAt: string
}

export interface LabRequest {
  id: number; reference: string; test: number | null; testName: string; testCategory: string; testCategoryLabel: string
  testPrice: number; testTurnaround: string; testSampleType: string; patient: number | null; patientName: string
  patientPhone: string; patientEmail: string; status: LabRequestStatus; statusLabel: string
  paymentStatus: LabPaymentStatus; paymentStatusLabel: string; priority: LabPriority; priorityLabel: string
  channel: LabChannel; channelLabel: string; resultDeliveryMethod: LabResultDeliveryMethod; resultDeliveryLabel: string
  collectionAddress: string; collectionInstructions: string; resultPickupLocation: string; orderingDoctor: string; notes: string
  collectionVerificationRequired: boolean; collectionCodeActive: boolean; collectionCodeExpiresAt: string | null
  collectionVerifiedAt: string | null; collectionVerifiedByName: string
  assignedPartner: number | null; partnerName: string; assignedPharmacist: number | null; pharmacistName: string
  laboratory: number | null; laboratoryName: string; laboratoryReference: string
  assignedTechnician: number | null; technicianName: string; scheduledAt: string | null; requestedAt: string; updatedAt: string
  auditLogs: LabAuditLog[]; result: LabResult | null
}

export interface CreateLabRequestPayload {
  test: number; patient_name: string; patient_phone: string; patient_email?: string; priority?: LabPriority
  channel?: LabChannel; result_delivery_method?: LabResultDeliveryMethod; collection_address?: string
  collection_instructions?: string; result_pickup_location?: string; ordering_doctor?: string; notes?: string; scheduled_at: string
}

export type UpdateLabRequestPayload = Partial<{
  status: LabRequestStatus; payment_status: LabPaymentStatus; priority: LabPriority; assigned_partner: number | null
  laboratory: number | null
  assigned_pharmacist: number | null; assigned_technician: number | null; scheduled_at: string | null
  collection_address: string; collection_instructions: string; result_pickup_location: string; notes: string
}>

const CATEGORY_LABELS: Record<string, string> = {
  blood: 'Blood', cardiac: 'Cardiac', infectious: 'Infectious', wellness: 'Wellness', metabolic: 'Metabolic',
}
const STATUS_LABELS: Record<LabRequestStatus, string> = {
  awaiting_sample: 'Awaiting sample', sample_collected: 'Sample collected', processing: 'Processing',
  result_ready: 'Result ready', completed: 'Completed', cancelled: 'Cancelled',
}
const PAYMENT_LABELS: Record<LabPaymentStatus, string> = { pending: 'Pending', paid: 'Paid' }
const PRIORITY_LABELS: Record<LabPriority, string> = { routine: 'Routine', priority: 'Priority' }
const CHANNEL_LABELS: Record<LabChannel, string> = { walk_in: 'Visit laboratory', collection: 'Home sample collection' }
const RESULT_DELIVERY_LABELS: Record<LabResultDeliveryMethod, string> = {
  digital: 'Secure digital delivery', physical_pickup: 'Physical result pickup',
}

function unwrap<T>(value: unknown, fallback: T): T {
  if (value && typeof value === 'object' && 'data' in (value as Record<string, unknown>)) {
    return ((value as Record<string, unknown>).data as T) ?? fallback
  }
  return (value as T) ?? fallback
}

function listPayload(value: unknown): unknown[] {
  const payload = unwrap<unknown>(value, [])
  if (Array.isArray(payload)) return payload
  const results = payload && typeof payload === 'object' ? (payload as { results?: unknown[] }).results : undefined
  return Array.isArray(results) ? results : []
}

function asNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapLabResult(raw: Record<string, unknown>): LabResult {
  return {
    id: asNumber(raw.id), reference: String(raw.reference ?? ''), summary: String(raw.summary ?? ''),
    file: raw.download_url ? String(raw.download_url) : null, filename: String(raw.filename ?? ''),
    flags: Array.isArray(raw.flags) ? raw.flags.map(String) : [], isAbnormal: Boolean(raw.is_abnormal),
    recommendation: String(raw.recommendation ?? ''), reviewedBy: raw.reviewed_by == null ? null : asNumber(raw.reviewed_by),
    reviewedByName: String(raw.reviewed_by_name ?? ''), uploadedAt: String(raw.uploaded_at ?? ''),
  }
}

function mapAuditLog(raw: Record<string, unknown>): LabAuditLog {
  return {
    id: asNumber(raw.id), action: String(raw.action ?? ''),
    performedBy: raw.performed_by == null ? null : asNumber(raw.performed_by),
    performedByName: String(raw.performed_by_name ?? ''), timestamp: String(raw.timestamp ?? ''),
  }
}

function mapLabTest(raw: Record<string, unknown>): LabTest {
  const category = String(raw.category ?? '')
  return {
    id: asNumber(raw.id), reference: String(raw.reference ?? ''), name: String(raw.name ?? ''), category,
    categoryLabel: CATEGORY_LABELS[category] ?? category, price: asNumber(raw.price), turnaround: String(raw.turnaround ?? ''),
    sampleType: String(raw.sample_type ?? ''), description: String(raw.description ?? ''),
    isActive: Boolean(raw.is_active), createdAt: String(raw.created_at ?? ''),
  }
}

function mapLabRequest(raw: Record<string, unknown>): LabRequest {
  const status = String(raw.status ?? 'awaiting_sample') as LabRequestStatus
  const paymentStatus = String(raw.payment_status ?? 'pending') as LabPaymentStatus
  const priority = String(raw.priority ?? 'routine') as LabPriority
  const channel = String(raw.channel ?? 'collection') as LabChannel
  const resultDeliveryMethod = String(raw.result_delivery_method ?? 'digital') as LabResultDeliveryMethod
  const category = String(raw.test_category ?? '')
  return {
    id: asNumber(raw.id), reference: String(raw.reference ?? ''), test: raw.test == null ? null : asNumber(raw.test),
    testName: String(raw.test_name ?? ''), testCategory: category, testCategoryLabel: CATEGORY_LABELS[category] ?? category,
    testPrice: asNumber(raw.test_price), testTurnaround: String(raw.test_turnaround ?? ''),
    testSampleType: String(raw.test_sample_type ?? ''), patient: raw.patient == null ? null : asNumber(raw.patient),
    patientName: String(raw.patient_name ?? ''), patientPhone: String(raw.patient_phone ?? ''),
    patientEmail: String(raw.patient_email ?? ''), status, statusLabel: STATUS_LABELS[status] ?? status,
    paymentStatus, paymentStatusLabel: PAYMENT_LABELS[paymentStatus] ?? paymentStatus,
    priority, priorityLabel: PRIORITY_LABELS[priority] ?? priority, channel, channelLabel: CHANNEL_LABELS[channel] ?? channel,
    resultDeliveryMethod, resultDeliveryLabel: RESULT_DELIVERY_LABELS[resultDeliveryMethod] ?? resultDeliveryMethod,
    collectionAddress: String(raw.collection_address ?? ''), collectionInstructions: String(raw.collection_instructions ?? ''),
    collectionVerificationRequired: Boolean(raw.collection_verification_required),
    collectionCodeActive: Boolean(raw.collection_code_active),
    collectionCodeExpiresAt: raw.collection_code_expires_at ? String(raw.collection_code_expires_at) : null,
    collectionVerifiedAt: raw.collection_verified_at ? String(raw.collection_verified_at) : null,
    collectionVerifiedByName: String(raw.collection_verified_by_name ?? ''),
    resultPickupLocation: String(raw.result_pickup_location ?? ''), orderingDoctor: String(raw.ordering_doctor ?? ''),
    notes: String(raw.notes ?? ''), assignedPartner: raw.assigned_partner == null ? null : asNumber(raw.assigned_partner),
    partnerName: String(raw.partner_name ?? ''), assignedPharmacist: raw.assigned_pharmacist == null ? null : asNumber(raw.assigned_pharmacist),
    laboratory: raw.laboratory == null ? null : asNumber(raw.laboratory),
    laboratoryName: String(raw.laboratory_name ?? ''), laboratoryReference: String(raw.laboratory_reference ?? ''),
    pharmacistName: String(raw.pharmacist_name ?? ''), assignedTechnician: raw.assigned_technician == null ? null : asNumber(raw.assigned_technician),
    technicianName: String(raw.technician_name ?? ''), scheduledAt: raw.scheduled_at ? String(raw.scheduled_at) : null,
    requestedAt: String(raw.requested_at ?? ''), updatedAt: String(raw.updated_at ?? ''),
    auditLogs: Array.isArray(raw.audit_logs) ? raw.audit_logs.map((item) => mapAuditLog(item as Record<string, unknown>)) : [],
    result: raw.result && typeof raw.result === 'object' ? mapLabResult(raw.result as Record<string, unknown>) : null,
  }
}

export async function fetchLabTests(): Promise<LabTest[]> {
  const response = await apiClient.get('/lab/tests/')
  return listPayload(response.data).map((item) => mapLabTest(item as Record<string, unknown>))
}

export async function fetchMyLabRequests(): Promise<LabRequest[]> {
  const response = await apiClient.get('/lab/requests/', { params: { page_size: 500 } })
  return listPayload(response.data).map((item) => mapLabRequest(item as Record<string, unknown>))
}

export async function createLabRequest(payload: CreateLabRequestPayload): Promise<LabRequest> {
  const response = await apiClient.post('/lab/requests/', payload)
  return mapLabRequest(unwrap<Record<string, unknown>>(response.data, {}))
}

export const fetchStaffLabRequests = fetchMyLabRequests

export async function updateLabRequest(id: number, payload: UpdateLabRequestPayload): Promise<LabRequest> {
  const response = await apiClient.patch(`/lab/requests/${id}/update/`, payload)
  return mapLabRequest(unwrap<Record<string, unknown>>(response.data, {}))
}

export async function issueLabCollectionCode(requestId: number): Promise<{
  code: string
  expiresAt: string
  laboratoryName: string
  technicianName: string
}> {
  const response = await apiClient.post(`/lab/requests/${requestId}/collection-code/`)
  const payload = unwrap<Record<string, unknown>>(response.data, {})
  return {
    code: String(payload.code ?? ''),
    expiresAt: String(payload.expires_at ?? ''),
    laboratoryName: String(payload.laboratory_name ?? ''),
    technicianName: String(payload.technician_name ?? ''),
  }
}

export async function verifyLabCollectionCode(requestId: number, code: string): Promise<LabRequest> {
  const response = await apiClient.post(`/lab/requests/${requestId}/verify-collection/`, { code })
  return mapLabRequest(unwrap<Record<string, unknown>>(response.data, {}))
}

export async function uploadLabResult(
  requestId: number,
  payload: { summary: string; file?: File | null; flags?: string[]; is_abnormal?: boolean; recommendation?: string },
): Promise<LabResult> {
  const form = new FormData()
  form.append('summary', payload.summary)
  form.append('flags', JSON.stringify(payload.flags ?? []))
  form.append('is_abnormal', String(Boolean(payload.is_abnormal)))
  form.append('recommendation', payload.recommendation ?? '')
  if (payload.file) form.append('file', payload.file)
  const response = await apiClient.post(`/lab/requests/${requestId}/results/`, form)
  return mapLabResult(unwrap<Record<string, unknown>>(response.data, {}))
}

export async function downloadLabResultFile(result: LabResult): Promise<void> {
  if (!result.file) throw new Error('No result file is available.')
  const response = await apiClient.get(result.file, { responseType: 'blob' })
  const objectUrl = URL.createObjectURL(response.data as Blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = result.filename || `${result.reference}.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
