import {
  PrescriptionAuditEntry,
  PrescriptionRecord,
  appendPrescriptionAudit,
  createUploadedPrescription,
  loadPrescriptionRecords,
  savePrescriptionRecords,
} from '../data/prescriptions'
import { toApiResult } from './mockApi'

type UploadPayload = {
  patient: string
  doctor: string
  notes?: string
  files: string[]
}

export const prescriptionService = {
  list: async () => toApiResult(loadPrescriptionRecords()),
  saveAll: async (records: PrescriptionRecord[]) => {
    savePrescriptionRecords(records)
    return toApiResult(records)
  },
  upload: async (payload: UploadPayload) => {
    const current = loadPrescriptionRecords()
    const updated = createUploadedPrescription(current, payload)
    savePrescriptionRecords(updated)
    return toApiResult(updated)
  },
  update: async (prescriptionId: string, updates: Partial<PrescriptionRecord>, auditAction?: string) => {
    const current = loadPrescriptionRecords()
    const updated = current.map((item) => (
      item.id === prescriptionId ? { ...item, ...updates } : item
    ))
    const withAudit = auditAction ? appendPrescriptionAudit(updated, prescriptionId, auditAction) : updated
    savePrescriptionRecords(withAudit)
    return toApiResult(withAudit)
  },
  appendAudit: async (prescriptionId: string, entry: PrescriptionAuditEntry | string) => {
    const action = typeof entry === 'string' ? entry : entry.action
    const current = loadPrescriptionRecords()
    const updated = appendPrescriptionAudit(current, prescriptionId, action)
    savePrescriptionRecords(updated)
    return toApiResult(updated)
  },
}
