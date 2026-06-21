import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  Consultation,
  DoctorEarning,
  DoctorMessage,
  DoctorMessageThread,
  DoctorProfile,
  DoctorPrescription,
  DoctorPrescriptionItem,
  loadConsultations,
  loadDoctorEarnings,
  loadDoctorMessages,
  loadDoctorPrescriptions,
  loadDoctorProfiles,
  saveConsultations,
  saveDoctorEarnings,
  saveDoctorMessages,
  saveDoctorPrescriptions,
} from '../../data/telemedicine'
import {
  createPediatricianPrescription,
  fetchConsultation,
  fetchClinicianEarnings,
  fetchPediatricianPrescriptions,
  fetchPediatricianConsultations,
  searchPediatricianCatalogVariants,
  sendConsultationMessage,
  sendPediatricianPrescription,
  updateConsultation,
  type ClinicianEarningRecord,
  type ClinicianCatalogVariant,
  type ClinicianPrescription,
  type ConsultationRecord,
} from '../../services/consultationService'
import ProfessionalPortalShell from '../../components/ProfessionalPortalShell/ProfessionalPortalShell'
import { useConsultationSocket, type SocketMessage } from '../../hooks/useConsultationSocket'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/portals/DoctorDashboardPage.css'
import '../../styles/portals/PediatricianDashboardPage.css'

type PediatricTab = 'queue' | 'consents' | 'prescriptions' | 'profiles' | 'earnings'

type PediatricClinicalNoteKey = 'complaint' | 'history' | 'exam' | 'diagnosis' | 'plan' | 'followUp' | 'assessment'

type PediatricClinicalNotes = Record<PediatricClinicalNoteKey, string>

type ChildClinicalProfile = {
  child: string
  age: number
  ageMonths: number
  gender: string
  dob: string
  bloodGroup: string
  guardian: string
  relationship: string
  phone: string
  email: string
  emergencyContact: string
  lastVisit: string
  weightKg?: number
  heightCm: number
  bmi: string
  headCircumference: string
  growthPercentile: string
  growthStatus: string
  allergies: string[]
  chronicConditions: string[]
  currentMedication: string[]
  vaccinations: {
    received: string[]
    upcoming: string[]
    missed: string[]
  }
  hospitalizations: string[]
  documents: string[]
}

const STATUS_COLORS: Record<string, string> = {
  Waiting: '#f59e0b',
  'In progress': '#2563EB',
  Completed: '#16A34A',
  Cancelled: '#6B7280',
}

const RX_STATUS_COLORS: Record<string, string> = {
  Draft: '#f59e0b',
  Sent: '#2563EB',
  Dispensed: '#16A34A',
}

function initials(name: string) {
  return name
    .replace(/^(Guardian|Dr\.?)[\s:]+/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function consultStep(status: Consultation['status']) {
  if (status === 'Waiting') return 0
  if (status === 'In progress') return 1
  if (status === 'Completed') return 2
  return -1
}

const CONSULT_STEPS = ['Waiting', 'In progress', 'Completed']

function timelineTime(value: string) {
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function formatTimelineDate(value: string) {
  const time = timelineTime(value)
  if (!time) return value || 'Not dated'
  return new Date(time).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function consultationNumericId(id: string) {
  const numericId = Number(String(id).replace(/\D/g, ''))
  return Number.isFinite(numericId) && numericId > 0 ? numericId : null
}

function prescriptionMatchesConsultation(rx: DoctorPrescription, consultationId: string) {
  return rx.notes.toLowerCase().includes(consultationId.toLowerCase())
}

function medicationSummary(items: DoctorPrescriptionItem[]) {
  if (items.length === 0) return 'No medication items'
  const [first, ...rest] = items
  return `${first.name || 'Medication'}${rest.length > 0 ? ` + ${rest.length} more` : ''}`
}

const CONSULT_STATUS_FROM_API: Record<string, Consultation['status']> = {
  waiting: 'Waiting',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const CONSULT_STATUS_TO_API: Record<Consultation['status'], ConsultationRecord['status']> = {
  Waiting: 'waiting',
  'In progress': 'in_progress',
  Completed: 'completed',
  Cancelled: 'cancelled',
}

function formatBackendDate(value: string | null | undefined) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function mapBackendPediatricConsultation(record: ConsultationRecord, doctorId: string): Consultation {
  return {
    id: record.reference || `CONS-${record.id}`,
    backendId: record.id,
    doctorId,
    patientName: record.patientName || record.guardianName || 'Guardian',
    patientAge: record.patientAge ?? 0,
    issue: record.issue,
    status: CONSULT_STATUS_FROM_API[record.status] ?? 'Waiting',
    scheduledAt: formatBackendDate(record.scheduledAt || record.createdAt),
    channel: 'Chat',
    priority: record.priority === 'priority' ? 'Priority' : 'Routine',
    lastMessageAt: formatBackendDate(record.lastMessageAt || record.updatedAt),
    pediatric: true,
    guardianName: record.guardianName || record.patientName,
    childName: record.childName || record.patientName,
    childAge: record.childAge ?? undefined,
    weightKg: record.weightKg == null ? undefined : Number(record.weightKg),
    consentStatus: record.consentStatus === 'granted' ? 'Granted' : 'Pending',
    dosageAlert: record.dosageAlert,
  }
}

function mapBackendPediatricThread(record: ConsultationRecord, doctorId: string): DoctorMessageThread {
  const messages = record.messages.map((message) => ({
    id: String(message.id),
    sender: message.senderName === record.patientName ? 'patient' as const : 'doctor' as const,
    text: message.message,
    time: message.sentAt ? new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
  }))
  return {
    id: `CONS-${record.id}`,
    backendConsultationId: record.id,
    doctorId,
    patientName: record.childName || record.patientName || 'Child',
    lastMessage: messages[messages.length - 1]?.text || record.issue,
    lastMessageAt: formatBackendDate(record.lastMessageAt || record.updatedAt),
    unreadCount: 0,
    status: record.status === 'completed' ? 'Resolved' : 'Open',
    messages,
  }
}

function mapSocketMessage(message: SocketMessage, currentUserId: number | null | undefined): DoctorMessage {
  const sentAt = message.sentAt ? new Date(message.sentAt) : null
  return {
    id: String(message.id),
    sender: message.sender == null ? 'system' : message.sender === currentUserId ? 'doctor' : 'patient',
    text: message.message,
    time: sentAt && !Number.isNaN(sentAt.getTime())
      ? sentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '',
  }
}

function mergeThreadMessage(thread: DoctorMessageThread, message: DoctorMessage, lastMessageAt: string): DoctorMessageThread {
  if (thread.messages.some((item) => item.id === message.id)) return thread
  return {
    ...thread,
    lastMessage: message.text || thread.lastMessage,
    lastMessageAt,
    messages: [...thread.messages, message],
  }
}

function mapBackendPediatricPrescription(rx: ClinicianPrescription, doctorId: string): DoctorPrescription {
  const consultationId = rx.consultation_id ?? rx.consultation ?? null
  return {
    id: rx.reference,
    backendId: rx.id,
    doctorId,
    patientName: rx.patient_name,
    createdAt: rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
    status: rx.status === 'sent' ? 'Sent' : rx.status === 'dispensed' ? 'Dispensed' : 'Draft',
    notes: rx.notes || (consultationId ? `Consultation #${consultationId}` : 'No notes provided.'),
    pediatric: true,
    items: (rx.items || []).map((item) => ({
      name: item.drug_name || item.catalog_name || 'Medication',
      dosage: [item.dose, item.frequency, item.duration].filter(Boolean).join(' · ') || '-',
      quantity: item.quantity ?? 1,
      variantId: item.variant_id ?? item.product_variant_id ?? null,
      productId: item.product_id ?? null,
      sku: item.sku,
      catalogName: item.catalog_name,
      catalogFallback: item.catalog_fallback,
    })),
  }
}

function mapBackendPediatricEarning(row: ClinicianEarningRecord, doctorId: string): DoctorEarning {
  const earnedAt = row.earned_at ? new Date(row.earned_at) : new Date()
  const payoutDate = new Date(earnedAt)
  payoutDate.setDate(payoutDate.getDate() + 7)
  return {
    id: `EARN-${row.id}`,
    doctorId,
    period: row.description || earnedAt.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' }),
    consults: row.consultation ? 1 : 0,
    revenue: Number(row.amount) || 0,
    payoutDate: payoutDate.toISOString().slice(0, 10),
    status: 'Scheduled',
  }
}

function PediatricTimeline({ items }: { items: Array<{ type: string; date: string; summary: string }> }) {
  return (
    <div className="doc-timeline pd-history-timeline">
      {items.map((item, i) => (
        <div key={i} className="doc-timeline__item">
          <div className="doc-timeline__dot" data-type={item.type} />
          <div className="doc-timeline__content">
            <p className="doc-timeline__date">{formatTimelineDate(item.date)}</p>
            <p className="doc-timeline__summary">{item.summary}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function getAgeBandInfo(ageYears: number | undefined, ageMonths?: number): { label: string; color: string; bg: string } {
  const totalMonths = ageYears !== undefined ? ageYears * 12 + (ageMonths || 0) : 0
  if (totalMonths < 24) return { label: 'Infant', color: '#f97316', bg: '#fff7ed' }
  if (totalMonths < 60) return { label: 'Toddler', color: '#f59e0b', bg: '#fffbeb' }
  if (totalMonths < 144) return { label: 'Child', color: '#06B6D4', bg: '#ECFEFF' }
  return { label: 'Teen', color: '#8b5cf6', bg: '#f5f3ff' }
}

function AgeBand({ ageYears, ageMonths }: { ageYears?: number; ageMonths?: number }) {
  const band = getAgeBandInfo(ageYears, ageMonths)
  return (
    <span className="ped-age-band" style={{ color: band.color, background: band.bg }}>
      {band.label}
    </span>
  )
}

function formatPediatricAge(ageYears?: number, ageMonths?: number): string {
  const totalMonths = (ageYears || 0) * 12 + (ageMonths || 0)
  if (totalMonths < 24) return `${totalMonths} months`
  if (totalMonths < 36) return `${ageYears}y ${ageMonths || 0}m`
  return `${ageYears} years`
}

const WHO_WEIGHT_PERCENTILES = {
  p3:  [3.4,4.4,5.1,5.7,6.2,6.7,7.1,7.4,7.7,8.0,8.2,8.4,8.6,8.9,9.2,9.5,9.7,9.9,10.1,10.3,10.5,10.7,10.9,11.1,11.3],
  p50: [3.3,4.5,5.6,6.4,7.0,7.5,7.9,8.3,8.6,8.9,9.2,9.4,9.6,9.9,10.1,10.3,10.5,10.7,10.9,11.1,11.3,11.5,11.8,12.0,12.2],
  p97: [4.2,5.7,6.9,7.7,8.4,9.0,9.5,9.9,10.3,10.7,11.0,11.3,11.6,12.0,12.3,12.6,12.9,13.2,13.5,13.8,14.1,14.4,14.7,15.0,15.3],
}

function GrowthChart({ weightKg, ageMonths }: { weightKg?: number; ageMonths?: number }) {
  if (!weightKg || ageMonths === undefined) return null
  const months = Math.min(ageMonths, 24)
  const maxIdx = WHO_WEIGHT_PERCENTILES.p3.length - 1
  const idx = Math.min(months, maxIdx)
  const p3 = WHO_WEIGHT_PERCENTILES.p3[idx]
  const p50 = WHO_WEIGHT_PERCENTILES.p50[idx]
  const p97 = WHO_WEIGHT_PERCENTILES.p97[idx]
  const minW = 2.5, maxW = 16
  const toY = (w: number) => 120 - ((w - minW) / (maxW - minW)) * 100
  const patientY = toY(Math.min(maxW, Math.max(minW, weightKg)))
  const allMonths = Array.from({ length: maxIdx + 1 }, (_, i) => i)
  void allMonths
  const toX = (m: number) => (m / maxIdx) * 220 + 20
  const path = (arr: number[]) => arr.map((w, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(w)}`).join(' ')
  return (
    <div className="ped-growth-chart">
      <p className="ped-growth-chart__title">Weight-for-Age (WHO 0–24 months)</p>
      <svg viewBox="0 0 260 140" width="100%" style={{ maxWidth: 320 }}>
        <path d={path(WHO_WEIGHT_PERCENTILES.p97)} fill="none" stroke="#bfdbfe" strokeWidth="1.5" />
        <path d={path(WHO_WEIGHT_PERCENTILES.p50)} fill="none" stroke="#93c5fd" strokeWidth="2" />
        <path d={path(WHO_WEIGHT_PERCENTILES.p3)} fill="none" stroke="#bfdbfe" strokeWidth="1.5" />
        <text x="238" y={toY(WHO_WEIGHT_PERCENTILES.p97[maxIdx])} fontSize="7" fill="#93c5fd">P97</text>
        <text x="238" y={toY(WHO_WEIGHT_PERCENTILES.p50[maxIdx])} fontSize="7" fill="#06B6D4">P50</text>
        <text x="238" y={toY(WHO_WEIGHT_PERCENTILES.p3[maxIdx])} fontSize="7" fill="#93c5fd">P3</text>
        {ageMonths <= 24 && (
          <circle cx={toX(months)} cy={patientY} r="5" fill="#ef4444" stroke="#fff" strokeWidth="2" />
        )}
        <text x={toX(0)} y="138" fontSize="7" fill="#94a3b8">0m</text>
        <text x={toX(12)} y="138" fontSize="7" fill="#94a3b8">12m</text>
        <text x={toX(24)} y="138" fontSize="7" fill="#94a3b8">24m</text>
      </svg>
      <p className="ped-growth-chart__meta">
        {weightKg}kg at {ageMonths}m_ {
          weightKg < p3 ? 'Below P3 (underweight)' :
          weightKg > p97 ? 'Above P97 (overweight)' :
          weightKg >= p50 ? `Above median (P50: ${p50}kg)` :
          `Below median (P50: ${p50}kg)`
        }
      </p>
    </div>
  )
}

function DosingCalculator({ weightKg }: { weightKg?: number }) {
  const [drug, setDrug] = useState('')
  const [mgPerKg, setMgPerKg] = useState('')
  const dose = weightKg && mgPerKg ? (weightKg * parseFloat(mgPerKg)).toFixed(1) : null
  return (
    <div className="ped-dosing-calc">
      <p className="ped-dosing-calc__title">Dosing Calculator</p>
      <div className="ped-dosing-calc__row">
        <input
          placeholder="Drug name"
          value={drug}
          onChange={e => setDrug(e.target.value)}
          className="ped-dosing-calc__input"
        />
        <input
          type="number"
          placeholder="mg/kg"
          value={mgPerKg}
          onChange={e => setMgPerKg(e.target.value)}
          className="ped-dosing-calc__input"
          min="0"
          step="0.1"
        />
      </div>
      {dose && (
        <p className="ped-dosing-calc__result">
          {drug || 'Dose'}: <strong>{dose} mg</strong>
          {weightKg && <span> ({weightKg}kg × {mgPerKg} mg/kg)</span>}
        </p>
      )}
    </div>
  )
}

const NOTE_FIELDS: Array<{ key: PediatricClinicalNoteKey; label: string; placeholder: string }> = [
  { key: 'complaint', label: 'Presenting complaint', placeholder: 'Fever, cough, rash, vomiting, diarrhoea...' },
  { key: 'history', label: 'History of present illness', placeholder: 'Onset, duration, associated symptoms, feeding, hydration, sleep...' },
  { key: 'exam', label: 'Physical examination findings', placeholder: 'Vitals, hydration, ENT, chest, abdomen, skin, neuro...' },
  { key: 'diagnosis', label: 'Diagnosis', placeholder: 'Working diagnosis and differentials...' },
  { key: 'plan', label: 'Treatment plan', placeholder: 'Medication, fluids, investigations, home care instructions...' },
  { key: 'followUp', label: 'Follow-up instructions', placeholder: 'Review date, red flags, when guardian should return urgently...' },
  { key: 'assessment', label: 'Pediatric assessment notes', placeholder: 'Growth, nutrition, vaccination, safeguarding, dosing rationale...' },
]

const EMPTY_NOTES: PediatricClinicalNotes = {
  complaint: '',
  history: '',
  exam: '',
  diagnosis: '',
  plan: '',
  followUp: '',
  assessment: '',
}

function monthsFromAge(ageYears?: number) {
  return Math.max(0, Math.round((ageYears || 0) * 12))
}

function childProfileSeed(child: string) {
  const seeds: Record<string, Partial<ChildClinicalProfile>> = {
    'Ethan W.': {
      gender: 'Male',
      dob: '2021-03-18',
      bloodGroup: 'O+',
      relationship: 'Mother',
      allergies: ['Penicillin'],
      chronicConditions: ['Recurrent tonsillitis'],
      currentMedication: ['Paracetamol syrup as needed'],
      vaccinations: { received: ['BCG', 'Pentavalent 1-3', 'MMR 1'], upcoming: ['MMR 2'], missed: ['Influenza 2026'] },
      documents: ['Previous prescriptions', 'Vaccination card'],
    },
    'Ava K.': {
      gender: 'Female',
      dob: '2024-01-09',
      bloodGroup: 'A+',
      relationship: 'Father',
      allergies: ['No known drug allergies'],
      chronicConditions: ['Nutrition follow-up'],
      currentMedication: ['Zinc supplement'],
      vaccinations: { received: ['BCG', 'OPV 1-3', 'Pentavalent 1-3'], upcoming: ['Vitamin A'], missed: [] },
      documents: ['Growth record', 'Vaccination card'],
    },
    'Mia M.': {
      gender: 'Female',
      dob: '2017-06-23',
      bloodGroup: 'B+',
      relationship: 'Mother',
      allergies: ['Skin irritants', 'Sulfa caution'],
      chronicConditions: ['Atopic dermatitis'],
      currentMedication: ['Emollient cream'],
      vaccinations: { received: ['Routine childhood series'], upcoming: ['HPV counselling'], missed: [] },
      documents: ['Lab reports', 'Dermatology notes'],
    },
    'Leo N.': {
      gender: 'Male',
      dob: '2020-09-11',
      bloodGroup: 'AB+',
      relationship: 'Father',
      allergies: ['No known drug allergies'],
      chronicConditions: ['Recent antibiotic course'],
      currentMedication: ['Amoxicillin clavulanate'],
      vaccinations: { received: ['Routine childhood series'], upcoming: ['Influenza 2026'], missed: [] },
      documents: ['Prescription history', 'Medical records'],
    },
    'Jay O.': {
      gender: 'Male',
      dob: '2022-04-05',
      bloodGroup: 'O-',
      relationship: 'Mother',
      allergies: ['Dust trigger'],
      chronicConditions: ['Wheeze episodes'],
      currentMedication: ['Salbutamol inhaler'],
      vaccinations: { received: ['BCG', 'Pentavalent 1-3', 'MMR 1'], upcoming: ['MMR 2'], missed: [] },
      documents: ['Asthma action notes', 'Vaccination card'],
    },
  }
  return seeds[child] || {}
}

function buildChildClinicalProfile(consultation: Consultation): ChildClinicalProfile {
  const child = consultation.childName || consultation.patientName
  const seed = childProfileSeed(child)
  const age = consultation.childAge ?? consultation.patientAge ?? 0
  const ageMonths = monthsFromAge(age)
  const weightKg = consultation.weightKg
  const heightCm = age < 3 ? 88 : age < 6 ? 108 : age < 10 ? 132 : 152
  const bmiValue = weightKg ? weightKg / Math.pow(heightCm / 100, 2) : 0
  const growthStatus = weightKg && weightKg < Math.max(8, age * 2.1 + 7) ? 'Underweight watch' : 'Tracking expected curve'
  return {
    child,
    age,
    ageMonths,
    gender: seed.gender || 'Not recorded',
    dob: seed.dob || 'Not recorded',
    bloodGroup: seed.bloodGroup || 'Not recorded',
    guardian: consultation.guardianName || 'Guardian',
    relationship: seed.relationship || 'Parent/Guardian',
    phone: '+254 700 000 000',
    email: `${(consultation.guardianName || 'guardian').toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.+|\.+$/g, '') || 'guardian'}@example.com`,
    emergencyContact: '+254 711 000 000',
    lastVisit: consultation.scheduledAt,
    weightKg,
    heightCm,
    bmi: bmiValue ? bmiValue.toFixed(1) : '-',
    headCircumference: ageMonths <= 24 ? `${44 + Math.min(ageMonths, 24) * 0.25} cm` : 'Not applicable',
    growthPercentile: growthStatus === 'Underweight watch' ? 'P3-P10' : 'P50-P75',
    growthStatus,
    allergies: seed.allergies || ['No known drug allergies'],
    chronicConditions: seed.chronicConditions || ['None recorded'],
    currentMedication: seed.currentMedication || ['None recorded'],
    vaccinations: seed.vaccinations || { received: ['Routine vaccines recorded'], upcoming: ['Next age-based review'], missed: [] },
    hospitalizations: seed.hospitalizations || ['None recorded'],
    documents: seed.documents || ['Medical records', 'Previous prescriptions'],
  }
}

// ── Data seeding ─────────────────────────────────────────────────────────────

const createInitialPediatricThreads = (): DoctorMessageThread[] => {
  const stored = loadDoctorMessages()
  const seeded = [...stored]
  const defaults: DoctorMessageThread[] = [
    {
      id: 'MSG-PED-901',
      doctorId: 'PED-001',
      patientName: 'Guardian: Aisha K.',
      lastMessage: 'Could you share the latest temperature reading?',
      lastMessageAt: '2026-02-07 09:20 AM',
      unreadCount: 1,
      status: 'Open',
      messages: [
        { id: 'MSG-PED-901-1', sender: 'patient', text: 'Liam still has a mild fever.', time: '09:10 AM' },
        { id: 'MSG-PED-901-2', sender: 'doctor', text: 'Could you share the latest temperature reading?', time: '09:20 AM' },
      ],
    },
    {
      id: 'MSG-PED-902',
      doctorId: 'PED-002',
      patientName: 'Guardian: Brian T.',
      lastMessage: 'No wheezing today, thank you doctor.',
      lastMessageAt: '2026-02-07 10:15 AM',
      unreadCount: 0,
      status: 'Resolved',
      messages: [
        { id: 'MSG-PED-902-1', sender: 'doctor', text: 'Continue inhaler for 3 more days.', time: '09:58 AM' },
        { id: 'MSG-PED-902-2', sender: 'patient', text: 'No wheezing today, thank you doctor.', time: '10:15 AM' },
      ],
    },
  ]
  defaults.forEach((thread) => {
    const index = seeded.findIndex((item) => item.id === thread.id)
    if (index === -1) { seeded.push(thread); return }
    seeded[index] = { ...thread, ...seeded[index], doctorId: thread.doctorId }
  })
  if (seeded.length !== stored.length) saveDoctorMessages(seeded)
  return seeded
}

const createInitialPediatricConsultations = (): Consultation[] => {
  const stored = loadConsultations()
  const seeded = [...stored]
  const defaults: Consultation[] = [
    { id: 'CONS-2203', doctorId: 'PED-001', patientName: 'Guardian: Mary W.', patientAge: 36, issue: 'Persistent sore throat and fever', status: 'Waiting', scheduledAt: '2026-02-07 11:40 AM', channel: 'Chat', priority: 'Priority', lastMessageAt: '2026-02-07 11:15 AM', pediatric: true, guardianName: 'Mary W.', childName: 'Ethan W.', childAge: 5, weightKg: 18, consentStatus: 'Pending', dosageAlert: false },
    { id: 'CONS-2204', doctorId: 'PED-001', patientName: 'Guardian: David K.', patientAge: 40, issue: 'Routine nutrition follow-up', status: 'Completed', scheduledAt: '2026-02-06 02:10 PM', channel: 'Chat', priority: 'Routine', lastMessageAt: '2026-02-06 02:45 PM', pediatric: true, guardianName: 'David K.', childName: 'Ava K.', childAge: 2, weightKg: 11, consentStatus: 'Granted', dosageAlert: false },
    { id: 'CONS-2205', doctorId: 'PED-002', patientName: 'Guardian: Lydia M.', patientAge: 34, issue: 'Skin allergy reaction', status: 'Waiting', scheduledAt: '2026-02-07 01:20 PM', channel: 'Chat', priority: 'Routine', lastMessageAt: '2026-02-07 01:02 PM', pediatric: true, guardianName: 'Lydia M.', childName: 'Mia M.', childAge: 9, weightKg: 29, consentStatus: 'Pending', dosageAlert: true },
    { id: 'CONS-2206', doctorId: 'PED-002', patientName: 'Guardian: Peter N.', patientAge: 37, issue: 'Post-antibiotic stomach upset', status: 'In progress', scheduledAt: '2026-02-07 03:00 PM', channel: 'Chat', priority: 'Priority', lastMessageAt: '2026-02-07 02:55 PM', pediatric: true, guardianName: 'Peter N.', childName: 'Leo N.', childAge: 6, weightKg: 20, consentStatus: 'Granted', dosageAlert: false },
    { id: 'CONS-2207', doctorId: 'PED-002', patientName: 'Guardian: Diana O.', patientAge: 31, issue: 'Night cough and wheeze', status: 'Completed', scheduledAt: '2026-02-05 09:15 AM', channel: 'Chat', priority: 'Routine', lastMessageAt: '2026-02-05 09:45 AM', pediatric: true, guardianName: 'Diana O.', childName: 'Jay O.', childAge: 4, weightKg: 16, consentStatus: 'Granted', dosageAlert: false },
  ]
  defaults.forEach((consult) => {
    const index = seeded.findIndex((item) => item.id === consult.id)
    if (index === -1) { seeded.push(consult); return }
    seeded[index] = { ...consult, ...seeded[index], doctorId: consult.doctorId, pediatric: true }
  })
  if (seeded.length !== stored.length) saveConsultations(seeded)
  return seeded
}

const createInitialPediatricPrescriptions = (): DoctorPrescription[] => {
  const stored = loadDoctorPrescriptions()
  const seeded = [...stored]
  const defaults: DoctorPrescription[] = [
    { id: 'RX-6502', doctorId: 'PED-001', patientName: 'Liam K.', createdAt: '2026-02-06', status: 'Draft', notes: 'Monitor temperature every 6 hours.', pediatric: true, items: [{ name: 'Paracetamol syrup', dosage: '5ml every 6 hours', quantity: 1 }] },
    { id: 'RX-6503', doctorId: 'PED-001', patientName: 'Ava K.', createdAt: '2026-02-04', status: 'Sent', notes: 'Add probiotic for 5 days.', pediatric: true, items: [{ name: 'Oral rehydration salts', dosage: 'After each loose stool', quantity: 8 }, { name: 'Children probiotic sachet', dosage: '1 sachet daily', quantity: 5 }] },
    { id: 'RX-6504', doctorId: 'PED-002', patientName: 'Mia M.', createdAt: '2026-02-03', status: 'Dispensed', notes: 'Avoid known skin irritants.', pediatric: true, items: [{ name: 'Cetirizine syrup', dosage: '5ml at night', quantity: 1 }, { name: 'Calamine lotion', dosage: 'Apply twice daily', quantity: 1 }] },
  ]
  defaults.forEach((prescription) => {
    const index = seeded.findIndex((item) => item.id === prescription.id)
    if (index === -1) { seeded.push(prescription); return }
    seeded[index] = { ...prescription, ...seeded[index], doctorId: prescription.doctorId, pediatric: true }
  })
  if (seeded.length !== stored.length) saveDoctorPrescriptions(seeded)
  return seeded
}

const createInitialPediatricEarnings = (): DoctorEarning[] => {
  const stored = loadDoctorEarnings()
  const seeded = [...stored]
  const defaults: DoctorEarning[] = [
    { id: 'PAY-2002', doctorId: 'PED-001', period: 'Jan 2026', consults: 31, revenue: 37200, payoutDate: '2026-02-03', status: 'Paid' },
    { id: 'PAY-2003', doctorId: 'PED-001', period: 'Feb 2026', consults: 14, revenue: 16800, payoutDate: '2026-03-03', status: 'Scheduled' },
    { id: 'PAY-2004', doctorId: 'PED-002', period: 'Feb 2026', consults: 19, revenue: 28500, payoutDate: '2026-03-03', status: 'On hold' },
  ]
  defaults.forEach((earning) => {
    if (!seeded.some((item) => item.id === earning.id)) seeded.push(earning)
  })
  if (seeded.length !== stored.length) saveDoctorEarnings(seeded)
  return seeded
}

// ── Component ─────────────────────────────────────────────────────────────────

function PediatricianDashboardPage() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<PediatricTab>('queue')
  const isAdminPreview = user?.role === 'admin'
  const [doctors] = useState(loadDoctorProfiles())
  const currentPediatricianProfile = useMemo<DoctorProfile>(() => {
    const userEmail = user?.email?.trim().toLowerCase()
    const matchedProfile = userEmail
      ? doctors.find((d) => d.type === 'Pediatrician' && d.email.toLowerCase() === userEmail)
      : undefined
    if (matchedProfile) return matchedProfile
    return {
      id: user ? `USER-${user.id}` : 'CURRENT-PEDIATRICIAN',
      name: user?.name
        ? (/^dr\.?\s/i.test(user.name) ? user.name : `Dr. ${user.name}`)
        : 'Pediatrician',
      type: 'Pediatrician',
      specialty: 'Pediatrician Portal',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      license: '',
      facility: 'Ava Pharmacy',
      submitted: '',
      status: 'Active',
      commission: 0,
      consultFee: 0,
      rating: 0,
      availability: '',
      languages: [],
      documents: [],
    }
  }, [doctors, user])
  const adminPreviewPediatricians = useMemo(
    () => doctors.filter((d) => d.type === 'Pediatrician'),
    [doctors]
  )
  const [activeDoctorId, setActiveDoctorId] = useState(() => {
    if (!isAdminPreview) return currentPediatricianProfile.id
    return adminPreviewPediatricians.find((d) => d.status === 'Active')?.id ?? adminPreviewPediatricians[0]?.id ?? ''
  })
  const [consultations, setConsultations] = useState<Consultation[]>(() => createInitialPediatricConsultations())
  const [threads, setThreads] = useState<DoctorMessageThread[]>(() => createInitialPediatricThreads())
  const [prescriptions, setPrescriptions] = useState<DoctorPrescription[]>(() => createInitialPediatricPrescriptions())
  const [earningsData, setEarningsData] = useState<DoctorEarning[]>(() => createInitialPediatricEarnings())

  const [queueSearch, setQueueSearch] = useState('')
  const [selectedConsult, setSelectedConsult] = useState<Consultation | null>(null)
  const [consultationNotes, setConsultationNotes] = useState<Record<string, PediatricClinicalNotes>>({})

  const consultEndRef = useRef<HTMLDivElement>(null)
  const [showConsultChat, setShowConsultChat] = useState(false)
  const [consultThread, setConsultThread] = useState<DoctorMessageThread | null>(null)
  const [consultMessage, setConsultMessage] = useState('')

  const [prescriptionSearch, setPrescriptionSearch] = useState('')
  const [showRxPanel, setShowRxPanel] = useState(false)
  const [rxPatient, setRxPatient] = useState('')
  const [rxNotes, setRxNotes] = useState('')
  const [rxConsultationId, setRxConsultationId] = useState<number | null>(null)
  const [rxItems, setRxItems] = useState<DoctorPrescriptionItem[]>([{ name: '', dosage: '', quantity: 1 }])
  const [rxCatalogOptions, setRxCatalogOptions] = useState<Record<number, ClinicianCatalogVariant[]>>({})
  const [rxCatalogLoading, setRxCatalogLoading] = useState<Record<number, boolean>>({})
  const [rxCatalogList, setRxCatalogList] = useState<ClinicianCatalogVariant[]>([])
  const [rxCatalogListLoading, setRxCatalogListLoading] = useState(false)
  const [workspaceError, setWorkspaceError] = useState('')
  const [consultationRefreshError, setConsultationRefreshError] = useState('')
  const [selectedChild, setSelectedChild] = useState<string | null>(null)

  const liveConsultationId = showConsultChat
    ? consultThread?.backendConsultationId ?? selectedConsult?.backendId ?? null
    : null
  const socketToken = typeof window === 'undefined' ? null : window.localStorage.getItem('ava_access_token')

  const handleLiveConsultationMessage = useCallback((socketMessage: SocketMessage) => {
    if (!liveConsultationId) return
    const message = mapSocketMessage(socketMessage, user?.id)
    const lastMessageAt = socketMessage.sentAt ? formatBackendDate(socketMessage.sentAt) : 'Now'
    const fallbackPatientName = selectedConsult?.childName || selectedConsult?.patientName || consultThread?.patientName || 'Child'

    setThreads((prev) => {
      let matched = false
      const next = prev.map((thread) => {
        if (thread.backendConsultationId !== liveConsultationId) return thread
        matched = true
        return mergeThreadMessage(thread, message, lastMessageAt)
      })
      if (matched) return next
      return [{
        id: `CONS-${liveConsultationId}`,
        backendConsultationId: liveConsultationId,
        doctorId: activeDoctorId,
        patientName: fallbackPatientName,
        lastMessage: message.text,
        lastMessageAt,
        unreadCount: 0,
        status: 'Open',
        messages: [message],
      }, ...prev]
    })
    setConsultThread((prev) => {
      if (prev?.backendConsultationId === liveConsultationId) {
        return mergeThreadMessage(prev, message, lastMessageAt)
      }
      if (selectedConsult?.backendId !== liveConsultationId) return prev
      return {
        id: `CONS-${liveConsultationId}`,
        backendConsultationId: liveConsultationId,
        doctorId: activeDoctorId,
        patientName: fallbackPatientName,
        lastMessage: message.text,
        lastMessageAt,
        unreadCount: 0,
        status: 'Open',
        messages: [message],
      }
    })
    setConsultations((prev) => prev.map((consultation) => (
      consultation.backendId === liveConsultationId
        ? { ...consultation, lastMessageAt }
        : consultation
    )))
  }, [activeDoctorId, consultThread?.patientName, liveConsultationId, selectedConsult?.childName, selectedConsult?.patientName, user?.id])

  useConsultationSocket(liveConsultationId, socketToken, handleLiveConsultationMessage)

  useEffect(() => {
    if (!liveConsultationId || isAdminPreview) return undefined
    let cancelled = false

    const refreshOpenConversation = async () => {
      try {
        const record = await fetchConsultation(liveConsultationId)
        if (cancelled) return
        const mappedConsultation = mapBackendPediatricConsultation(record, activeDoctorId)
        const mappedThread = mapBackendPediatricThread(record, activeDoctorId)

        setConsultations((prev) => prev.map((consultation) => (
          consultation.backendId === record.id || consultation.id === mappedConsultation.id
            ? mappedConsultation
            : consultation
        )))
        setThreads((prev) => {
          const exists = prev.some((thread) => thread.backendConsultationId === record.id || thread.id === mappedThread.id)
          return exists
            ? prev.map((thread) => (
              thread.backendConsultationId === record.id || thread.id === mappedThread.id ? mappedThread : thread
            ))
            : [mappedThread, ...prev]
        })
        setSelectedConsult((prev) => (
          prev?.backendId === record.id || prev?.id === mappedConsultation.id ? mappedConsultation : prev
        ))
        setConsultThread(() => ({ ...mappedThread, unreadCount: 0 }))
      } catch {
        // Keep the open chat usable while the socket reconnects or a poll fails.
      }
    }

    void refreshOpenConversation()
    const timer = window.setInterval(() => { void refreshOpenConversation() }, 3000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [activeDoctorId, isAdminPreview, liveConsultationId])

  useEffect(() => {
    consultEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [consultThread?.messages])

  useEffect(() => {
    let cancelled = false
    const loadLiveWorkspace = async () => {
      if (isAdminPreview) {
        setWorkspaceError('')
        setConsultations(createInitialPediatricConsultations())
        setThreads(createInitialPediatricThreads())
        setPrescriptions(createInitialPediatricPrescriptions())
        setEarningsData(createInitialPediatricEarnings())
        return
      }
      try {
        setWorkspaceError('')
        const [backendPrescriptions, backendEarnings] = await Promise.all([
          fetchPediatricianPrescriptions(),
          fetchClinicianEarnings(),
        ])
        if (cancelled) return
        setPrescriptions(backendPrescriptions.map((rx) => mapBackendPediatricPrescription(rx, activeDoctorId)))
        setEarningsData(backendEarnings.map((earning) => mapBackendPediatricEarning(earning, activeDoctorId)))
      } catch {
        if (!cancelled) setWorkspaceError('Unable to load the live pediatrician workspace. Showing saved local data.')
      }
    }
    void loadLiveWorkspace()
    return () => { cancelled = true }
  }, [activeDoctorId, isAdminPreview])

  useEffect(() => {
    if (isAdminPreview) return undefined

    let cancelled = false
    let refreshInProgress = false

    const refreshConsultations = async () => {
      if (refreshInProgress) return
      refreshInProgress = true

      try {
        const backendConsultations = await fetchPediatricianConsultations()
        if (cancelled) return

        const nextConsultations = backendConsultations.map((record) =>
          mapBackendPediatricConsultation(record, activeDoctorId)
        )
        const nextThreads = backendConsultations
          .filter((record) => record.messages.length > 0 || record.status === 'in_progress')
          .map((record) => mapBackendPediatricThread(record, activeDoctorId))

        setConsultations(nextConsultations)
        setThreads(nextThreads)
        setSelectedConsult((current) => {
          if (!current) return current
          return nextConsultations.find((item) => item.backendId === current.backendId || item.id === current.id) ?? current
        })
        setConsultThread((current) => {
          if (!current) return current
          return nextThreads.find((item) => item.backendConsultationId === current.backendConsultationId || item.id === current.id) ?? current
        })
        setConsultationRefreshError('')
      } catch {
        if (!cancelled) setConsultationRefreshError('Unable to refresh consultation requests. Retrying automatically…')
      } finally {
        refreshInProgress = false
      }
    }

    const refreshWhenVisible = () => {
      if (!document.hidden) void refreshConsultations()
    }

    void refreshConsultations()
    const refreshTimer = window.setInterval(() => { void refreshConsultations() }, 5000)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      cancelled = true
      window.clearInterval(refreshTimer)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [activeDoctorId, isAdminPreview])

  const pediatricDoctors = isAdminPreview ? adminPreviewPediatricians : [currentPediatricianProfile]

  useEffect(() => {
    if (!isAdminPreview) {
      if (activeDoctorId !== currentPediatricianProfile.id) {
        setActiveDoctorId(currentPediatricianProfile.id)
      }
      return
    }
    if (adminPreviewPediatricians.length === 0) return
    if (!adminPreviewPediatricians.some((d) => d.id === activeDoctorId)) {
      setActiveDoctorId(adminPreviewPediatricians[0].id)
    }
  }, [activeDoctorId, adminPreviewPediatricians, currentPediatricianProfile.id, isAdminPreview])

  const doctor = pediatricDoctors.find((d) => d.id === activeDoctorId)

  const pedConsultations = useMemo(
    () => consultations.filter((c) => c.doctorId === activeDoctorId && c.pediatric),
    [consultations, activeDoctorId]
  )

  const queueItems = useMemo(() => {
    const q = queueSearch.trim().toLowerCase()
    if (!q) return pedConsultations
    return pedConsultations.filter((c) =>
      [c.childName ?? '', c.guardianName ?? '', c.issue, c.status, c.id].some((v) => v.toLowerCase().includes(q))
    )
  }, [pedConsultations, queueSearch])

  const pedThreads = useMemo(
    () => threads.filter((t) => t.doctorId === activeDoctorId),
    [threads, activeDoctorId]
  )

  const pedPrescriptions = useMemo(
    () => prescriptions.filter((rx) => rx.doctorId === activeDoctorId && rx.pediatric),
    [prescriptions, activeDoctorId]
  )

  const filteredPrescriptions = useMemo(() => {
    const q = prescriptionSearch.trim().toLowerCase()
    if (!q) return pedPrescriptions
    return pedPrescriptions.filter((rx) =>
      [rx.patientName, rx.status, rx.id].some((v) => v.toLowerCase().includes(q))
    )
  }, [pedPrescriptions, prescriptionSearch])

  const prescriptionPatientOptions = useMemo(() => {
    return pedConsultations
      .filter((consultation) => consultation.backendId && consultation.status !== 'Cancelled')
      .map((consultation) => ({
        value: String(consultation.backendId),
        label: `${consultation.childName || consultation.patientName} · ${consultation.id}`,
        childName: consultation.childName || consultation.patientName,
      }))
  }, [pedConsultations])

  const consentPending = useMemo(
    () => pedConsultations.filter((c) => c.consentStatus === 'Pending'),
    [pedConsultations]
  )

  const dosageAlerts = useMemo(
    () => pedConsultations.filter((c) => c.dosageAlert),
    [pedConsultations]
  )

  const childProfiles = useMemo(() => {
    const map = new Map<string, ChildClinicalProfile>()
    pedConsultations.forEach((c) => {
      if (!c.childName) return
      map.set(c.childName, buildChildClinicalProfile(c))
    })
    return Array.from(map.values())
  }, [pedConsultations])

  const selectedClinicalProfile = useMemo(
    () => selectedConsult ? buildChildClinicalProfile(selectedConsult) : null,
    [selectedConsult]
  )

  const selectedConsultationNotes = selectedConsult ? consultationNotes[selectedConsult.id] || EMPTY_NOTES : EMPTY_NOTES

  const selectedConsultContext = useMemo(() => {
    if (!selectedConsult) {
      return {
        consults: [] as Consultation[],
        prescriptions: [] as DoctorPrescription[],
        threads: [] as DoctorMessageThread[],
        timeline: [] as Array<{ type: string; date: string; summary: string }>,
        linkedRx: undefined as DoctorPrescription | undefined,
        linkedThread: undefined as DoctorMessageThread | undefined,
      }
    }
    const childName = selectedConsult.childName || selectedConsult.patientName
    const guardianName = selectedConsult.guardianName || selectedConsult.patientName
    const consults = pedConsultations.filter((consultation) =>
      (consultation.childName || consultation.patientName) === childName
    )
    const prescriptionsForChild = pedPrescriptions.filter((rx) => rx.patientName === childName)
    const threadsForFamily = pedThreads.filter((thread) =>
      thread.patientName === childName ||
      thread.patientName === guardianName ||
      thread.patientName.includes(childName) ||
      thread.patientName.includes(guardianName)
    )
    const linkedRx = prescriptionsForChild.find((rx) => prescriptionMatchesConsultation(rx, selectedConsult.id))
    const linkedThread = threadsForFamily.find((thread) =>
      thread.backendConsultationId === selectedConsult.backendId || thread.id === `CONS-${selectedConsult.backendId}`
    ) ?? threadsForFamily[0]
    const timeline = [
      ...consults.map((consultation) => ({
        type: 'consultation',
        date: consultation.scheduledAt,
        summary: `${consultation.id}: ${consultation.issue} (${consultation.status})`,
      })),
      ...prescriptionsForChild.map((rx) => ({
        type: 'prescription',
        date: rx.createdAt,
        summary: `${rx.id}: ${medicationSummary(rx.items)} (${rx.status})`,
      })),
      ...threadsForFamily.flatMap((thread) =>
        thread.messages.slice(-2).map((message) => ({
          type: 'message',
          date: thread.lastMessageAt,
          summary: `${message.sender === 'doctor' ? 'Pediatrician' : 'Guardian'}: ${message.text}`,
        }))
      ),
    ].sort((a, b) => timelineTime(b.date) - timelineTime(a.date))
    return { consults, prescriptions: prescriptionsForChild, threads: threadsForFamily, timeline, linkedRx, linkedThread }
  }, [pedConsultations, pedPrescriptions, pedThreads, selectedConsult])

  const earnings = useMemo(
    () => earningsData.filter((e) => e.doctorId === activeDoctorId),
    [activeDoctorId, earningsData]
  )

  const stats = useMemo(() => {
    const total = pedConsultations.length
    const waiting = pedConsultations.filter((c) => c.status === 'Waiting').length
    const ongoing = pedConsultations.filter((c) => c.status === 'In progress').length
    const completed = pedConsultations.filter((c) => c.status === 'Completed').length
    const consents = consentPending.length
    const alerts = dosageAlerts.length
    const prescriptionReviews = pedPrescriptions.filter((rx) => rx.status === 'Draft').length
    const followUpsDue = pedConsultations.filter((c) => c.status === 'Completed').length
    const totalRevenue = earnings.reduce((sum, e) => sum + e.revenue, 0)
    return { total, waiting, ongoing, completed, consents, alerts, prescriptionReviews, followUpsDue, totalRevenue }
  }, [pedConsultations, consentPending, dosageAlerts, pedPrescriptions, earnings])

  const unreadCount = useMemo(
    () => pedThreads.reduce((sum, t) => sum + (t.unreadCount || 0), 0),
    [pedThreads]
  )

  const doctorFirstName = doctor?.name.replace(/^Dr\.\s*/i, '').split(' ')[0] ?? 'Doctor'
  const navigationItems = [
    {
      id: 'queue',
      label: 'Queue',
      badge: stats.waiting,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
    {
      id: 'consents',
      label: 'Consents',
      badge: stats.consents,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      ),
    },
    {
      id: 'prescriptions',
      label: 'Prescriptions',
      badge: 0,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      id: 'profiles',
      label: 'Child profiles',
      badge: stats.alerts,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="7" r="4" />
          <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
          <path d="M19 8l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'earnings',
      label: 'Earnings',
      badge: 0,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
  ] as const

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  const replaceLiveConsultation = (record: ConsultationRecord) => {
    const mappedConsultation = mapBackendPediatricConsultation(record, activeDoctorId)
    const mappedThread = mapBackendPediatricThread(record, activeDoctorId)
    setConsultations((prev) => {
      const exists = prev.some((item) => item.backendId === record.id || item.id === mappedConsultation.id)
      return exists
        ? prev.map((item) => (item.backendId === record.id || item.id === mappedConsultation.id ? mappedConsultation : item))
        : [mappedConsultation, ...prev]
    })
    setThreads((prev) => {
      const exists = prev.some((item) => item.backendConsultationId === record.id || item.id === mappedThread.id)
      return exists
        ? prev.map((item) => (item.backendConsultationId === record.id || item.id === mappedThread.id ? mappedThread : item))
        : [mappedThread, ...prev]
    })
    return { consultation: mappedConsultation, thread: mappedThread }
  }

  const updateConsultationStatus = async (id: string, status: Consultation['status']) => {
    const existing = consultations.find((consultation) => consultation.id === id)
    if (existing?.backendId) {
      try {
        setWorkspaceError('')
        const record = await updateConsultation(existing.backendId, { status: CONSULT_STATUS_TO_API[status] })
        replaceLiveConsultation(record)
      } catch {
        setWorkspaceError('Unable to update the consultation. Please try again.')
      }
      return
    }

    const updated = consultations.map((c) => (c.id === id ? { ...c, status } : c))
    setConsultations(updated)
    saveConsultations(updated)
    if (selectedConsult?.id === id) setSelectedConsult({ ...selectedConsult, status })
  }

  const markConsentGranted = (id: string) => {
    const updated = consultations.map((c) => (c.id === id ? { ...c, consentStatus: 'Granted' as const } : c))
    setConsultations(updated)
    saveConsultations(updated)
  }

  const resolveDosageAlert = (id: string) => {
    const updated = consultations.map((c) => (c.id === id ? { ...c, dosageAlert: false } : c))
    setConsultations(updated)
    saveConsultations(updated)
  }

  const updateConsultationNote = (consultationId: string, key: PediatricClinicalNoteKey, value: string) => {
    setConsultationNotes((prev) => ({
      ...prev,
      [consultationId]: {
        ...(prev[consultationId] || EMPTY_NOTES),
        [key]: value,
      },
    }))
  }

  const findOrCreateThread = (consult: Consultation): DoctorMessageThread => {
    const existing = consult.backendId
      ? threads.find((thread) => thread.backendConsultationId === consult.backendId || thread.id === `CONS-${consult.backendId}`)
      : threads.find((thread) => (
        thread.doctorId === consult.doctorId
        && (thread.patientName === consult.patientName || thread.patientName === consult.childName)
      ))
    if (existing) return existing
    const newThread: DoctorMessageThread = {
      id: `TH-${Date.now()}`,
      doctorId: consult.doctorId,
      patientName: consult.patientName,
      lastMessage: `Consultation started – ${consult.issue}`,
      lastMessageAt: 'Now',
      unreadCount: 0,
      status: 'Open',
      messages: [{
        id: `SMSG-${Date.now()}`,
        sender: 'system',
        text: `Consultation started for ${consult.childName ?? consult.patientName}: ${consult.issue}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }],
    }
    const all = [newThread, ...threads]
    setThreads(all)
    saveDoctorMessages(all)
    return newThread
  }

  const handleStartConsultation = async (consult: Consultation) => {
    if (consult.backendId) {
      try {
        setWorkspaceError('')
        const record = await updateConsultation(consult.backendId, { status: 'in_progress' })
        const live = replaceLiveConsultation(record)
        setSelectedConsult(live.consultation)
        setConsultThread({ ...live.thread, unreadCount: 0 })
        setShowConsultChat(true)
      } catch {
        setWorkspaceError('Unable to start this consultation. Please refresh and try again.')
      }
      return
    }

    void updateConsultationStatus(consult.id, 'In progress')
    const thread = findOrCreateThread(consult)
    setConsultThread({ ...thread, unreadCount: 0 })
    setSelectedConsult({ ...consult, status: 'In progress' })
    setShowConsultChat(true)
  }

  const handleSendConsultMessage = async () => {
    if (!consultThread || !consultMessage.trim()) return
    if (consultThread.backendConsultationId) {
      try {
        setWorkspaceError('')
        const message = consultMessage.trim()
        setConsultMessage('')
        await sendConsultationMessage(consultThread.backendConsultationId, message)
        const record = await fetchConsultation(consultThread.backendConsultationId)
        const live = replaceLiveConsultation(record)
        setSelectedConsult(live.consultation)
        setConsultThread(live.thread)
      } catch {
        setWorkspaceError('Unable to send this message. Please try again.')
      }
      return
    }

    const msg: DoctorMessage = {
      id: `MSG-${Date.now()}`,
      sender: 'doctor',
      text: consultMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    const updated: DoctorMessageThread = {
      ...consultThread,
      lastMessage: consultMessage,
      lastMessageAt: 'Now',
      messages: [...consultThread.messages, msg],
    }
    const all = threads.map((t) => (t.id === consultThread.id ? updated : t))
    setThreads(all)
    saveDoctorMessages(all)
    setConsultThread(updated)
    setConsultMessage('')
  }

  const updateRxItem = (index: number, patch: Partial<DoctorPrescriptionItem>) => {
    setRxItems((prev) => prev.map((item, i) => i === index ? { ...item, ...patch } : item))
  }

  const loadPrescriptionCatalog = () => {
    if (rxCatalogList.length > 0 || rxCatalogListLoading) return
    setRxCatalogListLoading(true)
    void searchPediatricianCatalogVariants('', 1000)
      .then((options: ClinicianCatalogVariant[]) => setRxCatalogList(options))
      .catch(() => setWorkspaceError('Unable to load the medicine catalog. You can still search manually.'))
      .finally(() => setRxCatalogListLoading(false))
  }

  const handlePrescriptionConsultationSelect = (value: string) => {
    const consultationId = Number(value) || null
    setRxConsultationId(consultationId)
    const selected = pedConsultations.find((consultation) => consultation.backendId === consultationId)
    if (!selected) {
      setRxPatient('')
      setRxNotes('')
      return
    }
    const childName = selected.childName || selected.patientName
    setRxPatient(childName)
    setRxNotes(`Consultation ${selected.id}: ${selected.issue}`)
  }

  const handleCatalogSearch = (index: number, value: string) => {
    updateRxItem(index, {
      name: value,
      variantId: null,
      productId: null,
      sku: '',
      catalogName: '',
      stockStatus: '',
      availableQuantity: undefined,
    })
    if (value.trim().length < 2) {
      setRxCatalogOptions((prev) => ({ ...prev, [index]: [] }))
      return
    }
    setRxCatalogLoading((prev) => ({ ...prev, [index]: true }))
    void searchPediatricianCatalogVariants(value)
      .then((options) => setRxCatalogOptions((prev) => ({ ...prev, [index]: options })))
      .finally(() => setRxCatalogLoading((prev) => ({ ...prev, [index]: false })))
  }

  const selectCatalogVariant = (index: number, variant: ClinicianCatalogVariant) => {
    updateRxItem(index, {
      name: variant.display_name,
      variantId: variant.id,
      productId: variant.product_id,
      sku: variant.sku,
      catalogName: variant.display_name,
      stockStatus: variant.inventory_status,
      availableQuantity: variant.available_quantity,
      catalogFallback: false,
    })
    setRxCatalogOptions((prev) => ({ ...prev, [index]: [] }))
  }

  const handleCatalogSelect = (index: number, value: string) => {
    if (!value) {
      updateRxItem(index, {
        name: '',
        variantId: null,
        productId: null,
        sku: '',
        catalogName: '',
        stockStatus: '',
        availableQuantity: undefined,
        catalogFallback: false,
      })
      return
    }
    const variant = rxCatalogList.find((option) => String(option.id) === value)
    if (variant) selectCatalogVariant(index, variant)
  }

  const openNewPrescriptionPanel = () => {
    setRxPatient('')
    setRxNotes('')
    setRxConsultationId(null)
    setRxItems([{ name: '', dosage: '', quantity: 1 }])
    setRxCatalogOptions({})
    setRxCatalogLoading({})
    setWorkspaceError('')
    setShowRxPanel(true)
    loadPrescriptionCatalog()
  }

  const openPrescriptionForConsultation = (consultation: Consultation) => {
    setRxPatient(consultation.childName || consultation.patientName)
    setRxNotes(`Consultation ${consultation.id}: ${consultation.issue}`)
    setRxConsultationId(consultation.backendId ?? consultationNumericId(consultation.id))
    setRxItems([{ name: '', dosage: '', quantity: 1 }])
    setRxCatalogOptions({})
    setRxCatalogLoading({})
    setWorkspaceError('')
    setShowRxPanel(true)
    loadPrescriptionCatalog()
  }

  const isStartedPrescriptionItem = (item: DoctorPrescriptionItem) =>
    Boolean(item.name.trim() || item.variantId || item.dosage.trim() || item.sku)

  const isCompletePrescriptionItem = (item: DoctorPrescriptionItem) =>
    Boolean(
      item.name.trim() &&
      item.variantId &&
      item.dosage.trim() &&
      Number.isFinite(Number(item.quantity)) &&
      Number(item.quantity) >= 1,
    )

  const rxHasMedication =
    rxItems.some(isCompletePrescriptionItem) &&
    !rxItems.some((item) => isStartedPrescriptionItem(item) && !isCompletePrescriptionItem(item))

  const handleCreatePrescription = async () => {
    if (!rxPatient.trim() || !rxConsultationId) {
      setWorkspaceError('Select a child consultation before issuing a pediatric prescription.')
      return
    }
    const filteredItems = rxItems.filter(isStartedPrescriptionItem)
    if (filteredItems.length === 0) return
    if (filteredItems.some((item) => !isCompletePrescriptionItem(item))) {
      setWorkspaceError('Select a medicine, dosage, and quantity for each prescription item.')
      return
    }
    try {
      setWorkspaceError('')
      const created = await createPediatricianPrescription({
        patient_name: rxPatient.trim(),
        consultation_id: rxConsultationId,
        notes: rxNotes,
        items: filteredItems.map((item) => ({
          drug_name: item.name,
          dose: item.dosage,
          frequency: item.dosage,
          duration: '',
          variant_id: item.variantId ?? null,
          product_variant_id: item.variantId ?? null,
          product_id: item.productId ?? null,
          sku: item.sku,
          catalog_name: item.catalogName,
          catalog_fallback: Boolean(item.catalogFallback || !item.variantId),
          quantity: item.quantity,
        })),
      })
      const sent = await sendPediatricianPrescription(created.id)
      const rx = mapBackendPediatricPrescription(sent, activeDoctorId)
      const updated = [rx, ...prescriptions]
      setPrescriptions(updated)
      saveDoctorPrescriptions(updated)
      setShowRxPanel(false)
      setRxPatient('')
      setRxNotes('')
      setRxConsultationId(null)
      setRxItems([{ name: '', dosage: '', quantity: 1 }])
      setRxCatalogOptions({})
      return
    } catch {
      setWorkspaceError('The pediatric prescription could not be issued. Confirm the patient, stock availability, and medication details, then try again.')
      return
    }
  }

  const updatePrescriptionStatus = (id: string, status: DoctorPrescription['status']) => {
    const updated = prescriptions.map((rx) => (rx.id === id ? { ...rx, status } : rx))
    setPrescriptions(updated)
    saveDoctorPrescriptions(updated)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ProfessionalPortalShell
      accentColor="#14B8A6"
      activeItemId={activeTab}
      navItems={navigationItems}
      onNavChange={(itemId) => setActiveTab(itemId as PediatricTab)}
      onLogout={() => { void logout() }}
      roleLabel={isAdminPreview ? 'Admin · Pediatrician Preview' : 'Pediatrician'}
      sidebarHeaderContent={isAdminPreview ? (
        <select
          value={activeDoctorId}
          onChange={(e) => setActiveDoctorId(e.target.value)}
          className="portal-shell__select"
        >
          {pediatricDoctors.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      ) : undefined}
      userInitials={doctor ? initials(doctor.name) : 'PD'}
      userMeta={doctor?.specialty || 'Pediatrician Portal'}
      userName={user?.name || doctor?.name || 'Pediatrician'}
    >
      <div className="dd-content">
        {workspaceError && (
          <div className="dd-alert dd-alert--warning" role="status">
            <span>{workspaceError}</span>
          </div>
        )}
        {consultationRefreshError && (
          <div className="dd-alert dd-alert--warning" role="status">
            <span>{consultationRefreshError}</span>
          </div>
        )}

        {/* ── QUEUE TAB ── */}
        {activeTab === 'queue' && (
          <>
            <div className="dd-welcome">
              <div>
                <h1 className="dd-welcome__title">{greeting()}, Dr. {doctorFirstName}</h1>
                <p className="dd-welcome__sub">{doctor?.specialty} · {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            <div className="pd-home-section">
              <div className="pd-section-heading">
                <div>
                  <p className="pd-eyebrow">Today&apos;s summary</p>
                  <h2>Child care workload</h2>
                </div>
                <span>{childProfiles.length} registered child profile{childProfiles.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="cm-kpi-grid pd-summary-grid">
              <div className="cm-kpi-card">
                <div className="cm-kpi-card__icon cm-kpi-card__icon--blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div className="cm-kpi-card__body">
                  <span className="cm-kpi-card__label">Upcoming consultations</span>
                  <strong className="cm-kpi-card__value">{stats.total}</strong>
                </div>
              </div>
              <div className="cm-kpi-card">
                <div className="cm-kpi-card__icon cm-kpi-card__icon--amber">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div className="cm-kpi-card__body">
                  <span className="cm-kpi-card__label">Ongoing consultations</span>
                  <strong className="cm-kpi-card__value cm-kpi-card__value--amber">{stats.ongoing}</strong>
                </div>
              </div>
              <div className="cm-kpi-card">
                <div className="cm-kpi-card__icon cm-kpi-card__icon--teal">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M9 11l3 3L22 4"/><circle cx="12" cy="12" r="10"/></svg>
                </div>
                <div className="cm-kpi-card__body">
                  <span className="cm-kpi-card__label">Follow-ups due</span>
                  <strong className="cm-kpi-card__value cm-kpi-card__value--green">{stats.followUpsDue}</strong>
                </div>
              </div>
              <div className="cm-kpi-card">
                <div className="cm-kpi-card__icon cm-kpi-card__icon--red">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div className="cm-kpi-card__body">
                  <span className="cm-kpi-card__label">New messages</span>
                  <strong className="cm-kpi-card__value cm-kpi-card__value--red">{unreadCount}</strong>
                </div>
              </div>
              <div className="cm-kpi-card">
                <div className="cm-kpi-card__icon cm-kpi-card__icon--purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div className="cm-kpi-card__body">
                  <span className="cm-kpi-card__label">Prescription reviews</span>
                  <strong className="cm-kpi-card__value cm-kpi-card__value--purple">{stats.prescriptionReviews}</strong>
                </div>
              </div>
              <div className="cm-kpi-card">
                <div className="cm-kpi-card__icon cm-kpi-card__icon--teal">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/></svg>
                </div>
                <div className="cm-kpi-card__body">
                  <span className="cm-kpi-card__label">New child registrations</span>
                  <strong className="cm-kpi-card__value cm-kpi-card__value--green">{childProfiles.length}</strong>
                </div>
              </div>
            </div>

            <div className="pd-quick-actions">
              <button type="button" onClick={() => queueItems[0] && handleStartConsultation(queueItems[0])}>Start consultation</button>
              <button type="button" onClick={() => setActiveTab('profiles')}>View medical records</button>
            </div>

            <div className="dd-table-card">
              <div className="dd-toolbar">
                <div className="dd-search-wrap">
                  <svg className="dd-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input
                    className="dd-search-input"
                    type="text"
                    placeholder="Search child, guardian, issue…"
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                  />
                  {queueSearch && <button className="dd-search-clear" onClick={() => setQueueSearch('')}>×</button>}
                </div>
                <span className="dd-count">{queueItems.length} consultation{queueItems.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="cm-panel cm-table-wrap dd-table-wrap">
                <table className="cm-table dd-table">
                  <thead>
                    <tr>
                      <th>Child name</th>
                      <th>Age</th>
                      <th>Age in months</th>
                      <th>Gender</th>
                      <th>Guardian name</th>
                      <th>Appointment type</th>
                      <th>Appointment time</th>
                      <th>Priority</th>
                      <th>Consultation status</th>
                      <th>Weight</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueItems.map((item) => {
                      const profile = buildChildClinicalProfile(item)
                      return (
                      <tr
                        key={item.id}
                        className={selectedConsult?.id === item.id ? 'dd-row--active' : ''}
                        onClick={() => { setSelectedConsult(item); setConsultThread(findOrCreateThread(item)); setShowConsultChat(false) }}
                      >
                        <td>
                          <div className="dd-td-patient">
                            <div className="dd-td-patient__avatar">{initials(item.childName ?? item.patientName)}</div>
                            <div>
                              <p className="dd-td-patient__name">
                                {item.childName ?? '-'}
                                {item.childAge ? <span className="pd-age-tag">, {formatPediatricAge(item.childAge)}</span> : null}
                                {item.dosageAlert && <span className="pd-alert-dot" title="Dosage alert" />}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                                <AgeBand ageYears={item.childAge} />
                                {item.consentStatus !== 'Granted' && (
                                  <span className="ped-consent-warn">⚠ Consent pending</span>
                                )}
                              </div>
                              <p className="dd-td-patient__id">Guardian: {item.guardianName ?? '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="dd-td-meta">{formatPediatricAge(item.childAge)}</td>
                        <td className="dd-td-meta">{profile.ageMonths}m</td>
                        <td className="dd-td-meta">{profile.gender}</td>
                        <td className="dd-td-meta">{item.guardianName ?? '-'}</td>
                        <td className="dd-td-issue">{item.issue}</td>
                        <td className="dd-td-meta">{item.scheduledAt}</td>
                        <td className="dd-td-meta">{item.priority}</td>
                        <td>
                          <div className="dd-status-cell">
                            <span className="dd-status-dot" style={{ background: STATUS_COLORS[item.status] ?? '#9ca3af' }} />
                            <span className="dd-status-text">{item.status}</span>
                          </div>
                        </td>
                        <td className="dd-td-meta">{item.weightKg ? `${item.weightKg} kg` : '-'}</td>
                        <td>
                          <div className="dd-actions-cell" onClick={(e) => e.stopPropagation()}>
                            {item.status === 'Waiting' && (
                              <button
                                className="dd-action-btn dd-action-btn--start"
                                type="button"
                                onClick={() => handleStartConsultation(item)}
                              >
                                Start
                              </button>
                            )}
                            {item.status === 'In progress' && (
                              <button
                                className="dd-action-btn dd-action-btn--chat"
                                type="button"
                                onClick={() => {
                                  const thread = findOrCreateThread(item)
                                  setSelectedConsult(item)
                                  setConsultThread(thread)
                                  setShowConsultChat(true)
                                }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                Workspace
                              </button>
                            )}
                            <button className="dd-action-btn" type="button" onClick={() => { setSelectedConsult(item); setConsultThread(findOrCreateThread(item)); setShowConsultChat(false) }}>
                              Profile
                            </button>
                            <button className="dd-action-btn" type="button" onClick={() => { setSelectedConsult(item); setConsultThread(findOrCreateThread(item)); setShowConsultChat(false) }}>
                              Guardian
                            </button>
                            <button
                              className="dd-action-btn"
                              type="button"
                              disabled={item.status === 'Completed' || item.status === 'Cancelled'}
                              onClick={() => updateConsultationStatus(item.id, 'Completed')}
                            >
                              Done
                            </button>
                            <button
                              className="dd-action-btn"
                              type="button"
                              disabled={item.status === 'Cancelled'}
                              onClick={() => updateConsultationStatus(item.id, 'Cancelled')}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
                {queueItems.length === 0 && (
                  <div className="dd-empty">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/></svg>
                    <p>No pediatric consultations found.</p>
                  </div>
                )}
              </div>
            </div>

            {selectedConsult && selectedClinicalProfile && (
              <div className="pd-unified-workspace">
                <div className="pd-section-heading">
                  <div>
                    <p className="pd-eyebrow">Unified consultation workspace</p>
                    <h2>{selectedClinicalProfile.child}</h2>
                  </div>
                  <div className="pd-workspace-actions">
                    <button type="button" onClick={() => handleStartConsultation(selectedConsult)}>Start consultation</button>
                    <button type="button" onClick={() => {
                      setRxPatient(selectedClinicalProfile.child)
                      setRxNotes(`Consultation ${selectedConsult.id}: ${selectedConsult.issue}`)
                      setRxConsultationId(selectedConsult.backendId ?? null)
                      setRxItems([{ name: '', dosage: '', quantity: 1 }])
                      setRxCatalogOptions({})
                      setShowRxPanel(true)
                    }}>Create prescription</button>
                    <button type="button" onClick={() => updateConsultationStatus(selectedConsult.id, 'Completed')}>Schedule follow-up</button>
                  </div>
                </div>

                <div className="pd-workspace-grid">
                  <section className="pd-workspace-panel pd-workspace-panel--summary">
                    <div className="pd-child-hero">
                      <div className="pd-profile-card__avatar">{initials(selectedClinicalProfile.child)}</div>
                      <div>
                        <h3>{selectedClinicalProfile.child}</h3>
                        <p>{selectedClinicalProfile.gender} · {formatPediatricAge(selectedClinicalProfile.age)} · {selectedClinicalProfile.ageMonths} months</p>
                        <span className="pd-inline-status">{selectedClinicalProfile.growthPercentile} · {selectedClinicalProfile.growthStatus}</span>
                      </div>
                    </div>
                    <div className="pd-info-list">
                      <span>Date of birth <strong>{selectedClinicalProfile.dob}</strong></span>
                      <span>Blood group <strong>{selectedClinicalProfile.bloodGroup}</strong></span>
                      <span>Weight <strong>{selectedClinicalProfile.weightKg ? `${selectedClinicalProfile.weightKg} kg` : '-'}</strong></span>
                      <span>Height <strong>{selectedClinicalProfile.heightCm} cm</strong></span>
                      <span>BMI <strong>{selectedClinicalProfile.bmi}</strong></span>
                      <span>Head circumference <strong>{selectedClinicalProfile.headCircumference}</strong></span>
                    </div>
                    <div className="pd-alert-stack">
                      {[...selectedClinicalProfile.allergies, ...selectedClinicalProfile.chronicConditions, ...(selectedClinicalProfile.vaccinations.missed.length ? selectedClinicalProfile.vaccinations.missed.map((v) => `Missed: ${v}`) : [])].map((alert) => (
                        <span key={alert}>{alert}</span>
                      ))}
                    </div>
                    <GrowthChart weightKg={selectedConsult.weightKg} ageMonths={selectedClinicalProfile.ageMonths} />
                    <DosingCalculator weightKg={selectedConsult.weightKg} />
                    <div className="pd-mini-links">
                      {['Medical history', 'Consultation history', 'Prescription history', 'Growth charts', 'Vaccination history'].map((label) => (
                        <button key={label} type="button">{label}</button>
                      ))}
                    </div>
                  </section>

                  <section className="pd-workspace-panel pd-notes-panel">
                    <div className="pd-panel-title">
                      <h3>Consultation notes</h3>
                      <span>Autosaved locally</span>
                    </div>
                    <div className="pd-note-grid">
                      {NOTE_FIELDS.map((field) => (
                        <label key={field.key} className="pd-note-field">
                          <span>{field.label}</span>
                          <textarea
                            rows={field.key === 'complaint' ? 2 : 3}
                            placeholder={field.placeholder}
                            value={selectedConsultationNotes[field.key]}
                            onChange={(e) => updateConsultationNote(selectedConsult.id, field.key, e.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                    <div className="pd-care-modules">
                      <div>
                        <h4>Vaccination</h4>
                        <p>Received: {selectedClinicalProfile.vaccinations.received.join(', ')}</p>
                        <p>Upcoming: {selectedClinicalProfile.vaccinations.upcoming.join(', ') || 'None'}</p>
                        <p>Missed: {selectedClinicalProfile.vaccinations.missed.join(', ') || 'None'}</p>
                      </div>
                      <div>
                        <h4>Referral</h4>
                        <p>Attach consultation summary, diagnosis, prescription history, growth records, and relevant documents.</p>
                        <button type="button">Create referral</button>
                      </div>
                    </div>
                  </section>

                  <section className="pd-workspace-panel pd-guardian-panel">
                    <div className="pd-panel-title">
                      <h3>Guardian communication</h3>
                      <span>{selectedClinicalProfile.guardian}</span>
                    </div>
                    <div className="pd-info-list">
                      <span>Relationship <strong>{selectedClinicalProfile.relationship}</strong></span>
                      <span>Phone <strong>{selectedClinicalProfile.phone}</strong></span>
                      <span>Email <strong>{selectedClinicalProfile.email}</strong></span>
                      <span>Emergency <strong>{selectedClinicalProfile.emergencyContact}</strong></span>
                    </div>
                    <div className="pd-shared-files">
                      {selectedClinicalProfile.documents.map((doc) => <span key={doc}>{doc}</span>)}
                      <span>Uploaded child photos</span>
                      <span>Shared treatment instructions</span>
                    </div>
                    <div className="dd-sp-chat-messages pd-inline-chat">
                      {(consultThread?.messages ?? []).map((msg) => (
                        <div key={msg.id} className={`dd-sp-msg dd-sp-msg--${msg.sender}`}>
                          {msg.sender === 'system' ? (
                            <span className="dd-sp-msg-system">{msg.text}</span>
                          ) : (
                            <div className="dd-sp-msg-bubble">
                              <p>{msg.text}</p>
                              <span className="dd-sp-msg-time">{msg.time}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="dd-sp-chat-input">
                      <input
                        type="text"
                        placeholder="Message guardian, request photos, or share instructions..."
                        value={consultMessage}
                        onChange={(e) => setConsultMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendConsultMessage()}
                      />
                      <button className="dd-send-btn" type="button" onClick={handleSendConsultMessage} disabled={!consultMessage.trim()}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── CONSENTS TAB ── */}
        {activeTab === 'consents' && (
          <div className="dd-table-card">
            <div className="dd-toolbar">
              <h3 className="dd-toolbar__title">Guardian consent requests</h3>
              <span className="dd-count">{consentPending.length} pending</span>
            </div>
            {consentPending.length > 0 ? (
              <div className="pd-consent-grid">
                {consentPending.map((item) => (
                  <div key={item.id} className="pd-consent-card">
                    <div className="pd-consent-card__top">
                      <div className="pd-consent-card__avatar">{initials(item.childName ?? item.patientName)}</div>
                      <div>
                        <p className="pd-consent-card__child">{item.childName}</p>
                        <p className="pd-consent-card__guardian">Guardian: {item.guardianName}</p>
                      </div>
                      <span className="pd-consent pd-consent--pending">Pending</span>
                    </div>
                    <p className="pd-consent-card__issue">{item.issue}</p>
                    <div className="pd-consent-card__footer">
                      <span className="pd-consent-card__meta">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {item.scheduledAt}
                      </span>
                      <button
                        className="dd-sp-btn dd-sp-btn--primary"
                        type="button"
                        onClick={() => markConsentGranted(item.id)}
                      >
                        Grant consent
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dd-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><circle cx="12" cy="12" r="10"/></svg>
                <p>All guardian consents are up to date.</p>
              </div>
            )}
          </div>
        )}

        {/* ── PRESCRIPTIONS TAB ── */}
        {activeTab === 'prescriptions' && (
          <div className="dd-table-card">
            <div className="dd-toolbar">
              <div className="dd-search-wrap">
                <svg className="dd-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  className="dd-search-input"
                  type="text"
                  placeholder="Search prescriptions…"
                  value={prescriptionSearch}
                  onChange={(e) => setPrescriptionSearch(e.target.value)}
                />
              </div>
              <span className="dd-count">{filteredPrescriptions.length} prescription{filteredPrescriptions.length !== 1 ? 's' : ''}</span>
              <button className="dd-primary-btn" type="button" onClick={openNewPrescriptionPanel}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New prescription
              </button>
            </div>
            <div className="cm-panel cm-table-wrap dd-table-wrap">
              <table className="cm-table dd-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Child</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrescriptions.map((rx) => (
                    <tr key={rx.id}>
                      <td><span className="dd-mono">{rx.id}</span></td>
                      <td>
                        <div className="dd-td-patient">
                          <div className="dd-td-patient__avatar dd-td-patient__avatar--sm">{initials(rx.patientName)}</div>
                          <span className="dd-td-patient__name">{rx.patientName}</span>
                        </div>
                      </td>
                      <td className="dd-td-meta">{rx.createdAt}</td>
                      <td className="dd-td-meta">{rx.items.length} item{rx.items.length !== 1 ? 's' : ''}</td>
                      <td>
                        <div className="dd-status-cell">
                          <span className="dd-status-dot" style={{ background: RX_STATUS_COLORS[rx.status] ?? '#9ca3af' }} />
                          <span className="dd-status-text">{rx.status}</span>
                        </div>
                      </td>
                      <td>
                        <div className="dd-actions-cell">
                          <button
                            className="dd-action-btn dd-action-btn--start"
                            type="button"
                            disabled={rx.status === 'Sent' || rx.status === 'Dispensed'}
                            onClick={() => updatePrescriptionStatus(rx.id, 'Sent')}
                          >
                            Send
                          </button>
                          <button
                            className="dd-action-btn"
                            type="button"
                            disabled={rx.status === 'Dispensed'}
                            onClick={() => updatePrescriptionStatus(rx.id, 'Dispensed')}
                          >
                            Dispensed
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPrescriptions.length === 0 && (
                <div className="dd-empty">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <p>No pediatric prescriptions found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PROFILES TAB ── */}
        {activeTab === 'profiles' && (
          <>
            {dosageAlerts.length > 0 && (
              <div className="pd-alerts-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <strong>{dosageAlerts.length} dosage alert{dosageAlerts.length !== 1 ? 's' : ''} require attention</strong>
                <div className="pd-alerts-list">
                  {dosageAlerts.map((a) => (
                    <div key={a.id} className="pd-alert-item">
                      <span><strong>{a.childName}</strong> - {a.issue}</span>
                      <button
                        className="dd-action-btn"
                        type="button"
                        onClick={() => resolveDosageAlert(a.id)}
                      >
                        Resolve
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="dd-table-card">
              <div className="dd-toolbar">
                <h3 className="dd-toolbar__title">Child profiles</h3>
                <span className="dd-count">{childProfiles.length} profile{childProfiles.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="pd-profile-grid">
                {childProfiles.map((p) => {
                  const childConsults = pedConsultations.filter((consultation) => (consultation.childName || consultation.patientName) === p.child)
                  const childRx = pedPrescriptions.filter((rx) => rx.patientName === p.child)
                  const timelineItems = [
                    ...childConsults.map((consultation) => ({
                      type: 'consultation',
                      date: consultation.scheduledAt,
                      summary: `${consultation.issue} (${consultation.status}) · Guardian: ${consultation.guardianName || p.guardian}`,
                    })),
                    ...childRx.map((rx) => ({
                      type: 'prescription',
                      date: rx.createdAt,
                      summary: `Prescription ${rx.id}: ${rx.status} · ${rx.items.map((item) => item.name).filter(Boolean).join(', ') || 'No medication items'}`,
                    })),
                  ].sort((a, b) => timelineTime(b.date) - timelineTime(a.date))
                  const latestPrescribableConsultation = childConsults.find((consultation) => consultation.backendId && consultation.status !== 'Cancelled')

                  return (
                    <div key={p.child} className="pd-profile-card">
                      <div className="pd-profile-card__avatar">{initials(p.child)}</div>
                      <div className="pd-profile-card__body">
                        <p className="pd-profile-card__name">{p.child}</p>
                        <p className="pd-profile-card__age">{formatPediatricAge(p.age)} · {p.ageMonths} months <AgeBand ageYears={p.age} /></p>
                      </div>
                      <div className="pd-profile-card__meta">
                        <div className="pd-profile-card__row">
                          <span>Guardian</span><strong>{p.guardian}</strong>
                        </div>
                        <div className="pd-profile-card__row">
                          <span>Guardian contact</span><strong>{p.phone}</strong>
                        </div>
                        <div className="pd-profile-card__row">
                          <span>Weight</span><strong>{p.weightKg ? `${p.weightKg} kg` : '-'}</strong>
                        </div>
                        <div className="pd-profile-card__row">
                          <span>Height</span><strong>{p.heightCm} cm</strong>
                        </div>
                        <div className="pd-profile-card__row">
                          <span>Growth</span><strong>{p.growthPercentile}</strong>
                        </div>
                        <div className="pd-profile-card__row">
                          <span>Vaccines due</span><strong>{p.vaccinations.upcoming.length + p.vaccinations.missed.length}</strong>
                        </div>
                        <div className="pd-profile-card__row">
                          <span>Last visit</span><strong>{p.lastVisit}</strong>
                        </div>
                        <div className="pd-profile-card__row">
                          <span>Consults</span><strong>{childConsults.length}</strong>
                        </div>
                        <div className="pd-profile-card__row">
                          <span>Prescriptions</span><strong>{childRx.length}</strong>
                        </div>
                      </div>
                      <div className="pd-profile-card__actions">
                        <button
                          className="dd-action-btn"
                          type="button"
                          onClick={() => setSelectedChild(selectedChild === p.child ? null : p.child)}
                        >
                          {selectedChild === p.child ? 'Hide history' : 'View history'}
                        </button>
                        <button
                          className="dd-action-btn dd-action-btn--rx"
                          type="button"
                          disabled={!latestPrescribableConsultation}
                          onClick={() => {
                            if (!latestPrescribableConsultation) return
                            setRxPatient(p.child)
                            setRxNotes(`Consultation ${latestPrescribableConsultation.id}: ${latestPrescribableConsultation.issue}`)
                            setRxConsultationId(latestPrescribableConsultation.backendId ?? null)
                            setRxItems([{ name: '', dosage: '', quantity: 1 }])
                            setRxCatalogOptions({})
                            setShowRxPanel(true)
                          }}
                        >
                          Rx
                        </button>
                      </div>
                      {selectedChild === p.child && (
                        <div className="pd-profile-card__history">
                          {timelineItems.length > 0 ? (
                            <PediatricTimeline items={timelineItems} />
                          ) : (
                            <p className="pd-profile-card__empty-history">No clinical history recorded yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                {childProfiles.length === 0 && (
                  <div className="dd-empty dd-empty--full">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/></svg>
                    <p>No child profiles available.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── EARNINGS TAB ── */}
        {activeTab === 'earnings' && (
          <>
            <div className="dd-earnings-summary">
              <div className="dd-earnings-summary__item dd-earnings-summary__item--main">
                <p className="dd-earnings-summary__label">Total earned</p>
                <p className="dd-earnings-summary__value">KSh {stats.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="dd-earnings-summary__item">
                <p className="dd-earnings-summary__label">Consultations</p>
                <p className="dd-earnings-summary__num">{earnings.reduce((s, e) => s + e.consults, 0)}</p>
              </div>
              <div className="dd-earnings-summary__item">
                <p className="dd-earnings-summary__label">Avg. per consult</p>
                <p className="dd-earnings-summary__num">
                  KSh {earnings.reduce((s, e) => s + e.consults, 0) > 0
                    ? Math.round(stats.totalRevenue / earnings.reduce((s, e) => s + e.consults, 0)).toLocaleString()
                    : '-'}
                </p>
              </div>
              <div className="dd-earnings-summary__item">
                <p className="dd-earnings-summary__label">Pending payout</p>
                <p className="dd-earnings-summary__num">
                  KSh {earnings.filter((e) => e.status === 'Scheduled').reduce((s, e) => s + e.revenue, 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="dd-table-card">
              <div className="dd-toolbar">
                <h3 className="dd-toolbar__title">Monthly breakdown</h3>
              </div>
              <div className="cm-panel cm-table-wrap dd-table-wrap">
                <table className="cm-table dd-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Consultations</th>
                      <th>Revenue</th>
                      <th>Status</th>
                      <th>Payout date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.map((entry) => (
                      <tr key={entry.id}>
                        <td><strong>{entry.period}</strong></td>
                        <td className="dd-td-meta">{entry.consults}</td>
                        <td><strong>KSh {entry.revenue.toLocaleString()}</strong></td>
                        <td>
                          <div className="dd-status-cell">
                            <span className="dd-status-dot" style={{
                              background: entry.status === 'Paid' ? '#16A34A' : entry.status === 'Scheduled' ? '#F59E0B' : '#EF4444'
                            }} />
                            <span className="dd-status-text">{entry.status}</span>
                          </div>
                        </td>
                        <td className="dd-td-meta">{entry.payoutDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {earnings.length === 0 && (
                  <div className="dd-empty">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    <p>No earnings data yet.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Consultation side panel ── */}
      {selectedConsult && (
        <>
          <div className="dd-overlay" onClick={() => { setSelectedConsult(null); setShowConsultChat(false) }} />
          <aside className={`dd-side-panel pd-consult-panel ${showConsultChat ? 'dd-side-panel--chat' : ''}`}>
            <div className="dd-sp-header">
              <div>
                <p className="dd-sp-id">{selectedConsult.id}</p>
                <p className="dd-sp-meta">{selectedConsult.childName ?? selectedConsult.patientName} · {selectedConsult.scheduledAt}</p>
              </div>
              <div className="dd-sp-header-actions">
                {showConsultChat && (
                  <button className="dd-sp-back" type="button" onClick={() => setShowConsultChat(false)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                    Back
                  </button>
                )}
                <button className="dd-sp-close" type="button" onClick={() => { setSelectedConsult(null); setShowConsultChat(false) }}>×</button>
              </div>
            </div>

            {showConsultChat ? (
              <div className="dd-sp-chat">
                <div className="dd-sp-chat-patient">
                  <div className="dd-sp-patient__avatar">{initials(selectedConsult.childName ?? selectedConsult.patientName)}</div>
                  <div style={{ flex: 1 }}>
                    <p className="dd-sp-patient__name">{selectedConsult.childName ?? selectedConsult.patientName}</p>
                    <p className="dd-sp-patient__meta">{selectedConsult.id} · via {selectedConsult.guardianName}</p>
                  </div>
                  <div className="dd-online-status">
                    <span className="dd-online-dot" /> Online
                  </div>
                </div>
                <div className="dd-sp-chat-messages">
                  {(consultThread?.messages ?? []).map((msg) => (
                    <div key={msg.id} className={`dd-sp-msg dd-sp-msg--${msg.sender}`}>
                      {msg.sender === 'system' ? (
                        <span className="dd-sp-msg-system">{msg.text}</span>
                      ) : (
                        <>
                          {msg.sender === 'patient' && (
                            <div className="dd-sp-msg-avatar">{initials(selectedConsult.patientName)}</div>
                          )}
                          <div className="dd-sp-msg-bubble">
                            <p>{msg.text}</p>
                            <span className="dd-sp-msg-time">{msg.time}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  <div ref={consultEndRef} />
                </div>
                <div className="dd-sp-chat-input">
                  <input
                    type="text"
                    placeholder="Type your message…"
                    value={consultMessage}
                    onChange={(e) => setConsultMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendConsultMessage()}
                  />
                  <button
                    className="dd-send-btn"
                    type="button"
                    onClick={handleSendConsultMessage}
                    disabled={!consultMessage.trim()}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </div>
                <div className="dd-sp-footer">
                  <div className="dd-sp-actions">
                    <button
                      className="dd-sp-btn dd-sp-btn--rx"
                      type="button"
                      onClick={() => openPrescriptionForConsultation(selectedConsult)}
                    >
                      Issue prescription
                    </button>
                    <button
                      className="dd-sp-btn dd-sp-btn--success"
                      type="button"
                      disabled={selectedConsult.status === 'Completed'}
                      onClick={() => { void updateConsultationStatus(selectedConsult.id, 'Completed'); setShowConsultChat(false) }}
                    >
                      Mark completed
                    </button>
                    <button
                      className="dd-sp-btn dd-sp-btn--danger"
                      type="button"
                      onClick={() => { void updateConsultationStatus(selectedConsult.id, 'Cancelled'); setSelectedConsult(null); setShowConsultChat(false) }}
                    >
                      End &amp; cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="dd-sp-stepper">
                  {CONSULT_STEPS.map((step, idx) => {
                    const current = consultStep(selectedConsult.status)
                    const isDone = idx < current
                    const isActive = idx === current
                    return (
                      <div key={step} className={`dd-sp-step ${isDone ? 'dd-sp-step--done' : ''} ${isActive ? 'dd-sp-step--active' : ''}`}>
                        <div className="dd-sp-step__inner">
                          <div className="dd-sp-step__dot">
                            {isDone ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                            ) : <span>{idx + 1}</span>}
                          </div>
                          <p className="dd-sp-step__label">{step}</p>
                        </div>
                        {idx < CONSULT_STEPS.length - 1 && (
                          <div className={`dd-sp-step__line ${isDone ? 'dd-sp-step__line--done' : ''}`} />
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="dd-sp-body pd-consult-body">
                  <div className="pd-consult-workspace">
                    <section className="pd-consult-main">
                      <div className="pd-child-summary-card">
                        <div className="dd-sp-patient">
                          <div className="dd-sp-patient__avatar">{initials(selectedConsult.childName ?? selectedConsult.patientName)}</div>
                          <div>
                            <p className="dd-sp-patient__name">{selectedConsult.childName ?? '-'}</p>
                            <p className="dd-sp-patient__meta">
                              {formatPediatricAge(selectedConsult.childAge)} · {selectedConsult.weightKg ? `${selectedConsult.weightKg} kg` : 'Weight not recorded'} · Guardian: {selectedConsult.guardianName ?? '-'}
                            </p>
                            <div className="pd-child-summary-card__badges">
                              <AgeBand ageYears={selectedConsult.childAge} />
                              <span className={`pd-consent ${selectedConsult.consentStatus === 'Granted' ? 'pd-consent--ok' : 'pd-consent--pending'}`}>
                                {selectedConsult.consentStatus ?? 'Pending consent'}
                              </span>
                              <span className="dd-status-cell">
                                <span className="dd-status-dot" style={{ background: STATUS_COLORS[selectedConsult.status] ?? '#9ca3af' }} />
                                <span className="dd-status-text">{selectedConsult.status}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="pd-child-summary-card__metrics">
                          <div><span>Scheduled</span><strong>{selectedConsult.scheduledAt}</strong></div>
                          <div><span>Growth</span><strong>{selectedClinicalProfile?.growthPercentile ?? '-'}</strong></div>
                          <div><span>Allergies</span><strong>{selectedClinicalProfile?.allergies.join(', ') ?? '-'}</strong></div>
                          <div><span>Current meds</span><strong>{selectedClinicalProfile?.currentMedication.join(', ') ?? '-'}</strong></div>
                        </div>
                      </div>

                      <div className="pd-complaint-card">
                        <span>Chief complaint</span>
                        <p>{selectedConsult.issue}</p>
                      </div>

                      <div className={`dd-handoff-card pd-rx-handoff ${selectedConsultContext.linkedRx ? 'dd-handoff-card--ready' : ''}`}>
                        <div>
                          <span className="dd-handoff-card__label">Prescription linked to this consultation</span>
                          <strong>{selectedConsultContext.linkedRx ? selectedConsultContext.linkedRx.id : 'No prescription issued yet'}</strong>
                          <p>
                            {selectedConsultContext.linkedRx
                              ? `${selectedConsultContext.linkedRx.status} · ${medicationSummary(selectedConsultContext.linkedRx.items)}`
                              : 'Create the pediatric prescription from this consultation after diagnosis and dosing review.'}
                          </p>
                        </div>
                        <button className="dd-action-btn dd-action-btn--rx" type="button" onClick={() => openPrescriptionForConsultation(selectedConsult)}>
                          {selectedConsultContext.linkedRx ? 'Add another Rx' : 'Issue Rx'}
                        </button>
                      </div>

                      <div className="pd-note-board">
                        <div className="pd-note-board__header">
                          <div>
                            <p className="dd-sp-section-title">Clinical notes</p>
                            <span>Autosaved locally while the consultation is open.</span>
                          </div>
                        </div>
                        <div className="pd-note-grid">
                          {NOTE_FIELDS.map((field) => (
                            <label key={field.key} className="pd-note-field">
                              <span>{field.label}</span>
                              <textarea
                                value={selectedConsultationNotes[field.key]}
                                placeholder={field.placeholder}
                                rows={field.key === 'assessment' ? 3 : 2}
                                onChange={(event) => updateConsultationNote(selectedConsult.id, field.key, event.target.value)}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    </section>

                    <aside className="pd-consult-context">
                      <div className="pd-context-card">
                        <p className="dd-sp-section-title">Pediatric safety</p>
                        <GrowthChart weightKg={selectedConsult.weightKg} ageMonths={selectedConsult.childAge !== undefined ? selectedConsult.childAge * 12 : undefined} />
                        <DosingCalculator weightKg={selectedConsult.weightKg} />
                      </div>

                      <div className="pd-context-card">
                        <div className="pd-context-card__header">
                          <p className="dd-sp-section-title">History</p>
                          <span>{selectedConsultContext.timeline.length}</span>
                        </div>
                        {selectedConsultContext.timeline.length > 0 ? (
                          <PediatricTimeline items={selectedConsultContext.timeline.slice(0, 6)} />
                        ) : (
                          <p className="pd-context-empty">No previous child history recorded.</p>
                        )}
                      </div>

                      <div className="pd-context-card">
                        <div className="pd-context-card__header">
                          <p className="dd-sp-section-title">Recent family chat</p>
                          <span>{selectedConsultContext.threads.length}</span>
                        </div>
                        {selectedConsultContext.linkedThread ? (
                          <div className="pd-chat-preview">
                            {selectedConsultContext.linkedThread.messages.slice(-3).map((message) => (
                              <p key={message.id}>
                                <strong>{message.sender === 'doctor' ? 'You' : 'Guardian'}:</strong> {message.text}
                              </p>
                            ))}
                            <button
                              className="dd-action-btn dd-action-btn--chat"
                              type="button"
                              onClick={() => {
                                const thread = findOrCreateThread(selectedConsult)
                                setConsultThread(thread)
                                setShowConsultChat(true)
                              }}
                            >
                              Open chat
                            </button>
                          </div>
                        ) : (
                          <p className="pd-context-empty">No messages yet for this consultation.</p>
                        )}
                      </div>
                    </aside>
                  </div>
                </div>

                <div className="dd-sp-footer">
                  <div className="dd-sp-actions">
                    {selectedConsult.status === 'Waiting' ? (
                      <button
                        className="dd-sp-btn dd-sp-btn--primary"
                        type="button"
                        onClick={() => handleStartConsultation(selectedConsult)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Start conversation
                      </button>
                    ) : selectedConsult.status === 'In progress' ? (
                      <button
                        className="dd-sp-btn dd-sp-btn--primary"
                        type="button"
                        onClick={() => {
                          const thread = findOrCreateThread(selectedConsult)
                          setConsultThread(thread)
                          setShowConsultChat(true)
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Continue conversation
                      </button>
                    ) : null}
                    <button
                      className="dd-sp-btn dd-sp-btn--rx"
                      type="button"
                      onClick={() => openPrescriptionForConsultation(selectedConsult)}
                    >
                      Issue prescription
                    </button>
                    <button
                      className="dd-sp-btn dd-sp-btn--success"
                      type="button"
                      disabled={selectedConsult.status === 'Completed'}
                      onClick={() => updateConsultationStatus(selectedConsult.id, 'Completed')}
                    >
                      Mark completed
                    </button>
                    <button
                      className="dd-sp-btn dd-sp-btn--danger"
                      type="button"
                      disabled={selectedConsult.status === 'Cancelled'}
                      onClick={() => { updateConsultationStatus(selectedConsult.id, 'Cancelled'); setSelectedConsult(null) }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}
          </aside>
        </>
      )}

      {/* ── Create Rx side panel ── */}
      {showRxPanel && (
        <>
          <div className="dd-overlay" onClick={() => setShowRxPanel(false)} />
          <aside className="dd-side-panel dd-side-panel--rx">
            <div className="dd-sp-header">
              <div>
                <p className="dd-sp-id">New Pediatric Prescription</p>
                <p className="dd-sp-meta">
                  {rxConsultationId ? `Linked to consultation #${rxConsultationId}` : 'Select a child consultation first'}
                </p>
              </div>
              <button className="dd-sp-close" type="button" onClick={() => { setShowRxPanel(false); setRxConsultationId(null) }}>×</button>
            </div>
            <div className="dd-sp-body">
              <div className="dd-sp-section">
                <div className="dd-rx-field">
                  <label>Child consultation</label>
                  <select
                    value={rxConsultationId ? String(rxConsultationId) : ''}
                    onChange={(e) => handlePrescriptionConsultationSelect(e.target.value)}
                  >
                    <option value="">Select a child</option>
                    {prescriptionPatientOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {rxPatient && <p className="dd-rx-field-note">Child: {rxPatient}</p>}
                  {prescriptionPatientOptions.length === 0 && (
                    <p className="dd-rx-field-note dd-rx-field-note--warning">
                      No pediatric consultations are available. Start or assign a consultation before issuing medicine.
                    </p>
                  )}
                </div>
                <div className="dd-rx-field">
                  <label>Clinical notes</label>
                  <textarea rows={3} placeholder="Diagnosis, weight-based dosing notes…" value={rxNotes} onChange={(e) => setRxNotes(e.target.value)} />
                </div>
              </div>
              <div className="dd-sp-section">
                <p className="dd-sp-section-title">Medications</p>
                <p className="dd-rx-catalog-hint">Select medicines from Ava Pharmacy inventory. Out-of-stock variants cannot be issued.</p>
                <div className="dd-rx-items">
                  {rxItems.map((item, idx) => (
                    <div key={idx} className="dd-rx-item">
                      <div className="dd-rx-item__header">
                        <span>Medication {idx + 1}</span>
                        <div className="dd-rx-item__meta">
                          {item.variantId && <em>Catalog selected</em>}
                          {rxItems.length > 1 && (
                            <button
                              className="dd-rx-remove-btn"
                              type="button"
                              onClick={() => setRxItems((prev) => prev.filter((_, itemIndex) => itemIndex !== idx))}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="dd-rx-catalog-cell">
                        <label>Medicine</label>
                        <select
                          value={item.variantId ? String(item.variantId) : ''}
                          onFocus={loadPrescriptionCatalog}
                          onChange={(e) => handleCatalogSelect(idx, e.target.value)}
                        >
                          <option value="">
                            {rxCatalogListLoading ? 'Loading medicines...' : 'Select medicine from catalog'}
                          </option>
                          {((rxCatalogOptions[idx]?.length ?? 0) > 0 ? rxCatalogOptions[idx] : rxCatalogList).map((variant) => (
                            <option key={variant.id} value={variant.id} disabled={!variant.can_prescribe}>
                              {variant.display_name} · {variant.sku} · {variant.inventory_status.replace(/_/g, ' ')} · {variant.available_quantity} available
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Filter medicine list"
                          value={item.variantId ? '' : item.name}
                          onChange={(e) => handleCatalogSearch(idx, e.target.value)}
                        />
                        {item.variantId && (
                          <div className="dd-rx-selected">
                            <span>{item.sku}</span>
                            <span>{item.stockStatus?.replace(/_/g, ' ') || 'in catalog'} · {item.availableQuantity ?? 0} available</span>
                          </div>
                        )}
                        {item.catalogFallback && !item.variantId && (
                          <div className="dd-rx-fallback-note">Non-catalog item. Pharmacist must review and map it before fulfillment.</div>
                        )}
                        {(rxCatalogLoading[idx] || (rxCatalogOptions[idx]?.length ?? 0) > 0) && (
                          <div className="dd-rx-options">
                            {rxCatalogLoading[idx] && <p className="dd-rx-options__empty">Searching inventory...</p>}
                            {(rxCatalogOptions[idx] ?? []).map((variant) => (
                              <button
                                key={variant.id}
                                className="dd-rx-option"
                                type="button"
                                disabled={!variant.can_prescribe}
                                onClick={() => selectCatalogVariant(idx, variant)}
                              >
                                <span>
                                  <strong>{variant.display_name}</strong>
                                  <small>{variant.brand_name || 'Ava catalog'} · {variant.sku}</small>
                                </span>
                                <em>{variant.inventory_status.replace(/_/g, ' ')} · {variant.available_quantity}</em>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="dd-rx-dose-cell">
                        <label>Dosage <span className="dd-rx-required">*</span></label>
                        <input type="text" required placeholder="e.g. 5ml 3x/day" value={item.dosage} onChange={(e) => updateRxItem(idx, { dosage: e.target.value })} />
                      </div>
                      <div className="dd-rx-qty-cell">
                        <label>Qty <span className="dd-rx-required">*</span></label>
                        <input type="number" min={1} required placeholder="Qty" value={item.quantity} onChange={(e) => updateRxItem(idx, { quantity: Number(e.target.value) })} />
                      </div>
                    </div>
                  ))}
                  <button className="dd-add-item-btn" type="button" onClick={() => setRxItems((prev) => [...prev, { name: '', dosage: '', quantity: 1 }])}>
                    + Add another medication
                  </button>
                </div>
              </div>
            </div>
            <div className="dd-sp-footer">
              <div className="dd-sp-actions">
                <button
                  className="dd-sp-btn dd-sp-btn--primary"
                  type="button"
                  onClick={handleCreatePrescription}
                  disabled={!rxConsultationId || !rxPatient.trim() || !rxHasMedication}
                >
                  Issue &amp; notify guardian
                </button>
                <button className="dd-sp-btn" type="button" onClick={() => { setShowRxPanel(false); setRxConsultationId(null) }}>Cancel</button>
              </div>
            </div>
          </aside>
        </>
      )}
    </ProfessionalPortalShell>
  )
}

export default PediatricianDashboardPage
