export type LabCategory = 'Blood' | 'Cardiac' | 'Infectious' | 'Wellness' | 'Metabolic'
export type LabRequestStatus =
  | 'Awaiting sample'
  | 'Sample collected'
  | 'Processing'
  | 'Result ready'
  | 'Completed'
  | 'Cancelled'
export type LabPaymentStatus = 'Paid' | 'Pending'
export type LabPriority = 'Routine' | 'Priority'
export type LabChannel = 'Walk-in' | 'Collection'

export interface LabTest {
  id: string
  name: string
  category: LabCategory
  price: number
  turnaround: string
  sampleType: string
  description: string
}

export interface LabAuditEntry {
  time: string
  action: string
}

export interface LabRequest {
  id: string
  patientName: string
  patientPhone: string
  patientEmail?: string
  testId: string
  status: LabRequestStatus
  requestedAt: string
  scheduledAt: string
  paymentStatus: LabPaymentStatus
  priority: LabPriority
  channel: LabChannel
  orderingDoctor?: string
  notes?: string
  assignedTechnician?: string
  resultId?: string
  audit: LabAuditEntry[]
}

export interface LabResult {
  id: string
  requestId: string
  summary: string
  fileName: string
  uploadedAt: string
  flags: string[]
  abnormal: boolean
  recommendation?: string
  reviewedBy: string
}

const defaultLabTests: LabTest[] = [
  {
    id: 'LAB-T-001',
    name: 'Complete Blood Count (CBC)',
    category: 'Blood',
    price: 1500,
    turnaround: '24 hrs',
    sampleType: 'Blood',
    description: 'Measures red cells, white cells, and platelets.',
  },
  {
    id: 'LAB-T-002',
    name: 'Malaria Rapid Test',
    category: 'Infectious',
    price: 800,
    turnaround: '4 hrs',
    sampleType: 'Blood',
    description: 'Rapid antigen test for malaria detection.',
  },
  {
    id: 'LAB-T-003',
    name: 'HbA1c Test',
    category: 'Metabolic',
    price: 2200,
    turnaround: '48 hrs',
    sampleType: 'Blood',
    description: 'Average blood sugar levels for the past 3 months.',
  },
  {
    id: 'LAB-T-004',
    name: 'Lipid Profile',
    category: 'Cardiac',
    price: 2600,
    turnaround: '24 hrs',
    sampleType: 'Blood',
    description: 'Cholesterol and triglyceride levels.',
  },
  {
    id: 'LAB-T-005',
    name: 'Vitamin D',
    category: 'Wellness',
    price: 2800,
    turnaround: '48 hrs',
    sampleType: 'Blood',
    description: 'Checks vitamin D deficiency.',
  },
]

const defaultLabRequests: LabRequest[] = [
  {
    id: 'LAB-1001',
    patientName: 'Sarah M.',
    patientPhone: '+254 700 112 334',
    testId: 'LAB-T-001',
    status: 'Processing',
    requestedAt: '2026-02-06 02:10 PM',
    scheduledAt: '2026-02-07 10:00 AM',
    paymentStatus: 'Paid',
    priority: 'Routine',
    channel: 'Walk-in',
    orderingDoctor: 'Dr. Sarah Johnson',
    assignedTechnician: 'Samuel Kiptoo',
    audit: [
      { time: '2026-02-06 02:10 PM', action: 'Lab request created' },
      { time: '2026-02-07 09:58 AM', action: 'Sample collected at lab desk' },
      { time: '2026-02-07 10:20 AM', action: 'Processing started by Samuel Kiptoo' },
    ],
  },
  {
    id: 'LAB-1002',
    patientName: 'Brian K.',
    patientPhone: '+254 711 678 900',
    testId: 'LAB-T-003',
    status: 'Awaiting sample',
    requestedAt: '2026-02-06 01:20 PM',
    scheduledAt: '2026-02-07 12:30 PM',
    paymentStatus: 'Paid',
    priority: 'Priority',
    channel: 'Collection',
    orderingDoctor: 'Dr. Michael Chen',
    notes: 'Patient prefers home collection.',
    audit: [{ time: '2026-02-06 01:20 PM', action: 'Lab request created' }],
  },
  {
    id: 'LAB-1003',
    patientName: 'Aisha T.',
    patientPhone: '+254 722 345 900',
    testId: 'LAB-T-002',
    status: 'Completed',
    requestedAt: '2026-02-05 11:10 AM',
    scheduledAt: '2026-02-05 03:00 PM',
    paymentStatus: 'Paid',
    priority: 'Routine',
    channel: 'Walk-in',
    assignedTechnician: 'Samuel Kiptoo',
    resultId: 'RES-2001',
    audit: [
      { time: '2026-02-05 11:10 AM', action: 'Lab request created' },
      { time: '2026-02-05 03:08 PM', action: 'Sample collected at lab desk' },
      { time: '2026-02-05 03:25 PM', action: 'Processing started by Samuel Kiptoo' },
      { time: '2026-02-05 06:12 PM', action: 'Lab result uploaded by Samuel Kiptoo' },
      { time: '2026-02-05 06:40 PM', action: 'Patient marked result as received' },
    ],
  },
]

const defaultLabResults: LabResult[] = [
  {
    id: 'RES-2001',
    requestId: 'LAB-1003',
    summary: 'No malaria parasites detected.',
    fileName: 'LAB-1003-malaria.pdf',
    uploadedAt: '2026-02-05 06:12 PM',
    flags: [],
    abnormal: false,
    recommendation: 'Continue current hydration and follow-up only if symptoms persist.',
    reviewedBy: 'Samuel Kiptoo',
  },
]

const STORAGE = {
  tests: 'ava_lab_tests',
  requests: 'ava_lab_requests',
  results: 'ava_lab_results',
}

const safeLoad = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(fallback))
      return fallback
    }
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

const nowLabel = () => new Date().toLocaleString()

export const loadLabTests = () => safeLoad(STORAGE.tests, defaultLabTests)

export const saveLabTests = (tests: LabTest[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE.tests, JSON.stringify(tests))
}

export const loadLabRequests = () => safeLoad(STORAGE.requests, defaultLabRequests)

export const saveLabRequests = (requests: LabRequest[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE.requests, JSON.stringify(requests))
}

export const loadLabResults = () => safeLoad(STORAGE.results, defaultLabResults)

export const saveLabResults = (results: LabResult[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE.results, JSON.stringify(results))
}

export const nextLabRequestId = (requests: LabRequest[]) => {
  const maxId = requests.reduce((max, request) => {
    const value = Number.parseInt(request.id.replace('LAB-', ''), 10)
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 1000)
  return `LAB-${maxId + 1}`
}

export const nextLabResultId = (results: LabResult[]) => {
  const maxId = results.reduce((max, result) => {
    const value = Number.parseInt(result.id.replace('RES-', ''), 10)
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 2000)
  return `RES-${maxId + 1}`
}

const addAudit = (request: LabRequest, action: string) => {
  return {
    ...request,
    audit: [{ time: nowLabel(), action }, ...(request.audit ?? [])],
  }
}

export const createLabRequest = (
  requests: LabRequest[],
  payload: {
    patientName: string
    patientPhone: string
    patientEmail?: string
    testId: string
    scheduledAt: string
    paymentStatus: LabPaymentStatus
    priority: LabPriority
    channel: LabChannel
    orderingDoctor?: string
    notes?: string
  }
) => {
  const request: LabRequest = {
    id: nextLabRequestId(requests),
    patientName: payload.patientName.trim(),
    patientPhone: payload.patientPhone.trim(),
    patientEmail: payload.patientEmail?.trim() || undefined,
    testId: payload.testId,
    status: 'Awaiting sample',
    requestedAt: nowLabel(),
    scheduledAt: payload.scheduledAt.trim(),
    paymentStatus: payload.paymentStatus,
    priority: payload.priority,
    channel: payload.channel,
    orderingDoctor: payload.orderingDoctor?.trim() || undefined,
    notes: payload.notes?.trim() || undefined,
    audit: [{ time: nowLabel(), action: 'Lab request created' }],
  }

  return [request, ...requests]
}

const requestStatusTransitions: Record<LabRequestStatus, LabRequestStatus[]> = {
  'Awaiting sample': ['Sample collected', 'Cancelled'],
  'Sample collected': ['Processing', 'Cancelled'],
  Processing: ['Result ready', 'Cancelled'],
  'Result ready': ['Completed'],
  Completed: [],
  Cancelled: [],
}

export const canTransitionLabStatus = (from: LabRequestStatus, to: LabRequestStatus) => {
  return requestStatusTransitions[from].includes(to)
}

export const getNextLabStatus = (status: LabRequestStatus): LabRequestStatus | null => {
  if (status === 'Awaiting sample') return 'Sample collected'
  if (status === 'Sample collected') return 'Processing'
  if (status === 'Result ready') return 'Completed'
  return null
}

export const updateLabRequestStatus = (
  requests: LabRequest[],
  requestId: string,
  nextStatus: LabRequestStatus,
  actor: string,
  note?: string
) => {
  return requests.map((request) => {
    if (request.id !== requestId) return request
    if (request.status === nextStatus) return request
    if (!canTransitionLabStatus(request.status, nextStatus)) return request
    const suffix = note?.trim() ? ` (${note.trim()})` : ''
    return addAudit({ ...request, status: nextStatus }, `Status set to ${nextStatus} by ${actor}${suffix}`)
  })
}

export const assignLabTechnician = (
  requests: LabRequest[],
  requestId: string,
  technician: string
) => {
  return requests.map((request) => {
    if (request.id !== requestId) return request
    return addAudit(
      { ...request, assignedTechnician: technician },
      `Assigned technician ${technician}`
    )
  })
}

export const upsertLabResult = (
  requests: LabRequest[],
  results: LabResult[],
  payload: {
    requestId: string
    summary: string
    fileName?: string
    flags?: string[]
    abnormal: boolean
    recommendation?: string
    reviewedBy: string
  }
) => {
  const existing = results.find((result) => result.requestId === payload.requestId)
  const nextResultId = existing?.id ?? nextLabResultId(results)
  const resultRecord: LabResult = {
    id: nextResultId,
    requestId: payload.requestId,
    summary: payload.summary.trim(),
    fileName: payload.fileName?.trim() || `${payload.requestId}-result.pdf`,
    uploadedAt: nowLabel(),
    flags: payload.flags ?? [],
    abnormal: payload.abnormal,
    recommendation: payload.recommendation?.trim() || undefined,
    reviewedBy: payload.reviewedBy.trim() || 'Lab Technician',
  }

  const nextResults = existing
    ? results.map((result) => (result.requestId === payload.requestId ? resultRecord : result))
    : [resultRecord, ...results]

  const nextRequests = requests.map((request) => {
    if (request.id !== payload.requestId) return request
    const action = existing
      ? `Lab result updated by ${resultRecord.reviewedBy}`
      : `Lab result uploaded by ${resultRecord.reviewedBy}`
    return addAudit(
      {
        ...request,
        status: 'Result ready',
        resultId: resultRecord.id,
      },
      action
    )
  })

  return {
    requests: nextRequests,
    results: nextResults,
  }
}

export const markLabResultReceived = (requests: LabRequest[], requestId: string) => {
  return requests.map((request) => {
    if (request.id !== requestId) return request
    if (request.status !== 'Result ready') return request
    return addAudit({ ...request, status: 'Completed' }, 'Patient marked result as received')
  })
}

export const cancelLabRequest = (requests: LabRequest[], requestId: string, actor: string) => {
  return requests.map((request) => {
    if (request.id !== requestId) return request
    if (!canTransitionLabStatus(request.status, 'Cancelled')) return request
    return addAudit({ ...request, status: 'Cancelled' }, `Request cancelled by ${actor}`)
  })
}
