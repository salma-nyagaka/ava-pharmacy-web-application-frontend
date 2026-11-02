import ConsultationAttachments from '../../components/ConsultationAttachments'
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
  loadDoctorProfiles,
  saveConsultations,
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
  identityKey: string
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
  heightCm: number | null
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

function prescriptionMatchesConsultation(rx: DoctorPrescription, consultation: Consultation) {
  if (consultation.backendId && rx.consultationId === consultation.backendId) return true
  return rx.notes.toLowerCase().includes(consultation.id.toLowerCase())
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
    createdAtRaw: record.createdAt,
    channel: 'Chat',
    priority: record.priority === 'priority' ? 'Priority' : 'Routine',
    lastMessageAt: formatBackendDate(record.lastMessageAt || record.updatedAt),
    pediatric: true,
    guardianName: record.guardianName || record.patientName,
    childName: record.childName || record.patientName,
    childPatientId: record.childPatient,
    childAge: record.childAge ?? undefined,
    weightKg: record.weightKg == null ? undefined : Number(record.weightKg),
    heightCm: record.heightCm == null ? undefined : Number(record.heightCm),
    bmi: record.bmi ?? undefined,
    childSnapshot: record.childSnapshot,
    guardianSnapshot: record.guardianSnapshot,
    consentStatus: record.consentStatus === 'granted' ? 'Granted' : 'Pending',
    dosageAlert: record.dosageAlert,
  }
}

function mapBackendPediatricThread(record: ConsultationRecord, doctorId: string): DoctorMessageThread {
  const messages = record.messages.map((message) => ({
    id: String(message.id),
    sender: message.sender == null ? 'system' as const : message.sender === record.patient ? 'patient' as const : 'doctor' as const,
    text: message.message,
    sentAtRaw: message.sentAt,
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
    sentAtRaw: message.sentAt,
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

function preserveRicherThread(current: DoctorMessageThread | undefined, next: DoctorMessageThread): DoctorMessageThread {
  if (!current || next.messages.length >= current.messages.length) return next
  return {
    ...next,
    lastMessage: current.lastMessage,
    lastMessageAt: current.lastMessageAt,
    unreadCount: current.unreadCount,
    messages: current.messages,
  }
}

function threadMessagesMatch(current: DoctorMessageThread | null, next: DoctorMessageThread): boolean {
  if (!current || current.messages.length !== next.messages.length) return false
  return current.messages.every((message, index) => {
    const candidate = next.messages[index]
    return candidate?.id === message.id
      && candidate.text === message.text
      && candidate.sender === message.sender
      && candidate.time === message.time
  })
}

function mapBackendPediatricPrescription(rx: ClinicianPrescription, doctorId: string): DoctorPrescription {
  const consultationId = rx.consultation_id ?? rx.consultation ?? null
  return {
    id: rx.reference,
    backendId: rx.id,
    consultationId,
    doctorId,
    patientName: rx.patient_name,
    createdAt: rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
    status: rx.status === 'sent' ? 'Sent' : rx.status === 'dispensed' ? 'Dispensed' : 'Draft',
    isPaidFor: Boolean(rx.is_paid_for),
    notes: rx.notes || (consultationId ? `Consultation #${consultationId}` : 'No notes provided.'),
    pediatric: true,
    items: (rx.items || []).map((item) => ({
      name: item.drug_name || item.catalog_name || 'Medication',
      dosage: item.dose || '',
      frequency: item.frequency || '',
      duration: item.duration || '',
      quantityMeasurement: item.quantity_measurement || 'unit(s)',
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

function GrowthChart({ weightKg }: { weightKg?: number; ageMonths?: number }) {
  return <div className="ped-growth-chart"><p>Recorded weight: {weightKg ? `${weightKg} kg` : 'Not recorded'}. Growth assessment has not been recorded.</p></div>
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

function pediatricChildKey(consultation: Consultation): string {
  return consultation.childPatientId != null
    ? `child:${consultation.childPatientId}`
    : `consultation:${consultation.backendId ?? consultation.id}`
}

function buildChildClinicalProfile(consultation: Consultation): ChildClinicalProfile {
  const child = consultation.childSnapshot ?? {}
  const guardian = consultation.guardianSnapshot ?? {}
  const list = (value: unknown): string[] => Array.isArray(value) && value.length ? value.map(String) : ['Not recorded']
  const age = consultation.childAge ?? consultation.patientAge ?? 0
  return {
    identityKey: pediatricChildKey(consultation),
    child: consultation.childName || consultation.patientName,
    age,
    ageMonths: monthsFromAge(age),
    gender: String(child.gender || 'Not recorded'),
    dob: String(child.date_of_birth || 'Not recorded'),
    bloodGroup: 'Not recorded',
    guardian: consultation.guardianName || String(guardian.name || 'Guardian'),
    relationship: 'Parent/Guardian',
    phone: String(guardian.phone || 'Not recorded'),
    email: String(guardian.email || 'Not recorded'),
    emergencyContact: 'Not recorded',
    lastVisit: consultation.scheduledAt,
    weightKg: consultation.weightKg,
    heightCm: consultation.heightCm ?? null,
    bmi: consultation.bmi || 'Not recorded',
    headCircumference: 'Not recorded',
    growthPercentile: 'Not assessed',
    growthStatus: 'Assessment not recorded',
    allergies: list(child.allergies),
    chronicConditions: list(child.chronic_conditions),
    currentMedication: list(child.current_medications),
    vaccinations: { received: list(child.vaccination_notes ? [child.vaccination_notes] : []), upcoming: ['Not recorded'], missed: [] },
    hospitalizations: ['Not recorded'],
    documents: [],
  }
}

const createInitialPediatricThreads = (): DoctorMessageThread[] => []
const createInitialPediatricConsultations = (): Consultation[] => []
const createInitialPediatricPrescriptions = (): DoctorPrescription[] => []
const createInitialPediatricEarnings = (): DoctorEarning[] => []

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
  const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState(false)
  const [showRxPanel, setShowRxPanel] = useState(false)
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(null)
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
  }, [activeDoctorId, consultThread?.patientName, liveConsultationId, selectedConsult?.backendId, selectedConsult?.childName, selectedConsult?.patientName, user?.id])

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
        setConsultThread((current) => (
          threadMessagesMatch(current, mappedThread)
            ? current
            : { ...mappedThread, unreadCount: 0 }
        ))
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
        if (!cancelled) {
          setWorkspaceError('Unable to load the live pediatrician workspace. Please try again.')
          setConsultations([])
          setThreads([])
          setPrescriptions([])
          setEarningsData([])
        }
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
        setThreads((currentThreads) => nextThreads.map((nextThread) => {
          const currentThread = currentThreads.find((thread) => (
            thread.backendConsultationId === nextThread.backendConsultationId || thread.id === nextThread.id
          ))
          return preserveRicherThread(currentThread, nextThread)
        }))
        setSelectedConsult((current) => {
          if (!current) return current
          return nextConsultations.find((item) => item.backendId === current.backendId || item.id === current.id) ?? current
        })
        setConsultThread((current) => {
          if (!current) return current
          const next = nextThreads.find((item) => (
            item.backendConsultationId === current.backendConsultationId || item.id === current.id
          ))
          return next ? preserveRicherThread(current, next) : current
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

  const notificationOpened = useRef(false)
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get('consultation'))
    const record = pedConsultations.find(item => item.backendId === id)
    if (!notificationOpened.current && record) { setSelectedConsult(record); notificationOpened.current = true }
  }, [pedConsultations])

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
      const key = pediatricChildKey(c)
      if (!map.has(key)) map.set(key, buildChildClinicalProfile(c))
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
    const consults = pedConsultations.filter((consultation) => pediatricChildKey(consultation) === pediatricChildKey(selectedConsult))
    const consultationIds = new Set(consults.map((consultation) => consultation.backendId).filter((id): id is number => id != null))
    const prescriptionsForChild = pedPrescriptions.filter((rx) => rx.consultationId != null && consultationIds.has(rx.consultationId))
    const threadsForFamily = pedThreads.filter((thread) => thread.backendConsultationId != null && consultationIds.has(thread.backendConsultationId))
    const linkedRx = prescriptionsForChild.find((rx) => prescriptionMatchesConsultation(rx, selectedConsult))
    const linkedThread = threadsForFamily.find((thread) =>
      thread.backendConsultationId === selectedConsult.backendId || thread.id === `CONS-${selectedConsult.backendId}`
    ) ?? threadsForFamily[0]
    const timeline = [
      ...consults.map((consultation) => ({
        type: 'consultation',
        date: consultation.createdAtRaw || consultation.scheduledAt,
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
          date: message.sentAtRaw || thread.lastMessageAt,
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
    setEditingPrescriptionId(null)
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

  const viewExistingPrescriptions = async () => {
    setActiveTab('prescriptions')
    if (isAdminPreview) return

    setIsLoadingPrescriptions(true)
    setWorkspaceError('')
    try {
      const backendPrescriptions = await fetchPediatricianPrescriptions()
      setPrescriptions(backendPrescriptions.map((prescription) => (
        mapBackendPediatricPrescription(prescription, activeDoctorId)
      )))
    } catch {
      setWorkspaceError('Unable to refresh prescriptions right now. Previously loaded prescriptions are still shown.')
    } finally {
      setIsLoadingPrescriptions(false)
    }
  }

  const openPrescriptionForConsultation = (consultation: Consultation) => {
    const consultationId = consultation.backendId ?? consultationNumericId(consultation.id)
    const existingPrescription = pedPrescriptions.find((prescription) => (
      prescription.consultationId === consultationId
      && prescription.status !== 'Dispensed'
      && !prescription.isPaidFor
    ))
    setEditingPrescriptionId(existingPrescription?.id ?? null)
    setRxPatient(consultation.childName || consultation.patientName)
    setRxNotes(existingPrescription?.notes || `Consultation ${consultation.id}: ${consultation.issue}`)
    setRxConsultationId(consultationId)
    setRxItems(existingPrescription?.items.length
      ? existingPrescription.items.map((item) => ({ ...item }))
      : [{ name: '', dosage: '', quantity: 1 }])
    setRxCatalogOptions({})
    setRxCatalogLoading({})
    setWorkspaceError('')
    setShowRxPanel(true)
    loadPrescriptionCatalog()
  }

  const openPrescriptionForEditing = (prescription: DoctorPrescription) => {
    if (prescription.isPaidFor || prescription.status === 'Dispensed') return
    setEditingPrescriptionId(prescription.id)
    setRxPatient(prescription.patientName)
    setRxNotes(prescription.notes)
    setRxConsultationId(prescription.consultationId ?? null)
    setRxItems(prescription.items.length ? prescription.items.map((item) => ({ ...item })) : [{ name: '', dosage: '', quantity: 1 }])
    setRxCatalogOptions({})
    setRxCatalogLoading({})
    setWorkspaceError('')
    setShowRxPanel(true)
    loadPrescriptionCatalog()
  }

  const closePrescriptionPanel = () => {
    setShowRxPanel(false)
    setEditingPrescriptionId(null)
    setRxConsultationId(null)
  }

  const isStartedPrescriptionItem = (item: DoctorPrescriptionItem) =>
    Boolean(item.name.trim() || item.variantId || item.dosage.trim() || item.sku)

  const isCompletePrescriptionItem = (item: DoctorPrescriptionItem) =>
    Boolean(
      item.name.trim() &&
      item.variantId &&
      item.dosage.trim() &&
      Boolean(item.frequency?.trim()) &&
      Boolean(item.duration?.trim()) &&
      Boolean(item.quantityMeasurement?.trim()) &&
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
      setWorkspaceError('Complete medicine, dose, frequency, duration, quantity, and measurement for each item.')
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
          frequency: item.frequency || '',
          duration: item.duration || '',
          quantity_measurement: item.quantityMeasurement || 'unit(s)',
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
      const updated = prescriptions.some((item) => item.id === rx.id)
        ? prescriptions.map((item) => item.id === rx.id ? rx : item)
        : [rx, ...prescriptions]
      setPrescriptions(updated)
      saveDoctorPrescriptions(updated)
      setShowRxPanel(false)
      setEditingPrescriptionId(null)
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
      onNavChange={(itemId) => {
        if (itemId === 'prescriptions') {
          void viewExistingPrescriptions()
          return
        }
        setActiveTab(itemId as PediatricTab)
      }}
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
              <button type="button" onClick={() => { void viewExistingPrescriptions() }} disabled={isLoadingPrescriptions}>
                {isLoadingPrescriptions ? 'Loading prescriptions…' : `View prescriptions${pedPrescriptions.length ? ` (${pedPrescriptions.length})` : ''}`}
              </button>
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
                <table className="cm-table dd-table pd-consultation-table">
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
                          <div className="dd-actions-cell pd-consultation-actions" onClick={(e) => e.stopPropagation()}>
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
                            <button
                              className="dd-action-btn dd-action-btn--rx"
                              type="button"
                              disabled={item.status === 'Cancelled'}
                              onClick={() => openPrescriptionForConsultation(item)}
                            >
                              Rx
                            </button>
                            <button className="dd-action-btn" type="button" onClick={() => { setSelectedConsult(item); setConsultThread(findOrCreateThread(item)); setShowConsultChat(false) }}>
                              Details
                            </button>
                            <button
                              className="dd-action-btn pd-action-btn--complete"
                              type="button"
                              disabled={item.status === 'Completed' || item.status === 'Cancelled'}
                              onClick={() => updateConsultationStatus(item.id, 'Completed')}
                            >
                              Complete
                            </button>
                            <button
                              className="dd-action-btn pd-action-btn--cancel"
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
                      <span>Height <strong>{selectedClinicalProfile.heightCm == null ? 'Not recorded' : `${selectedClinicalProfile.heightCm} cm`}</strong></span>
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
                        <p>Missed: {selectedClinicalProfile.vaccinations.missed.join(', ') || 'Not recorded'}</p>
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
                    {consultThread?.backendConsultationId && <ConsultationAttachments key={consultThread.backendConsultationId} consultationId={consultThread.backendConsultationId} refreshKey={consultThread.messages.length} />}
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
                            className="dd-action-btn dd-action-btn--rx"
                            type="button"
                            disabled={rx.status === 'Dispensed' || rx.isPaidFor}
                            title={rx.isPaidFor ? 'Paid prescriptions cannot be edited' : rx.status === 'Dispensed' ? 'Dispensed prescriptions cannot be edited' : 'Edit prescription'}
                            onClick={() => openPrescriptionForEditing(rx)}
                          >
                            Edit
                          </button>
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
                  const childConsults = pedConsultations.filter((consultation) => pediatricChildKey(consultation) === p.identityKey)
                  const consultationIds = new Set(childConsults.map((consultation) => consultation.backendId).filter((id): id is number => id != null))
                  const childRx = pedPrescriptions.filter((rx) => rx.consultationId != null && consultationIds.has(rx.consultationId))
                  const timelineItems = [
                    ...childConsults.map((consultation) => ({
                      type: 'consultation',
                      date: consultation.createdAtRaw || consultation.scheduledAt,
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
                    <div key={p.identityKey} className="pd-profile-card">
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
                          <span>Height</span><strong>{p.heightCm == null ? 'Not recorded' : `${p.heightCm} cm`}</strong>
                        </div>
                        <div className="pd-profile-card__row">
                          <span>Growth</span><strong>{p.growthPercentile}</strong>
                        </div>
                        <div className="pd-profile-card__row">
                          <span>Vaccines due</span><strong>Not recorded</strong>
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
                          onClick={() => setSelectedChild(selectedChild === p.identityKey ? null : p.identityKey)}
                        >
                          {selectedChild === p.identityKey ? 'Hide history' : 'View history'}
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
                      {selectedChild === p.identityKey && (
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
                    ? (stats.totalRevenue / earnings.reduce((s, e) => s + e.consults, 0)).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
                {consultThread?.backendConsultationId && <ConsultationAttachments key={consultThread.backendConsultationId} consultationId={consultThread.backendConsultationId} refreshKey={consultThread.messages.length} />}
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
          <div className="dd-overlay" onClick={closePrescriptionPanel} />
          <aside className="dd-side-panel dd-side-panel--rx">
            <div className="dd-sp-header">
              <div>
                <p className="dd-sp-id">{editingPrescriptionId ? 'Edit Pediatric Prescription' : 'New Pediatric Prescription'}</p>
                <p className="dd-sp-meta">
                  {rxConsultationId ? `Linked to consultation #${rxConsultationId}` : 'Select a child consultation first'}
                </p>
              </div>
              <button className="dd-sp-close" type="button" onClick={closePrescriptionPanel}>×</button>
            </div>
            <div className="dd-sp-body">
              <div className="dd-sp-section">
                <div className="dd-rx-field">
                  <label>Child consultation</label>
                  <select
                    value={rxConsultationId ? String(rxConsultationId) : ''}
                    disabled={Boolean(editingPrescriptionId)}
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
                          {item.variantId && !(
                            (rxCatalogOptions[idx]?.length ?? 0) > 0 ? rxCatalogOptions[idx] : rxCatalogList
                          ).some((variant) => variant.id === item.variantId) && (
                            <option value={item.variantId}>
                              {item.catalogName || item.name} {item.sku ? `· ${item.sku}` : ''}
                            </option>
                          )}
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
                        <label>Dose <span className="dd-rx-required">*</span></label>
                        <input type="text" required placeholder="e.g. 5 ml" value={item.dosage} onChange={(e) => updateRxItem(idx, { dosage: e.target.value })} />
                        <label>Frequency <span className="dd-rx-required">*</span></label>
                        <input type="text" required placeholder="e.g. TID" value={item.frequency ?? ''} onChange={(e) => updateRxItem(idx, { frequency: e.target.value })} />
                        <label>Duration <span className="dd-rx-required">*</span></label>
                        <input type="text" required placeholder="e.g. 3/7 or 2/52" value={item.duration ?? ''} onChange={(e) => updateRxItem(idx, { duration: e.target.value })} />
                      </div>
                      <div className="dd-rx-qty-cell">
                        <label>Qty <span className="dd-rx-required">*</span></label>
                        <input type="number" min={1} required placeholder="Qty" value={item.quantity} onChange={(e) => updateRxItem(idx, { quantity: Number(e.target.value) })} />
                        <label>Measurement <span className="dd-rx-required">*</span></label>
                        <input type="text" required placeholder="e.g. tablets, ml" value={item.quantityMeasurement ?? ''} onChange={(e) => updateRxItem(idx, { quantityMeasurement: e.target.value })} />
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
                  {editingPrescriptionId ? 'Save changes & notify guardian' : 'Issue & notify guardian'}
                </button>
                <button className="dd-sp-btn" type="button" onClick={closePrescriptionPanel}>Cancel</button>
              </div>
            </div>
          </aside>
        </>
      )}
    </ProfessionalPortalShell>
  )
}

export default PediatricianDashboardPage
