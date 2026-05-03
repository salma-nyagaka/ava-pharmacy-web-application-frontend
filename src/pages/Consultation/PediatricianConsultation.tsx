import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { formatPhoneHref } from '../../services/siteSettingsService'
import {
  ClinicianSummary,
  ConsultationRecord,
  createConsultation,
  fetchConsultation,
  fetchMyConsultations,
  fetchPediatricians,
  grantConsultationConsent,
  sendConsultationMessage,
  updateConsultation,
} from '../../services/consultationService'
import '../../styles/pages/ConsultationPage.css'

type ConsultationViewState = 'form' | 'waiting' | 'chatting' | 'completed'

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

function PediatricianConsultation() {
  const { user } = useAuth()
  const { settings } = useSiteSettings()
  const [pediatricians, setPediatricians] = useState<ClinicianSummary[]>([])
  const [currentConsultation, setCurrentConsultation] = useState<ConsultationRecord | null>(null)
  const [selectedPediatricianId, setSelectedPediatricianId] = useState<number | null>(null)
  const [consentChecked, setConsentChecked] = useState(false)
  const [formData, setFormData] = useState({
    parentName: user?.name ?? '',
    childName: '',
    childAge: '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    symptoms: '',
    vaccineHistory: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isEndingConsultation, setIsEndingConsultation] = useState(false)
  const [isGrantingConsent, setIsGrantingConsent] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      parentName: user?.name ?? prev.parentName,
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
        const [providers, consultations] = await Promise.all([fetchPediatricians(), fetchMyConsultations()])
        if (!isMounted) return

        const activeProviders = providers.filter((provider) => provider.status === 'active')
        setPediatricians(activeProviders)
        setSelectedPediatricianId(activeProviders[0]?.id ?? null)

        const activeConsultation = consultations.find(
          (consultation) => consultation.isPediatric && (consultation.status === 'waiting' || consultation.status === 'in_progress'),
        )

        if (activeConsultation) {
          const detail = await fetchConsultation(activeConsultation.id)
          if (!isMounted) return
          setCurrentConsultation(detail)
        }
      } catch {
        if (!isMounted) return
        setLoadError('Unable to load pediatric consultation services right now.')
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
        // Ignore transient polling errors.
      }
    }, 2500)

    return () => window.clearInterval(timer)
  }, [currentConsultation?.id, currentConsultation?.status])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentConsultation?.messages.length])

  const selectedPediatrician = useMemo(
    () => pediatricians.find((provider) => provider.id === selectedPediatricianId) ?? pediatricians[0] ?? null,
    [pediatricians, selectedPediatricianId],
  )

  const viewState = mapViewState(currentConsultation)
  const assignedPediatrician = useMemo(() => {
    if (currentConsultation?.pediatrician) {
      return pediatricians.find((provider) => provider.id === currentConsultation.pediatrician) ?? null
    }
    return selectedPediatrician
  }, [currentConsultation?.pediatrician, pediatricians, selectedPediatrician])

  const setField = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setFormErrors((prev) => ({ ...prev, [key]: '' }))
    setSubmitError('')
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.parentName.trim()) errors.parentName = 'Parent or guardian name is required'
    if (!formData.childName.trim()) errors.childName = 'Child name is required'
    if (!formData.childAge.trim()) errors.childAge = 'Age is required'
    else if (Number.isNaN(Number(formData.childAge)) || Number(formData.childAge) < 0 || Number(formData.childAge) > 18) {
      errors.childAge = 'Enter a valid age between 0 and 18'
    }
    if (!formData.email.trim()) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email address'
    if (!formData.phone.trim()) errors.phone = 'Phone number is required'
    else if (!/^\+?[0-9]{10,15}$/.test(formData.phone.replace(/\s/g, ''))) errors.phone = 'Invalid phone number'
    if (!formData.symptoms.trim()) errors.symptoms = 'Please describe the child\'s symptoms'
    if (!consentChecked) errors.consent = 'You must provide guardian consent to proceed'
    if (!selectedPediatrician) errors.parentName = 'No pediatrician is currently available'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validateForm() || !selectedPediatrician) return

    setIsSubmitting(true)
    setSubmitError('')
    try {
      const issue = formData.vaccineHistory.trim()
        ? `${formData.symptoms.trim()}\n\nVaccine history: ${formData.vaccineHistory.trim()}`
        : formData.symptoms.trim()

      const created = await createConsultation({
        pediatrician: selectedPediatrician.id,
        patient_name: formData.parentName.trim(),
        patient_email: formData.email.trim(),
        patient_phone: formData.phone.trim(),
        issue,
        priority: 'routine',
        is_pediatric: true,
        guardian_name: formData.parentName.trim(),
        child_name: formData.childName.trim(),
        child_age: Number(formData.childAge),
      })

      try {
        await grantConsultationConsent(created.id)
        const detail = await fetchConsultation(created.id)
        setCurrentConsultation(detail)
      } catch {
        setCurrentConsultation(created)
      }
    } catch {
      setSubmitError('Unable to start the pediatric consultation right now. Please try again.')
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

  const handleGrantConsent = async () => {
    if (!currentConsultation) return
    setIsGrantingConsent(true)
    try {
      await grantConsultationConsent(currentConsultation.id)
      const detail = await fetchConsultation(currentConsultation.id)
      setCurrentConsultation(detail)
    } catch {
      setSubmitError('Unable to grant guardian consent right now.')
    } finally {
      setIsGrantingConsent(false)
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
      const updated = await updateConsultation(currentConsultation.id, { status: 'completed' })
      setCurrentConsultation(updated)
      setShowEndConfirm(false)
    } catch {
      setSubmitError('Unable to end this consultation right now.')
    } finally {
      setIsEndingConsultation(false)
    }
  }

  if (isLoading) {
    return <div className="dc-page" />
  }

  if (viewState === 'waiting' && currentConsultation) {
    return (
      <div className="dc-page">
        <div className="dc-waiting dc-waiting--teal">
          <div className="dc-waiting__card">
            <div className="dc-waiting__avatar-wrap">
              <div className="dc-waiting__pulse-ring dc-waiting__pulse-ring--teal" />
              <div className="dc-waiting__avatar dc-waiting__avatar--teal">{getInitials(currentConsultation.doctorName || assignedPediatrician?.name || 'PD')}</div>
            </div>
            <span className="dc-waiting__status-badge dc-waiting__status-badge--teal">Request received</span>
            <p className="dc-waiting__doctor-name">{currentConsultation.doctorName || assignedPediatrician?.name || 'Assigned pediatrician'}</p>
            <p className="dc-waiting__doctor-spec">Consultation for {currentConsultation.childName || formData.childName || 'your child'}</p>

            <div className="dc-waiting__meta">
              <div className="dc-waiting__meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>Started {formatDateTime(currentConsultation.createdAt)}</span>
              </div>
              <div className="dc-waiting__meta-sep">·</div>
              <div className="dc-waiting__meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <span>{pediatricians.length} pediatricians available</span>
              </div>
            </div>

            <div className="dc-waiting__connecting dc-waiting__connecting--teal">
              <span /><span /><span />
            </div>
            <p className="dc-waiting__tip">We are waiting for the pediatrician to join. This page refreshes automatically.</p>
            {currentConsultation.consentStatus !== 'granted' && (
              <div className="dc-complete__actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn--primary ped-btn--primary" onClick={() => { void handleGrantConsent() }} disabled={isGrantingConsent}>
                  {isGrantingConsent ? 'Granting consent…' : 'Grant guardian consent'}
                </button>
              </div>
            )}
            {submitError && <p className="dc-field-error" style={{ marginTop: '1rem' }}>{submitError}</p>}
            <div className="dc-complete__actions" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn--primary ped-btn--primary" onClick={() => { void handleRefreshConsultation() }}>
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
        <div className="dc-chat dc-chat--teal">
          <div className="dc-chat__header">
            <div className="dc-chat__doc-info">
              <div className="dc-chat__doc-avatar dc-chat__doc-avatar--teal">{getInitials(currentConsultation.doctorName || assignedPediatrician?.name || 'PD')}</div>
              <div>
                <p className="dc-chat__doc-name">{currentConsultation.doctorName || assignedPediatrician?.name || 'Assigned pediatrician'}</p>
                <p className="dc-chat__doc-spec">
                  <span className="dc-chat__online-dot dc-chat__online-dot--teal" />
                  Pediatrics · Consulting for {currentConsultation.childName || 'your child'}
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
                <div className="dc-msg__avatar dc-msg__avatar--teal">{getInitials(currentConsultation.doctorName || assignedPediatrician?.name || 'PD')}</div>
                <div className="dc-msg__bubble dc-msg__bubble--ped">
                  <p>Your pediatric consultation has started. You can send your first message now.</p>
                  <span className="dc-msg__time">{formatDateTime(currentConsultation.updatedAt)}</span>
                </div>
              </div>
            )}
            {currentConsultation.messages.map((message) => {
              const isPatient = message.sender === user?.id
              return (
                <div key={message.id} className={`dc-msg dc-msg--${isPatient ? 'patient' : 'doctor'}`}>
                  {!isPatient && (
                    <div className="dc-msg__avatar dc-msg__avatar--teal">{getInitials(currentConsultation.doctorName || assignedPediatrician?.name || 'PD')}</div>
                  )}
                  <div className="dc-msg__bubble dc-msg__bubble--ped">
                    <p>{message.message}</p>
                    <span className="dc-msg__time">{formatDateTime(message.sentAt)}</span>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="dc-chat__input">
            <input
              type="text"
              placeholder="Type your message..."
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleSendMessage()
                }
              }}
            />
            <button className="btn btn--primary dc-send-btn dc-send-btn--teal" type="button" onClick={() => { void handleSendMessage() }} disabled={!messageInput.trim() || isSendingMessage}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          {submitError && <p className="dc-field-error" style={{ marginTop: '1rem' }}>{submitError}</p>}
        </div>

        {showEndConfirm && (
          <div className="modal-overlay" onClick={() => setShowEndConfirm(false)}>
            <div className="dc-confirm" onClick={(event) => event.stopPropagation()}>
              <h3>End consultation?</h3>
              <p>This will mark the pediatric consultation as completed.</p>
              <div className="dc-confirm__actions">
                <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowEndConfirm(false)}>Continue</button>
                <button className="btn btn--primary btn--sm ped-btn--primary" type="button" onClick={() => { void handleEndConsultation() }} disabled={isEndingConsultation}>
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
    const consultationFee = assignedPediatrician?.consultFee ?? 0

    return (
      <div className="dc-page">
        <div className="dc-complete">
          <div className="dc-complete__icon dc-complete__icon--teal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2>{isCancelled ? 'Consultation closed' : 'Consultation complete'}</h2>
          <p className="dc-complete__sub">
            {isCancelled
              ? `Consultation ${currentConsultation.reference} is no longer active.`
              : `Thank you for consulting with ${currentConsultation.doctorName || assignedPediatrician?.name || 'our pediatrician'} for ${currentConsultation.childName || 'your child'}.`}
          </p>
          <div className="dc-complete__summary">
            <div className="dc-complete__row"><span>Reference</span><strong>{currentConsultation.reference}</strong></div>
            <div className="dc-complete__row"><span>Pediatrician</span><strong>{currentConsultation.doctorName || assignedPediatrician?.name || 'Assigned pediatrician'}</strong></div>
            <div className="dc-complete__row"><span>Child</span><strong>{currentConsultation.childName || '—'}</strong></div>
            <div className="dc-complete__row"><span>Date</span><strong>{formatDate(currentConsultation.updatedAt || currentConsultation.createdAt)}</strong></div>
            {!isCancelled && <div className="dc-complete__row"><span>Estimated fee</span><strong>KSh {consultationFee.toLocaleString()}</strong></div>}
          </div>
          <div className="dc-complete__actions">
            <Link to="/account/consultations" className="btn btn--primary ped-btn--primary">View consultation history</Link>
            <Link to="/products" className="btn btn--outline">Browse Medicines</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dc-page">
      <a href="#ped-form" className="skip-to-content">Skip to form</a>

      <section className="page-hero page-hero--ped">
        <div className="container">
          <nav className="svc-hero__breadcrumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/health-services">Health Services</Link>
            <span>/</span>
            <span>Pediatric Consultation</span>
          </nav>
          <h1 className="svc-hero__title">Pediatric Consultation</h1>
          <p className="svc-hero__sub">Expert care for your child from certified pediatricians. Start a secure chat consultation.</p>
          <div className="page-hero__pills">
            <span className="page-hero__pill page-hero__pill--teal">Child Specialists</span>
            <span className="page-hero__pill page-hero__pill--teal">Ages 0-18</span>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="dc-body" id="ped-form">
          <div className="dc-form-card">
            <h2 className="dc-form-card__title">Start pediatric consultation</h2>
            <p className="dc-form-card__sub">Fill in your child&apos;s details and we will route you to an available pediatrician.</p>

            {loadError && <p className="dc-field-error" style={{ marginBottom: '1rem' }}>{loadError}</p>}
            {submitError && <p className="dc-field-error" style={{ marginBottom: '1rem' }}>{submitError}</p>}

            <form onSubmit={handleSubmit} noValidate>
              <p className="ped-section-label">Parent / Guardian</p>
              <div className="dc-form-row">
                <div className="dc-field">
                  <label htmlFor="ped-parent">Full name</label>
                  <input id="ped-parent" type="text" value={formData.parentName} onChange={(event) => setField('parentName', event.target.value)} aria-invalid={!!formErrors.parentName} placeholder="Jane Mwangi" />
                  {formErrors.parentName && <span className="dc-field-error">{formErrors.parentName}</span>}
                </div>
                <div className="dc-field">
                  <label htmlFor="ped-email">Email address</label>
                  <input id="ped-email" type="email" value={formData.email} onChange={(event) => setField('email', event.target.value)} aria-invalid={!!formErrors.email} placeholder="you@example.com" />
                  {formErrors.email && <span className="dc-field-error">{formErrors.email}</span>}
                </div>
              </div>

              <div className="dc-form-row" style={{ marginBottom: '1.75rem' }}>
                <div className="dc-field">
                  <label htmlFor="ped-phone">Phone number</label>
                  <input id="ped-phone" type="tel" value={formData.phone} onChange={(event) => setField('phone', event.target.value)} aria-invalid={!!formErrors.phone} placeholder="+254 700 000 000" />
                  {formErrors.phone && <span className="dc-field-error">{formErrors.phone}</span>}
                </div>
                <div className="dc-field" />
              </div>

              <p className="ped-section-label">Child Information</p>
              <div className="dc-form-row" style={{ marginBottom: '1.25rem' }}>
                <div className="dc-field">
                  <label htmlFor="ped-child-name">Child's name</label>
                  <input id="ped-child-name" type="text" value={formData.childName} onChange={(event) => setField('childName', event.target.value)} aria-invalid={!!formErrors.childName} placeholder="e.g. Emily" />
                  {formErrors.childName && <span className="dc-field-error">{formErrors.childName}</span>}
                </div>
                <div className="dc-field">
                  <label htmlFor="ped-child-age">Age in years (0-18)</label>
                  <input id="ped-child-age" type="number" min="0" max="18" value={formData.childAge} onChange={(event) => setField('childAge', event.target.value)} aria-invalid={!!formErrors.childAge} placeholder="e.g. 5" />
                  {formErrors.childAge && <span className="dc-field-error">{formErrors.childAge}</span>}
                </div>
              </div>

              <div className="dc-field" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="ped-symptoms">
                  Describe symptoms
                  <span className="dc-field-char">{formData.symptoms.length}/500</span>
                </label>
                <textarea
                  id="ped-symptoms"
                  rows={4}
                  maxLength={500}
                  placeholder="Describe your child's symptoms, how long they have had them, and any relevant history or allergies..."
                  value={formData.symptoms}
                  onChange={(event) => setField('symptoms', event.target.value)}
                  aria-invalid={!!formErrors.symptoms}
                />
                {formErrors.symptoms && <span className="dc-field-error">{formErrors.symptoms}</span>}
              </div>

              <div className="dc-field" style={{ marginBottom: '1.75rem' }}>
                <label htmlFor="ped-vaccine">
                  Vaccine history
                  <span className="dc-field-optional">optional</span>
                </label>
                <textarea id="ped-vaccine" rows={2} placeholder="Recent vaccinations or any pending ones..." value={formData.vaccineHistory} onChange={(event) => setField('vaccineHistory', event.target.value)} />
              </div>

              <div className="dc-field" style={{ marginBottom: '1.25rem' }}>
                <label className="ped-consent-label">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    style={{ marginRight: '0.5rem', accentColor: '#0f766e' }}
                  />
                  I, as parent/guardian, give consent for this telemedicine consultation on behalf of my child.
                </label>
                {formErrors.consent && <span className="dc-field-error">{formErrors.consent}</span>}
              </div>

              <button type="submit" className="btn btn--primary dc-submit-btn ped-submit-btn" disabled={isSubmitting || !consentChecked}>
                {isSubmitting ? 'Starting consultation…' : 'Start chat consultation →'}
              </button>
            </form>

            <div className="dc-steps">
              {[
                { n: '1', label: 'Fill details', desc: 'Enter guardian and child information' },
                { n: '2', label: 'Consent', desc: 'Guardian consent is captured for the consult' },
                { n: '3', label: 'Chat', desc: 'Secure real-time consultation' },
                { n: '4', label: 'Prescription', desc: 'Issued digitally when needed' },
              ].map((step) => (
                <div key={step.n} className="dc-step">
                  <div className="dc-step__dot ped-step__dot">{step.n}</div>
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
              <p className="dc-fee-card__amount ped-fee-amount">KSh {(selectedPediatrician?.consultFee ?? 0).toLocaleString()}</p>
              <p className="dc-fee-card__note">Charged by the assigned pediatrician · No upfront charge on this page</p>
              <div className="dc-fee-card__includes">
                <p className="dc-fee-card__includes-title">Includes:</p>
                <ul>
                  <li>Secure pediatric chat session</li>
                  <li>Digital prescription when clinically necessary</li>
                  <li>Child consultation history in your account</li>
                </ul>
              </div>
            </div>

            <div className="dc-sidebar__card">
              <p className="dc-sidebar__card-title">Available pediatricians</p>
              <div className="dc-doctors-list">
                {pediatricians.length === 0 && <p className="card__meta">No pediatricians are available right now.</p>}
                {pediatricians.map((provider) => {
                  const isSelected = selectedPediatricianId === provider.id
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      className="dc-doctor-item"
                      onClick={() => setSelectedPediatricianId(provider.id)}
                      style={isSelected ? { borderColor: '#0f766e', background: 'rgba(13, 148, 136, 0.08)' } : undefined}
                    >
                      <div className="dc-doctor-item__avatar ped-doctor-avatar">{getInitials(provider.name)}</div>
                      <div className="dc-doctor-item__info">
                        <p className="dc-doctor-item__name">{provider.name}</p>
                        <p className="dc-doctor-item__spec">{provider.specialty} · Online</p>
                      </div>
                      <div className="dc-doctor-item__rating"><span>★ {provider.rating.toFixed(1)}</span></div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="dc-sidebar__card dc-trust-card">
              <div className="dc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>Certified pediatric specialists</span>
              </div>
              <div className="dc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>Guardian consent captured in the flow</span>
              </div>
              <div className="dc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>Child consultation history saved to your account</span>
              </div>
            </div>

            <a href={`tel:${formatPhoneHref(settings.supportPhone)}`} className="dc-emergency-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Pediatric emergency? Call now
            </a>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default PediatricianConsultation
