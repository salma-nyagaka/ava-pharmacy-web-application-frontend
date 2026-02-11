import { useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader/PageHeader'
import './DoctorDashboardPage.css'
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

type DoctorTab = 'queue' | 'messages' | 'prescriptions' | 'patients' | 'earnings'

const tabLabels: { id: DoctorTab; label: string }[] = [
  { id: 'queue', label: 'Consultation queue' },
  { id: 'messages', label: 'Secure messages' },
  { id: 'prescriptions', label: 'E-prescriptions' },
  { id: 'patients', label: 'Patient records' },
  { id: 'earnings', label: 'Earnings' },
]

function DoctorDashboardPage() {
  const [activeTab, setActiveTab] = useState<DoctorTab>('queue')
  const [doctors] = useState(loadDoctorProfiles())
  const [activeDoctorId, setActiveDoctorId] = useState(() => {
    return doctors.find((doctor) => doctor.type === 'Doctor' && doctor.status === 'Active')?.id ?? doctors[0]?.id
  })
  const [consultations, setConsultations] = useState<Consultation[]>(() => loadConsultations())
  const [threads, setThreads] = useState<DoctorMessageThread[]>(() => loadDoctorMessages())
  const [prescriptions, setPrescriptions] = useState<DoctorPrescription[]>(() => loadDoctorPrescriptions())
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

  const doctor = doctors.find((item) => item.id === activeDoctorId)

  const doctorConsultations = useMemo(() => {
    return consultations.filter((consult) => consult.doctorId === activeDoctorId && !consult.pediatric)
  }, [consultations, activeDoctorId])

  const queueItems = useMemo(() => {
    const query = queueSearch.trim().toLowerCase()
    if (!query) return doctorConsultations
    return doctorConsultations.filter((consult) =>
      [consult.patientName, consult.issue, consult.status, consult.id].some((value) =>
        value.toLowerCase().includes(query)
      )
    )
  }, [doctorConsultations, queueSearch])

  const doctorThreads = useMemo(() => {
    return threads.filter((thread) => thread.doctorId === activeDoctorId)
  }, [threads, activeDoctorId])

  const filteredThreads = useMemo(() => {
    const query = messageSearch.trim().toLowerCase()
    if (!query) return doctorThreads
    return doctorThreads.filter((thread) =>
      [thread.patientName, thread.lastMessage, thread.status].some((value) =>
        value.toLowerCase().includes(query)
      )
    )
  }, [doctorThreads, messageSearch])

  const doctorPrescriptions = useMemo(() => {
    return prescriptions.filter((rx) => rx.doctorId === activeDoctorId && !rx.pediatric)
  }, [prescriptions, activeDoctorId])

  const filteredPrescriptions = useMemo(() => {
    const query = prescriptionSearch.trim().toLowerCase()
    if (!query) return doctorPrescriptions
    return doctorPrescriptions.filter((rx) =>
      [rx.patientName, rx.status, rx.id].some((value) => value.toLowerCase().includes(query))
    )
  }, [doctorPrescriptions, prescriptionSearch])

  const patientRecords = useMemo(() => {
    const unique = new Map<string, { name: string; lastVisit: string; total: number }>()
    doctorConsultations.forEach((consult) => {
      const entry = unique.get(consult.patientName)
      if (!entry) {
        unique.set(consult.patientName, {
          name: consult.patientName,
          lastVisit: consult.scheduledAt,
          total: 1,
        })
      } else {
        entry.total += 1
        entry.lastVisit = consult.scheduledAt
      }
    })
    return Array.from(unique.values())
  }, [doctorConsultations])

  const earnings = useMemo(() => {
    return loadDoctorEarnings().filter((item) => item.doctorId === activeDoctorId)
  }, [activeDoctorId])

  const stats = useMemo(() => {
    const total = doctorConsultations.length
    const pending = doctorConsultations.filter((consult) => consult.status === 'Waiting').length
    const inProgress = doctorConsultations.filter((consult) => consult.status === 'In progress').length
    return { total, pending, inProgress }
  }, [doctorConsultations])

  const updateConsultationStatus = (consultationId: string, status: Consultation['status']) => {
    const updated = consultations.map((consult) =>
      consult.id === consultationId ? { ...consult, status } : consult
    )
    setConsultations(updated)
    saveConsultations(updated)
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

  const openThread = (thread: DoctorMessageThread) => {
    const updatedThreads = threads.map((item) =>
      item.id === thread.id ? { ...item, unreadCount: 0 } : item
    )
    setThreads(updatedThreads)
    saveDoctorMessages(updatedThreads)
    setSelectedThread({ ...thread, unreadCount: 0 })
  }

  const handleAddRxItem = () => {
    setRxItems((prev) => [...prev, { name: '', dosage: '', quantity: 1 }])
  }

  const handleRxItemChange = (index: number, field: keyof DoctorPrescriptionItem, value: string | number) => {
    setRxItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    )
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

  return (
    <div>
      <PageHeader
        title="Doctor portal"
        subtitle="Manage consultations, issue e-prescriptions, and review patient history."
        badge="Doctor Dashboard"
      />
      <section className="page">
        <div className="container">
          <div className="portal-header">
            <div>
              <p className="portal-header__label">Signed in as</p>
              <h2>{doctor?.name ?? 'Doctor'}</h2>
              <p className="portal-header__meta">{doctor?.specialty}</p>
            </div>
            <div>
              <label className="portal-header__label" htmlFor="doctor-select">View profile</label>
              <select
                id="doctor-select"
                value={activeDoctorId}
                onChange={(event) => setActiveDoctorId(event.target.value)}
              >
                {doctors.filter((item) => item.type === 'Doctor').map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="portal-stats">
            <div className="portal-stat">
              <p className="portal-stat__label">Consultations today</p>
              <p className="portal-stat__value">{stats.total}</p>
            </div>
            <div className="portal-stat">
              <p className="portal-stat__label">Waiting</p>
              <p className="portal-stat__value">{stats.pending}</p>
            </div>
            <div className="portal-stat">
              <p className="portal-stat__label">In progress</p>
              <p className="portal-stat__value">{stats.inProgress}</p>
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
                  placeholder="Search by patient, issue, status..."
                  value={queueSearch}
                  onChange={(event) => setQueueSearch(event.target.value)}
                />
              </div>
              <div className="queue-list">
                {queueItems.map((item) => (
                  <div key={item.id} className="queue-item">
                    <div>
                      <strong>{item.patientName}</strong>
                      <p className="queue-item__meta">{item.issue}</p>
                      <p className="queue-item__meta">Scheduled: {item.scheduledAt}</p>
                      <p className="queue-item__meta">Priority: {item.priority}</p>
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
                  <div className="empty-state">No consultations match your search.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="portal-panel">
              <div className="portal-panel__header">
                <h3>Secure messages</h3>
                <input
                  type="text"
                  placeholder="Search messages"
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
                  <div className="empty-state">No conversations found.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'prescriptions' && (
            <div className="portal-panel">
              <div className="portal-panel__header">
                <h3>E-prescriptions</h3>
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
                      <th>Patient</th>
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
                        <td colSpan={5} className="empty-state">No prescriptions found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'patients' && (
            <div className="portal-panel">
              <div className="portal-panel__header">
                <h3>Patient records</h3>
                <p className="portal-panel__sub">Quick summary of your active patients.</p>
              </div>
              <div className="patients-grid">
                {patientRecords.map((patient) => (
                  <div key={patient.name} className="patient-card">
                    <h4>{patient.name}</h4>
                    <p>Last visit: {patient.lastVisit}</p>
                    <p>Total consultations: {patient.total}</p>
                  </div>
                ))}
                {patientRecords.length === 0 && (
                  <div className="empty-state">No patient records yet.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="portal-panel">
              <div className="portal-panel__header">
                <h3>Earnings</h3>
                <p className="portal-panel__sub">Track monthly payouts and consultation revenue.</p>
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
              <h2>Consultation details</h2>
              <button className="modal__close" onClick={() => setSelectedConsult(null)}>×</button>
            </div>
            <div className="modal__content">
              <div className="detail-row">
                <span className="detail-label">Patient</span>
                <span className="detail-value">{selectedConsult.patientName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Issue</span>
                <span className="detail-value">{selectedConsult.issue}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Scheduled</span>
                <span className="detail-value">{selectedConsult.scheduledAt}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value">{selectedConsult.status}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Last message</span>
                <span className="detail-value">{selectedConsult.lastMessageAt}</span>
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
              <h2>Create prescription</h2>
              <button className="modal__close" onClick={() => setShowRxModal(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="form-group">
                <label>Patient name</label>
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

export default DoctorDashboardPage
