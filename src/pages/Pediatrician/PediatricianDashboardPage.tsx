import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader/PageHeader'
import './PediatricianDashboardPage.css'
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

type PediatricTab = 'queue' | 'messages' | 'consents' | 'prescriptions' | 'profiles' | 'earnings'

const tabLabels: { id: PediatricTab; label: string }[] = [
  { id: 'queue', label: 'Consultation queue' },
  { id: 'messages', label: 'Family messages' },
  { id: 'consents', label: 'Guardian consents' },
  { id: 'prescriptions', label: 'Pediatric prescriptions' },
  { id: 'profiles', label: 'Child profiles' },
  { id: 'earnings', label: 'Earnings' },
]

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
    if (index === -1) {
      seeded.push(thread)
      return
    }
    seeded[index] = { ...thread, ...seeded[index], doctorId: thread.doctorId }
  })

  if (seeded.length !== stored.length) {
    saveDoctorMessages(seeded)
  }

  return seeded
}

const createInitialPediatricConsultations = (): Consultation[] => {
  const stored = loadConsultations()
  const seeded = [...stored]
  const defaults: Consultation[] = [
    {
      id: 'CONS-2203',
      doctorId: 'PED-001',
      patientName: 'Guardian: Mary W.',
      patientAge: 36,
      issue: 'Persistent sore throat and fever',
      status: 'Waiting',
      scheduledAt: '2026-02-07 11:40 AM',
      channel: 'Chat',
      priority: 'Priority',
      lastMessageAt: '2026-02-07 11:15 AM',
      pediatric: true,
      guardianName: 'Mary W.',
      childName: 'Ethan W.',
      childAge: 5,
      weightKg: 18,
      consentStatus: 'Pending',
      dosageAlert: false,
    },
    {
      id: 'CONS-2204',
      doctorId: 'PED-001',
      patientName: 'Guardian: David K.',
      patientAge: 40,
      issue: 'Routine nutrition follow-up',
      status: 'Completed',
      scheduledAt: '2026-02-06 02:10 PM',
      channel: 'Chat',
      priority: 'Routine',
      lastMessageAt: '2026-02-06 02:45 PM',
      pediatric: true,
      guardianName: 'David K.',
      childName: 'Ava K.',
      childAge: 2,
      weightKg: 11,
      consentStatus: 'Granted',
      dosageAlert: false,
    },
    {
      id: 'CONS-2205',
      doctorId: 'PED-002',
      patientName: 'Guardian: Lydia M.',
      patientAge: 34,
      issue: 'Skin allergy reaction',
      status: 'Waiting',
      scheduledAt: '2026-02-07 01:20 PM',
      channel: 'Chat',
      priority: 'Routine',
      lastMessageAt: '2026-02-07 01:02 PM',
      pediatric: true,
      guardianName: 'Lydia M.',
      childName: 'Mia M.',
      childAge: 9,
      weightKg: 29,
      consentStatus: 'Pending',
      dosageAlert: true,
    },
    {
      id: 'CONS-2206',
      doctorId: 'PED-002',
      patientName: 'Guardian: Peter N.',
      patientAge: 37,
      issue: 'Post-antibiotic stomach upset',
      status: 'In progress',
      scheduledAt: '2026-02-07 03:00 PM',
      channel: 'Chat',
      priority: 'Priority',
      lastMessageAt: '2026-02-07 02:55 PM',
      pediatric: true,
      guardianName: 'Peter N.',
      childName: 'Leo N.',
      childAge: 6,
      weightKg: 20,
      consentStatus: 'Granted',
      dosageAlert: false,
    },
    {
      id: 'CONS-2207',
      doctorId: 'PED-002',
      patientName: 'Guardian: Diana O.',
      patientAge: 31,
      issue: 'Night cough and wheeze',
      status: 'Completed',
      scheduledAt: '2026-02-05 09:15 AM',
      channel: 'Chat',
      priority: 'Routine',
      lastMessageAt: '2026-02-05 09:45 AM',
      pediatric: true,
      guardianName: 'Diana O.',
      childName: 'Jay O.',
      childAge: 4,
      weightKg: 16,
      consentStatus: 'Granted',
      dosageAlert: false,
    },
  ]

  defaults.forEach((consult) => {
    const index = seeded.findIndex((item) => item.id === consult.id)
    if (index === -1) {
      seeded.push(consult)
      return
    }
    seeded[index] = { ...consult, ...seeded[index], doctorId: consult.doctorId, pediatric: true }
  })

  if (seeded.length !== stored.length) {
    saveConsultations(seeded)
  }

  return seeded
}

const createInitialPediatricPrescriptions = (): DoctorPrescription[] => {
  const stored = loadDoctorPrescriptions()
  const seeded = [...stored]
  const defaults: DoctorPrescription[] = [
    {
      id: 'RX-6502',
      doctorId: 'PED-001',
      patientName: 'Liam K.',
      createdAt: '2026-02-06 10:25 AM',
      status: 'Draft',
      notes: 'Monitor temperature every 6 hours and keep hydration high.',
      pediatric: true,
      items: [
        { name: 'Paracetamol syrup', dosage: '5ml every 6 hours', quantity: 1 },
      ],
    },
    {
      id: 'RX-6503',
      doctorId: 'PED-001',
      patientName: 'Ava K.',
      createdAt: '2026-02-04 12:10 PM',
      status: 'Sent',
      notes: 'Add probiotic for 5 days.',
      pediatric: true,
      items: [
        { name: 'Oral rehydration salts', dosage: 'After each loose stool', quantity: 8 },
        { name: 'Children probiotic sachet', dosage: '1 sachet daily', quantity: 5 },
      ],
    },
    {
      id: 'RX-6504',
      doctorId: 'PED-002',
      patientName: 'Mia M.',
      createdAt: '2026-02-03 08:40 AM',
      status: 'Dispensed',
      notes: 'Avoid known skin irritants and follow up in 3 days.',
      pediatric: true,
      items: [
        { name: 'Cetirizine syrup', dosage: '5ml at night', quantity: 1 },
        { name: 'Calamine lotion', dosage: 'Apply twice daily', quantity: 1 },
      ],
    },
  ]

  defaults.forEach((prescription) => {
    const index = seeded.findIndex((item) => item.id === prescription.id)
    if (index === -1) {
      seeded.push(prescription)
      return
    }
    seeded[index] = { ...prescription, ...seeded[index], doctorId: prescription.doctorId, pediatric: true }
  })

  if (seeded.length !== stored.length) {
    saveDoctorPrescriptions(seeded)
  }

  return seeded
}

const createInitialPediatricEarnings = (): DoctorEarning[] => {
  const stored = loadDoctorEarnings()
  const seeded = [...stored]
  const defaults: DoctorEarning[] = [
    {
      id: 'PAY-2002',
      doctorId: 'PED-001',
      period: 'Jan 2026',
      consults: 31,
      revenue: 37200,
      payoutDate: '2026-02-03',
      status: 'Paid',
    },
    {
      id: 'PAY-2003',
      doctorId: 'PED-001',
      period: 'Feb 2026',
      consults: 14,
      revenue: 16800,
      payoutDate: '2026-03-03',
      status: 'Scheduled',
    },
    {
      id: 'PAY-2004',
      doctorId: 'PED-002',
      period: 'Feb 2026',
      consults: 19,
      revenue: 28500,
      payoutDate: '2026-03-03',
      status: 'On hold',
    },
  ]

  defaults.forEach((earning) => {
    const exists = seeded.some((item) => item.id === earning.id)
    if (!exists) {
      seeded.push(earning)
    }
  })

  if (seeded.length !== stored.length) {
    saveDoctorEarnings(seeded)
  }

  return seeded
}

function PediatricianDashboardPage() {
  const [activeTab, setActiveTab] = useState<PediatricTab>('queue')
  const [doctors] = useState(loadDoctorProfiles())
  const [activeDoctorId, setActiveDoctorId] = useState(() => {
    return (
      doctors.find((doctor) => doctor.type === 'Pediatrician' && doctor.status === 'Active')?.id
      ?? doctors.find((doctor) => doctor.type === 'Pediatrician')?.id
      ?? doctors[0]?.id
      ?? ''
    )
  })
  const [consultations, setConsultations] = useState<Consultation[]>(() => createInitialPediatricConsultations())
  const [threads, setThreads] = useState<DoctorMessageThread[]>(() => createInitialPediatricThreads())
  const [prescriptions, setPrescriptions] = useState<DoctorPrescription[]>(() => createInitialPediatricPrescriptions())
  const [earningsData] = useState<DoctorEarning[]>(() => createInitialPediatricEarnings())
  const [queueSearch, setQueueSearch] = useState('')
  const [messageSearch, setMessageSearch] = useState('')
  const [prescriptionSearch, setPrescriptionSearch] = useState('')
  const [selectedConsult, setSelectedConsult] = useState<Consultation | null>(null)
  const [selectedThread, setSelectedThread] = useState<DoctorMessageThread | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [showRxModal, setShowRxModal] = useState(false)
  const [rxPatient, setRxPatient] = useState('')
  const [rxNotes, setRxNotes] = useState('')
  const [rxItems, setRxItems] = useState<DoctorPrescriptionItem[]>([{ name: '', dosage: '', quantity: 1 }])

  const pediatricDoctors = useMemo(
    () => doctors.filter((doctor) => doctor.type === 'Pediatrician'),
    [doctors]
  )

  useEffect(() => {
    if (pediatricDoctors.length === 0) return
    const matchesPediatricDoctor = pediatricDoctors.some((doctor) => doctor.id === activeDoctorId)
    if (!matchesPediatricDoctor) {
      setActiveDoctorId(pediatricDoctors[0].id)
    }
  }, [activeDoctorId, pediatricDoctors])

  const pediatricConsultations = useMemo(() => {
    return consultations.filter((consult) => consult.doctorId === activeDoctorId && consult.pediatric)
  }, [consultations, activeDoctorId])

  const pediatricConsultationCountByDoctor = useMemo(() => {
    return consultations.reduce<Record<string, number>>((acc, consult) => {
      if (!consult.pediatric) return acc
      acc[consult.doctorId] = (acc[consult.doctorId] ?? 0) + 1
      return acc
    }, {})
  }, [consultations])

  useEffect(() => {
    if (pediatricDoctors.length === 0) return
    if (pediatricConsultations.length > 0) return
    const fallback = pediatricDoctors
      .map((doctor) => ({ id: doctor.id, count: pediatricConsultationCountByDoctor[doctor.id] ?? 0 }))
      .sort((a, b) => b.count - a.count)[0]
    if (fallback && fallback.count > 0 && fallback.id !== activeDoctorId) {
      setActiveDoctorId(fallback.id)
    }
  }, [activeDoctorId, pediatricConsultations.length, pediatricConsultationCountByDoctor, pediatricDoctors])

  const queueItems = useMemo(() => {
    const query = queueSearch.trim().toLowerCase()
    if (!query) return pediatricConsultations
    return pediatricConsultations.filter((consult) =>
      [consult.childName ?? '', consult.guardianName ?? '', consult.issue, consult.status].some((value) =>
        value.toLowerCase().includes(query)
      )
    )
  }, [pediatricConsultations, queueSearch])

  const consentRequests = useMemo(() => {
    return pediatricConsultations.filter((consult) => consult.consentStatus === 'Pending')
  }, [pediatricConsultations])

  const dosageAlerts = useMemo(() => {
    return pediatricConsultations.filter((consult) => consult.dosageAlert)
  }, [pediatricConsultations])

  const pediatricPrescriptions = useMemo(() => {
    return prescriptions.filter((rx) => rx.doctorId === activeDoctorId && rx.pediatric)
  }, [prescriptions, activeDoctorId])

  const filteredPrescriptions = useMemo(() => {
    const query = prescriptionSearch.trim().toLowerCase()
    if (!query) return pediatricPrescriptions
    return pediatricPrescriptions.filter((rx) =>
      [rx.patientName, rx.status, rx.id].some((value) => value.toLowerCase().includes(query))
    )
  }, [pediatricPrescriptions, prescriptionSearch])

  const pediatricThreads = useMemo(() => {
    return threads.filter((thread) => thread.doctorId === activeDoctorId)
  }, [threads, activeDoctorId])

  const filteredThreads = useMemo(() => {
    const query = messageSearch.trim().toLowerCase()
    if (!query) return pediatricThreads
    return pediatricThreads.filter((thread) =>
      [thread.patientName, thread.lastMessage, thread.status].some((value) =>
        value.toLowerCase().includes(query)
      )
    )
  }, [pediatricThreads, messageSearch])

  const childProfiles = useMemo(() => {
    const unique = new Map<string, { child: string; guardian: string; lastVisit: string; weight: string }>()
    pediatricConsultations.forEach((consult) => {
      if (!consult.childName || !consult.guardianName) return
      unique.set(consult.childName, {
        child: consult.childName,
        guardian: consult.guardianName,
        lastVisit: consult.scheduledAt,
        weight: consult.weightKg ? `${consult.weightKg} kg` : 'Not recorded',
      })
    })
    return Array.from(unique.values())
  }, [pediatricConsultations])

  const earnings = useMemo(() => {
    return earningsData.filter((item) => item.doctorId === activeDoctorId)
  }, [activeDoctorId, earningsData])

  const updateConsultationStatus = (consultationId: string, status: Consultation['status']) => {
    const updated = consultations.map((consult) =>
      consult.id === consultationId ? { ...consult, status } : consult
    )
    setConsultations(updated)
    saveConsultations(updated)
  }

  const openThread = (thread: DoctorMessageThread) => {
    const updatedThreads = threads.map((item) =>
      item.id === thread.id ? { ...item, unreadCount: 0 } : item
    )
    setThreads(updatedThreads)
    saveDoctorMessages(updatedThreads)
    setSelectedThread({ ...thread, unreadCount: 0 })
  }

  const handleSendMessage = () => {
    if (!selectedThread || !newMessage.trim()) return
    const outgoingMessage: DoctorMessage = {
      id: `MSG-${Date.now()}`,
      sender: 'doctor',
      text: newMessage,
      time: 'Now',
    }
    const updatedThread = {
      ...selectedThread,
      lastMessage: newMessage,
      lastMessageAt: 'Now',
      messages: [...selectedThread.messages, outgoingMessage],
    }
    const updatedThreads = threads.map((thread) => (thread.id === selectedThread.id ? updatedThread : thread))
    setThreads(updatedThreads)
    saveDoctorMessages(updatedThreads)
    setSelectedThread(updatedThread)
    setNewMessage('')
  }

  const markConsentGranted = (consultationId: string) => {
    const updated = consultations.map((consult) =>
      consult.id === consultationId ? { ...consult, consentStatus: 'Granted' as const } : consult
    )
    setConsultations(updated)
    saveConsultations(updated)
  }

  const resolveDosageAlert = (consultationId: string) => {
    const updated = consultations.map((consult) =>
      consult.id === consultationId ? { ...consult, dosageAlert: false } : consult
    )
    setConsultations(updated)
    saveConsultations(updated)
  }

  const handleAddRxItem = () => {
    setRxItems((prev) => [...prev, { name: '', dosage: '', quantity: 1 }])
  }

  const handleRxItemChange = (index: number, field: keyof DoctorPrescriptionItem, value: string | number) => {
    setRxItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)))
  }

  const handleCreatePrescription = () => {
    if (!rxPatient.trim()) return
    const newRx: DoctorPrescription = {
      id: `RX-${Math.floor(1000 + Math.random() * 9000)}`,
      doctorId: activeDoctorId,
      patientName: rxPatient,
      createdAt: 'Now',
      status: 'Draft',
      notes: rxNotes || 'No notes provided.',
      pediatric: true,
      items: rxItems.filter((item) => item.name.trim()),
    }
    const updated = [newRx, ...prescriptions]
    setPrescriptions(updated)
    saveDoctorPrescriptions(updated)
    setShowRxModal(false)
    setRxPatient('')
    setRxNotes('')
    setRxItems([{ name: '', dosage: '', quantity: 1 }])
  }

  const updatePrescriptionStatus = (id: string, status: DoctorPrescription['status']) => {
    const updated = prescriptions.map((rx) => (rx.id === id ? { ...rx, status } : rx))
    setPrescriptions(updated)
    saveDoctorPrescriptions(updated)
  }

  const doctor = doctors.find((item) => item.id === activeDoctorId)

  return (
    <div>
      <PageHeader
        title="Pediatrician portal"
        subtitle="Review child profiles, obtain guardian consent, and issue pediatric prescriptions."
        badge="Pediatrics"
      />
      <section className="page">
        <div className="container">
          <div className="portal-header">
            <div>
              <p className="portal-header__label">Signed in as</p>
              <h2>{doctor?.name ?? 'Pediatrician'}</h2>
              <p className="portal-header__meta">{doctor?.specialty}</p>
            </div>
            <div>
              <label className="portal-header__label" htmlFor="pediatric-select">View profile</label>
              <select
                id="pediatric-select"
                value={activeDoctorId}
                onChange={(event) => setActiveDoctorId(event.target.value)}
              >
                {pediatricDoctors.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="portal-stats">
            <div className="portal-stat">
              <p className="portal-stat__label">Active consultations</p>
              <p className="portal-stat__value">{pediatricConsultations.length}</p>
            </div>
            <div className="portal-stat">
              <p className="portal-stat__label">Guardian consents</p>
              <p className="portal-stat__value">{consentRequests.length} pending</p>
            </div>
            <div className="portal-stat">
              <p className="portal-stat__label">Dosage alerts</p>
              <p className="portal-stat__value">{dosageAlerts.length}</p>
            </div>
          </div>

          <div className="portal-tabs">
            {tabLabels.map((tab) => (
              <button
                key={tab.id}
                className={`portal-tab ${activeTab === tab.id ? 'portal-tab--active' : ''}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'queue' && (
            <div className="portal-panel">
              <div className="portal-panel__header">
                <h3>Consultation queue</h3>
                <input
                  type="text"
                  placeholder="Search by child or guardian"
                  value={queueSearch}
                  onChange={(event) => setQueueSearch(event.target.value)}
                />
              </div>
              <div className="queue-list">
                {queueItems.map((item) => (
                  <div key={item.id} className="queue-item">
                    <div>
                      <strong>{item.childName}</strong>
                      <p className="queue-item__meta">Guardian: {item.guardianName}</p>
                      <p className="queue-item__meta">Issue: {item.issue}</p>
                      <p className="queue-item__meta">Weight: {item.weightKg} kg</p>
                      <p className="queue-item__meta">Consent: {item.consentStatus ?? 'Pending'}</p>
                    </div>
                    <div className="queue-item__actions">
                      <span className={`status-pill ${item.status === 'Waiting' ? 'status-pill--warning' : item.status === 'Completed' ? 'status-pill--success' : item.status === 'Cancelled' ? 'status-pill--danger' : 'status-pill--info'}`}>
                        {item.status}
                      </span>
                      <div className="queue-item__buttons">
                        <button className="btn btn--outline btn--sm" onClick={() => setSelectedConsult(item)}>
                          View
                        </button>
                        <button className="btn btn--primary btn--sm" onClick={() => updateConsultationStatus(item.id, 'In progress')}>
                          Start
                        </button>
                        <button className="btn btn--outline btn--sm" onClick={() => updateConsultationStatus(item.id, 'Completed')}>
                          Complete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {queueItems.length === 0 && (
                  <div className="empty-state">No pediatric consultations found.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="portal-panel">
              <div className="portal-panel__header">
                <h3>Family messages</h3>
                <input
                  type="text"
                  placeholder="Search guardian messages"
                  value={messageSearch}
                  onChange={(event) => setMessageSearch(event.target.value)}
                />
              </div>
              <div className="messages-list">
                {filteredThreads.map((thread) => (
                  <button key={thread.id} className="messages-card" onClick={() => openThread(thread)}>
                    <div>
                      <h4>{thread.patientName}</h4>
                      <p>{thread.lastMessage}</p>
                    </div>
                    <div className="messages-card__meta">
                      <span>{thread.lastMessageAt}</span>
                      {thread.unreadCount > 0 && <span className="message-badge">{thread.unreadCount}</span>}
                    </div>
                  </button>
                ))}
                {filteredThreads.length === 0 && (
                  <div className="empty-state">No guardian conversations found.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'consents' && (
            <div className="portal-panel">
              <div className="portal-panel__header">
                <h3>Guardian consent requests</h3>
                <p className="portal-panel__sub">Ensure guardian consent is recorded before proceeding.</p>
              </div>
              <div className="consent-grid">
                {consentRequests.map((item) => (
                  <div key={item.id} className="consent-card">
                    <h4>{item.childName}</h4>
                    <p>Guardian: {item.guardianName}</p>
                    <p>Status: {item.consentStatus}</p>
                    <button className="btn btn--primary btn--sm" onClick={() => markConsentGranted(item.id)}>
                      Mark consent granted
                    </button>
                  </div>
                ))}
                {consentRequests.length === 0 && (
                  <div className="empty-state">All consents are up to date.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'prescriptions' && (
            <div className="portal-panel">
              <div className="portal-panel__header">
                <h3>Pediatric prescriptions</h3>
                <div className="portal-panel__actions">
                  <input
                    type="text"
                    placeholder="Search prescriptions"
                    value={prescriptionSearch}
                    onChange={(event) => setPrescriptionSearch(event.target.value)}
                  />
                  <button className="btn btn--primary btn--sm" onClick={() => setShowRxModal(true)}>
                    Create prescription
                  </button>
                </div>
              </div>
              <div className="portal-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Child</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrescriptions.map((rx) => (
                      <tr key={rx.id}>
                        <td>{rx.id}</td>
                        <td>{rx.patientName}</td>
                        <td>{rx.createdAt}</td>
                        <td>
                          <span className={`status-pill ${rx.status === 'Sent' ? 'status-pill--success' : rx.status === 'Draft' ? 'status-pill--warning' : 'status-pill--info'}`}>
                            {rx.status}
                          </span>
                        </td>
                        <td className="portal-table__actions">
                          <button className="btn btn--outline btn--sm" onClick={() => updatePrescriptionStatus(rx.id, 'Sent')}>
                            Send to pharmacy
                          </button>
                          <button className="btn btn--outline btn--sm" onClick={() => updatePrescriptionStatus(rx.id, 'Dispensed')}>
                            Mark dispensed
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredPrescriptions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="empty-state">No pediatric prescriptions yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'profiles' && (
            <div className="portal-panel">
              <div className="portal-panel__header">
                <h3>Child profiles</h3>
                <p className="portal-panel__sub">Review recent pediatric cases and follow-ups.</p>
              </div>
              <div className="patients-grid">
                {childProfiles.map((profile) => (
                  <div key={profile.child} className="patient-card">
                    <h4>{profile.child}</h4>
                    <p>Guardian: {profile.guardian}</p>
                    <p>Weight: {profile.weight}</p>
                    <p>Last visit: {profile.lastVisit}</p>
                  </div>
                ))}
                {childProfiles.length === 0 && (
                  <div className="empty-state">No child profiles available.</div>
                )}
              </div>
              {dosageAlerts.length > 0 && (
                <div className="alert-panel">
                  <h4>Dosage alerts</h4>
                  {dosageAlerts.map((alert) => (
                    <div key={alert.id} className="alert-card">
                      <div>
                        <strong>{alert.childName}</strong>
                        <p>{alert.issue}</p>
                      </div>
                      <button className="btn btn--outline btn--sm" onClick={() => resolveDosageAlert(alert.id)}>
                        Resolve alert
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="portal-panel">
              <div className="portal-panel__header">
                <h3>Earnings</h3>
                <p className="portal-panel__sub">Monthly pediatric consultation payouts.</p>
              </div>
              <div className="earnings-grid">
                {earnings.map((entry) => (
                  <div key={entry.id} className="earnings-card">
                    <h4>{entry.period}</h4>
                    <p>{entry.consults} consultations</p>
                    <p className="earnings-card__value">KSh {entry.revenue.toLocaleString()}</p>
                    <span className={`status-pill ${entry.status === 'Paid' ? 'status-pill--success' : entry.status === 'Scheduled' ? 'status-pill--warning' : 'status-pill--danger'}`}>
                      {entry.status}
                    </span>
                    <p className="earnings-card__meta">Payout: {entry.payoutDate}</p>
                  </div>
                ))}
                {earnings.length === 0 && (
                  <div className="empty-state">No earnings data yet.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {selectedConsult && (
        <div className="modal-overlay" onClick={() => setSelectedConsult(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Pediatric consultation details</h2>
              <button className="modal__close" onClick={() => setSelectedConsult(null)}>×</button>
            </div>
            <div className="modal__content">
              <div className="detail-row">
                <span className="detail-label">Child</span>
                <span className="detail-value">{selectedConsult.childName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Guardian</span>
                <span className="detail-value">{selectedConsult.guardianName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Issue</span>
                <span className="detail-value">{selectedConsult.issue}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Weight</span>
                <span className="detail-value">{selectedConsult.weightKg} kg</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Consent</span>
                <span className="detail-value">{selectedConsult.consentStatus ?? 'Pending'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Scheduled</span>
                <span className="detail-value">{selectedConsult.scheduledAt}</span>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setSelectedConsult(null)}>
                Close
              </button>
              <button className="btn btn--outline btn--sm" onClick={() => updateConsultationStatus(selectedConsult.id, 'Cancelled')}>
                Cancel
              </button>
              <button className="btn btn--primary btn--sm" onClick={() => updateConsultationStatus(selectedConsult.id, 'Completed')}>
                Mark completed
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedThread && (
        <div className="modal-overlay" onClick={() => setSelectedThread(null)}>
          <div className="modal modal--wide" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Chat with {selectedThread.patientName}</h2>
              <button className="modal__close" onClick={() => setSelectedThread(null)}>×</button>
            </div>
            <div className="modal__content">
              <div className="chat-window">
                {selectedThread.messages.map((message) => (
                  <div key={message.id} className={`chat-message chat-message--${message.sender}`}>
                    <p>{message.text}</p>
                    <span>{message.time}</span>
                  </div>
                ))}
              </div>
              <div className="chat-input">
                <input
                  type="text"
                  placeholder="Write a response..."
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                />
                <button className="btn btn--primary btn--sm" onClick={handleSendMessage}>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRxModal && (
        <div className="modal-overlay" onClick={() => setShowRxModal(false)}>
          <div className="modal modal--wide" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Create pediatric prescription</h2>
              <button className="modal__close" onClick={() => setShowRxModal(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="form-group">
                <label>Child name</label>
                <input
                  type="text"
                  value={rxPatient}
                  onChange={(event) => setRxPatient(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  rows={3}
                  value={rxNotes}
                  onChange={(event) => setRxNotes(event.target.value)}
                />
              </div>
              <div className="rx-items">
                {rxItems.map((item, index) => (
                  <div key={`${index}-${item.name}`} className="rx-item">
                    <input
                      type="text"
                      placeholder="Medicine name"
                      value={item.name}
                      onChange={(event) => handleRxItemChange(index, 'name', event.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Dosage"
                      value={item.dosage}
                      onChange={(event) => handleRxItemChange(index, 'dosage', event.target.value)}
                    />
                    <input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(event) => handleRxItemChange(index, 'quantity', Number(event.target.value))}
                    />
                  </div>
                ))}
                <button className="btn btn--outline btn--sm" type="button" onClick={handleAddRxItem}>
                  Add another item
                </button>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowRxModal(false)}>
                Cancel
              </button>
              <button className="btn btn--primary btn--sm" onClick={handleCreatePrescription}>
                Save prescription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PediatricianDashboardPage
