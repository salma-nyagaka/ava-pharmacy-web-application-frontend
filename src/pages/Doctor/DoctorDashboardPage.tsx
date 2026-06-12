import { Fragment, useMemo, useRef, useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  Consultation,
  DoctorMessage,
  DoctorMessageThread,
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
  fetchDoctorConsultations,
  fetchClinicianPrescriptions,
  sendClinicianPrescription,
  sendConsultationMessage,
  searchClinicianCatalogVariants,
  updateConsultation,
  type ClinicianPrescription,
  type ConsultationRecord,
} from '../../services/consultationService'
import ProfessionalPortalShell from '../../components/ProfessionalPortalShell/ProfessionalPortalShell'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/portals/DoctorDashboardPage.css'

type DoctorTab = 'queue' | 'messages' | 'prescriptions' | 'patients' | 'earnings'

const STATUS_PILL_STYLES: Record<string, { background: string; color: string }> = {
  Waiting:      { background: 'rgba(245,158,11,0.12)',  color: '#92400e' },
  'In progress':{ background: 'rgba(16,185,129,0.12)',  color: '#065f46' },
  Completed:    { background: 'rgba(100,116,139,0.12)', color: '#1e293b' },
  Cancelled:    { background: 'rgba(239,68,68,0.12)',   color: '#991b1b' },
  urgent:       { background: 'rgba(239,68,68,0.12)',   color: '#991b1b' },
  critical:     { background: 'rgba(239,68,68,0.12)',   color: '#991b1b' },
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
    sender: message.senderName === record.patientName ? 'patient' as const : 'doctor' as const,
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

function mapBackendPrescription(rx: ClinicianPrescription, doctorId: string): DoctorPrescription {
  return {
    id: rx.reference,
    backendId: rx.id,
    doctorId,
    patientName: rx.patient_name,
    createdAt: rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
    status: rx.status === 'sent' ? 'Sent' : rx.status === 'dispensed' ? 'Dispensed' : 'Draft',
    notes: rx.consultation_id ? `Consultation ${rx.consultation_id}` : 'No notes provided.',
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

function WaitTimer({ since }: { since: string | Date | undefined }) {
  const [mins, setMins] = useState(0)
  useEffect(() => {
    const calc = () => {
      if (!since) return
      const diff = Math.floor((Date.now() - new Date(since).getTime()) / 60000)
      setMins(Math.max(0, diff))
    }
    calc()
    const id = setInterval(calc, 30000)
    return () => clearInterval(id)
  }, [since])
  const color = mins < 10 ? '#10b981' : mins < 20 ? '#f59e0b' : '#ef4444'
  return (
    <span className="doc-wait-timer" style={{ color, '--wait-color': color } as React.CSSProperties}>
      Waiting {mins} min
    </span>
  )
}

function PatientTimeline({ items }: { items: Array<{ type: string; date: string; summary: string }> }) {
  return (
    <div className="doc-timeline">
      {items.map((item, i) => (
        <div key={i} className="doc-timeline__item">
          <div className="doc-timeline__dot" data-type={item.type} />
          <div className="doc-timeline__content">
            <p className="doc-timeline__date">{new Date(item.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            <p className="doc-timeline__summary">{item.summary}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function DoctorDashboardPage() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<DoctorTab>('queue')
  const doctors = useMemo(() => loadDoctorProfiles(), [])
  const doctor = useMemo(() => {
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
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [workspaceError, setWorkspaceError] = useState('')

  const [queueSearch, setQueueSearch] = useState('')
  const [selectedConsult, setSelectedConsult] = useState<Consultation | null>(null)

  const [messageSearch, setMessageSearch] = useState('')
  const [activeThread, setActiveThread] = useState<DoctorMessageThread | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
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

  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeThread?.messages])

  useEffect(() => {
    consultEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [consultThread?.messages])

  useEffect(() => {
    let cancelled = false
    const loadWorkspace = async () => {
      setWorkspaceLoading(true)
      setWorkspaceError('')
      try {
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
        setConsultations(mappedConsultations)
        setThreads(mappedThreads)
        setPrescriptions(mappedPrescriptions)
      } catch {
        if (!cancelled) {
          setWorkspaceError('Unable to load the live doctor workspace. Showing saved local data.')
          setConsultations(loadConsultations())
          setThreads(loadDoctorMessages())
          setPrescriptions(loadDoctorPrescriptions())
        }
      } finally {
        if (!cancelled) setWorkspaceLoading(false)
      }
    }
    void loadWorkspace()
    return () => { cancelled = true }
  }, [activeDoctorId])

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

  const filteredThreads = useMemo(() => {
    const q = messageSearch.trim().toLowerCase()
    if (!q) return doctorThreads
    return doctorThreads.filter((t) =>
      [t.patientName, t.lastMessage, t.status].some((v) => v.toLowerCase().includes(q))
    )
  }, [doctorThreads, messageSearch])

  const doctorPrescriptions = useMemo(
    () => prescriptions.filter((rx) => rx.doctorId === activeDoctorId && !rx.pediatric),
    [prescriptions, activeDoctorId]
  )

  const prescriptionStats = useMemo(() => ({
    draft: doctorPrescriptions.filter((rx) => rx.status === 'Draft').length,
    sent: doctorPrescriptions.filter((rx) => rx.status === 'Sent').length,
    dispensed: doctorPrescriptions.filter((rx) => rx.status === 'Dispensed').length,
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

  const earnings = useMemo(
    () => loadDoctorEarnings().filter((e) => e.doctorId === activeDoctorId),
    [activeDoctorId]
  )

  const stats = useMemo(() => {
    const total = doctorConsultations.length
    const waiting = doctorConsultations.filter((c) => c.status === 'Waiting').length
    const inProgress = doctorConsultations.filter((c) => c.status === 'In progress').length
    const completed = doctorConsultations.filter((c) => c.status === 'Completed').length
    const totalRevenue = earnings.reduce((sum, e) => sum + e.revenue, 0)
    return { total, waiting, inProgress, completed, totalRevenue }
  }, [doctorConsultations, earnings])

  const unreadCount = useMemo(
    () => doctorThreads.reduce((sum, t) => sum + (t.unreadCount || 0), 0),
    [doctorThreads]
  )

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

  const loadLiveWorkspace = async (options?: { clearSelection?: boolean }) => {
    setWorkspaceLoading(true)
    setWorkspaceError('')
    try {
      const [backendConsultations, backendPrescriptions] = await Promise.all([
        fetchDoctorConsultations(),
        fetchClinicianPrescriptions(),
      ])
      const mappedConsultations = backendConsultations.map((record) => mapBackendConsultation(record, activeDoctorId))
      const mappedThreads = backendConsultations
        .filter((record) => record.messages.length > 0 || record.status === 'in_progress')
        .map((record) => mapBackendThread(record, activeDoctorId))
      const mappedPrescriptions = backendPrescriptions.map((rx) => mapBackendPrescription(rx, activeDoctorId))
      setConsultations(mappedConsultations)
      setThreads(mappedThreads)
      setPrescriptions(mappedPrescriptions)
      if (options?.clearSelection) {
        setSelectedConsult(null)
        setShowConsultChat(false)
      }
    } catch {
      setWorkspaceError('Unable to load the live doctor workspace. Showing saved local data.')
      setConsultations(loadConsultations())
      setThreads(loadDoctorMessages())
      setPrescriptions(loadDoctorPrescriptions())
    } finally {
      setWorkspaceLoading(false)
    }
  }

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

  const handleSendMessage = async () => {
    if (!activeThread || !newMessage.trim()) return
    if (activeThread.backendConsultationId) {
      try {
        setWorkspaceError('')
        const messageText = newMessage.trim()
        setNewMessage('')
        await sendConsultationMessage(activeThread.backendConsultationId, messageText)
        const record = await fetchConsultation(activeThread.backendConsultationId)
        replaceConsultation(record)
        const thread = replaceThread(record)
        setActiveThread(thread)
      } catch {
        setWorkspaceError('Unable to send this message. Please check the connection and try again.')
      }
      return
    }

    const msg: DoctorMessage = {
      id: `MSG-${Date.now()}`,
      sender: 'doctor',
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    const updated: DoctorMessageThread = {
      ...activeThread,
      lastMessage: newMessage,
      lastMessageAt: 'Now',
      messages: [...activeThread.messages, msg],
    }
    const all = threads.map((t) => (t.id === activeThread.id ? updated : t))
    setThreads(all)
    saveDoctorMessages(all)
    setActiveThread(updated)
    setNewMessage('')
  }

  const openThread = (thread: DoctorMessageThread) => {
    if (thread.backendConsultationId) {
      void fetchConsultation(thread.backendConsultationId)
        .then((record) => {
          replaceConsultation(record)
          const mapped = replaceThread(record)
          setActiveThread({ ...mapped, unreadCount: 0 })
        })
        .catch(() => setWorkspaceError('Unable to load this conversation. Please refresh and try again.'))
      return
    }

    const all = threads.map((t) => (t.id === thread.id ? { ...t, unreadCount: 0 } : t))
    setThreads(all)
    saveDoctorMessages(all)
    setActiveThread({ ...thread, unreadCount: 0 })
  }

  const openPrescriptionForConsultation = (consult: Consultation) => {
    setRxPatient(consult.patientName)
    setRxNotes(`Consultation ${consult.id}: ${consult.issue}`)
    setRxConsultationId(consult.backendId ?? consultationNumericId(consult.id))
    setShowRxPanel(true)
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

  const handleCreatePrescription = async () => {
    if (!rxPatient.trim()) return
    const filteredItems = rxItems.filter((i) => i.name.trim())
    let backendId: number | undefined
    let backendReference: string | undefined
    let nextStatus: DoctorPrescription['status'] = 'Draft'
    if (rxConsultationId && filteredItems.length > 0) {
      try {
        setWorkspaceError('')
        const created = await createClinicianPrescription({
          patient_name: rxPatient.trim(),
          consultation_id: rxConsultationId,
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
            notes: rxNotes,
          })),
        })
        const sent = await sendClinicianPrescription(created.id)
        backendId = sent.id
        backendReference = sent.reference
        nextStatus = 'Sent'
      } catch {
        backendId = undefined
        setWorkspaceError('The prescription could not be sent to the pharmacy. It was saved locally as a draft.')
      }
    }
    const rx: DoctorPrescription = {
      id: backendReference || `RX-${Math.floor(1000 + Math.random() * 9000)}`,
      backendId,
      doctorId: activeDoctorId,
      patientName: rxPatient,
      createdAt: new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: nextStatus,
      notes: rxNotes || 'No notes provided.',
      items: filteredItems,
    }
    const updated = [rx, ...prescriptions]
    setPrescriptions(updated)
    saveDoctorPrescriptions(updated)
    setShowRxPanel(false)
    setRxPatient('')
    setRxNotes('')
    setRxConsultationId(null)
    setRxItems([{ name: '', dosage: '', quantity: 1 }])
    setRxCatalogOptions({})
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
  const rxHasMedication = rxItems.some((item) => item.name.trim() && (item.variantId || item.catalogFallback))
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
      id: 'messages',
      label: 'Messages',
      badge: unreadCount,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
      accentColor="#4f46e5"
      activeItemId={activeTab}
      navItems={navigationItems}
      onNavChange={(itemId) => setActiveTab(itemId as DoctorTab)}
      onLogout={() => { void logout() }}
      roleLabel="Doctor"
      userInitials={initials(doctor.name)}
      userMeta={doctor.specialty || 'Doctor Portal'}
      userName={doctor.name}
    >
      <div className="dd-content">
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
                <button className="dd-soft-btn" type="button" onClick={() => setActiveTab('messages')}>
                  Messages
                  {unreadCount > 0 && <span>{unreadCount}</span>}
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
                <span>Unread</span>
                <strong>{unreadCount} message{unreadCount !== 1 ? 's' : ''}</strong>
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
                                ? <WaitTimer since={item.scheduledAt} />
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

        {/* ── MESSAGES TAB ── */}
        {activeTab === 'messages' && (
          <div className="dd-messages-layout">
            <div className="dd-thread-list">
              <div className="dd-thread-search">
                <div className="dd-search-wrap">
                  <svg className="dd-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input
                    className="dd-search-input"
                    type="text"
                    placeholder="Search conversations…"
                    value={messageSearch}
                    onChange={(e) => setMessageSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="dd-threads">
                {filteredThreads.map((thread) => (
                  <button
                    key={thread.id}
                    className={`dd-thread-item ${activeThread?.id === thread.id ? 'dd-thread-item--active' : ''} ${thread.unreadCount > 0 ? 'dd-thread-item--unread' : ''}`}
                    type="button"
                    onClick={() => openThread(thread)}
                  >
                    <div className="dd-thread-item__avatar">{initials(thread.patientName)}</div>
                    <div className="dd-thread-item__body">
                      <p className="dd-thread-item__name">{thread.patientName}</p>
                      <p className="dd-thread-item__preview">{thread.lastMessage}</p>
                    </div>
                    <div className="dd-thread-item__right">
                      <span className="dd-thread-item__time">{thread.lastMessageAt}</span>
                      {thread.unreadCount > 0 && (
                        <span className="dd-unread-badge">{thread.unreadCount}</span>
                      )}
                    </div>
                  </button>
                ))}
                {filteredThreads.length === 0 && (
                  <div className="dd-empty dd-empty--sm">No patient conversations yet.</div>
                )}
              </div>
            </div>

            <div className="dd-chat-pane">
              {activeThread ? (
                <>
                  <div className="dd-chat-header">
                    <div className="dd-chat-header__info">
                      <div className="dd-chat-header__avatar">{initials(activeThread.patientName)}</div>
                      <div>
                        <p className="dd-chat-header__name">{activeThread.patientName}</p>
                        <p className="dd-chat-header__status">
                          <span className="dd-online-dot" /> Active
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="dd-chat-messages">
                    {activeThread.messages.map((msg) => (
                      <div key={msg.id} className={`dd-msg dd-msg--${msg.sender}`}>
                        {msg.sender !== 'doctor' && (
                          <div className="dd-msg__avatar">{initials(activeThread.patientName)}</div>
                        )}
                        <div className="dd-msg__bubble">
                          <p>{msg.text}</p>
                          <span className="dd-msg__time">{msg.time}</span>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="dd-chat-input">
                    <input
                      type="text"
                      placeholder="Write your response…"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          void handleSendMessage()
                        }
                      }}
                    />
                    <button
                      className="dd-send-btn"
                      type="button"
                      onClick={() => { void handleSendMessage() }}
                      disabled={!newMessage.trim()}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                  </div>
                </>
              ) : (
                <div className="dd-chat-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <p>Select a patient conversation when one is available.</p>
                </div>
              )}
            </div>
          </div>
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
              <div className="dd-rx-summary-card dd-rx-summary-card--done">
                <span>Dispensed</span>
                <strong>{prescriptionStats.dispensed}</strong>
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
              <button className="dd-primary-btn" type="button" onClick={() => { setRxConsultationId(null); setShowRxPanel(true) }}>
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
                          <button
                            className="dd-action-btn"
                            type="button"
                            disabled={rx.status === 'Dispensed'}
                            onClick={() => updatePrescriptionStatus(rx.id, 'Dispensed')}
                          >
                            Mark dispensed
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
                  <p>No e-prescriptions created yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PATIENTS TAB ── */}
        {activeTab === 'patients' && (
          <div className="dd-table-card">
            <div className="dd-toolbar">
              <div className="dd-search-wrap">
                <svg className="dd-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  className="dd-search-input"
                  type="text"
                  placeholder="Search patients…"
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
                    <th>Last visit</th>
                    <th>Consultations</th>
                    <th>Prescriptions</th>
                    <th>Latest activity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((p) => {
                    const patientConsults = doctorConsultations.filter((c) => c.patientName === p.name)
                    const patientRx = doctorPrescriptions.filter((rx) => rx.patientName === p.name)
                    const timelineItems = [
                      ...patientConsults.map((c) => ({ type: 'consultation', date: c.scheduledAt, summary: `Consultation: ${c.issue} (${c.status})` })),
                      ...patientRx.map((rx) => ({ type: 'prescription', date: rx.createdAt, summary: `Prescription ${rx.id}: ${medicationSummary(rx.items)}` })),
                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    const latest = timelineItems[0]
                    return (
                      <Fragment key={p.name}>
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
                          <td className="dd-td-meta">{p.lastVisit}</td>
                          <td><strong>{patientConsults.length}</strong></td>
                          <td><strong>{patientRx.length}</strong></td>
                          <td className="dd-td-issue">{latest?.summary ?? 'No activity recorded'}</td>
                          <td>
                            <div className="dd-actions-cell">
                              <button
                                className="dd-action-btn"
                                type="button"
                                onClick={() => setSelectedPatient(selectedPatient === p.name ? null : p.name)}
                              >
                                {selectedPatient === p.name ? 'Hide' : 'History'}
                              </button>
                              <button
                                className="dd-action-btn dd-action-btn--rx"
                                type="button"
                                onClick={() => {
                                  setRxPatient(p.name)
                                  setRxNotes(`Manual prescription for ${p.name}`)
                                  setRxConsultationId(null)
                                  setShowRxPanel(true)
                                }}
                              >
                                Rx
                              </button>
                            </div>
                          </td>
                        </tr>
                        {selectedPatient === p.name && timelineItems.length > 0 && (
                          <tr key={`${p.name}-history`} className="dd-patient-history-row">
                            <td colSpan={6}>
                              <PatientTimeline items={timelineItems} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
        )}

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
                      <p className="dd-earnings-trend" style={{ color: momDiff >= 0 ? '#10b981' : '#ef4444' }}>
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
                    <p className="dd-sp-patient__meta">{selectedConsult.issue}</p>
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
          <div className="dd-overlay" onClick={() => setShowRxPanel(false)} />
          <aside className="dd-side-panel">
            <div className="dd-sp-header">
              <div>
                <p className="dd-sp-id">New E-Prescription</p>
                <p className="dd-sp-meta">
                  {rxConsultationId ? `Linked to consultation #${rxConsultationId}` : 'Fill in the details below'}
                </p>
              </div>
              <button className="dd-sp-close" type="button" onClick={() => { setShowRxPanel(false); setRxConsultationId(null) }}>×</button>
            </div>
            <div className="dd-sp-body">
              <div className="dd-sp-section">
                <div className="dd-rx-field">
                  <label>Patient name</label>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={rxPatient}
                    onChange={(e) => setRxPatient(e.target.value)}
                  />
                </div>
                <div className="dd-rx-field">
                  <label>Clinical notes</label>
                  <textarea
                    rows={3}
                    placeholder="Diagnosis, instructions…"
                    value={rxNotes}
                    onChange={(e) => setRxNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="dd-sp-section">
                <p className="dd-sp-section-title">Medications</p>
                <p className="dd-rx-catalog-hint">Select medicines from Ava Pharmacy inventory. Use non-catalog only when the item is not available in the catalog.</p>
                <div className="dd-rx-items">
                  {rxItems.map((item, idx) => (
                    <div key={idx} className="dd-rx-item">
                      <div className="dd-rx-catalog-cell">
                        <input
                          type="text"
                          placeholder="Search catalog medicine or variant"
                          value={item.name}
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
                        <label className="dd-rx-fallback-toggle">
                          <input
                            type="checkbox"
                            checked={Boolean(item.catalogFallback)}
                            onChange={(e) => updateRxItem(idx, {
                              catalogFallback: e.target.checked,
                              variantId: e.target.checked ? null : item.variantId,
                            })}
                          />
                          <span>Use as non-catalog item</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="Dosage (e.g. 500mg 3×/day)"
                        value={item.dosage}
                        onChange={(e) => updateRxItem(idx, { dosage: e.target.value })}
                      />
                      <input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateRxItem(idx, { quantity: Number(e.target.value) })}
                      />
                    </div>
                  ))}
                  <button
                    className="dd-add-item-btn"
                    type="button"
                    onClick={() => setRxItems((prev) => [...prev, { name: '', dosage: '', quantity: 1 }])}
                  >
                    + Add medication
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
                  disabled={!rxPatient.trim() || !rxHasMedication}
                >
                  {rxConsultationId ? 'Issue & notify patient' : 'Save & create'}
                </button>
                <button className="dd-sp-btn" type="button" onClick={() => { setShowRxPanel(false); setRxConsultationId(null) }}>
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
