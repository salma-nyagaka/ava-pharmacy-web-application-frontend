import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { formatPhoneHref } from '../../services/siteSettingsService'
import {
  ClinicianSummary,
  ConsultationRecord,
  createConsultation,
  endConsultation,
  fetchConsultation,
  fetchDoctors,
  fetchMyConsultations,
  sendConsultationMessage,
  updateConsultation,
} from '../../services/consultationService'
import { useConsultationSocket } from '../../hooks/useConsultationSocket'
import '../../styles/pages/ConsultationPage.css'

type ConsultationViewState = 'form' | 'waiting' | 'chatting' | 'completed'

const SPECIALTIES = [
  'General Medicine',
  'Cardiology',
  'Dermatology',
  'Diabetes & Endocrinology',
  'ENT',
  'Gastroenterology',
  'Mental Health',
  'Neurology',
  'Orthopedics',
  'Respiratory',
  'Urology',
  'Women\'s Health',
]

function getInitials(name: string) {
  return name
    .replace(/^Dr\.\s*/i, '')
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function mapViewState(consultation: ConsultationRecord | null): ConsultationViewState {
  if (!consultation) return 'form'
  if (consultation.status === 'completed' || consultation.status === 'cancelled') return 'completed'
  if (consultation.status === 'in_progress' || consultation.messages.length > 0) return 'chatting'
  return 'waiting'
}

function DoctorConsultation() {
  const { user } = useAuth()
  const { settings } = useSiteSettings()
  const [doctors, setDoctors] = useState<ClinicianSummary[]>([])
  const [currentConsultation, setCurrentConsultation] = useState<ConsultationRecord | null>(null)
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    specialty: '',
    urgency: 'Routine' as 'Routine' | 'Urgent',
    symptoms: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isEndingConsultation, setIsEndingConsultation] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      name: user?.name ?? prev.name,
      email: user?.email ?? prev.email,
      phone: user?.phone ?? prev.phone,
    }))
  }, [user?.email, user?.name, user?.phone])

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setIsLoading(true)
      setLoadError('')
      try {
        const [doctorList, consultations] = await Promise.all([fetchDoctors(), fetchMyConsultations()])
        if (!isMounted) return

        const activeDoctors = doctorList.filter((doctor) => doctor.status === 'active')
        setDoctors(activeDoctors)

        const activeConsultation = consultations.find(
          (consultation) => !consultation.isPediatric && (consultation.status === 'waiting' || consultation.status === 'in_progress'),
        )

        if (activeConsultation) {
          const detail = await fetchConsultation(activeConsultation.id)
          if (!isMounted) return
          setCurrentConsultation(detail)
        }
      } catch {
        if (!isMounted) return
        setLoadError('Unable to load doctor consultation services right now.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadData()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!currentConsultation || !['waiting', 'in_progress'].includes(currentConsultation.status)) return undefined

    const timer = window.setInterval(async () => {
      try {
        const detail = await fetchConsultation(currentConsultation.id)
        setCurrentConsultation(detail)
      } catch {
        // Ignore transient polling errors; manual refresh paths remain available.
      }
    }, 2500)

    return () => window.clearInterval(timer)
  }, [currentConsultation?.id, currentConsultation?.status])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentConsultation?.messages.length])

  const filteredDoctors = useMemo(() => {
    if (!formData.specialty) return doctors
    return doctors.filter((doctor) => doctor.specialty === formData.specialty)
  }, [doctors, formData.specialty])

  useEffect(() => {
    if (!filteredDoctors.length) {
      setSelectedDoctorId(null)
      return
    }

    if (selectedDoctorId && filteredDoctors.some((doctor) => doctor.id === selectedDoctorId)) return
    setSelectedDoctorId(filteredDoctors[0].id)
  }, [filteredDoctors, selectedDoctorId])

  const selectedDoctor = useMemo(
    () => filteredDoctors.find((doctor) => doctor.id === selectedDoctorId) ?? filteredDoctors[0] ?? null,
    [filteredDoctors, selectedDoctorId],
  )

  const token = typeof window !== 'undefined' ? (localStorage.getItem('ava_access_token') ?? null) : null
  const { messages: wsMessages, isConnected: wsConnected, typingUsers, sendMessage: wsSend, sendTyping } = useConsultationSocket(
    currentConsultation?.id ?? null,
    token,
  )

  // Merge WebSocket messages into consultation when they arrive
  useEffect(() => {
    if (!wsMessages.length) return
    setCurrentConsultation((prev) => {
      if (!prev) return prev
      const existingIds = new Set(prev.messages.map((m) => m.id))
      const newMsgs = wsMessages.filter((m) => !existingIds.has(m.id)).map((m) => ({
        id: m.id,
        sender: m.sender,
        senderName: m.senderName,
        message: m.message,
        sentAt: m.sentAt,
      }))
      if (!newMsgs.length) return prev
      return { ...prev, messages: [...prev.messages, ...newMsgs] }
    })
  }, [wsMessages])

  const viewState = mapViewState(currentConsultation)
  const assignedDoctor = useMemo(() => {
    if (currentConsultation?.doctor) {
      return doctors.find((doctor) => doctor.id === currentConsultation.doctor) ?? null
    }
    return selectedDoctor
  }, [currentConsultation?.doctor, doctors, selectedDoctor])

  const setField = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setFormErrors((prev) => ({ ...prev, [key]: '' }))
    setSubmitError('')
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = 'Full name is required'
    if (!formData.email.trim()) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email address'
    if (!formData.phone.trim()) errors.phone = 'Phone number is required'
    else if (!/^\+?[0-9]{10,15}$/.test(formData.phone.replace(/\s/g, ''))) errors.phone = 'Invalid phone number'
    if (!formData.symptoms.trim()) errors.symptoms = 'Please describe your symptoms'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setSubmitError('')
    try {
      const issue = formData.specialty.trim()
        ? `${formData.symptoms.trim()}\n\nPreferred specialty: ${formData.specialty.trim()}`
        : formData.symptoms.trim()

      const created = await createConsultation({
        doctor: selectedDoctor?.id,
        patient_name: formData.name.trim(),
        patient_email: formData.email.trim(),
        patient_phone: formData.phone.trim(),
        issue,
        priority: formData.urgency === 'Urgent' ? 'priority' : 'routine',
      })
      setCurrentConsultation(created)
    } catch {
      setSubmitError('Unable to start the consultation right now. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRefreshConsultation = async () => {
    if (!currentConsultation) return
    try {
      const detail = await fetchConsultation(currentConsultation.id)
      setCurrentConsultation(detail)
    } catch {
      setSubmitError('Unable to refresh consultation status right now.')
    }
  }

  const handleSendMessage = async () => {
    if (!currentConsultation || !messageInput.trim()) return
    setIsSendingMessage(true)
    try {
      await sendConsultationMessage(currentConsultation.id, messageInput.trim())
      setMessageInput('')
      const detail = await fetchConsultation(currentConsultation.id)
      setCurrentConsultation(detail)
    } catch {
      setSubmitError('Message could not be sent. Please try again.')
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleEndConsultation = async () => {
    if (!currentConsultation) return
    setIsEndingConsultation(true)
    try {
      // Use dedicated endConsultation if available, fall back to status update
      const updated = await endConsultation(currentConsultation.id).catch(() =>
        updateConsultation(currentConsultation.id, { status: 'completed' })
      )
      setCurrentConsultation(updated)
      setShowEndConfirm(false)
    } catch {
      setSubmitError('Unable to end this consultation right now.')
    } finally {
      setIsEndingConsultation(false)
    }
  }

  // Use WebSocket send when connected, otherwise fall back to HTTP
  const dispatchMessage = (text: string) => {
    if (wsConnected) {
      wsSend(text)
    }
  }

  const handleMessageInputChange = (value: string) => {
    setMessageInput(value)
    sendTyping()
  }

  if (isLoading) {
    return <div className="dc-page" />
  }

  if (viewState === 'waiting' && currentConsultation) {
    return (
      <div className="dc-page">
        <div className="dc-waiting">
          <div className="dc-waiting__card">
            <div className="dc-waiting__avatar-wrap">
              <div className="dc-waiting__pulse-ring" />
              <div className="dc-waiting__avatar">{getInitials(currentConsultation.doctorName || assignedDoctor?.name || 'DR')}</div>
            </div>
            <span className="dc-waiting__status-badge">Request received</span>
            <p className="dc-waiting__doctor-name">{currentConsultation.doctorName || assignedDoctor?.name || 'Assigned doctor'}</p>
            <p className="dc-waiting__doctor-spec">{currentConsultation.doctorSpecialty || assignedDoctor?.specialty || 'Doctor consultation'}</p>

            <div className="dc-waiting__meta">
              <div className="dc-waiting__meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>Started {formatDateTime(currentConsultation.createdAt)}</span>
              </div>
              <div className="dc-waiting__meta-sep">·</div>
              <div className="dc-waiting__meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>{doctors.length} doctors available</span>
              </div>
            </div>

            <div className="dc-waiting__connecting">
              <span /><span /><span />
            </div>
            <p className="dc-waiting__tip">We are waiting for the clinician to join this chat. This page refreshes automatically.</p>
            {submitError && <p className="dc-field-error" style={{ marginTop: '1rem' }}>{submitError}</p>}
            <div className="dc-complete__actions" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn--primary" onClick={() => { void handleRefreshConsultation() }}>
                Refresh status
              </button>
              <Link to="/account/consultations" className="btn btn--outline">View all consultations</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (viewState === 'chatting' && currentConsultation) {
    return (
      <div className="dc-page">
        <div className="dc-chat">
          <div className="dc-chat__header">
            <div className="dc-chat__doc-info">
              <div className="dc-chat__doc-avatar">{getInitials(currentConsultation.doctorName || assignedDoctor?.name || 'DR')}</div>
              <div>
                <p className="dc-chat__doc-name">{currentConsultation.doctorName || assignedDoctor?.name || 'Assigned doctor'}</p>
                <p className="dc-chat__doc-spec">
                  <span className="dc-chat__online-dot" />
                  {currentConsultation.doctorSpecialty || assignedDoctor?.specialty || 'Doctor consultation'}
                </p>
              </div>
            </div>
            <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowEndConfirm(true)}>
              End Consultation
            </button>
          </div>

          <div className="dc-chat__messages">
            {currentConsultation.messages.length === 0 && (
              <div className="dc-msg dc-msg--doctor">
                <div className="dc-msg__avatar">{getInitials(currentConsultation.doctorName || assignedDoctor?.name || 'DR')}</div>
                <div className="dc-msg__bubble">
                  <p>Your consultation has started. You can send your first message now.</p>
                  <span className="dc-msg__time">{formatDateTime(currentConsultation.updatedAt)}</span>
                </div>
              </div>
            )}
            {currentConsultation.messages.map((message) => {
              const isPatient = message.sender === user?.id
              return (
                <div key={message.id} className={`dc-msg dc-msg--${isPatient ? 'patient' : 'doctor'}`}>
                  {!isPatient && (
                    <div className="dc-msg__avatar">{getInitials(currentConsultation.doctorName || assignedDoctor?.name || 'DR')}</div>
                  )}
                  <div className="dc-msg__bubble">
                    <p>{message.message}</p>
                    <span className="dc-msg__time">{formatDateTime(message.sentAt)}</span>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {typingUsers.length > 0 && (
            <p className="dc-chat__typing">{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…</p>
          )}
          <div className="dc-chat__input">
            <input
              type="text"
              placeholder="Type your message…"
              value={messageInput}
              onChange={(event) => handleMessageInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  dispatchMessage(messageInput.trim())
                  void handleSendMessage()
                }
              }}
            />
            <button className="btn btn--primary" type="button" onClick={() => { dispatchMessage(messageInput.trim()); void handleSendMessage() }} disabled={!messageInput.trim() || isSendingMessage}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          {submitError && <p className="dc-field-error" style={{ marginTop: '1rem' }}>{submitError}</p>}
        </div>

        {showEndConfirm && (
          <div className="modal-overlay" onClick={() => setShowEndConfirm(false)}>
            <div className="dc-confirm" onClick={(event) => event.stopPropagation()}>
              <h3>End consultation?</h3>
              <p>This will mark the consultation as completed.</p>
              <div className="dc-confirm__actions">
                <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowEndConfirm(false)}>Continue</button>
                <button className="btn btn--primary btn--sm" type="button" onClick={() => { void handleEndConsultation() }} disabled={isEndingConsultation}>
                  {isEndingConsultation ? 'Ending…' : 'End & finish'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (viewState === 'completed' && currentConsultation) {
    const isCancelled = currentConsultation.status === 'cancelled'
    const consultationFee = assignedDoctor?.consultFee ?? 0

    return (
      <div className="dc-page">
        <div className="dc-complete">
          <div className="dc-complete__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2>{isCancelled ? 'Consultation closed' : 'Consultation complete'}</h2>
          <p className="dc-complete__sub">
            {isCancelled
              ? `Consultation ${currentConsultation.reference} is no longer active.`
              : `Thank you for consulting with ${currentConsultation.doctorName || assignedDoctor?.name || 'our doctor'}.`}
          </p>
          <div className="dc-complete__summary">
            <div className="dc-complete__row"><span>Reference</span><strong>{currentConsultation.reference}</strong></div>
            <div className="dc-complete__row"><span>Doctor</span><strong>{currentConsultation.doctorName || assignedDoctor?.name || 'Assigned doctor'}</strong></div>
            <div className="dc-complete__row"><span>Date</span><strong>{formatDate(currentConsultation.updatedAt || currentConsultation.createdAt)}</strong></div>
            {!isCancelled && <div className="dc-complete__row"><span>Estimated fee</span><strong>KSh {consultationFee.toLocaleString()}</strong></div>}
          </div>
          <div className="dc-complete__next">
            <p className="dc-complete__next-label">What&apos;s next?</p>
            <div className="dc-complete__step"><span className="dc-complete__step-dot">1</span><span>Check your consultation history for updates</span></div>
            <div className="dc-complete__step"><span className="dc-complete__step-dot">2</span><span>Upload any issued prescription for fulfilment</span></div>
            <div className="dc-complete__step"><span className="dc-complete__step-dot">3</span><span>Browse medicines or book another consultation if needed</span></div>
          </div>
          <div className="dc-complete__actions">
            <Link to="/account/consultations" className="btn btn--primary">View consultation history</Link>
            <Link to="/prescriptions" className="btn btn--outline">Upload prescription</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dc-page">
      <a href="#dc-form" className="skip-to-content">Skip to form</a>

      <section className="page-hero page-hero--doctor">
        <div className="container">
          <nav className="svc-hero__breadcrumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/health-services">Health Services</Link>
            <span>/</span>
            <span>Doctor Consultation</span>
          </nav>
          <h1 className="svc-hero__title">Doctor Consultation</h1>
          <p className="svc-hero__sub">Connect with a licensed doctor via secure chat. Get advice, diagnosis, and a digital prescription - all in minutes.</p>
          <div className="page-hero__pills">
            <span className="page-hero__pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Licensed &amp; verified</span>
            <span className="page-hero__pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>{doctors.length} doctors available</span>
            <span className="page-hero__pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Encrypted &amp; private</span>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="dc-body" id="dc-form">
          <div className="dc-form-card">
            <h2 className="dc-form-card__title">Start your consultation</h2>
            <p className="dc-form-card__sub">Fill in your details and we will route you to an available doctor.</p>

            {loadError && <p className="dc-field-error" style={{ marginBottom: '1rem' }}>{loadError}</p>}
            {submitError && <p className="dc-field-error" style={{ marginBottom: '1rem' }}>{submitError}</p>}

            <form onSubmit={handleSubmit} noValidate>
              <div className="dc-form-row">
                <div className="dc-field">
                  <label htmlFor="dc-name">Full name</label>
                  <input id="dc-name" type="text" value={formData.name} onChange={(event) => setField('name', event.target.value)} aria-invalid={!!formErrors.name} placeholder="Jane Mwangi" />
                  {formErrors.name && <span className="dc-field-error">{formErrors.name}</span>}
                </div>
                <div className="dc-field">
                  <label htmlFor="dc-email">Email address</label>
                  <input id="dc-email" type="email" value={formData.email} onChange={(event) => setField('email', event.target.value)} aria-invalid={!!formErrors.email} placeholder="you@example.com" />
                  {formErrors.email && <span className="dc-field-error">{formErrors.email}</span>}
                </div>
              </div>

              <div className="dc-form-row">
                <div className="dc-field">
                  <label htmlFor="dc-phone">Phone number</label>
                  <input id="dc-phone" type="tel" value={formData.phone} onChange={(event) => setField('phone', event.target.value)} aria-invalid={!!formErrors.phone} placeholder="+254 700 000 000" />
                  {formErrors.phone && <span className="dc-field-error">{formErrors.phone}</span>}
                </div>
                <div className="dc-field">
                  <label htmlFor="dc-specialty">Specialty <span className="dc-field-optional">optional</span></label>
                  <select id="dc-specialty" value={formData.specialty} onChange={(event) => setField('specialty', event.target.value)}>
                    <option value="">Any available doctor</option>
                    {SPECIALTIES.map((specialty) => <option key={specialty} value={specialty}>{specialty}</option>)}
                  </select>
                  {formErrors.specialty && <span className="dc-field-error">{formErrors.specialty}</span>}
                </div>
              </div>

              <div className="dc-field" style={{ marginBottom: '1.25rem' }}>
                <label>Urgency</label>
                <div className="dc-urgency">
                  {(['Routine', 'Urgent'] as const).map((urgency) => (
                    <button
                      key={urgency}
                      type="button"
                      className={`dc-urgency__btn ${formData.urgency === urgency ? `dc-urgency__btn--${urgency.toLowerCase()}--active` : ''} dc-urgency__btn--${urgency.toLowerCase()}`}
                      onClick={() => setField('urgency', urgency)}
                    >
                      {urgency === 'Urgent' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                      {urgency}
                    </button>
                  ))}
                </div>
              </div>

              <div className="dc-field" style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="dc-symptoms">
                  Describe your symptoms
                  <span className="dc-field-char">{formData.symptoms.length}/500</span>
                </label>
                <textarea
                  id="dc-symptoms"
                  rows={5}
                  maxLength={500}
                  placeholder="Describe your symptoms, how long you have had them, and any relevant medical history or allergies…"
                  value={formData.symptoms}
                  onChange={(event) => setField('symptoms', event.target.value)}
                  aria-invalid={!!formErrors.symptoms}
                />
                {formErrors.symptoms && <span className="dc-field-error">{formErrors.symptoms}</span>}
              </div>

              <button type="submit" className="btn btn--primary dc-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Starting consultation…' : 'Start chat consultation →'}
              </button>
            </form>

            <div className="dc-steps">
              {[
                { n: '1', label: 'Fill details', desc: 'Provide your symptoms and contact details' },
                { n: '2', label: 'Assigned', desc: 'We assign the right doctor for the request' },
                { n: '3', label: 'Chat', desc: 'Secure real-time consultation' },
                { n: '4', label: 'Prescription', desc: 'Issued digitally when needed' },
              ].map((step) => (
                <div key={step.n} className="dc-step">
                  <div className="dc-step__dot">{step.n}</div>
                  <div>
                    <p className="dc-step__label">{step.label}</p>
                    <p className="dc-step__desc">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="dc-sidebar">
            <div className="dc-sidebar__card dc-fee-card">
              <p className="dc-fee-card__label">Consultation fee</p>
              <p className="dc-fee-card__amount">KSh {(selectedDoctor?.consultFee ?? 0).toLocaleString()}</p>
              <p className="dc-fee-card__note">Charged by the assigned clinician · No upfront charge on this page</p>
              <div className="dc-fee-card__includes">
                <p className="dc-fee-card__includes-title">Includes:</p>
                <ul>
                  <li>Secure doctor chat session</li>
                  <li>Digital prescription when clinically necessary</li>
                  <li>Consultation history in your account</li>
                </ul>
              </div>
            </div>

            <div className="dc-sidebar__card">
              <p className="dc-sidebar__card-title">Available doctors</p>
              <div className="dc-doctors-list">
                {filteredDoctors.length === 0 && <p className="card__meta">No doctors match the selected specialty right now.</p>}
                {filteredDoctors.map((doctor) => {
                  const isSelected = selectedDoctorId === doctor.id
                  return (
                    <button
                      key={doctor.id}
                      type="button"
                      className="dc-doctor-item"
                      onClick={() => setSelectedDoctorId(doctor.id)}
                      style={isSelected ? { borderColor: '#e81750', background: 'rgba(232, 23, 80, 0.06)' } : undefined}
                    >
                      <div className="dc-doctor-item__avatar">{getInitials(doctor.name)}</div>
                      <div className="dc-doctor-item__info">
                        <p className="dc-doctor-item__name">{doctor.name}</p>
                        <p className="dc-doctor-item__spec">{doctor.specialty}</p>
                      </div>
                      <div className="dc-doctor-item__rating">
                        <span>★ {doctor.rating.toFixed(1)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="dc-sidebar__card dc-trust-card">
              <div className="dc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>End-to-end encrypted chat</span>
              </div>
              <div className="dc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>Licensed clinicians only</span>
              </div>
              <div className="dc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="18" height="18"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>Your consultation is saved to your account</span>
              </div>
            </div>

            <a href={`tel:${formatPhoneHref(settings.supportPhone)}`} className="dc-emergency-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Emergency? Call now
            </a>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default DoctorConsultation
