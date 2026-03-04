export type PrescriptionStatus = 'Pending' | 'Approved' | 'Clarification' | 'Rejected'
export type DispatchStatus = 'Not started' | 'Queued' | 'Packed' | 'Dispatched' | 'Delivered'

export interface PrescriptionItem {
  name: string
  dose: string
  frequency: string
  qty: number
}

export interface PrescriptionAuditEntry {
  time: string
  action: string
}

export interface PrescriptionRecord {
  id: string
  patient: string
  pharmacist: string
  status: PrescriptionStatus
  dispatchStatus: DispatchStatus
  submitted: string
  doctor: string
  files: string[]
  items: PrescriptionItem[]
  notes: string
  audit: PrescriptionAuditEntry[]
}

const STORAGE_KEY = 'ava_prescription_records'

const defaultRecords: PrescriptionRecord[] = [
  {
    id: 'RX-2041',
    patient: 'Sarah M.',
    pharmacist: 'Grace N.',
    status: 'Approved',
    dispatchStatus: 'Delivered',
    submitted: '2026-01-21',
    doctor: 'Dr. Sarah Johnson',
    files: ['RX-2041-scan.pdf'],
    items: [
      { name: 'Amoxicillin 250mg', dose: '1 capsule', frequency: '2x daily', qty: 14 },
      { name: 'Vitamin C 1000mg', dose: '1 tablet', frequency: '1x daily', qty: 10 },
    ],
    notes: 'Patient requested delivery after 6 PM.',
    audit: [
      { time: '2026-01-21 09:12', action: 'Approved by Grace N.' },
      { time: '2026-01-21 09:20', action: 'Queued for dispatch' },
      { time: '2026-01-21 10:00', action: 'Packed for courier handoff' },
      { time: '2026-01-21 12:45', action: 'Delivered to customer' },
    ],
  },
  {
    id: 'RX-2040',
    patient: 'Brian K.',
    pharmacist: 'John K.',
    status: 'Pending',
    dispatchStatus: 'Not started',
    submitted: '2026-01-22',
    doctor: 'Dr. Michael Chen',
    files: ['RX-2040-photo.jpg'],
    items: [
      { name: 'Ibuprofen 400mg', dose: '1 tablet', frequency: '3x daily', qty: 21 },
    ],
    notes: 'Needs clarification on dosage duration.',
    audit: [{ time: '2026-01-22 10:05', action: 'Assigned to John K.' }],
  },
  {
    id: 'RX-2038',
    patient: 'Aisha T.',
    pharmacist: 'Grace N.',
    status: 'Clarification',
    dispatchStatus: 'Not started',
    submitted: '2026-01-20',
    doctor: 'Dr. Mercy Otieno',
    files: ['RX-2038-scan.pdf'],
    items: [
      { name: 'Paracetamol 500mg', dose: '2 tablets', frequency: '2x daily', qty: 20 },
      { name: 'Cough Syrup', dose: '10 ml', frequency: '3x daily', qty: 1 },
    ],
    notes: 'Waiting on updated prescription image.',
    audit: [{ time: '2026-01-20 15:40', action: 'Clarification requested' }],
  },
]

const toIsoDate = () => {
  return new Date().toISOString().slice(0, 10)
}

const toAuditTime = () => {
  return new Date().toLocaleString()
}

export const loadPrescriptionRecords = (): PrescriptionRecord[] => {
  if (typeof window === 'undefined') return defaultRecords
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultRecords))
      return defaultRecords
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : defaultRecords
  } catch {
    return defaultRecords
  }
}

export const savePrescriptionRecords = (records: PrescriptionRecord[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export const nextPrescriptionId = (records: PrescriptionRecord[]) => {
  const maxId = records.reduce((max, item) => {
    const parsed = Number.parseInt(item.id.replace('RX-', ''), 10)
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max
  }, 2000)
  return `RX-${maxId + 1}`
}

export const createUploadedPrescription = (
  records: PrescriptionRecord[],
  payload: {
    patient: string
    doctor: string
    notes?: string
    files: string[]
  }
) => {
  const newRecord: PrescriptionRecord = {
    id: nextPrescriptionId(records),
    patient: payload.patient || 'Ava Customer',
    doctor: payload.doctor || 'Doctor not specified',
    submitted: toIsoDate(),
    pharmacist: 'Unassigned',
    status: 'Pending',
    dispatchStatus: 'Not started',
    files: payload.files,
    items: [
      { name: 'Pending pharmacist review', dose: '-', frequency: '-', qty: 0 },
    ],
    notes: payload.notes || 'Uploaded from customer portal',
    audit: [{ time: toAuditTime(), action: `Uploaded ${payload.files.length} file(s) by customer` }],
  }

  return [newRecord, ...records]
}

export const appendPrescriptionAudit = (
  records: PrescriptionRecord[],
  prescriptionId: string,
  action: string
) => {
  return records.map((item) =>
    item.id === prescriptionId
      ? {
        ...item,
        audit: [{ time: toAuditTime(), action }, ...(item.audit ?? [])],
      }
      : item
  )
}
