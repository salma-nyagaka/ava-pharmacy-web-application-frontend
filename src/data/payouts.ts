import { loadConsultations, loadDoctorProfiles } from './telemedicine'
import { loadLabRequests } from './labs'
import { loadLabPartners } from './labPartners'
import { loadPrescriptionRecords } from './prescriptions'
import { loadPayoutRules } from './payoutRules'

export type PayoutRole = 'Doctor' | 'Pediatrician' | 'Lab Technician' | 'Lab Partner' | 'Pharmacist'
export type PayoutMethod = 'Bank Transfer' | 'M-Pesa' | 'Card' | 'Cheque' | 'Cash'
export type PayoutStatus = 'Pending' | 'Paid' | 'Failed'
export type PayoutTaskType = 'Consultation' | 'Lab Result' | 'Lab Delivery' | 'Prescription'

export interface AdminPayout {
  id: string
  recipientId?: string
  recipientName: string
  role: PayoutRole
  period: string
  amount: number
  method: PayoutMethod
  reference: string
  status: PayoutStatus
  requestedAt: string
  paidAt?: string
  notes?: string
  source?: 'Automatic' | 'Manual'
  taskType?: PayoutTaskType
  taskId?: string
  completedAt?: string
}

const STORAGE_KEY = 'ava_admin_payouts'

const defaultPayouts: AdminPayout[] = []

export const loadAdminPayouts = (): AdminPayout[] => {
  const autoPayouts = buildAutoPayoutsFromTasks()
  if (typeof window === 'undefined') return defaultPayouts

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const merged = mergeAutoPayouts(defaultPayouts, autoPayouts)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      return merged
    }
    const parsed = JSON.parse(raw)
    const resolved = Array.isArray(parsed) ? parsed : defaultPayouts
    return mergeAutoPayouts(resolved, autoPayouts)
  } catch {
    return mergeAutoPayouts(defaultPayouts, autoPayouts)
  }
}

export const saveAdminPayouts = (payouts: AdminPayout[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payouts))
}

const buildAutoPayoutsFromTasks = (): AdminPayout[] => {
  const doctors = loadDoctorProfiles()
  const doctorMap = new Map(doctors.map((doctor) => [doctor.id, doctor]))
  const rules = loadPayoutRules()
  const ruleMap = new Map(rules.map((rule) => [rule.role, rule]))
  const labPartners = loadLabPartners()
  const labPartnerMap = new Map(labPartners.map((partner) => [partner.id, partner]))
  const labTechs = labPartners.flatMap((partner) => partner.techs.map((tech) => ({ ...tech, partnerId: partner.id })))
  const labTechByName = new Map(labTechs.map((tech) => [tech.name.toLowerCase(), tech]))

  const consultationPayouts: AdminPayout[] = loadConsultations()
    .filter((consult) => consult.status === 'Completed')
    .map((consult) => {
      const doctor = doctorMap.get(consult.doctorId)
      const role: PayoutRole = doctor?.type === 'Pediatrician' ? 'Pediatrician' : 'Doctor'
      const rule = ruleMap.get(role)
      if (!rule || !rule.active) return null
      const amount = rule.amount
      return {
        id: `PAY-CONSULT-${consult.id}`,
        recipientId: consult.doctorId,
        recipientName: doctor?.name ?? `Doctor ${consult.doctorId}`,
        role,
        period: consult.scheduledAt,
        amount,
        method: 'M-Pesa',
        reference: `AUTO-${consult.id}`,
        status: 'Pending',
        requestedAt: consult.lastMessageAt || consult.scheduledAt,
        notes: 'Auto-generated from completed consultation.',
        source: 'Automatic',
        taskType: 'Consultation',
        taskId: consult.id,
        completedAt: consult.lastMessageAt || consult.scheduledAt,
      }
    })
    .filter(Boolean) as AdminPayout[]

  const labRequests = loadLabRequests()
  const labTechById = new Map(labTechs.map((tech) => [tech.id, tech]))

  const labTechPayouts: AdminPayout[] = labRequests
    .filter((request) => request.status === 'Result ready' || request.status === 'Completed')
    .map((request) => {
      const techName = request.assignedTechnician?.trim()
      const tech = techName ? labTechByName.get(techName.toLowerCase()) : undefined
      const resolvedTech = tech ?? (request.labTechId ? labTechById.get(request.labTechId) : undefined)
      const resolvedName = resolvedTech?.name ?? techName
      if (!resolvedName) return null
      const role: PayoutRole = 'Lab Technician'
      const rule = ruleMap.get(role)
      if (!rule || !rule.active) return null
      const amount = rule.amount
      return {
        id: `PAY-LABTECH-${request.id}`,
        recipientId: resolvedTech?.id ?? request.labTechId,
        recipientName: resolvedName,
        role,
        period: request.scheduledAt,
        amount,
        method: 'M-Pesa',
        reference: `AUTO-${request.id}`,
        status: 'Pending',
        requestedAt: request.scheduledAt,
        notes: 'Auto-generated from lab result publication.',
        source: 'Automatic',
        taskType: 'Lab Result',
        taskId: request.id,
        completedAt: request.scheduledAt,
      } as AdminPayout
    })
    .filter(Boolean) as AdminPayout[]

  const labPartnerPayouts: AdminPayout[] = labRequests
    .filter((request) => request.status === 'Completed')
    .map((request) => {
      const techName = request.assignedTechnician?.trim()
      const tech = techName ? labTechByName.get(techName.toLowerCase()) : undefined
      const partnerId = request.labPartnerId ?? tech?.partnerId
      const partner = partnerId ? labPartnerMap.get(partnerId) : undefined
      const role: PayoutRole = 'Lab Partner'
      const rule = ruleMap.get(role)
      if (!rule || !rule.active) return null
      const amount = rule.amount
      return {
        id: `PAY-LABPARTNER-${request.id}`,
        recipientId: partner?.id ?? partnerId,
        recipientName: partner?.name ?? 'Lab Partner',
        role,
        period: request.scheduledAt,
        amount,
        method: partner?.payoutMethod ?? 'Bank Transfer',
        reference: `AUTO-${request.id}`,
        status: 'Pending',
        requestedAt: request.scheduledAt,
        notes: 'Auto-generated from lab delivery completion.',
        source: 'Automatic',
        taskType: 'Lab Delivery',
        taskId: request.id,
        completedAt: request.scheduledAt,
      }
    })
    .filter(Boolean) as AdminPayout[]

  const prescriptionRecords = loadPrescriptionRecords()
  const pharmacistPayouts: AdminPayout[] = prescriptionRecords
    .filter((record) => record.status === 'Approved' && record.dispatchStatus === 'Delivered')
    .map((record) => {
      const role: PayoutRole = 'Pharmacist'
      const rule = ruleMap.get(role)
      if (!rule || !rule.active) return null
      const amount = rule.amount
      const completedAt = record.audit?.[0]?.time ?? record.submitted
      return {
        id: `PAY-PHARM-${record.id}`,
        recipientName: record.pharmacist || 'Pharmacist',
        role,
        period: record.submitted,
        amount,
        method: 'M-Pesa',
        reference: `AUTO-${record.id}`,
        status: 'Pending',
        requestedAt: record.submitted,
        notes: 'Auto-generated from dispensed prescription.',
        source: 'Automatic',
        taskType: 'Prescription',
        taskId: record.id,
        completedAt,
      }
    })
    .filter(Boolean) as AdminPayout[]

  return [...consultationPayouts, ...labTechPayouts, ...labPartnerPayouts, ...pharmacistPayouts]
}

const mergeAutoPayouts = (existing: AdminPayout[], autoPayouts: AdminPayout[]) => {
  const autoMap = new Map(autoPayouts.map((payout) => [payout.id, payout]))
  const updatedExisting = existing.map((payout) => {
    const auto = autoMap.get(payout.id)
    if (!auto) return payout
    if (payout.source === 'Manual') return payout
    return {
      ...auto,
      status: payout.status ?? auto.status,
      paidAt: payout.paidAt ?? auto.paidAt,
      notes: payout.notes ?? auto.notes,
      method: payout.method ?? auto.method,
      reference: payout.reference ?? auto.reference,
      source: 'Automatic',
    }
  })
  const existingIds = new Set(existing.map((payout) => payout.id))
  const missing = autoPayouts.filter((payout) => !existingIds.has(payout.id))
  if (missing.length === 0) return updatedExisting
  return [...missing, ...updatedExisting]
}
