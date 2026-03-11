import { useMemo, useRef, useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  Consultation,
  DoctorEarning,
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
  saveDoctorEarnings,
  saveDoctorMessages,
  saveDoctorPrescriptions,
} from '../../data/telemedicine'
import '../Doctor/DoctorDashboardPage.css'
import './PediatricianDashboardPage.css'

type PediatricTab = 'queue' | 'messages' | 'consents' | 'prescriptions' | 'profiles' | 'earnings'

const STATUS_COLORS: Record<string, string> = {
  Waiting: '#f59e0b',
  'In progress': '#3b82f6',
  Completed: '#10b981',
  Cancelled: '#ef4444',
}

const RX_STATUS_COLORS: Record<string, string> = {
  Draft: '#f59e0b',
  Sent: '#3b82f6',
  Dispensed: '#10b981',
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
  const { logout } = useAuth()
  const [activeTab, setActiveTab] = useState<PediatricTab>('queue')
  const [doctors] = useState(loadDoctorProfiles())
  const [activeDoctorId, setActiveDoctorId] = useState(() => {
    const peds = loadDoctorProfiles().filter((d) => d.type === 'Pediatrician')
    return (peds.find((d) => d.status === 'Active')?.id ?? peds[0]?.id ?? '')
  })
  const [consultations, setConsultations] = useState<Consultation[]>(() => createInitialPediatricConsultations())
  const [threads, setThreads] = useState<DoctorMessageThread[]>(() => createInitialPediatricThreads())
  const [prescriptions, setPrescriptions] = useState<DoctorPrescription[]>(() => createInitialPediatricPrescriptions())
  const [earningsData] = useState<DoctorEarning[]>(() => createInitialPediatricEarnings())

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
  const [rxItems, setRxItems] = useState<DoctorPrescriptionItem[]>([{ name: '', dosage: '', quantity: 1 }])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeThread?.messages])

  useEffect(() => {
    consultEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [consultThread?.messages])

  const pediatricDoctors = useMemo(
    () => doctors.filter((d) => d.type === 'Pediatrician'),
    [doctors]
  )

  useEffect(() => {
    if (pediatricDoctors.length === 0) return
    if (!pediatricDoctors.some((d) => d.id === activeDoctorId)) {
      setActiveDoctorId(pediatricDoctors[0].id)
    }
  }, [activeDoctorId, pediatricDoctors])

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

  const filteredThreads = useMemo(() => {
    const q = messageSearch.trim().toLowerCase()
    if (!q) return pedThreads
    return pedThreads.filter((t) =>
      [t.patientName, t.lastMessage, t.status].some((v) => v.toLowerCase().includes(q))
    )
  }, [pedThreads, messageSearch])

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

  const consentPending = useMemo(
    () => pedConsultations.filter((c) => c.consentStatus === 'Pending'),
    [pedConsultations]
  )

  const dosageAlerts = useMemo(
    () => pedConsultations.filter((c) => c.dosageAlert),
    [pedConsultations]
  )

  const childProfiles = useMemo(() => {
    const map = new Map<string, { child: string; age: number; guardian: string; lastVisit: string; weight: string }>()
    pedConsultations.forEach((c) => {
      if (!c.childName) return
      map.set(c.childName, {
        child: c.childName,
        age: c.childAge ?? 0,
        guardian: c.guardianName ?? '-',
        lastVisit: c.scheduledAt,
        weight: c.weightKg ? `${c.weightKg} kg` : '-',
      })
    })
    return Array.from(map.values())
  }, [pedConsultations])

  const earnings = useMemo(
    () => earningsData.filter((e) => e.doctorId === activeDoctorId),
    [activeDoctorId, earningsData]
  )

  const stats = useMemo(() => {
    const total = pedConsultations.length
    const waiting = pedConsultations.filter((c) => c.status === 'Waiting').length
    const consents = consentPending.length
    const alerts = dosageAlerts.length
    const totalRevenue = earnings.reduce((sum, e) => sum + e.revenue, 0)
    return { total, waiting, consents, alerts, totalRevenue }
  }, [pedConsultations, consentPending, dosageAlerts, earnings])

  const unreadCount = useMemo(
    () => pedThreads.reduce((sum, t) => sum + (t.unreadCount || 0), 0),
    [pedThreads]
  )

  const doctorFirstName = doctor?.name.replace(/^Dr\.\s*/i, '').split(' ')[0] ?? 'Doctor'

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  const updateConsultationStatus = (id: string, status: Consultation['status']) => {
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
        text: `Consultation started for ${consult.childName ?? consult.patientName}: ${consult.issue}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }],
    }
    const all = [newThread, ...threads]
    setThreads(all)
    saveDoctorMessages(all)
    return newThread
  }

  const handleStartConsultation = (consult: Consultation) => {
    updateConsultationStatus(consult.id, 'In progress')
    const thread = findOrCreateThread(consult)
    setConsultThread({ ...thread, unreadCount: 0 })
    setSelectedConsult({ ...consult, status: 'In progress' })
    setShowConsultChat(true)
  }

  const handleSendConsultMessage = () => {
    if (!consultThread || !consultMessage.trim()) return
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

  const openThread = (thread: DoctorMessageThread) => {
    const all = threads.map((t) => (t.id === thread.id ? { ...t, unreadCount: 0 } : t))
    setThreads(all)
    saveDoctorMessages(all)
    setActiveThread({ ...thread, unreadCount: 0 })
  }

  const handleSendMessage = () => {
    if (!activeThread || !newMessage.trim()) return
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

  const handleCreatePrescription = () => {
    if (!rxPatient.trim()) return
    const rx: DoctorPrescription = {
      id: `RX-${Math.floor(1000 + Math.random() * 9000)}`,
      doctorId: activeDoctorId,
      patientName: rxPatient,
      createdAt: new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'Draft',
      notes: rxNotes || 'No notes provided.',
      pediatric: true,
      items: rxItems.filter((i) => i.name.trim()),
    }
    const updated = [rx, ...prescriptions]
    setPrescriptions(updated)
    saveDoctorPrescriptions(updated)
    setShowRxPanel(false)
    setRxPatient('')
    setRxNotes('')
    setRxItems([{ name: '', dosage: '', quantity: 1 }])
  }

  const updatePrescriptionStatus = (id: string, status: DoctorPrescription['status']) => {
    const updated = prescriptions.map((rx) => (rx.id === id ? { ...rx, status } : rx))
    setPrescriptions(updated)
    saveDoctorPrescriptions(updated)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="dd-module">

      {/* ── Header ── */}
      <header className="dd-header">
        <div className="dd-header__inner">
          <div className="dd-header__brand">ava<span>pharmacy</span></div>
          <span className="dd-header__role">
            <span className="dd-header__dot" />
            Pediatrician Portal
          </span>
          <div className="dd-header__spacer" />
          <div className="dd-header__right">
            <select
              value={activeDoctorId}
              onChange={(e) => setActiveDoctorId(e.target.value)}
              className="dd-header__select"
            >
              {pediatricDoctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <div className="dd-header__avatar">{doctor ? initials(doctor.name) : 'PD'}</div>
            <span className="dd-header__name">{doctor?.name ?? 'Pediatrician'}</span>
            <button className="dd-header__logout" type="button" onClick={logout}>Sign out</button>
          </div>
        </div>
      </header>

      {/* ── Tab nav ── */}
      <div className="dd-tabs">
        <div className="dd-tabs__inner">
          {([
            { id: 'queue' as PediatricTab, label: 'Queue', badge: stats.waiting,
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
            { id: 'messages' as PediatricTab, label: 'Family messages', badge: unreadCount,
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
            { id: 'consents' as PediatricTab, label: 'Consents', badge: stats.consents,
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><circle cx="12" cy="12" r="10"/></svg> },
            { id: 'prescriptions' as PediatricTab, label: 'Prescriptions', badge: 0,
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
            { id: 'profiles' as PediatricTab, label: 'Child profiles', badge: stats.alerts,
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/><path d="M19 8l2 2 4-4"/></svg> },
            { id: 'earnings' as PediatricTab, label: 'Earnings', badge: 0,
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              className={`dd-tab ${activeTab === tab.id ? 'dd-tab--active' : ''}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
              {tab.badge > 0 && <span className="dd-tab__badge">{tab.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="dd-content">

        {/* ── QUEUE TAB ── */}
        {activeTab === 'queue' && (
          <>
            <div className="dd-welcome">
              <div>
                <h1 className="dd-welcome__title">{greeting()}, Dr. {doctorFirstName}</h1>
                <p className="dd-welcome__sub">{doctor?.specialty} · {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            <div className="dd-stats">
              <div className="dd-stat dd-stat--total">
                <div className="dd-stat__icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <p className="dd-stat__value">{stats.total}</p>
                <p className="dd-stat__label">Total today</p>
              </div>
              <div className="dd-stat dd-stat--waiting">
                <div className="dd-stat__icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <p className="dd-stat__value">{stats.waiting}</p>
                <p className="dd-stat__label">Waiting</p>
              </div>
              <div className="dd-stat dd-stat--active">
                <div className="dd-stat__icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><circle cx="12" cy="12" r="10"/></svg>
                </div>
                <p className="dd-stat__value">{stats.consents}</p>
                <p className="dd-stat__label">Consents pending</p>
              </div>
              <div className="dd-stat dd-stat--done">
                <div className="dd-stat__icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <p className="dd-stat__value">{stats.alerts}</p>
                <p className="dd-stat__label">Dosage alerts</p>
              </div>
              <div className="dd-stat dd-stat--revenue">
                <div className="dd-stat__icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <p className="dd-stat__value">KSh {stats.totalRevenue.toLocaleString()}</p>
                <p className="dd-stat__label">Total revenue</p>
              </div>
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

              <div className="dd-table-wrap">
                <table className="dd-table">
                  <thead>
                    <tr>
                      <th>Child / Guardian</th>
                      <th>Condition</th>
                      <th>Weight</th>
                      <th>Consent</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueItems.map((item) => (
                      <tr
                        key={item.id}
                        className={selectedConsult?.id === item.id ? 'dd-row--active' : ''}
                        onClick={() => { setSelectedConsult(item); setShowConsultChat(false) }}
                      >
                        <td>
                          <div className="dd-td-patient">
                            <div className="dd-td-patient__avatar">{initials(item.childName ?? item.patientName)}</div>
                            <div>
                              <p className="dd-td-patient__name">
                                {item.childName ?? '-'}
                                {item.childAge ? <span className="pd-age-tag">, {item.childAge}y</span> : null}
                                {item.dosageAlert && <span className="pd-alert-dot" title="Dosage alert" />}
                              </p>
                              <p className="dd-td-patient__id">Guardian: {item.guardianName ?? '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="dd-td-issue">{item.issue}</td>
                        <td className="dd-td-meta">{item.weightKg ? `${item.weightKg} kg` : '-'}</td>
                        <td>
                          <span className={`pd-consent ${item.consentStatus === 'Granted' ? 'pd-consent--ok' : 'pd-consent--pending'}`}>
                            {item.consentStatus === 'Granted' ? (
                              <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> Granted</>
                            ) : 'Pending'}
                          </span>
                        </td>
                        <td>
                          <div className="dd-status-cell">
                            <span className="dd-status-dot" style={{ background: STATUS_COLORS[item.status] ?? '#9ca3af' }} />
                            <span className="dd-status-text">{item.status}</span>
                          </div>
                        </td>
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
                                Chat
                              </button>
                            )}
                            <button
                              className="dd-action-btn"
                              type="button"
                              disabled={item.status === 'Completed' || item.status === 'Cancelled'}
                              onClick={() => updateConsultationStatus(item.id, 'Completed')}
                            >
                              Done
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                    placeholder="Search family messages…"
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
                  <div className="dd-empty dd-empty--sm">No family conversations.</div>
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
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button
                      className="dd-send-btn"
                      type="button"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                  </div>
                </>
              ) : (
                <div className="dd-chat-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <p>Select a family conversation to reply</p>
                </div>
              )}
            </div>
          </div>
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
              <button className="dd-primary-btn" type="button" onClick={() => setShowRxPanel(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New prescription
              </button>
            </div>
            <div className="dd-table-wrap">
              <table className="dd-table">
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
                {childProfiles.map((p) => (
                  <div key={p.child} className="pd-profile-card">
                    <div className="pd-profile-card__avatar">{initials(p.child)}</div>
                    <div className="pd-profile-card__body">
                      <p className="pd-profile-card__name">{p.child}</p>
                      <p className="pd-profile-card__age">Age {p.age}</p>
                    </div>
                    <div className="pd-profile-card__meta">
                      <div className="pd-profile-card__row">
                        <span>Guardian</span><strong>{p.guardian}</strong>
                      </div>
                      <div className="pd-profile-card__row">
                        <span>Weight</span><strong>{p.weight}</strong>
                      </div>
                      <div className="pd-profile-card__row">
                        <span>Last visit</span><strong>{p.lastVisit}</strong>
                      </div>
                    </div>
                  </div>
                ))}
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
              <div className="dd-table-wrap">
                <table className="dd-table">
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
                              background: entry.status === 'Paid' ? '#10b981' : entry.status === 'Scheduled' ? '#f59e0b' : '#ef4444'
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
          <aside className={`dd-side-panel ${showConsultChat ? 'dd-side-panel--chat' : ''}`}>
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
                    <p className="dd-sp-patient__meta">via {selectedConsult.guardianName}</p>
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
                      className="dd-sp-btn dd-sp-btn--success"
                      type="button"
                      disabled={selectedConsult.status === 'Completed'}
                      onClick={() => { updateConsultationStatus(selectedConsult.id, 'Completed'); setShowConsultChat(false) }}
                    >
                      Mark completed
                    </button>
                    <button
                      className="dd-sp-btn dd-sp-btn--danger"
                      type="button"
                      onClick={() => { updateConsultationStatus(selectedConsult.id, 'Cancelled'); setSelectedConsult(null); setShowConsultChat(false) }}
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

                <div className="dd-sp-body">
                  <div className="dd-sp-section">
                    <p className="dd-sp-section-title">Child</p>
                    <div className="dd-sp-patient">
                      <div className="dd-sp-patient__avatar">{initials(selectedConsult.childName ?? selectedConsult.patientName)}</div>
                      <div>
                        <p className="dd-sp-patient__name">{selectedConsult.childName ?? '-'}</p>
                        <p className="dd-sp-patient__meta">Age {selectedConsult.childAge} · {selectedConsult.weightKg} kg</p>
                      </div>
                    </div>
                  </div>

                  <div className="dd-sp-section">
                    <p className="dd-sp-section-title">Guardian</p>
                    <p className="dd-sp-value">{selectedConsult.guardianName ?? '-'}</p>
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
                      <p className="dd-sp-field-label">Consent</p>
                      <p className="dd-sp-field-value">
                        <span className={`pd-consent ${selectedConsult.consentStatus === 'Granted' ? 'pd-consent--ok' : 'pd-consent--pending'}`}>
                          {selectedConsult.consentStatus ?? 'Pending'}
                        </span>
                      </p>
                    </div>
                    <div className="dd-sp-field">
                      <p className="dd-sp-field-label">Status</p>
                      <div className="dd-status-cell">
                        <span className="dd-status-dot" style={{ background: STATUS_COLORS[selectedConsult.status] ?? '#9ca3af' }} />
                        <span className="dd-status-text">{selectedConsult.status}</span>
                      </div>
                    </div>
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
          <aside className="dd-side-panel">
            <div className="dd-sp-header">
              <div>
                <p className="dd-sp-id">New Pediatric Prescription</p>
                <p className="dd-sp-meta">Weight-adjusted dosing · age 0–18</p>
              </div>
              <button className="dd-sp-close" type="button" onClick={() => setShowRxPanel(false)}>×</button>
            </div>
            <div className="dd-sp-body">
              <div className="dd-sp-section">
                <div className="dd-rx-field">
                  <label>Child name</label>
                  <input type="text" placeholder="Full name" value={rxPatient} onChange={(e) => setRxPatient(e.target.value)} />
                </div>
                <div className="dd-rx-field">
                  <label>Clinical notes</label>
                  <textarea rows={3} placeholder="Diagnosis, weight-based dosing notes…" value={rxNotes} onChange={(e) => setRxNotes(e.target.value)} />
                </div>
              </div>
              <div className="dd-sp-section">
                <p className="dd-sp-section-title">Medications</p>
                <div className="dd-rx-items">
                  {rxItems.map((item, idx) => (
                    <div key={idx} className="dd-rx-item">
                      <input type="text" placeholder="Medicine name" value={item.name} onChange={(e) => setRxItems((prev) => prev.map((it, i) => i === idx ? { ...it, name: e.target.value } : it))} />
                      <input type="text" placeholder="Dosage (e.g. 5ml 3×/day)" value={item.dosage} onChange={(e) => setRxItems((prev) => prev.map((it, i) => i === idx ? { ...it, dosage: e.target.value } : it))} />
                      <input type="number" min={1} placeholder="Qty" value={item.quantity} onChange={(e) => setRxItems((prev) => prev.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) } : it))} />
                    </div>
                  ))}
                  <button className="dd-add-item-btn" type="button" onClick={() => setRxItems((prev) => [...prev, { name: '', dosage: '', quantity: 1 }])}>
                    + Add medication
                  </button>
                </div>
              </div>
            </div>
            <div className="dd-sp-footer">
              <div className="dd-sp-actions">
                <button className="dd-sp-btn dd-sp-btn--primary" type="button" onClick={handleCreatePrescription} disabled={!rxPatient.trim()}>
                  Save &amp; create
                </button>
                <button className="dd-sp-btn" type="button" onClick={() => setShowRxPanel(false)}>Cancel</button>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

export default PediatricianDashboardPage
