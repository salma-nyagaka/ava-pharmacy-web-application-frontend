import { useMemo, useRef, useState, useEffect } from 'react'
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
import './DoctorDashboardPage.css'

type DoctorTab = 'queue' | 'messages' | 'prescriptions' | 'patients' | 'earnings'

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

function DoctorDashboardPage() {
  const { logout } = useAuth()
  const [activeTab, setActiveTab] = useState<DoctorTab>('queue')
  const [doctors] = useState(loadDoctorProfiles())
  const [activeDoctorId, setActiveDoctorId] = useState(() => {
    return (
      doctors.find((d) => d.type === 'Doctor' && d.status === 'Active')?.id ??
      doctors[0]?.id
    )
  })
  const [consultations, setConsultations] = useState<Consultation[]>(() => loadConsultations())
  const [threads, setThreads] = useState<DoctorMessageThread[]>(() => loadDoctorMessages())
  const [prescriptions, setPrescriptions] = useState<DoctorPrescription[]>(() => loadDoctorPrescriptions())

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

  const [patientSearch, setPatientSearch] = useState('')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeThread?.messages])

  useEffect(() => {
    consultEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [consultThread?.messages])

  const doctor = doctors.find((d) => d.id === activeDoctorId)

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

  const updateConsultationStatus = (id: string, status: Consultation['status']) => {
    const updated = consultations.map((c) => (c.id === id ? { ...c, status } : c))
    setConsultations(updated)
    saveConsultations(updated)
    if (selectedConsult?.id === id) setSelectedConsult({ ...selectedConsult, status })
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

  const openThread = (thread: DoctorMessageThread) => {
    const all = threads.map((t) => (t.id === thread.id ? { ...t, unreadCount: 0 } : t))
    setThreads(all)
    saveDoctorMessages(all)
    setActiveThread({ ...thread, unreadCount: 0 })
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

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const doctorFirstName = doctor?.name.replace(/^Dr\.\s*/i, '').split(' ')[0] ?? 'Doctor'

  return (
    <div className="dd-module">

      {/* ── Header ── */}
      <header className="dd-header">
        <div className="dd-header__inner">
          <div className="dd-header__brand">ava<span>pharmacy</span></div>
          <span className="dd-header__role">
            <span className="dd-header__dot" />
            Doctor Portal
          </span>
          <div className="dd-header__spacer" />
          <div className="dd-header__right">
            <select
              value={activeDoctorId}
              onChange={(e) => setActiveDoctorId(e.target.value)}
              className="dd-header__select"
            >
              {doctors.filter((d) => d.type === 'Doctor').map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <div className="dd-header__avatar">{doctor ? initials(doctor.name) : 'DR'}</div>
            <span className="dd-header__name">{doctor?.name ?? 'Doctor'}</span>
            <button className="dd-header__logout" type="button" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Tab nav ── */}
      <div className="dd-tabs">
        <div className="dd-tabs__inner">
          {([
            { id: 'queue' as DoctorTab, label: 'Queue', badge: stats.waiting > 0 ? stats.waiting : 0,
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
            { id: 'messages' as DoctorTab, label: 'Messages', badge: unreadCount,
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
            { id: 'prescriptions' as DoctorTab, label: 'E-prescriptions', badge: 0,
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
            { id: 'patients' as DoctorTab, label: 'Patients', badge: 0,
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
            { id: 'earnings' as DoctorTab, label: 'Earnings', badge: 0,
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="10 8 16 12 10 16 10 8"/></svg>
                </div>
                <p className="dd-stat__value">{stats.inProgress}</p>
                <p className="dd-stat__label">In progress</p>
              </div>
              <div className="dd-stat dd-stat--done">
                <div className="dd-stat__icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <p className="dd-stat__value">{stats.completed}</p>
                <p className="dd-stat__label">Completed</p>
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
                    placeholder="Search by patient, issue, ID…"
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
                      <th>Patient</th>
                      <th>Issue</th>
                      <th>Scheduled</th>
                      <th>Priority</th>
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
                            <div className="dd-td-patient__avatar">{initials(item.patientName)}</div>
                            <div>
                              <p className="dd-td-patient__name">{item.patientName}</p>
                              <p className="dd-td-patient__id">{item.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="dd-td-issue">{item.issue}</td>
                        <td className="dd-td-meta">{item.scheduledAt}</td>
                        <td>
                          <span className={`dd-priority ${item.priority === 'Priority' ? 'dd-priority--high' : ''}`}>
                            {item.priority === 'Priority'
                              ? <><span className="dd-priority-dot" /> {item.priority}</>
                              : item.priority}
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
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <p>No consultations found.</p>
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
                  <div className="dd-empty dd-empty--sm">No conversations.</div>
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
                  <p>Select a conversation to start messaging</p>
                </div>
              )}
            </div>
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
                    <th>Patient</th>
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
                  <p>No prescriptions found.</p>
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
            <div className="dd-patient-grid">
              {filteredPatients.map((p) => (
                <div key={p.name} className="dd-patient-card">
                  <div className="dd-patient-card__avatar">{initials(p.name)}</div>
                  <div className="dd-patient-card__body">
                    <p className="dd-patient-card__name">{p.name}</p>
                    <p className="dd-patient-card__meta">Last visit: {p.lastVisit}</p>
                  </div>
                  <div className="dd-patient-card__stat">
                    <span className="dd-patient-card__count">{p.total}</span>
                    <span className="dd-patient-card__count-label">visit{p.total !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              ))}
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
                <p className="dd-sp-id">New E-Prescription</p>
                <p className="dd-sp-meta">Fill in the details below</p>
              </div>
              <button className="dd-sp-close" type="button" onClick={() => setShowRxPanel(false)}>×</button>
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
                <div className="dd-rx-items">
                  {rxItems.map((item, idx) => (
                    <div key={idx} className="dd-rx-item">
                      <input
                        type="text"
                        placeholder="Medicine name"
                        value={item.name}
                        onChange={(e) => setRxItems((prev) => prev.map((it, i) => i === idx ? { ...it, name: e.target.value } : it))}
                      />
                      <input
                        type="text"
                        placeholder="Dosage (e.g. 500mg 3×/day)"
                        value={item.dosage}
                        onChange={(e) => setRxItems((prev) => prev.map((it, i) => i === idx ? { ...it, dosage: e.target.value } : it))}
                      />
                      <input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => setRxItems((prev) => prev.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) } : it))}
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
                  disabled={!rxPatient.trim()}
                >
                  Save &amp; create
                </button>
                <button className="dd-sp-btn" type="button" onClick={() => setShowRxPanel(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

export default DoctorDashboardPage
