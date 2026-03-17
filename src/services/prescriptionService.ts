
import { apiClient } from '../lib/apiClient'
import { PrescriptionAuditEntry, PrescriptionRecord } from '../data/prescriptions'

type UploadPayload = {
  patient: string
  doctor: string
  notes?: string
  files: File[]
}

type ApiPrescriptionFile = {
  file: string
  filename: string
}

type ApiPrescriptionItem = {
  id: number
  name: string
  product_id?: number | null
  product_name?: string
  product_slug?: string
  product_image?: string | null
  dose: string
  frequency: string
  quantity: number
}

type ApiPrescriptionAudit = {
  action: string
  timestamp: string
}

type ApiPrescription = {
  id: number
  reference: string
  patient_name: string
  patient_name_display?: string
  pharmacist_name?: string
  status: string
  dispatch_status: string
  submitted_at: string
  doctor_name: string
  files: ApiPrescriptionFile[]
  items: ApiPrescriptionItem[]
  notes: string
  audit_logs: ApiPrescriptionAudit[]
}

const STATUS_FROM_API: Record<string, PrescriptionRecord['status']> = {
  pending: 'Pending',
  approved: 'Approved',
  clarification: 'Clarification',
  rejected: 'Rejected',
}

const STATUS_TO_API: Record<PrescriptionRecord['status'], string> = {
  Pending: 'pending',
  Approved: 'approved',
  Clarification: 'clarification',
  Rejected: 'rejected',
}

const DISPATCH_FROM_API: Record<string, PrescriptionRecord['dispatchStatus']> = {
  not_started: 'Not started',
  queued: 'Queued',
  packed: 'Packed',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
}

const DISPATCH_TO_API: Record<PrescriptionRecord['dispatchStatus'], string> = {
  'Not started': 'not_started',
  Queued: 'queued',
  Packed: 'packed',
  Dispatched: 'dispatched',
  Delivered: 'delivered',
}

function isAuthenticated() {
  return !!localStorage.getItem('ava_access_token')
}

function currentUserRole() {
  try {
    const raw = localStorage.getItem('ava_user')
    if (!raw) return ''
    const parsed = JSON.parse(raw) as { role?: string }
    return parsed.role ?? ''
  } catch {
    return ''
  }
}

function listEndpoint() {
  const role = currentUserRole()
  return role === 'admin' || role === 'pharmacist'
    ? '/admin/prescriptions/'
    : '/prescriptions/'
}

function mapPrescription(record: ApiPrescription): PrescriptionRecord {
  return {
    backendId: record.id,
    id: record.reference,
    patient: record.patient_name_display || record.patient_name,
    pharmacist: record.pharmacist_name || 'Unassigned',
    status: STATUS_FROM_API[record.status] ?? 'Pending',
    dispatchStatus: DISPATCH_FROM_API[record.dispatch_status] ?? 'Not started',
    submitted: record.submitted_at ? new Date(record.submitted_at).toISOString().slice(0, 10) : '',
    doctor: record.doctor_name || 'Doctor not specified',
    files: (record.files || []).map((file) => file.file || file.filename).filter(Boolean),
    items: (record.items || []).map((item) => ({
      backendId: item.id,
      name: item.name,
      productId: item.product_id ?? null,
      productName: item.product_name || '',
      productSlug: item.product_slug || '',
      productImage: item.product_image || null,
      dose: item.dose || '-',
      frequency: item.frequency || '-',
      qty: item.quantity ?? 0,
    })),
    notes: record.notes || '',
    audit: (record.audit_logs || []).map((entry) => ({
      time: entry.timestamp,
      action: entry.action,
    })),
  }
}

async function listPrescriptions(): Promise<PrescriptionRecord[]> {
  if (!isAuthenticated()) return []
  const res = await apiClient.get(listEndpoint())
  const payload = res.data?.data ?? res.data ?? []
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.results)
      ? payload.results
      : []
  return items.map(mapPrescription)
}

async function resolvePrescription(reference: string): Promise<PrescriptionRecord> {
  const records = await listPrescriptions()
  const match = records.find((item) => item.id === reference)
  if (!match?.backendId) {
    throw new Error('Prescription not found.')
  }
  return match
}

export const prescriptionService = {
  list: async () => {
    const data = await listPrescriptions()
    return { data }
  },
  saveAll: async (records: PrescriptionRecord[]) => {
    return { data: records }
  },
  upload: async (payload: UploadPayload) => {
    const formData = new FormData()
    formData.append('patient_name', payload.patient)
    formData.append('doctor_name', payload.doctor || '')
    formData.append('notes', payload.notes || '')
    payload.files.forEach((file) => formData.append('files', file))
    await apiClient.post('/prescriptions/upload/', formData)
    return prescriptionService.list()
  },
  update: async (prescriptionId: string, updates: Partial<PrescriptionRecord>, auditAction?: string) => {
    const prescription = await resolvePrescription(prescriptionId)
    const body: Record<string, unknown> = {}
    if (updates.status) body.status = STATUS_TO_API[updates.status]
    if (updates.dispatchStatus) body.dispatch_status = DISPATCH_TO_API[updates.dispatchStatus]
    if (typeof updates.notes === 'string') body.pharmacist_notes = updates.notes
    if (updates.items) {
      body.items = updates.items.map((item) => ({
        name: item.name,
        product_id: item.productId ?? null,
        dose: item.dose,
        frequency: item.frequency,
        quantity: item.qty,
      }))
    }
    if (Object.keys(body).length) {
      await apiClient.patch(`/prescriptions/${prescription.backendId}/update/`, body)
    }
    if (auditAction) {
      await apiClient.post(`/prescriptions/${prescription.backendId}/audit/`, { action: auditAction })
    }
    return prescriptionService.list()
  },
  appendAudit: async (prescriptionId: string, entry: PrescriptionAuditEntry | string) => {
    const action = typeof entry === 'string' ? entry : entry.action
    const prescription = await resolvePrescription(prescriptionId)
    await apiClient.post(`/prescriptions/${prescription.backendId}/audit/`, { action })
    return prescriptionService.list()
  },
  addApprovedItemToCart: async (prescriptionId: string, itemId: number, quantity?: number) => {
    const prescription = await resolvePrescription(prescriptionId)
    const payload = quantity ? { quantity } : {}
    const res = await apiClient.post(`/prescriptions/${prescription.backendId}/items/${itemId}/add-to-cart/`, payload)
    return res.data?.data ?? res.data
  },
}
