import { apiClient } from '../lib/apiClient'
import { loadLabTests as loadFallbackLabTests } from '../data/labs'

export type LabPriority = 'routine' | 'priority'
export type LabPaymentStatus = 'pending' | 'paid'
export type LabRequestStatus = 'awaiting_sample' | 'sample_collected' | 'processing' | 'result_ready' | 'completed' | 'cancelled'
export type LabChannel = 'walk_in' | 'collection'

export interface LabTest {
  id: number
  reference: string
  name: string
  category: string
  categoryLabel: string
  price: number
  turnaround: string
  sampleType: string
  description: string
  isActive: boolean
  createdAt: string
}

export interface LabAuditLog {
  id: number
  action: string
  performedBy: number | null
  performedByName: string
  timestamp: string
}

export interface LabResult {
  id: number
  reference: string
  summary: string
  file: string | null
  filename: string
  flags: string[]
  isAbnormal: boolean
  recommendation: string
  reviewedBy: number | null
  reviewedByName: string
  uploadedAt: string
}

export interface LabRequest {
  id: number
  reference: string
  test: number | null
  testName: string
  testCategory: string
  testCategoryLabel: string
  testPrice: number
  testTurnaround: string
  testSampleType: string
  patient: number | null
  patientName: string
  patientPhone: string
  patientEmail: string
  status: LabRequestStatus
  statusLabel: string
  paymentStatus: LabPaymentStatus
  paymentStatusLabel: string
  priority: LabPriority
  priorityLabel: string
  channel: LabChannel
  channelLabel: string
  orderingDoctor: string
  notes: string
  assignedTechnician: number | null
  technicianName: string
  scheduledAt: string | null
  requestedAt: string
  updatedAt: string
  auditLogs: LabAuditLog[]
  result: LabResult | null
}

export interface CreateLabRequestPayload {
  test: number
  patient_name: string
  patient_phone: string
  patient_email?: string
  priority?: LabPriority
  channel?: LabChannel
  ordering_doctor?: string
  notes?: string
  scheduled_at: string
}

type StoredUser = {
  id?: number
  name?: string
  email?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  blood: 'Blood',
  cardiac: 'Cardiac',
  infectious: 'Infectious',
  wellness: 'Wellness',
  metabolic: 'Metabolic',
}

const STATUS_LABELS: Record<LabRequestStatus, string> = {
  awaiting_sample: 'Awaiting sample',
  sample_collected: 'Sample collected',
  processing: 'Processing',
  result_ready: 'Result ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const PAYMENT_LABELS: Record<LabPaymentStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
}

const PRIORITY_LABELS: Record<LabPriority, string> = {
  routine: 'Routine',
  priority: 'Priority',
}

const CHANNEL_LABELS: Record<LabChannel, string> = {
  walk_in: 'Walk-in',
  collection: 'Home collection',
}

const LOCAL_LAB_REQUESTS_KEY = 'ava_lab_service_requests'
const USE_LOCAL_LAB_FLOW = true
const DEFAULT_TECHNICIAN = {
  id: 1,
  name: 'Ava Diagnostics Team',
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

function parseFallbackTestId(reference: string): number {
  const parsed = Number.parseInt(reference.replace(/\D/g, ''), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function loadLocalLabRequests(): LabRequest[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(LOCAL_LAB_REQUESTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as LabRequest[]) : []
  } catch {
    return []
  }
}

function saveLocalLabRequests(requests: LabRequest[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_LAB_REQUESTS_KEY, JSON.stringify(requests))
}

function nextLocalLabRequestId(requests: LabRequest[]): number {
  return requests.reduce((max, request) => Math.max(max, request.id), 3000) + 1
}

function createLocalAuditLog(id: number, action: string, timestamp: string, performedByName = DEFAULT_TECHNICIAN.name): LabAuditLog {
  return {
    id,
    action,
    performedBy: DEFAULT_TECHNICIAN.id,
    performedByName,
    timestamp,
  }
}

function mapLocalFallbackTests(): LabTest[] {
  return loadFallbackLabTests().map((test) => {
    const category = test.category.trim().toLowerCase()
    return {
      id: parseFallbackTestId(test.id),
      reference: test.id,
      name: test.name,
      category,
      categoryLabel: test.category,
      price: test.price,
      turnaround: test.turnaround,
      sampleType: test.sampleType,
      description: test.description,
      isActive: true,
      createdAt: '',
    }
  })
}

function filterRequestsForCurrentUser(requests: LabRequest[]): LabRequest[] {
  const user = getStoredUser()
  if (!user) return []

  const userEmail = normalizeText(user.email)
  const userName = normalizeText(user.name)

  return requests.filter((request) => {
    if (userEmail && normalizeText(request.patientEmail) === userEmail) return true
    if (userName && normalizeText(request.patientName) === userName) return true
    return false
  })
}

function ensureLocalRequestConnected(request: LabRequest): LabRequest {
  if (request.result || request.status === 'completed' || request.status === 'result_ready') {
    return request
  }

  const now = new Date().toISOString()
  const auditLogs = [...request.auditLogs]
  let nextAuditId = auditLogs.reduce((max, log) => Math.max(max, log.id), 0) + 1

  if (request.status === 'awaiting_sample') {
    auditLogs.push(createLocalAuditLog(nextAuditId++, 'Sample received and queued for analysis', now))
  }

  auditLogs.push(createLocalAuditLog(nextAuditId, `Processing started by ${DEFAULT_TECHNICIAN.name}`, now))

  return {
    ...request,
    status: 'processing',
    statusLabel: STATUS_LABELS.processing,
    assignedTechnician: DEFAULT_TECHNICIAN.id,
    technicianName: DEFAULT_TECHNICIAN.name,
    updatedAt: now,
    auditLogs,
  }
}

function hydrateLocalLabRequests(): LabRequest[] {
  const records = loadLocalLabRequests()
  let changed = false

  const nextRecords = records.map((record) => {
    const hydrated = ensureLocalRequestConnected(record)
    if (hydrated !== record) {
      changed = true
    }
    return hydrated
  })

  if (changed) {
    saveLocalLabRequests(nextRecords)
  }

  return nextRecords
}

function createLocalLabRequest(payload: CreateLabRequestPayload): LabRequest {
  const tests = mapLocalFallbackTests()
  const selectedTest = tests.find((test) => test.id === payload.test)
  if (!selectedTest) {
    throw new Error('Selected lab test could not be found.')
  }

  const user = getStoredUser()
  const requests = hydrateLocalLabRequests()
  const now = new Date().toISOString()
  const nextId = nextLocalLabRequestId(requests)

  const request: LabRequest = {
    id: nextId,
    reference: `LAB-${nextId}`,
    test: selectedTest.id,
    testName: selectedTest.name,
    testCategory: selectedTest.category,
    testCategoryLabel: selectedTest.categoryLabel,
    testPrice: selectedTest.price,
    testTurnaround: selectedTest.turnaround,
    testSampleType: selectedTest.sampleType,
    patient: user?.id ?? null,
    patientName: payload.patient_name.trim(),
    patientPhone: payload.patient_phone.trim(),
    patientEmail: payload.patient_email?.trim() ?? '',
    status: 'processing',
    statusLabel: STATUS_LABELS.processing,
    paymentStatus: 'pending',
    paymentStatusLabel: PAYMENT_LABELS.pending,
    priority: payload.priority ?? 'routine',
    priorityLabel: PRIORITY_LABELS[payload.priority ?? 'routine'],
    channel: payload.channel ?? 'walk_in',
    channelLabel: CHANNEL_LABELS[payload.channel ?? 'walk_in'],
    orderingDoctor: payload.ordering_doctor?.trim() ?? '',
    notes: payload.notes?.trim() ?? '',
    assignedTechnician: DEFAULT_TECHNICIAN.id,
    technicianName: DEFAULT_TECHNICIAN.name,
    scheduledAt: payload.scheduled_at,
    requestedAt: now,
    updatedAt: now,
    auditLogs: [
      createLocalAuditLog(1, 'Lab request created', now, user?.name?.trim() || 'Patient'),
      createLocalAuditLog(2, 'Sample received and queued for analysis', now),
      createLocalAuditLog(3, `Processing started by ${DEFAULT_TECHNICIAN.name}`, now),
    ],
    result: null,
  }

  saveLocalLabRequests([request, ...requests])
  return request
}

function mapLabResult(raw: Record<string, unknown>): LabResult {
  return {
    id: Number(raw.id ?? 0),
    reference: String(raw.reference ?? ''),
    summary: String(raw.summary ?? ''),
    file: raw.file ? String(raw.file) : null,
    filename: String(raw.filename ?? ''),
    flags: Array.isArray(raw.flags) ? raw.flags.map(String) : [],
    isAbnormal: Boolean(raw.is_abnormal),
    recommendation: String(raw.recommendation ?? ''),
    reviewedBy: raw.reviewed_by == null ? null : Number(raw.reviewed_by),
    reviewedByName: String(raw.reviewed_by_name ?? ''),
    uploadedAt: String(raw.uploaded_at ?? ''),
  }
}

function mapAuditLog(raw: Record<string, unknown>): LabAuditLog {
  return {
    id: Number(raw.id ?? 0),
    action: String(raw.action ?? ''),
    performedBy: raw.performed_by == null ? null : Number(raw.performed_by),
    performedByName: String(raw.performed_by_name ?? ''),
    timestamp: String(raw.timestamp ?? ''),
  }
}

function mapLabTest(raw: Record<string, unknown>): LabTest {
  const category = String(raw.category ?? '')
  return {
    id: Number(raw.id ?? 0),
    reference: String(raw.reference ?? ''),
    name: String(raw.name ?? ''),
    category,
    categoryLabel: CATEGORY_LABELS[category] ?? category,
    price: normalizeNumber(raw.price),
    turnaround: String(raw.turnaround ?? ''),
    sampleType: String(raw.sample_type ?? ''),
    description: String(raw.description ?? ''),
    isActive: Boolean(raw.is_active),
    createdAt: String(raw.created_at ?? ''),
  }
}

function mapLabRequest(raw: Record<string, unknown>): LabRequest {
  const status = String(raw.status ?? 'awaiting_sample') as LabRequestStatus
  const paymentStatus = String(raw.payment_status ?? 'pending') as LabPaymentStatus
  const priority = String(raw.priority ?? 'routine') as LabPriority
  const channel = String(raw.channel ?? 'walk_in') as LabChannel
  const category = String(raw.test_category ?? '')

  return {
    id: Number(raw.id ?? 0),
    reference: String(raw.reference ?? ''),
    test: raw.test == null ? null : Number(raw.test),
    testName: String(raw.test_name ?? ''),
    testCategory: category,
    testCategoryLabel: CATEGORY_LABELS[category] ?? category,
    testPrice: normalizeNumber(raw.test_price),
    testTurnaround: String(raw.test_turnaround ?? ''),
    testSampleType: String(raw.test_sample_type ?? ''),
    patient: raw.patient == null ? null : Number(raw.patient),
    patientName: String(raw.patient_name ?? ''),
    patientPhone: String(raw.patient_phone ?? ''),
    patientEmail: String(raw.patient_email ?? ''),
    status,
    statusLabel: STATUS_LABELS[status] ?? status,
    paymentStatus,
    paymentStatusLabel: PAYMENT_LABELS[paymentStatus] ?? paymentStatus,
    priority,
    priorityLabel: PRIORITY_LABELS[priority] ?? priority,
    channel,
    channelLabel: CHANNEL_LABELS[channel] ?? channel,
    orderingDoctor: String(raw.ordering_doctor ?? ''),
    notes: String(raw.notes ?? ''),
    assignedTechnician: raw.assigned_technician == null ? null : Number(raw.assigned_technician),
    technicianName: String(raw.technician_name ?? ''),
    scheduledAt: raw.scheduled_at ? String(raw.scheduled_at) : null,
    requestedAt: String(raw.requested_at ?? ''),
    updatedAt: String(raw.updated_at ?? ''),
    auditLogs: Array.isArray(raw.audit_logs) ? raw.audit_logs.map((item) => mapAuditLog(item as Record<string, unknown>)) : [],
    result: raw.result && typeof raw.result === 'object' ? mapLabResult(raw.result as Record<string, unknown>) : null,
  }
}

export async function fetchLabTests(): Promise<LabTest[]> {
  if (USE_LOCAL_LAB_FLOW) {
    return mapLocalFallbackTests()
  }
  try {
    const res = await apiClient.get('/lab/tests/')
    const payload = unwrap<unknown>(res.data, [])
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { results?: unknown[] })?.results)
        ? (payload as { results: unknown[] }).results
        : []
    return list.map((item) => mapLabTest(item as Record<string, unknown>))
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error
    return mapLocalFallbackTests()
  }
}

export async function fetchMyLabRequests(): Promise<LabRequest[]> {
  if (USE_LOCAL_LAB_FLOW) {
    return filterRequestsForCurrentUser(hydrateLocalLabRequests())
  }
  try {
    const res = await apiClient.get('/lab/requests/')
    const payload = unwrap<unknown>(res.data, [])
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { results?: unknown[] })?.results)
        ? (payload as { results: unknown[] }).results
        : []
    return list.map((item) => mapLabRequest(item as Record<string, unknown>))
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error
    return filterRequestsForCurrentUser(loadLocalLabRequests())
  }
}

export async function createLabRequest(payload: CreateLabRequestPayload): Promise<LabRequest> {
  if (USE_LOCAL_LAB_FLOW) {
    return createLocalLabRequest(payload)
  }
  try {
    const res = await apiClient.post('/lab/requests/', payload)
    return mapLabRequest(unwrap<Record<string, unknown>>(res.data, {}))
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error

    const tests = mapLocalFallbackTests()
    const selectedTest = tests.find((test) => test.id === payload.test)
    if (!selectedTest) {
      throw new Error('Selected lab test could not be found.')
    }

    const user = getStoredUser()
    const requests = loadLocalLabRequests()
    const now = new Date().toISOString()
    const nextId = nextLocalLabRequestId(requests)
    const record: LabRequest = {
      id: nextId,
      reference: `LAB-${nextId}`,
      test: selectedTest.id,
      testName: selectedTest.name,
      testCategory: selectedTest.category,
      testCategoryLabel: selectedTest.categoryLabel,
      testPrice: selectedTest.price,
      testTurnaround: selectedTest.turnaround,
      testSampleType: selectedTest.sampleType,
      patient: user?.id ?? null,
      patientName: payload.patient_name.trim(),
      patientPhone: payload.patient_phone.trim(),
      patientEmail: payload.patient_email?.trim() ?? '',
      status: 'awaiting_sample',
      statusLabel: STATUS_LABELS.awaiting_sample,
      paymentStatus: 'pending',
      paymentStatusLabel: PAYMENT_LABELS.pending,
      priority: payload.priority ?? 'routine',
      priorityLabel: PRIORITY_LABELS[payload.priority ?? 'routine'],
      channel: payload.channel ?? 'walk_in',
      channelLabel: CHANNEL_LABELS[payload.channel ?? 'walk_in'],
      orderingDoctor: payload.ordering_doctor?.trim() ?? '',
      notes: payload.notes?.trim() ?? '',
      assignedTechnician: null,
      technicianName: '',
      scheduledAt: payload.scheduled_at,
      requestedAt: now,
      updatedAt: now,
      auditLogs: [
        {
          id: 1,
          action: 'Lab request created',
          performedBy: user?.id ?? null,
          performedByName: user?.name?.trim() || 'Patient',
          timestamp: now,
        },
      ],
      result: null,
    }

    saveLocalLabRequests([record, ...requests])
    return record
  }
}
