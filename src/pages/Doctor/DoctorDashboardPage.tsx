import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  Consultation,
  DoctorMessage,
  DoctorMessageThread,
  DoctorEarning,
  DoctorPrescription,
  DoctorPrescriptionItem,
  loadConsultations,
  loadDoctorEarnings,
  loadDoctorMessages,
  loadDoctorPrescriptions,
  loadDoctorProfiles,
  saveConsultations,
  saveDoctorMessages,
  saveDoctorPrescriptions,
} from '../../data/telemedicine'
import {
  ClinicianCatalogVariant,
  createClinicianPrescription,
  downloadClinicianPrescriptionPdf,
  endConsultation,
  fetchConsultation,
  fetchClinicianEarnings,
  fetchDoctorConsultations,
  fetchClinicianPrescriptions,
  sendClinicianPrescription,
  sendConsultationMessage,
  searchClinicianCatalogVariants,
  updateConsultation,
  type ClinicianPrescription,
  type ClinicianEarningRecord,
  type ConsultationRecord,
} from '../../services/consultationService'
import ProfessionalPortalShell from '../../components/ProfessionalPortalShell/ProfessionalPortalShell'
import { useConsultationSocket, type SocketMessage } from '../../hooks/useConsultationSocket'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/portals/DoctorDashboardPage.css'

type DoctorTab = 'queue' | 'prescriptions' | 'patients' | 'earnings'

const STATUS_PILL_STYLES: Record<string, { background: string; color: string }> = {
  Waiting:      { background: 'rgba(245,158,11,0.12)',  color: '#92400e' },
  'In progress':{ background: 'rgba(37,99,235,0.12)',   color: '#1d4ed8' },
  Completed:    { background: 'rgba(22,163,74,0.12)',   color: '#166534' },
  Cancelled:    { background: 'rgba(107,114,128,0.14)', color: '#374151' },
  urgent:       { background: 'rgba(220,38,38,0.12)',   color: '#991b1b' },
  critical:     { background: 'rgba(220,38,38,0.12)',   color: '#991b1b' },
}

function initials(name: string) {
  return name
    .replace(/^Dr\.\s*/i, '')
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

function formatQueueCreatedAt(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function mapBackendConsultation(record: ConsultationRecord, doctorId: string): Consultation {
  return {
    id: record.reference || `CONS-${record.id}`,
    backendId: record.id,
    doctorId,
    patientName: record.patientName || 'Patient',
    patientAge: record.patientAge ?? 0,
    issue: record.issue,
    status: CONSULT_STATUS_FROM_API[record.status] ?? 'Waiting',
    scheduledAt: formatBackendDate(record.scheduledAt || record.createdAt),
    createdAt: formatQueueCreatedAt(record.createdAt),
    createdAtRaw: record.createdAt,
    channel: 'Chat',
    priority: record.priority === 'priority' ? 'Priority' : 'Routine',
    lastMessageAt: formatBackendDate(record.lastMessageAt || record.updatedAt),
    pediatric: record.isPediatric,
    guardianName: record.guardianName,
    childName: record.childName,
    childAge: record.childAge ?? undefined,
    weightKg: record.weightKg == null ? undefined : Number(record.weightKg),
    consentStatus: record.consentStatus === 'granted' ? 'Granted' : 'Pending',
    dosageAlert: record.dosageAlert,
  }
}

function mapBackendThread(record: ConsultationRecord, doctorId: string): DoctorMessageThread {
  const messages = record.messages.map((message) => ({
    id: String(message.id),
    sender: message.sender == null
      ? 'system' as const
      : message.sender === record.patient || (!record.patient && message.senderName === record.patientName)
        ? 'patient' as const
        : 'doctor' as const,
    text: message.message,
    time: message.sentAt ? new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
  }))
  return {
    id: `CONS-${record.id}`,
    backendConsultationId: record.id,
    doctorId,
    patientName: record.patientName || 'Patient',
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

function mapBackendPrescription(rx: ClinicianPrescription, doctorId: string): DoctorPrescription {
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

function mapBackendEarnings(records: ClinicianEarningRecord[], doctorId: string): DoctorEarning[] {
  const grouped = new Map<string, { period: string; consults: number; revenue: number; lastEarnedAt: string }>()
  records.forEach((record) => {
    const earnedAt = record.earned_at ? new Date(record.earned_at) : new Date()
    const key = `${earnedAt.getFullYear()}-${String(earnedAt.getMonth() + 1).padStart(2, '0')}`
    const period = earnedAt.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })
    const existing = grouped.get(key) ?? { period, consults: 0, revenue: 0, lastEarnedAt: record.earned_at }
    existing.consults += 1
    existing.revenue += Number(record.amount || 0)
    existing.lastEarnedAt = record.earned_at || existing.lastEarnedAt
    grouped.set(key, existing)
  })

  return Array.from(grouped.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, value]) => ({
      id: `EARN-${key}`,
      doctorId,
      period: value.period,
      consults: value.consults,
      revenue: value.revenue,
      payoutDate: 'Next payout cycle',
      status: 'Scheduled' as const,
    }))
}

function consultationNumericId(id: string) {
  const numericId = Number(String(id).replace(/\D/g, ''))
  return Number.isFinite(numericId) && numericId > 0 ? numericId : null
}

function prescriptionMatchesConsultation(rx: DoctorPrescription, consultation: Consultation | string) {
  const consultationId = typeof consultation === 'string' ? consultation : consultation.id
  const backendId = typeof consultation === 'string' ? consultationNumericId(consultation) : consultation.backendId
  if (backendId && rx.consultationId === backendId) return true
  return rx.notes.toLowerCase().includes(consultationId.toLowerCase())
}

function prescriptionItemKey(item: DoctorPrescriptionItem) {
  return String(item.variantId ?? item.sku ?? `${item.name}-${item.dosage}`).toLowerCase()
}

function prescriptionItemsForForm(rx: DoctorPrescription | null): DoctorPrescriptionItem[] {
  if (!rx || rx.items.length === 0) return [{ name: '', dosage: '', quantity: 1 }]
  const compacted = new Map<string, DoctorPrescriptionItem>()
  rx.items.forEach((item) => {
    const formItem = {
      name: item.catalogName || item.name,
      dosage: item.dosage,
      frequency: item.frequency || '',
      duration: item.duration || '',
      quantityMeasurement: item.quantityMeasurement || 'unit(s)',
      quantity: item.quantity || 1,
      variantId: item.variantId ?? null,
      productId: item.productId ?? null,
      sku: item.sku,
      catalogName: item.catalogName || item.name,
      catalogFallback: item.catalogFallback ?? false,
    }
    compacted.set(prescriptionItemKey(formItem), formItem)
  })
  return Array.from(compacted.values())
}

function medicationSummary(items: DoctorPrescriptionItem[]) {
  if (items.length === 0) return 'No medication items'
  const [first, ...rest] = items
  return `${first.name || 'Medication'}${rest.length > 0 ? ` + ${rest.length} more` : ''}`
}

function timelineTime(value: string) {
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function patientProfileSeed(name: string) {
  const safeName = name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.+|\.+$/g, '') || 'patient'
  return {
    gender: 'Not recorded',
    phone: '+254 700 000 000',
    email: `${safeName}@example.com`,
    allergies: ['No known drug allergies'],
    chronicConditions: ['None recorded'],
    currentMedication: ['None recorded'],
    bloodGroup: 'Not recorded',
    documents: ['Medical record', 'Consultation attachment'],
  }
}

function WaitTimer({ since }: { since: string | Date | undefined }) {
  const [mins, setMins] = useState<number | null>(null)
  useEffect(() => {
    const calc = () => {
      if (!since) {
        setMins(null)
        return
      }
      const startedAt = since instanceof Date ? since.getTime() : Date.parse(since)
      if (Number.isNaN(startedAt)) {
        setMins(null)
        return
      }
      const diff = Math.floor((Date.now() - startedAt) / 60000)
      setMins(Math.max(0, diff))
    }
    calc()
    const id = setInterval(calc, 30000)
    return () => clearInterval(id)
  }, [since])
  if (mins === null) return <span className="dd-td-meta">-</span>
  const color = mins < 10 ? '#16A34A' : mins < 20 ? '#F59E0B' : '#DC2626'
  return (
    <span className="doc-wait-timer" style={{ color, '--wait-color': color } as React.CSSProperties}>
      Waiting {mins} min
    </span>
  )
}

function DoctorDashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<DoctorTab>('queue')
  const isAdminPreview = user?.role === 'admin'
  const doctors = useMemo(() => loadDoctorProfiles(), [])
  const doctor = useMemo(() => {
    if (user?.role === 'admin') {
      const previewDoctor = doctors.find((d) => d.type === 'Doctor' && d.status === 'Active')
        ?? doctors.find((d) => d.type === 'Doctor')
      if (previewDoctor) {
        return {
          ...previewDoctor,
          name: user.name || previewDoctor.name,
          email: user.email || previewDoctor.email,
          specialty: `Admin preview · ${previewDoctor.specialty}`,
        }
      }
    }
    const userEmail = user?.email?.trim().toLowerCase()
    const matchedProfile = userEmail
      ? doctors.find((d) => d.type === 'Doctor' && d.email.toLowerCase() === userEmail)
      : undefined
    if (matchedProfile) return matchedProfile
    return {
      id: user ? `USER-${user.id}` : 'UNASSIGNED-DOCTOR',
      name: user?.name
        ? (/^dr\.?\s/i.test(user.name) ? user.name : `Dr. ${user.name}`)
        : 'Doctor',
      type: 'Doctor' as const,
      specialty: 'Doctor Portal',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      license: '',
      facility: 'Ava Pharmacy',
      submitted: '',
      status: 'Active' as const,
      commission: 0,
      consultFee: 0,
      rating: 0,
      availability: '',
      languages: [],
      documents: [],
    }
  }, [doctors, user])
  const activeDoctorId = doctor.id
  const [consultations, setConsultations] = useState<Consultation[]>(() => loadConsultations())
  const [threads, setThreads] = useState<DoctorMessageThread[]>(() => loadDoctorMessages())
  const [prescriptions, setPrescriptions] = useState<DoctorPrescription[]>(() => loadDoctorPrescriptions())
  const [earnings, setEarnings] = useState<DoctorEarning[]>(() => loadDoctorEarnings())
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [workspaceError, setWorkspaceError] = useState('')
  const [workspaceSuccess, setWorkspaceSuccess] = useState('')

  const [queueSearch, setQueueSearch] = useState('')
  const [selectedConsult, setSelectedConsult] = useState<Consultation | null>(null)

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
  const [rxLockedByPayment, setRxLockedByPayment] = useState(false)
  const [rxSubmitting, setRxSubmitting] = useState(false)
  const [rxModalSuccess, setRxModalSuccess] = useState('')
  const rxCloseTimerRef = useRef<number | null>(null)

  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)

  useEffect(() => {
    consultEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [consultThread?.messages])

  useEffect(() => {
    let cancelled = false
    const loadWorkspace = async () => {
      if (isAdminPreview) {
        setWorkspaceError('')
        setWorkspaceLoading(false)
        setConsultations(loadConsultations())
        setThreads(loadDoctorMessages())
        setPrescriptions(loadDoctorPrescriptions())
        return
      }
      setWorkspaceLoading(true)
      setWorkspaceError('')
      try {
        const [backendConsultations, backendPrescriptions, backendEarnings] = await Promise.all([
          fetchDoctorConsultations(),
          fetchClinicianPrescriptions(),
          fetchClinicianEarnings(),
        ])
        if (cancelled) return
        const mappedConsultations = backendConsultations.map((record) => mapBackendConsultation(record, activeDoctorId))
        const mappedThreads = backendConsultations
          .filter((record) => record.messages.length > 0 || record.status === 'in_progress')
          .map((record) => mapBackendThread(record, activeDoctorId))
        const mappedPrescriptions = backendPrescriptions.map((rx) => mapBackendPrescription(rx, activeDoctorId))
        const mappedEarnings = mapBackendEarnings(backendEarnings, activeDoctorId)
        setConsultations(mappedConsultations)
        setThreads(mappedThreads)
        setPrescriptions(mappedPrescriptions)
        setEarnings(mappedEarnings)
      } catch {
        if (!cancelled) {
          setWorkspaceError('Unable to load the live doctor workspace. Showing saved local data.')
          setConsultations(loadConsultations())
          setThreads(loadDoctorMessages())
          setPrescriptions(loadDoctorPrescriptions())
          setEarnings(loadDoctorEarnings().filter((e) => e.doctorId === activeDoctorId))
        }
      } finally {
        if (!cancelled) setWorkspaceLoading(false)
      }
    }
    void loadWorkspace()
    return () => { cancelled = true }
  }, [activeDoctorId, isAdminPreview])

  const doctorConsultations = useMemo(
    () => consultations.filter((c) => c.doctorId === activeDoctorId && !c.pediatric),
    [consultations, activeDoctorId]
  )

  const queueItems = useMemo(() => {
    const q = queueSearch.trim().toLowerCase()
    if (!q) return doctorConsultations
    return doctorConsultations.filter((c) =>
      [c.patientName, c.issue, c.status, c.id].some((v) => v.toLowerCase().includes(q))
    )
  }, [doctorConsultations, queueSearch])

  const doctorThreads = useMemo(
    () => threads.filter((t) => t.doctorId === activeDoctorId),
    [threads, activeDoctorId]
  )

  const doctorPrescriptions = useMemo(
    () => prescriptions.filter((rx) => rx.doctorId === activeDoctorId && !rx.pediatric),
    [prescriptions, activeDoctorId]
  )

  const prescriptionStats = useMemo(() => ({
    draft: doctorPrescriptions.filter((rx) => rx.status === 'Draft').length,
    sent: doctorPrescriptions.filter((rx) => rx.status === 'Sent').length,
  }), [doctorPrescriptions])

  const filteredPrescriptions = useMemo(() => {
    const q = prescriptionSearch.trim().toLowerCase()
    if (!q) return doctorPrescriptions
    return doctorPrescriptions.filter((rx) =>
      [rx.patientName, rx.status, rx.id].some((v) => v.toLowerCase().includes(q))
    )
  }, [doctorPrescriptions, prescriptionSearch])

  const patientRecords = useMemo(() => {
    const map = new Map<string, { name: string; lastVisit: string; total: number }>()
    doctorConsultations.forEach((c) => {
      const e = map.get(c.patientName)
      if (!e) map.set(c.patientName, { name: c.patientName, lastVisit: c.scheduledAt, total: 1 })
      else { e.total += 1; e.lastVisit = c.scheduledAt }
    })
    return Array.from(map.values())
  }, [doctorConsultations])

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase()
    if (!q) return patientRecords
    return patientRecords.filter((p) => p.name.toLowerCase().includes(q))
  }, [patientRecords, patientSearch])

  const stats = useMemo(() => {
    const total = doctorConsultations.length
    const waiting = doctorConsultations.filter((c) => c.status === 'Waiting').length
    const inProgress = doctorConsultations.filter((c) => c.status === 'In progress').length
    const completed = doctorConsultations.filter((c) => c.status === 'Completed').length
    const totalRevenue = earnings.reduce((sum, e) => sum + e.revenue, 0)
    return { total, waiting, inProgress, completed, totalRevenue }
  }, [doctorConsultations, earnings])

  const replaceConsultation = (record: ConsultationRecord) => {
    const mapped = mapBackendConsultation(record, activeDoctorId)
    setConsultations((prev) => prev.map((c) => (c.backendId === record.id || c.id === mapped.id ? mapped : c)))
    if (selectedConsult?.backendId === record.id || selectedConsult?.id === mapped.id) {
      setSelectedConsult(mapped)
    }
    return mapped
  }

  const replaceThread = (record: ConsultationRecord) => {
    const mapped = mapBackendThread(record, activeDoctorId)
    setThreads((prev) => {
      const exists = prev.some((thread) => thread.backendConsultationId === record.id || thread.id === mapped.id)
      return exists
        ? prev.map((thread) => (thread.backendConsultationId === record.id || thread.id === mapped.id ? mapped : thread))
        : [mapped, ...prev]
    })
    return mapped
  }

  const liveConsultationId = showConsultChat
    ? consultThread?.backendConsultationId ?? selectedConsult?.backendId ?? null
    : null
  const socketToken = typeof window === 'undefined' ? null : window.localStorage.getItem('ava_access_token')

  const handleLiveConsultationMessage = useCallback((socketMessage: SocketMessage) => {
    if (!liveConsultationId) return
    const message = mapSocketMessage(socketMessage, user?.id)
    const lastMessageAt = socketMessage.sentAt ? formatBackendDate(socketMessage.sentAt) : 'Now'
    const fallbackPatientName = selectedConsult?.patientName || consultThread?.patientName || socketMessage.senderName || 'Patient'

    setThreads((prev) => {
      let matched = false
      const next = prev.map((thread) => {
        if (thread.backendConsultationId !== liveConsultationId) return thread
        matched = true
        return mergeThreadMessage(thread, message, lastMessageAt)
      })
      if (matched) return next
      return [
        {
          id: `CONS-${liveConsultationId}`,
          backendConsultationId: liveConsultationId,
          doctorId: activeDoctorId,
          patientName: fallbackPatientName,
          lastMessage: message.text,
          lastMessageAt,
          unreadCount: 0,
          status: 'Open',
          messages: [message],
        },
        ...prev,
      ]
    })

    setConsultThread((prev) => (
      prev?.backendConsultationId === liveConsultationId
        ? mergeThreadMessage(prev, message, lastMessageAt)
        : prev
    ))
    setConsultations((prev) => prev.map((consultation) => (
      consultation.backendId === liveConsultationId
        ? { ...consultation, lastMessageAt }
        : consultation
    )))
  }, [activeDoctorId, consultThread?.patientName, liveConsultationId, selectedConsult?.patientName, user?.id])

  useConsultationSocket(liveConsultationId, socketToken, handleLiveConsultationMessage)

  useEffect(() => {
    if (!liveConsultationId || isAdminPreview) return
    let cancelled = false

    const refreshOpenConversation = async () => {
      try {
        const record = await fetchConsultation(liveConsultationId)
        if (cancelled) return
        const mappedConsult = mapBackendConsultation(record, activeDoctorId)
        const mappedThread = mapBackendThread(record, activeDoctorId)

        setConsultations((prev) => prev.map((consultation) => (
          consultation.backendId === record.id || consultation.id === mappedConsult.id
            ? mappedConsult
            : consultation
        )))
        setThreads((prev) => {
          const exists = prev.some((thread) => thread.backendConsultationId === record.id || thread.id === mappedThread.id)
          return exists
            ? prev.map((thread) => (
              thread.backendConsultationId === record.id || thread.id === mappedThread.id
                ? mappedThread
                : thread
            ))
            : [mappedThread, ...prev]
        })
        setSelectedConsult((prev) => (
          prev?.backendId === record.id || prev?.id === mappedConsult.id
            ? mappedConsult
            : prev
        ))
        setConsultThread((prev) => (
          prev?.backendConsultationId === record.id || prev?.id === mappedThread.id
            ? { ...mappedThread, unreadCount: 0 }
            : prev
        ))
      } catch {
        // Keep the open conversation usable; the send path still reports errors.
      }
    }

    void refreshOpenConversation()
    const intervalId = window.setInterval(refreshOpenConversation, 3000)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [activeDoctorId, isAdminPreview, liveConsultationId])

  const loadLiveWorkspace = async (options?: { clearSelection?: boolean }) => {
    if (isAdminPreview) {
      setWorkspaceError('')
      setConsultations(loadConsultations())
      setThreads(loadDoctorMessages())
      setPrescriptions(loadDoctorPrescriptions())
      if (options?.clearSelection) {
        setSelectedConsult(null)
        setShowConsultChat(false)
      }
      return
    }
    setWorkspaceLoading(true)
    setWorkspaceError('')
    try {
      const [backendConsultations, backendPrescriptions] = await Promise.all([
        fetchDoctorConsultations(),
        fetchClinicianPrescriptions(),
      ])
      const backendEarnings = await fetchClinicianEarnings()
      const mappedConsultations = backendConsultations.map((record) => mapBackendConsultation(record, activeDoctorId))
      const mappedThreads = backendConsultations
        .filter((record) => record.messages.length > 0 || record.status === 'in_progress')
        .map((record) => mapBackendThread(record, activeDoctorId))
      const mappedPrescriptions = backendPrescriptions.map((rx) => mapBackendPrescription(rx, activeDoctorId))
      const mappedEarnings = mapBackendEarnings(backendEarnings, activeDoctorId)
      setConsultations(mappedConsultations)
      setThreads(mappedThreads)
      setPrescriptions(mappedPrescriptions)
      setEarnings(mappedEarnings)
      if (options?.clearSelection) {
        setSelectedConsult(null)
        setShowConsultChat(false)
      }
    } catch {
      setWorkspaceError('Unable to load the live doctor workspace. Showing saved local data.')
      setConsultations(loadConsultations())
      setThreads(loadDoctorMessages())
      setPrescriptions(loadDoctorPrescriptions())
      setEarnings(loadDoctorEarnings().filter((e) => e.doctorId === activeDoctorId))
    } finally {
      setWorkspaceLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab !== 'queue') return

    let cancelled = false
    let inFlight = false

    const refreshQueue = async () => {
      if (inFlight) return
      inFlight = true
      try {
        if (isAdminPreview) {
          if (!cancelled) {
            setConsultations(loadConsultations())
            setThreads(loadDoctorMessages())
            setPrescriptions(loadDoctorPrescriptions())
          }
          return
        }

        const [backendConsultations, backendPrescriptions] = await Promise.all([
          fetchDoctorConsultations(),
          fetchClinicianPrescriptions(),
        ])
        if (cancelled) return

        const mappedConsultations = backendConsultations.map((record) => mapBackendConsultation(record, activeDoctorId))
        const mappedThreads = backendConsultations
          .filter((record) => record.messages.length > 0 || record.status === 'in_progress')
          .map((record) => mapBackendThread(record, activeDoctorId))
        const mappedPrescriptions = backendPrescriptions.map((rx) => mapBackendPrescription(rx, activeDoctorId))

        setWorkspaceError('')
        setConsultations(mappedConsultations)
        setThreads(mappedThreads)
        setPrescriptions(mappedPrescriptions)
        setSelectedConsult((current) => {
          if (!current) return current
          return mappedConsultations.find((consultation) => (
            consultation.backendId === current.backendId || consultation.id === current.id
          )) ?? current
        })
      } catch {
        // Keep the current queue visible; the manual refresh still reports full workspace errors.
      } finally {
        inFlight = false
      }
    }

    const intervalId = window.setInterval(refreshQueue, 7000)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [activeDoctorId, activeTab, isAdminPreview])

  const updateConsultationStatus = async (id: string, status: Consultation['status']) => {
    const existing = consultations.find((c) => c.id === id)
    if (existing?.backendId) {
      try {
        setWorkspaceError('')
        const record = status === 'Completed'
          ? await endConsultation(existing.backendId)
          : await updateConsultation(existing.backendId, { status: CONSULT_STATUS_TO_API[status] })
        replaceConsultation(record)
        replaceThread(record)
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

  const refreshLocalQueue = () => {
    void loadLiveWorkspace({ clearSelection: true })
  }

  const findOrCreateThread = (consult: Consultation): DoctorMessageThread => {
    const existing = threads.find(
      (t) => t.doctorId === consult.doctorId && t.patientName === consult.patientName
    )
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
        text: `Consultation started for: ${consult.issue}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }],
    }
    const all = [newThread, ...threads]
    setThreads(all)
    saveDoctorMessages(all)
    return newThread
  }

  const openConsultationThread = async (consult: Consultation) => {
    if (consult.backendId) {
      try {
        setWorkspaceError('')
        const record = await fetchConsultation(consult.backendId)
        const mappedConsult = replaceConsultation(record)
        const thread = replaceThread(record)
        setSelectedConsult(mappedConsult)
        setConsultThread({ ...thread, unreadCount: 0 })
        setShowConsultChat(true)
      } catch {
        setWorkspaceError('Unable to open this consultation chat. Please refresh and try again.')
      }
      return
    }

    const thread = findOrCreateThread(consult)
    setSelectedConsult(consult)
    setConsultThread(thread)
    setShowConsultChat(true)
  }

  const handleStartConsultation = async (consult: Consultation) => {
    if (consult.backendId) {
      try {
        setWorkspaceError('')
        const record = await updateConsultation(consult.backendId, { status: 'in_progress' })
        const mappedConsult = replaceConsultation(record)
        const thread = replaceThread(record)
        setConsultThread({ ...thread, unreadCount: 0 })
        setSelectedConsult(mappedConsult)
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
        const messageText = consultMessage.trim()
        setConsultMessage('')
        await sendConsultationMessage(consultThread.backendConsultationId, messageText)
        const record = await fetchConsultation(consultThread.backendConsultationId)
        replaceConsultation(record)
        const thread = replaceThread(record)
        setConsultThread(thread)
      } catch {
        setWorkspaceError('Unable to send this message. Please check the connection and try again.')
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

  const loadPrescriptionCatalog = () => {
    if (rxCatalogList.length > 0 || rxCatalogListLoading) return
    setRxCatalogListLoading(true)
    void searchClinicianCatalogVariants('', 1000)
      .then((options) => setRxCatalogList(options))
      .catch(() => setWorkspaceError('Unable to load the medicine catalog. You can still search manually.'))
      .finally(() => setRxCatalogListLoading(false))
  }

  const fillPrescriptionFromConsultation = (consult: Consultation | null) => {
    if (!consult) {
      setRxPatient('')
      setRxNotes('')
      setRxConsultationId(null)
      return
    }
    setRxPatient(consult.patientName)
    setRxNotes(`Consultation ${consult.id}: ${consult.issue}`)
    setRxConsultationId(consult.backendId ?? consultationNumericId(consult.id))
  }

  const closePrescriptionPanel = () => {
    if (rxCloseTimerRef.current) {
      window.clearTimeout(rxCloseTimerRef.current)
      rxCloseTimerRef.current = null
    }
    setShowRxPanel(false)
    setRxConsultationId(null)
    setRxLockedByPayment(false)
    setRxModalSuccess('')
    setRxSubmitting(false)
  }

  const openPrescriptionForConsultation = (consult: Consultation) => {
    fillPrescriptionFromConsultation(consult)
    const existingPrescription = doctorPrescriptions.find((rx) => prescriptionMatchesConsultation(rx, consult)) ?? null
    setRxItems(prescriptionItemsForForm(existingPrescription))
    setRxLockedByPayment(Boolean(existingPrescription?.isPaidFor))
    setRxModalSuccess('')
    setRxSubmitting(false)
    setRxCatalogOptions({})
    setRxCatalogLoading({})
    setWorkspaceSuccess('')
    setShowRxPanel(true)
    loadPrescriptionCatalog()
  }

  const openNewPrescriptionPanel = () => {
    const latestConsultation = doctorConsultations.find((consultation) => consultation.backendId && consultation.status !== 'Cancelled') ?? null
    fillPrescriptionFromConsultation(latestConsultation)
    const existingPrescription = latestConsultation
      ? doctorPrescriptions.find((rx) => prescriptionMatchesConsultation(rx, latestConsultation)) ?? null
      : null
    setRxItems(prescriptionItemsForForm(existingPrescription))
    setRxLockedByPayment(Boolean(existingPrescription?.isPaidFor))
    setRxModalSuccess('')
    setRxSubmitting(false)
    setRxCatalogOptions({})
    setRxCatalogLoading({})
    setWorkspaceError('')
    setWorkspaceSuccess('')
    setShowRxPanel(true)
    loadPrescriptionCatalog()
  }

  const updateRxItem = (index: number, patch: Partial<DoctorPrescriptionItem>) => {
    setRxItems((prev) => prev.map((it, i) => i === index ? { ...it, ...patch } : it))
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
    void searchClinicianCatalogVariants(value)
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

  const handleCreatePrescription = async () => {
    if (!rxPatient.trim() || !rxConsultationId) {
      setWorkspaceSuccess('')
      setWorkspaceError('Select a patient consultation before issuing an e-prescription.')
      return
    }
    if (rxLockedByPayment) {
      setWorkspaceSuccess('')
      setWorkspaceError('This prescription has already been paid for and can no longer be edited.')
      return
    }
    const filteredItems = rxItems.filter(isStartedPrescriptionItem)
    if (filteredItems.length === 0) return
    if (filteredItems.some((item) => !isCompletePrescriptionItem(item))) {
      setWorkspaceSuccess('')
      setWorkspaceError('Complete medicine, dose, frequency, duration, quantity, and measurement for each item.')
      return
    }
    let issuedPrescription: DoctorPrescription | null = null
    try {
      setRxSubmitting(true)
      setRxModalSuccess('')
      setWorkspaceError('')
      setWorkspaceSuccess('')
      const created = await createClinicianPrescription({
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
          catalog_fallback: false,
          quantity: item.quantity,
        })),
      })
      const sent = await sendClinicianPrescription(created.id)
      issuedPrescription = mapBackendPrescription(sent, activeDoctorId)
    } catch {
      setRxSubmitting(false)
      setWorkspaceSuccess('')
      setWorkspaceError('The prescription could not be issued. Confirm the patient, stock availability, and medication details, then try again.')
      return
    }
    const rx: DoctorPrescription = issuedPrescription ?? {
      id: `RX-${Math.floor(1000 + Math.random() * 9000)}`,
      consultationId: rxConsultationId,
      doctorId: activeDoctorId,
      patientName: rxPatient,
      createdAt: new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'Sent',
      isPaidFor: false,
      notes: rxNotes || 'No notes provided.',
      items: filteredItems,
    }
    const updated = prescriptions.some((item) => item.id === rx.id)
      ? prescriptions.map((item) => item.id === rx.id ? rx : item)
      : [rx, ...prescriptions]
    setPrescriptions(updated)
    saveDoctorPrescriptions(updated)
    setRxModalSuccess(`Prescription ${rx.id} was created and sent to ${rx.patientName}.`)
    rxCloseTimerRef.current = window.setTimeout(() => {
      closePrescriptionPanel()
      setRxPatient('')
      setRxNotes('')
      setRxItems([{ name: '', dosage: '', quantity: 1 }])
      setRxCatalogOptions({})
    }, 1800)
    setRxSubmitting(false)
    return
  }

  const updatePrescriptionStatus = (id: string, status: DoctorPrescription['status']) => {
    const updated = prescriptions.map((rx) => (rx.id === id ? { ...rx, status } : rx))
    setPrescriptions(updated)
    saveDoctorPrescriptions(updated)
  }

  const handleSendPrescription = (rx: DoctorPrescription) => {
    if (!rx.backendId) { updatePrescriptionStatus(rx.id, 'Sent'); return }
    void sendClinicianPrescription(rx.backendId).then(() => updatePrescriptionStatus(rx.id, 'Sent')).catch(() => updatePrescriptionStatus(rx.id, 'Sent'))
  }

  const handleDownloadPdf = (rx: DoctorPrescription) => {
    if (!rx.backendId) return
    void downloadClinicianPrescriptionPdf(rx.backendId)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const doctorFirstName = doctor?.name.replace(/^Dr\.\s*/i, '').split(' ')[0] ?? 'Doctor'
  const rxHasMedication =
    rxItems.some(isCompletePrescriptionItem) &&
    !rxItems.some((item) => isStartedPrescriptionItem(item) && !isCompletePrescriptionItem(item))
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
      id: 'patients',
      label: 'Patients',
      badge: 0,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: 'prescriptions',
      label: 'E-prescriptions',
      badge: prescriptionStats.draft + prescriptionStats.sent,
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

  return (
    <ProfessionalPortalShell
      accentColor="#2563EB"
      activeItemId={activeTab}
      navItems={navigationItems}
      onNavChange={(itemId) => setActiveTab(itemId as DoctorTab)}
      onLogout={async () => {
        await logout()
        navigate('/login', { replace: true })
      }}
      roleLabel={isAdminPreview ? 'Admin · Doctor Preview' : 'Doctor'}
      userInitials={initials(doctor.name)}
      userMeta={doctor.specialty || 'Doctor Portal'}
      userName={doctor.name}
    >
      <div className="dd-content">
        {activeTab !== 'queue' && workspaceSuccess && (
          <div className="dd-alert dd-alert--success" role="status">
            <strong>Prescription created</strong>
            <span>{workspaceSuccess}</span>
          </div>
        )}

        {activeTab !== 'queue' && workspaceError && (
          <div className="dd-alert dd-alert--warning" role="status">
            <strong>Workspace notice</strong>
            <span>{workspaceError}</span>
          </div>
        )}

        {/* ── QUEUE TAB ── */}
        {activeTab === 'queue' && (
          <>
            <div className="dd-welcome" style={{ gridColumn: '1 / -1' }}>
              <div>
                <h1 className="dd-welcome__title">{greeting()}, Dr. {doctorFirstName}</h1>
                <p className="dd-welcome__sub">{doctor?.specialty} · {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="dd-welcome__actions">
                <button className="dd-soft-btn" type="button" onClick={refreshLocalQueue} disabled={workspaceLoading}>
                  {workspaceLoading ? 'Syncing...' : 'Refresh queue'}
                </button>
                <button className="dd-soft-btn dd-soft-btn--primary" type="button" onClick={() => setActiveTab('prescriptions')}>
                  E-prescriptions
                </button>
              </div>
            </div>

            {workspaceError && (
              <div className="dd-alert dd-alert--warning" style={{ gridColumn: '1 / -1' }} role="status">
                <strong>Workspace notice</strong>
                <span>{workspaceError}</span>
              </div>
            )}

            {workspaceSuccess && (
              <div className="dd-alert dd-alert--success" style={{ gridColumn: '1 / -1' }} role="status">
                <strong>Prescription created</strong>
                <span>{workspaceSuccess}</span>
              </div>
            )}

            <div className="dd-clinical-flow" style={{ gridColumn: '1 / -1' }}>
              <div className="dd-flow-step dd-flow-step--active">
                <span className="dd-flow-step__icon">1</span>
                <div>
                  <strong>Paid request</strong>
                  <p>Confirmed payments enter the doctor queue.</p>
                </div>
              </div>
              <div className="dd-flow-step">
                <span className="dd-flow-step__icon">2</span>
                <div>
                  <strong>Doctor chat</strong>
                  <p>Review symptoms and ask follow-up questions.</p>
                </div>
              </div>
              <div className="dd-flow-step">
                <span className="dd-flow-step__icon">3</span>
                <div>
                  <strong>E-prescription</strong>
                  <p>Issue medicine and notify the customer.</p>
                </div>
              </div>
              <div className="dd-flow-step">
                <span className="dd-flow-step__icon">4</span>
                <div>
                  <strong>Pharmacy review</strong>
                  <p>Stock, cart, and dispensing move to pharmacy.</p>
                </div>
              </div>
            </div>

            <div className="dd-shift-strip" style={{ gridColumn: '1 / -1' }}>
              <div>
                <span>Next action</span>
                <strong>{stats.waiting > 0 ? 'Review waiting consultations' : stats.inProgress > 0 ? 'Continue active chats' : 'Queue is clear'}</strong>
              </div>
              <div>
                <span>Completed</span>
                <strong>{stats.completed} consultation{stats.completed !== 1 ? 's' : ''}</strong>
              </div>
              <div>
                <span>Clinical queue</span>
                <strong>{stats.waiting + stats.inProgress} open</strong>
              </div>
              <div>
                <span>Prescription handoffs</span>
                <strong>{prescriptionStats.sent} sent · {prescriptionStats.draft} draft</strong>
              </div>
            </div>

            <div className="cm-kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              <div className="cm-kpi-card">
                <div className="cm-kpi-card__icon cm-kpi-card__icon--blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div className="cm-kpi-card__body">
                  <span className="cm-kpi-card__label">Total today</span>
                  <strong className="cm-kpi-card__value">{stats.total}</strong>
                </div>
              </div>
              <div className="cm-kpi-card">
                <div className="cm-kpi-card__icon cm-kpi-card__icon--amber">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div className="cm-kpi-card__body">
                  <span className="cm-kpi-card__label">Waiting</span>
                  <strong className="cm-kpi-card__value cm-kpi-card__value--amber">{stats.waiting}</strong>
                </div>
              </div>
              <div className="cm-kpi-card">
                <div className="cm-kpi-card__icon cm-kpi-card__icon--teal">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="10 8 16 12 10 16 10 8"/></svg>
                </div>
                <div className="cm-kpi-card__body">
                  <span className="cm-kpi-card__label">In progress</span>
                  <strong className="cm-kpi-card__value cm-kpi-card__value--green">{stats.inProgress}</strong>
                </div>
              </div>
              <div className="cm-kpi-card">
                <div className="cm-kpi-card__icon cm-kpi-card__icon--green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div className="cm-kpi-card__body">
                  <span className="cm-kpi-card__label">Completed</span>
                  <strong className="cm-kpi-card__value cm-kpi-card__value--green">{stats.completed}</strong>
                </div>
              </div>
              <div className="cm-kpi-card">
                <div className="cm-kpi-card__icon cm-kpi-card__icon--purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div className="cm-kpi-card__body">
                  <span className="cm-kpi-card__label">Total revenue</span>
                  <strong className="cm-kpi-card__value cm-kpi-card__value--purple">KSh {stats.totalRevenue.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            <div className="doc-split-layout" style={{ gridColumn: '1 / -1' }}>
              <div className="dd-table-card">
                <div className="dd-toolbar">
                  <div className="dd-search-wrap">
                    <svg className="dd-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input
                      className="dd-search-input"
                      type="text"
                      placeholder="Search by patient, issue, ID…"
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
                        <th>Consultation</th>
                        <th>Created at</th>
                        <th>Patient</th>
                        <th>Clinical need</th>
                        <th>Wait</th>
                        <th>Prescription</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queueItems.map((item) => {
                        const linkedRx = doctorPrescriptions.find((rx) => prescriptionMatchesConsultation(rx, item.id))
                        return (
                          <tr
                            key={item.id}
                            className={selectedConsult?.id === item.id ? 'dd-row--active' : ''}
                            onClick={() => { setSelectedConsult(item); setShowConsultChat(false) }}
                          >
                            <td>
                              <div className="dd-consult-cell">
                                <span className="dd-mono">{item.id}</span>
                                <span className={`dd-priority ${item.priority === 'Priority' ? 'dd-priority--high' : ''}`}>
                                  {item.priority === 'Priority'
                                    ? <><span className="dd-priority-dot" /> {item.priority}</>
                                    : item.priority}
                                </span>
                              </div>
                            </td>
                            <td className="dd-td-meta">{item.createdAt || item.scheduledAt || '-'}</td>
                            <td>
                              <div className="dd-td-patient">
                                <div className="dd-td-patient__avatar">{initials(item.patientName)}</div>
                                <div>
                                  <p className="dd-td-patient__name">{item.patientName}</p>
                                  <p className="dd-td-patient__id">{item.patientAge} yrs · {item.channel}</p>
                                </div>
                              </div>
                            </td>
                            <td className="dd-td-issue">{item.issue}</td>
                            <td>
                              {item.status === 'Waiting' || item.status === 'In progress'
                                ? <WaitTimer since={item.createdAtRaw || item.scheduledAt} />
                                : <span className="dd-td-meta">{item.scheduledAt}</span>}
                            </td>
                            <td>
                              {linkedRx ? (
                                <div className="dd-rx-linked">
                                  <strong>{linkedRx.id}</strong>
                                  <span>{linkedRx.status} · {linkedRx.items.length} item{linkedRx.items.length !== 1 ? 's' : ''}</span>
                                </div>
                              ) : (
                                <span className="dd-rx-empty">Not issued</span>
                              )}
                            </td>
                            <td>
                              <span
                                className="dd-status-pill"
                                style={STATUS_PILL_STYLES[item.status] ?? { background: 'rgba(100,116,139,0.12)', color: '#1e293b' }}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td>
                              <div className="dd-actions-cell" onClick={(e) => e.stopPropagation()}>
                                {item.status === 'Waiting' && (
                                  <button
                                    className="dd-action-btn dd-action-btn--start"
                                    type="button"
                                    onClick={() => { void handleStartConsultation(item) }}
                                  >
                                    Start
                                  </button>
                                )}
                                {item.status === 'In progress' && (
                                  <button
                                    className="dd-action-btn dd-action-btn--chat"
                                    type="button"
                                    onClick={() => { void openConsultationThread(item) }}
                                  >
                                    Chat
                                  </button>
                                )}
                                <button
                                  className="dd-action-btn"
                                  type="button"
                                  onClick={() => setSelectedPatient(item.patientName)}
                                >
                                  Profile
                                </button>
                                <button
                                  className="dd-action-btn dd-action-btn--rx"
                                  type="button"
                                  disabled={item.status === 'Cancelled'}
                                  onClick={() => openPrescriptionForConsultation(item)}
                                >
                                  Rx
                                </button>
                                <button
                                  className="dd-action-btn"
                                  type="button"
                                  disabled={item.status === 'Completed' || item.status === 'Cancelled'}
                                  onClick={() => { void updateConsultationStatus(item.id, 'Completed') }}
                                >
                                  Done
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {queueItems.length === 0 && (
                    <div className="dd-empty dd-empty--queue">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      <strong>No paid consultations in your queue</strong>
                      <p>Customer requests appear here after the consultation fee is confirmed.</p>
                      <button className="dd-soft-btn" type="button" onClick={refreshLocalQueue} disabled={workspaceLoading}>
                        {workspaceLoading ? 'Syncing...' : 'Refresh queue'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right workspace panel */}
              <div className="dd-queue-workspace">
                {selectedConsult ? (
                  <div className="dd-workspace-card">
                    {(() => {
                      const linkedRx = doctorPrescriptions.find((rx) => prescriptionMatchesConsultation(rx, selectedConsult.id))
                      return (
                        <>
                    <div className="dd-workspace-card__header">
                      <div className="dd-td-patient">
                        <div className="dd-td-patient__avatar">{initials(selectedConsult.patientName)}</div>
                        <div>
                          <p className="dd-td-patient__name">{selectedConsult.patientName}</p>
                          <p className="dd-td-patient__id">{selectedConsult.id}</p>
                        </div>
                      </div>
                      <span
                        className="dd-status-pill"
                        style={STATUS_PILL_STYLES[selectedConsult.status] ?? { background: 'rgba(100,116,139,0.12)', color: '#1e293b' }}
                      >
                        {selectedConsult.status}
                      </span>
                    </div>
                    <div className="dd-workspace-card__body">
                      <p className="dd-sp-section-title">Chief Complaint</p>
                      <p className="dd-sp-value" style={{ marginBottom: '1rem' }}>{selectedConsult.issue}</p>
                      <div className="dd-sp-grid">
                        <div className="dd-sp-field">
                          <p className="dd-sp-field-label">Scheduled</p>
                          <p className="dd-sp-field-value">{selectedConsult.scheduledAt}</p>
                        </div>
                        <div className="dd-sp-field">
                          <p className="dd-sp-field-label">Priority</p>
                          <p className="dd-sp-field-value">{selectedConsult.priority}</p>
                        </div>
                        <div className="dd-sp-field">
                          <p className="dd-sp-field-label">Age</p>
                          <p className="dd-sp-field-value">{selectedConsult.patientAge} yrs</p>
                        </div>
                        <div className="dd-sp-field">
                          <p className="dd-sp-field-label">Channel</p>
                          <p className="dd-sp-field-value">{selectedConsult.channel}</p>
                        </div>
                      </div>
                      <div className={`dd-handoff-card ${linkedRx ? 'dd-handoff-card--ready' : ''}`}>
                        <div>
                          <span className="dd-handoff-card__label">Prescription handoff</span>
                          <strong>{linkedRx ? `${linkedRx.id} issued` : 'No prescription issued'}</strong>
                          <p>
                            {linkedRx
                              ? `${linkedRx.status} · ${medicationSummary(linkedRx.items)}`
                              : 'Issue an e-prescription from this consultation when medicine is required.'}
                          </p>
                        </div>
                        <button className="dd-action-btn dd-action-btn--rx" type="button" onClick={() => openPrescriptionForConsultation(selectedConsult)}>
                          {linkedRx ? 'Add another' : 'Issue Rx'}
                        </button>
                      </div>
                    </div>
                    <div className="dd-workspace-card__footer">
                      {selectedConsult.status === 'Waiting' && (
                        <button className="dd-sp-btn dd-sp-btn--primary" type="button" onClick={() => { void handleStartConsultation(selectedConsult) }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          Start conversation
                        </button>
                      )}
                      {selectedConsult.status === 'In progress' && (
                        <button className="dd-sp-btn dd-sp-btn--primary" type="button" onClick={() => { void openConsultationThread(selectedConsult) }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          Continue conversation
                        </button>
                      )}
                      <button className="dd-sp-btn dd-sp-btn--rx" type="button" onClick={() => openPrescriptionForConsultation(selectedConsult)}>
                        Issue prescription
                      </button>
                      <button className="dd-sp-btn dd-sp-btn--success" type="button" disabled={selectedConsult.status === 'Completed'} onClick={() => { void updateConsultationStatus(selectedConsult.id, 'Completed') }}>
                        Mark completed
                      </button>
                      <button className="dd-sp-btn dd-sp-btn--danger" type="button" disabled={selectedConsult.status === 'Cancelled'} onClick={() => { void updateConsultationStatus(selectedConsult.id, 'Cancelled'); setSelectedConsult(null) }}>
                        Cancel
                      </button>
                    </div>
                        </>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="dd-workspace-empty">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <strong>Ready for the next patient</strong>
                    <p>Select a consultation when one arrives. Paid requests are routed by specialty.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── PRESCRIPTIONS TAB ── */}
        {activeTab === 'prescriptions' && (
          <div className="dd-table-card">
            <div className="dd-rx-summary-row">
              <div className="dd-rx-summary-card">
                <span>Drafts</span>
                <strong>{prescriptionStats.draft}</strong>
              </div>
              <div className="dd-rx-summary-card dd-rx-summary-card--sent">
                <span>Sent to patient</span>
                <strong>{prescriptionStats.sent}</strong>
              </div>
            </div>
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
                    <th>Prescription</th>
                    <th>Patient &amp; source</th>
                    <th>Date</th>
                    <th>Medication plan</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrescriptions.map((rx) => (
                    <tr key={rx.id}>
                      <td>
                        <div className="dd-consult-cell">
                          <span className="dd-mono">{rx.id}</span>
                          <span className="dd-rx-source">{rx.backendId ? 'Synced' : 'Local draft'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="dd-td-patient">
                          <div className="dd-td-patient__avatar dd-td-patient__avatar--sm">{initials(rx.patientName)}</div>
                          <div>
                            <p className="dd-td-patient__name">{rx.patientName}</p>
                            <p className="dd-td-patient__id">{rx.notes.startsWith('Consultation') ? rx.notes.split(':')[0] : 'Manual prescription'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="dd-td-meta">{rx.createdAt}</td>
                      <td>
                        <div className="dd-med-plan">
                          <strong>{medicationSummary(rx.items)}</strong>
                          <span>{rx.items.length} item{rx.items.length !== 1 ? 's' : ''}</span>
                        </div>
                      </td>
                      <td>
                        <span className="dd-status-pill" style={
                          rx.status === 'Dispensed'
                            ? { background: 'rgba(16,185,129,0.12)', color: '#065f46' }
                            : rx.status === 'Sent'
                            ? { background: 'rgba(37,99,235,0.12)', color: '#1e3a8a' }
                            : { background: 'rgba(245,158,11,0.12)', color: '#92400e' }
                        }>
                          {rx.status}
                        </span>
                      </td>
                      <td>
                        <div className="dd-actions-cell">
                          <button
                            className="dd-action-btn dd-action-btn--start"
                            type="button"
                            disabled={rx.status === 'Sent' || rx.status === 'Dispensed'}
                            onClick={() => handleSendPrescription(rx)}
                          >
                            Issue
                          </button>
                          {rx.backendId && (
                            <button
                              className="dd-action-btn"
                              type="button"
                              onClick={() => handleDownloadPdf(rx)}
                            >
                              PDF
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPrescriptions.length === 0 && (
                <div className="dd-empty">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <p>No e-prescriptions created yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PATIENTS TAB ── */}
        {activeTab === 'patients' && (
          <>
            <div className="dd-table-card">
              <div className="dd-toolbar">
                <div className="dd-search-wrap">
                  <svg className="dd-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input
                    className="dd-search-input"
                    type="text"
                    placeholder="Search patients..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                  />
                </div>
                <span className="dd-count">{filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="cm-panel cm-table-wrap dd-table-wrap">
                <table className="cm-table dd-table dd-patient-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Age</th>
                      <th>Last Visit</th>
                      <th>Active Prescriptions</th>
                      <th>Last Activity</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((p) => {
                      const patientConsults = doctorConsultations.filter((c) => c.patientName === p.name)
                      const patientRx = doctorPrescriptions.filter((rx) => rx.patientName === p.name)
                      const activeRx = patientRx.filter((rx) => rx.status === 'Draft' || rx.status === 'Sent')
                      const timelineItems = [
                        ...patientConsults.map((c) => ({ type: 'consultation', date: c.scheduledAt, summary: `Consultation ${c.status}: ${c.issue}` })),
                        ...patientRx.map((rx) => ({ type: 'prescription', date: rx.createdAt, summary: `Prescription ${rx.status}: ${medicationSummary(rx.items)}` })),
                        ...doctorThreads
                          .filter((thread) => thread.patientName === p.name)
                          .flatMap((thread) => thread.messages.slice(-2).map((message) => ({
                            type: 'message',
                            date: thread.lastMessageAt,
                            summary: `${message.sender === 'doctor' ? 'Doctor' : 'Patient'} message: ${message.text}`,
                          }))),
                      ].sort((a, b) => timelineTime(b.date) - timelineTime(a.date))
                      const latest = timelineItems[0]
                      const latestPrescribableConsultation = patientConsults.find((consultation) => consultation.backendId && consultation.status !== 'Cancelled')
                      const age = patientConsults.find((consultation) => consultation.patientAge)?.patientAge ?? 0
                      return (
                        <tr key={p.name} className={selectedPatient === p.name ? 'dd-row--active' : ''}>
                          <td>
                            <div className="dd-td-patient">
                              <div className="dd-td-patient__avatar">{initials(p.name)}</div>
                              <div>
                                <p className="dd-td-patient__name">{p.name}</p>
                                <p className="dd-td-patient__id">Doctor patient</p>
                              </div>
                            </div>
                          </td>
                          <td className="dd-td-meta">{age || '-'}</td>
                          <td className="dd-td-meta">{p.lastVisit}</td>
                          <td><strong>{activeRx.length}</strong></td>
                          <td className="dd-td-issue">{latest?.summary ?? 'No activity recorded'}</td>
                          <td>
                            <div className="dd-actions-cell">
                              <button className="dd-action-btn" type="button" onClick={() => setSelectedPatient(p.name)}>
                                View Profile
                              </button>
                              <button
                                className="dd-action-btn dd-action-btn--start"
                                type="button"
                                disabled={!latestPrescribableConsultation}
                                onClick={() => { if (latestPrescribableConsultation) void handleStartConsultation(latestPrescribableConsultation) }}
                              >
                                Start Consultation
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredPatients.length === 0 && (
                  <div className="dd-empty dd-empty--full">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    <p>No patients found.</p>
                  </div>
                )}
              </div>
            </div>

            {selectedPatient && (() => {
              const patient = patientRecords.find((record) => record.name === selectedPatient)
              const profile = patientProfileSeed(selectedPatient)
              const patientConsults = doctorConsultations.filter((consultation) => consultation.patientName === selectedPatient)
              const patientRx = doctorPrescriptions.filter((rx) => rx.patientName === selectedPatient)
              const activeRx = patientRx.filter((rx) => rx.status === 'Draft' || rx.status === 'Sent')
              const latestPrescribableConsultation = patientConsults.find((consultation) => consultation.backendId && consultation.status !== 'Cancelled')
              const latestConsultation = patientConsults[0]

              return (
                <>
                  <div className="dd-overlay" onClick={() => setSelectedPatient(null)} />
                  <section className="dd-patient-profile dd-patient-profile--modal" role="dialog" aria-modal="true" aria-label={`${selectedPatient} patient profile`}>
                  <div className="dd-patient-profile__header">
                    <div className="dd-td-patient">
                      <div className="dd-td-patient__avatar">{initials(selectedPatient)}</div>
                      <div>
                        <h2>{selectedPatient}</h2>
                        <p>Who this patient is, what has happened, and what to do next.</p>
                      </div>
                    </div>
                    <div className="dd-patient-profile__header-actions">
                      <details className="dd-patient-action-menu">
                        <summary>Actions</summary>
                        <div className="dd-patient-action-menu__panel">
                          <button className="dd-sp-btn dd-sp-btn--primary" type="button" disabled={!latestPrescribableConsultation} onClick={() => { if (latestPrescribableConsultation) void handleStartConsultation(latestPrescribableConsultation) }}>
                            Start Consultation
                          </button>
                          <button className="dd-sp-btn dd-sp-btn--rx" type="button" disabled={!latestPrescribableConsultation} onClick={() => { if (latestPrescribableConsultation) openPrescriptionForConsultation(latestPrescribableConsultation) }}>
                            Create Prescription
                          </button>
                        </div>
                      </details>
                      <button className="dd-sp-close" type="button" aria-label="Close patient profile" onClick={() => setSelectedPatient(null)}>×</button>
                    </div>
                  </div>

                  <div className="dd-patient-profile__grid">
                    <div className="dd-profile-card dd-profile-card--summary">
                      <h3>Patient Summary</h3>
                      <div className="dd-profile-list">
                        <span>Full Name <strong>{selectedPatient}</strong></span>
                        <span>Age <strong>{latestConsultation?.patientAge ?? '-'}</strong></span>
                        <span>Gender <strong>{profile.gender}</strong></span>
                        <span>Phone Number <strong>{profile.phone}</strong></span>
                        <span>Email Address <strong>{profile.email}</strong></span>
                        <span>Allergies <strong>{profile.allergies.join(', ')}</strong></span>
                        <span>Chronic Conditions <strong>{profile.chronicConditions.join(', ')}</strong></span>
                        <span>Current Medication <strong>{profile.currentMedication.join(', ')}</strong></span>
                        <span>Blood Group <strong>{profile.bloodGroup}</strong></span>
                        <span>Active Prescriptions <strong>{activeRx.length}</strong></span>
                        <span>Last Consultation Date <strong>{patient?.lastVisit ?? '-'}</strong></span>
                      </div>
                    </div>

                    <div className="dd-profile-card">
                      <h3>Prescriptions</h3>
                      <div className="dd-profile-table-wrap">
                        <table className="dd-profile-table">
                          <thead><tr><th>Date</th><th>Medication</th><th>Diagnosis</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead>
                          <tbody>
                            {patientRx.map((rx) => (
                              <tr key={rx.id}>
                                <td>{rx.createdAt}</td>
                                <td>{medicationSummary(rx.items)}</td>
                                <td>{rx.notes || 'Not recorded'}</td>
                                <td>{rx.items[0]?.dosage || '-'}</td>
                                <td>{rx.status}</td>
                                <td>
                                  <div className="dd-actions-cell">
                                    <button className="dd-action-btn" type="button">View</button>
                                    <button className="dd-action-btn" type="button" disabled={!rx.backendId} onClick={() => handleDownloadPdf(rx)}>Download PDF</button>
                                    <button className="dd-action-btn dd-action-btn--rx" type="button" disabled={!latestPrescribableConsultation} onClick={() => { if (latestPrescribableConsultation) openPrescriptionForConsultation(latestPrescribableConsultation) }}>Reuse</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {patientRx.length === 0 && <tr><td colSpan={6}>No prescriptions recorded.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="dd-profile-card">
                      <h3>Documents</h3>
                      <div className="dd-documents-grid">
                        {[...profile.documents, 'Lab Reports', 'Imaging', 'Prescriptions'].map((document) => (
                          <div key={document} className="dd-document-chip">
                            <span>{document}</span>
                            <button type="button">Preview</button>
                            <button type="button">Download</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  </section>
                </>
              )
            })()}
          </>
        )}

        {activeTab === 'queue' && selectedPatient && (() => {
          const patient = patientRecords.find((record) => record.name === selectedPatient)
          const profile = patientProfileSeed(selectedPatient)
          const patientConsults = doctorConsultations.filter((consultation) => consultation.patientName === selectedPatient)
          const patientRx = doctorPrescriptions.filter((rx) => rx.patientName === selectedPatient)
          const activeRx = patientRx.filter((rx) => rx.status === 'Draft' || rx.status === 'Sent')
          const latestPrescribableConsultation = patientConsults.find((consultation) => consultation.backendId && consultation.status !== 'Cancelled')
          const latestConsultation = patientConsults[0]

          return (
            <>
              <div className="dd-overlay" onClick={() => setSelectedPatient(null)} />
              <section className="dd-patient-profile dd-patient-profile--modal" role="dialog" aria-modal="true" aria-label={`${selectedPatient} patient profile`}>
                <div className="dd-patient-profile__header">
                  <div className="dd-td-patient">
                    <div className="dd-td-patient__avatar">{initials(selectedPatient)}</div>
                    <div>
                      <h2>{selectedPatient}</h2>
                      <p>Patient profile and clinical history.</p>
                    </div>
                  </div>
                  <div className="dd-patient-profile__header-actions">
                    <details className="dd-patient-action-menu">
                      <summary>Actions</summary>
                      <div className="dd-patient-action-menu__panel">
                        <button className="dd-sp-btn dd-sp-btn--primary" type="button" disabled={!latestPrescribableConsultation} onClick={() => { if (latestPrescribableConsultation) void handleStartConsultation(latestPrescribableConsultation) }}>
                          Start Consultation
                        </button>
                        <button className="dd-sp-btn dd-sp-btn--rx" type="button" disabled={!latestPrescribableConsultation} onClick={() => { if (latestPrescribableConsultation) openPrescriptionForConsultation(latestPrescribableConsultation) }}>
                          Create Prescription
                        </button>
                      </div>
                    </details>
                    <button className="dd-sp-close" type="button" aria-label="Close patient profile" onClick={() => setSelectedPatient(null)}>×</button>
                  </div>
                </div>

                <div className="dd-patient-profile__grid">
                  <div className="dd-profile-card dd-profile-card--summary">
                    <h3>Patient Summary</h3>
                    <div className="dd-profile-list">
                      <span>Full Name <strong>{selectedPatient}</strong></span>
                      <span>Age <strong>{latestConsultation?.patientAge ?? '-'}</strong></span>
                      <span>Gender <strong>{profile.gender}</strong></span>
                      <span>Phone Number <strong>{profile.phone}</strong></span>
                      <span>Email Address <strong>{profile.email}</strong></span>
                      <span>Allergies <strong>{profile.allergies.join(', ')}</strong></span>
                      <span>Chronic Conditions <strong>{profile.chronicConditions.join(', ')}</strong></span>
                      <span>Current Medication <strong>{profile.currentMedication.join(', ')}</strong></span>
                      <span>Blood Group <strong>{profile.bloodGroup}</strong></span>
                      <span>Active Prescriptions <strong>{activeRx.length}</strong></span>
                      <span>Last Consultation Date <strong>{patient?.lastVisit ?? '-'}</strong></span>
                    </div>
                  </div>

                  <div className="dd-profile-card">
                    <h3>Prescriptions</h3>
                    <div className="dd-profile-table-wrap">
                      <table className="dd-profile-table">
                        <thead><tr><th>Date</th><th>Medication</th><th>Diagnosis</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                          {patientRx.map((rx) => (
                            <tr key={rx.id}>
                              <td>{rx.createdAt}</td>
                              <td>{medicationSummary(rx.items)}</td>
                              <td>{rx.notes || 'Not recorded'}</td>
                              <td>{rx.items[0]?.dosage || '-'}</td>
                              <td>{rx.status}</td>
                              <td>
                                <div className="dd-actions-cell">
                                  <button className="dd-action-btn" type="button">View</button>
                                  <button className="dd-action-btn" type="button" disabled={!rx.backendId} onClick={() => handleDownloadPdf(rx)}>Download PDF</button>
                                  <button className="dd-action-btn dd-action-btn--rx" type="button" disabled={!latestPrescribableConsultation} onClick={() => { if (latestPrescribableConsultation) openPrescriptionForConsultation(latestPrescribableConsultation) }}>Reuse</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {patientRx.length === 0 && <tr><td colSpan={6}>No prescriptions recorded.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="dd-profile-card">
                    <h3>Documents</h3>
                    <div className="dd-documents-grid">
                      {[...profile.documents, 'Lab Reports', 'Imaging', 'Prescriptions'].map((document) => (
                        <div key={document} className="dd-document-chip">
                          <span>{document}</span>
                          <button type="button">Preview</button>
                          <button type="button">Download</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </>
          )
        })()}

        {/* ── EARNINGS TAB ── */}
        {activeTab === 'earnings' && (
          <>
            {(() => {
              const now = new Date()
              const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
              const prevMonthLabel = prevMonthDate.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })
              const thisMonthEntry = earnings.find((e) => e.period.toLowerCase().includes(now.toLocaleDateString('en-KE', { month: 'long' }).toLowerCase()))
              const prevMonthEntry = earnings.find((e) => e.period.toLowerCase().includes(prevMonthDate.toLocaleDateString('en-KE', { month: 'long' }).toLowerCase()))
              const thisMonthRevenue = thisMonthEntry?.revenue ?? 0
              const prevMonthRevenue = prevMonthEntry?.revenue ?? 0
              const momDiff = thisMonthRevenue - prevMonthRevenue
              const momPct = prevMonthRevenue > 0 ? Math.round((momDiff / prevMonthRevenue) * 100) : null
              const pendingPayout = earnings.filter((e) => e.status === 'Scheduled').reduce((s, e) => s + e.revenue, 0)
              return (
                <div className="dd-earnings-summary">
                  <div className="dd-earnings-summary__item dd-earnings-summary__item--main">
                    <p className="dd-earnings-summary__label">Total earned</p>
                    <p className="dd-earnings-summary__value">KSh {stats.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="dd-earnings-summary__item">
                    <p className="dd-earnings-summary__label">This month</p>
                    <p className="dd-earnings-summary__num">KSh {thisMonthRevenue.toLocaleString()}</p>
                    {momPct !== null && (
                      <p className="dd-earnings-trend" style={{ color: momDiff >= 0 ? '#16A34A' : '#DC2626' }}>
                        {momDiff >= 0 ? '▲' : '▼'} {Math.abs(momPct)}% vs {prevMonthLabel}
                      </p>
                    )}
                  </div>
                  <div className="dd-earnings-summary__item">
                    <p className="dd-earnings-summary__label">Pending payout</p>
                    <p className="dd-earnings-summary__num">KSh {pendingPayout.toLocaleString()}</p>
                  </div>
                  <div className="dd-earnings-summary__item">
                    <p className="dd-earnings-summary__label">Avg. per consult</p>
                    <p className="dd-earnings-summary__num">
                      KSh {earnings.reduce((s, e) => s + e.consults, 0) > 0
                        ? Math.round(stats.totalRevenue / earnings.reduce((s, e) => s + e.consults, 0)).toLocaleString()
                        : '-'}
                    </p>
                  </div>
                </div>
              )
            })()}

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
                          <span className="dd-status-pill" style={
                            entry.status === 'Paid'
                              ? { background: 'rgba(16,185,129,0.12)', color: '#065f46' }
                              : entry.status === 'Scheduled'
                              ? { background: 'rgba(245,158,11,0.12)', color: '#92400e' }
                              : { background: 'rgba(239,68,68,0.12)', color: '#991b1b' }
                          }>
                            {entry.status}
                          </span>
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

      {/* ── Consultation detail side panel ── */}
      {selectedConsult && (
        <>
          <div className="dd-overlay" onClick={() => { setSelectedConsult(null); setShowConsultChat(false) }} />
          <aside className={`dd-side-panel ${showConsultChat ? 'dd-side-panel--chat' : ''}`}>
            <div className="dd-sp-header">
              <div>
                <p className="dd-sp-id">{selectedConsult.id}</p>
                <p className="dd-sp-meta">{selectedConsult.patientName} · {selectedConsult.scheduledAt}</p>
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
              /* ── Chat view ── */
              <div className="dd-sp-chat">
                <div className="dd-sp-chat-patient">
                  <div className="dd-sp-patient__avatar">{initials(selectedConsult.patientName)}</div>
                  <div style={{ flex: 1 }}>
                    <p className="dd-sp-patient__name">{selectedConsult.patientName}</p>
                    <p className="dd-sp-patient__meta">{selectedConsult.id} · {selectedConsult.issue}</p>
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        void handleSendConsultMessage()
                      }
                    }}
                  />
                  <button
                    className="dd-send-btn"
                    type="button"
                    onClick={() => { void handleSendConsultMessage() }}
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
              /* ── Info view ── */
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
                            ) : (
                              <span>{idx + 1}</span>
                            )}
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

                <div className="dd-sp-body">
                  <div className="dd-sp-section">
                    <p className="dd-sp-section-title">Patient</p>
                    <div className="dd-sp-patient">
                      <div className="dd-sp-patient__avatar">{initials(selectedConsult.patientName)}</div>
                      <div>
                        <p className="dd-sp-patient__name">{selectedConsult.patientName}</p>
                        <p className="dd-sp-patient__meta">Last active: {selectedConsult.lastMessageAt}</p>
                      </div>
                    </div>
                  </div>

                  <div className="dd-sp-section">
                    <p className="dd-sp-section-title">Chief complaint</p>
                    <p className="dd-sp-value">{selectedConsult.issue}</p>
                  </div>

                  <div className="dd-sp-grid">
                    <div className="dd-sp-field">
                      <p className="dd-sp-field-label">Scheduled</p>
                      <p className="dd-sp-field-value">{selectedConsult.scheduledAt}</p>
                    </div>
                    <div className="dd-sp-field">
                      <p className="dd-sp-field-label">Priority</p>
                      <p className="dd-sp-field-value">{selectedConsult.priority}</p>
                    </div>
                    <div className="dd-sp-field">
                      <p className="dd-sp-field-label">Status</p>
                      <span className="dd-status-pill" style={STATUS_PILL_STYLES[selectedConsult.status] ?? { background: 'rgba(100,116,139,0.12)', color: '#1e293b' }}>
                        {selectedConsult.status}
                      </span>
                    </div>
                  </div>
                  {(() => {
                    const linkedRx = doctorPrescriptions.find((rx) => prescriptionMatchesConsultation(rx, selectedConsult.id))
                    return (
                      <div className={`dd-handoff-card dd-handoff-card--panel ${linkedRx ? 'dd-handoff-card--ready' : ''}`}>
                        <div>
                          <span className="dd-handoff-card__label">Prescription</span>
                          <strong>{linkedRx ? linkedRx.id : 'Not issued yet'}</strong>
                          <p>{linkedRx ? `${linkedRx.status} · ${medicationSummary(linkedRx.items)}` : 'Create one from this consultation if medicine is required.'}</p>
                        </div>
                        <button className="dd-action-btn dd-action-btn--rx" type="button" onClick={() => openPrescriptionForConsultation(selectedConsult)}>
                          {linkedRx ? 'Add another' : 'Issue Rx'}
                        </button>
                      </div>
                    )
                  })()}
                </div>

                <div className="dd-sp-footer">
                  <div className="dd-sp-actions">
                    {selectedConsult.status === 'Waiting' ? (
                      <button
                        className="dd-sp-btn dd-sp-btn--primary"
                        type="button"
                        onClick={() => { void handleStartConsultation(selectedConsult) }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Start conversation
                      </button>
                    ) : selectedConsult.status === 'In progress' ? (
                      <button
                        className="dd-sp-btn dd-sp-btn--primary"
                        type="button"
                        onClick={() => { void openConsultationThread(selectedConsult) }}
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
                      onClick={() => { void updateConsultationStatus(selectedConsult.id, 'Completed') }}
                    >
                      Mark completed
                    </button>
                    <button
                      className="dd-sp-btn dd-sp-btn--danger"
                      type="button"
                      disabled={selectedConsult.status === 'Cancelled'}
                      onClick={() => { void updateConsultationStatus(selectedConsult.id, 'Cancelled'); setSelectedConsult(null) }}
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
          <div className="dd-overlay" onClick={rxModalSuccess ? undefined : closePrescriptionPanel} />
          <aside className="dd-side-panel dd-side-panel--rx">
            <div className="dd-sp-header">
              <div>
                <p className="dd-sp-id">New E-Prescription</p>
                <p className="dd-sp-meta">
                  {rxConsultationId ? `Linked to consultation #${rxConsultationId}` : 'Select a patient consultation first'}
                </p>
              </div>
              <button className="dd-sp-close" type="button" disabled={Boolean(rxModalSuccess)} onClick={closePrescriptionPanel}>×</button>
            </div>
            <div className="dd-sp-body">
              {rxModalSuccess && (
                <div className="dd-alert dd-alert--success dd-rx-modal-success" role="status">
                  <strong>Prescription created</strong>
                  <span>{rxModalSuccess}</span>
                </div>
              )}
              <div className="dd-sp-section dd-rx-context-section">
                <div className="dd-rx-field">
                  <label>Patient consultation</label>
                  {rxPatient && rxConsultationId ? (
                    <div className="dd-rx-readonly-card">
                      <p className="dd-rx-patient-chip">
                        <span>{initials(rxPatient)}</span>
                        Patient: {rxPatient}
                      </p>
                      <p className="dd-rx-readonly-card__meta">Consultation #{rxConsultationId}</p>
                    </div>
                  ) : (
                    <p className="dd-rx-field-note dd-rx-field-note--warning">
                      No consultation is selected. Open a patient consultation before issuing medicine.
                    </p>
                  )}
                </div>
                <div className="dd-rx-field">
                  <label>Clinical notes</label>
                  <div className="dd-rx-readonly-notes">
                    {rxNotes || 'Clinical notes will be picked from the selected consultation.'}
                  </div>
                </div>
              </div>

              <div className="dd-sp-section">
                <div className="dd-rx-section-heading">
                  <div>
                    <p className="dd-sp-section-title">Medications</p>
                    <p className="dd-rx-catalog-hint">Select medicines from Ava Pharmacy inventory. Pharmacists review issued prescriptions before fulfillment.</p>
                    {rxLockedByPayment && (
                      <p className="dd-rx-field-note dd-rx-field-note--warning">
                        This prescription has been paid for. Medication details are locked.
                      </p>
                    )}
                  </div>
                  <span>{rxItems.length} item{rxItems.length !== 1 ? 's' : ''}</span>
                </div>
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
                              disabled={rxLockedByPayment}
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
                          disabled={rxLockedByPayment}
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
                          disabled={rxLockedByPayment}
                          value={item.variantId ? '' : item.name}
                          onChange={(e) => handleCatalogSearch(idx, e.target.value)}
                        />
                        {item.variantId && (
                          <div className="dd-rx-selected">
                            <span>{item.sku}</span>
                            <span>{item.stockStatus?.replace(/_/g, ' ') || 'in catalog'} · {item.availableQuantity ?? 0} available</span>
                          </div>
                        )}
                        {(rxCatalogLoading[idx] || (rxCatalogOptions[idx]?.length ?? 0) > 0) && (
                          <div className="dd-rx-options">
                            {rxCatalogLoading[idx] && <p className="dd-rx-options__empty">Searching inventory...</p>}
                            {(rxCatalogOptions[idx] ?? []).map((variant) => (
                              <button
                                key={variant.id}
                                className="dd-rx-option"
                                type="button"
                                disabled={rxLockedByPayment || !variant.can_prescribe}
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
                        <input
                          type="text"
                          required
                          placeholder="e.g. 500 mg"
                          disabled={rxLockedByPayment}
                          value={item.dosage}
                          onChange={(e) => updateRxItem(idx, { dosage: e.target.value })}
                        />
                        <label>Frequency <span className="dd-rx-required">*</span></label>
                        <input type="text" required placeholder="e.g. TID" disabled={rxLockedByPayment} value={item.frequency ?? ''} onChange={(e) => updateRxItem(idx, { frequency: e.target.value })} />
                        <label>Duration <span className="dd-rx-required">*</span></label>
                        <input type="text" required placeholder="e.g. 3/7, 2/52, 1/12" disabled={rxLockedByPayment} value={item.duration ?? ''} onChange={(e) => updateRxItem(idx, { duration: e.target.value })} />
                      </div>
                      <div className="dd-rx-qty-cell">
                        <label>Qty <span className="dd-rx-required">*</span></label>
                        <input
                          type="number"
                          min={1}
                          required
                          placeholder="Qty"
                          disabled={rxLockedByPayment}
                          value={item.quantity}
                          onChange={(e) => updateRxItem(idx, { quantity: Number(e.target.value) })}
                        />
                        <label>Measurement <span className="dd-rx-required">*</span></label>
                        <input type="text" required placeholder="e.g. tablets, ml" disabled={rxLockedByPayment} value={item.quantityMeasurement ?? ''} onChange={(e) => updateRxItem(idx, { quantityMeasurement: e.target.value })} />
                      </div>
                    </div>
                  ))}
                  <button
                    className="dd-add-item-btn"
                    type="button"
                    disabled={rxLockedByPayment}
                    onClick={() => setRxItems((prev) => [...prev, { name: '', dosage: '', quantity: 1 }])}
                  >
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
                  disabled={rxSubmitting || Boolean(rxModalSuccess) || rxLockedByPayment || !rxConsultationId || !rxPatient.trim() || !rxHasMedication}
                >
                  {rxSubmitting ? 'Sending...' : rxModalSuccess ? 'Sent' : 'Issue & notify patient'}
                </button>
                <button className="dd-sp-btn" type="button" disabled={rxSubmitting || Boolean(rxModalSuccess)} onClick={closePrescriptionPanel}>
                  Cancel
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </ProfessionalPortalShell>
  )
}

export default DoctorDashboardPage
