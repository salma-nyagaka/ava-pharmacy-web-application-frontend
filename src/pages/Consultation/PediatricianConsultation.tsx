import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './ConsultationPage.css'

type ConsultationStatus = 'form' | 'waiting' | 'chatting' | 'completed'

const PEDIATRICIAN = { name: 'Dr. Emily Wanjiku', specialty: 'Pediatrics' }

const AVAILABLE_PEDIATRICIANS = [
  { name: 'Dr. Emily Wanjiku',  specialty: 'Pediatrics', rating: 4.9, initials: 'EW' },
  { name: 'Dr. Amara Kamau',   specialty: 'Pediatrics', rating: 4.8, initials: 'AK' },
  { name: 'Dr. Kevin Otieno',  specialty: 'Pediatrics', rating: 4.7, initials: 'KO' },
]

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function PediatricianConsultation() {
  const [status, setStatus] = useState<ConsultationStatus>('form')
  const [formData, setFormData] = useState({
    parentName: '',
    childName: '',
    childAge: '',
    email: '',
    phone: '',
    symptoms: '',
    vaccineHistory: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [queuePosition, setQueuePosition] = useState(2)
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'doctor' | 'patient'; text: string; time: string }>>([])
  const [messageInput, setMessageInput] = useState('')
  const [isDoctorTyping, setIsDoctorTyping] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isDoctorTyping])

  const setField = (key: string, value: string) => {
    setFormData((p) => ({ ...p, [key]: value }))
    setFormErrors((p) => ({ ...p, [key]: '' }))
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.parentName.trim()) errors.parentName = 'Parent name is required'
    if (!formData.childName.trim()) errors.childName = "Child's name is required"
    if (!formData.childAge.trim()) {
      errors.childAge = 'Age is required'
    } else if (isNaN(Number(formData.childAge)) || Number(formData.childAge) < 0 || Number(formData.childAge) > 18) {
      errors.childAge = 'Enter a valid age (0-18)'
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email address'
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required'
    } else if (!/^\+?[0-9]{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      errors.phone = 'Invalid phone number'
    }
    if (!formData.symptoms.trim()) errors.symptoms = "Please describe your child's symptoms"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    await new Promise((r) => setTimeout(r, 900))
    setIsSubmitting(false)
    setStatus('waiting')
    setTimeout(() => setQueuePosition(1), 4000)
    setTimeout(() => {
      setStatus('chatting')
      setChatMessages([{
        sender: 'doctor',
        text: `Hello ${formData.parentName.split(' ')[0]}! I'm ${PEDIATRICIAN.name}. I've reviewed ${formData.childName}'s information. How long have they been experiencing these symptoms?`,
        time: nowTime(),
      }])
    }, 8000)
  }

  const handleSendMessage = () => {
    if (!messageInput.trim()) return
    setChatMessages((p) => [...p, { sender: 'patient', text: messageInput, time: nowTime() }])
    setMessageInput('')
    setIsDoctorTyping(true)
    setTimeout(() => {
      setIsDoctorTyping(false)
      setChatMessages((p) => [...p, {
        sender: 'doctor',
        text: `Thank you. Based on what you've described about ${formData.childName}, I'll prepare appropriate treatment guidance and a digital prescription shortly.`,
        time: nowTime(),
      }])
    }, 2500)
  }

  // Waiting room
  if (status === 'waiting') {
    const percent = queuePosition === 2 ? 50 : 88
    const statusMsg = queuePosition === 1 ? "You're next!" : 'Finding your pediatrician...'
    return (
      <div className="dc-page">
        <div className="dc-waiting dc-waiting--teal">
          <div className="dc-waiting__card">
            <div className="dc-waiting__avatar-wrap">
              <div className="dc-waiting__pulse-ring dc-waiting__pulse-ring--teal" />
              <div className="dc-waiting__avatar dc-waiting__avatar--teal">PD</div>
            </div>
            <span className="dc-waiting__status-badge dc-waiting__status-badge--teal">{statusMsg}</span>
            <p className="dc-waiting__doctor-name">Pediatric Consultation</p>
            <p className="dc-waiting__doctor-spec">for {formData.childName}, age {formData.childAge}</p>
            <div className="dc-waiting__queue">
              <div className="dc-waiting__queue-steps">
                {[1, 2].map((n) => (
                  <div key={n} className={`dc-waiting__queue-step dc-waiting__queue-step--teal ${n > queuePosition ? 'dc-waiting__queue-step--done-teal' : n === queuePosition ? 'dc-waiting__queue-step--active-teal' : ''}`}>
                    {n > queuePosition ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : <span>{n}</span>}
                  </div>
                ))}
                <div className="dc-waiting__queue-track">
                  <div className="dc-waiting__queue-fill dc-waiting__queue-fill--teal" style={{ width: `${percent}%` }} />
                </div>
              </div>
              <p className="dc-waiting__position">Position <strong className="ped-strong">{queuePosition}</strong> of 2</p>
            </div>
            <div className="dc-waiting__meta">
              <div className="dc-waiting__meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>Avg. wait: 3-6 min</span>
              </div>
              <div className="dc-waiting__meta-sep">·</div>
              <div className="dc-waiting__meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <span>2 pediatricians online</span>
              </div>
            </div>
            <div className="dc-waiting__connecting dc-waiting__connecting--teal">
              <span /><span /><span />
            </div>
            <p className="dc-waiting__tip">Please stay on this page. You'll be connected automatically.</p>
          </div>
        </div>
      </div>
    )
  }

  // Chat room
  if (status === 'chatting') {
    return (
      <div className="dc-page">
        <div className="dc-chat dc-chat--teal">
          <div className="dc-chat__header">
            <div className="dc-chat__doc-info">
              <div className="dc-chat__doc-avatar dc-chat__doc-avatar--teal">EW</div>
              <div>
                <p className="dc-chat__doc-name">{PEDIATRICIAN.name}</p>
                <p className="dc-chat__doc-spec">
                  <span className="dc-chat__online-dot dc-chat__online-dot--teal" />
                  {PEDIATRICIAN.specialty} · Consulting for {formData.childName}
                </p>
              </div>
            </div>
            <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowEndConfirm(true)}>
              End Consultation
            </button>
          </div>
          <div className="dc-chat__messages">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`dc-msg dc-msg--${msg.sender}`}>
                {msg.sender === 'doctor' && (
                  <div className="dc-msg__avatar dc-msg__avatar--teal">EW</div>
                )}
                <div className="dc-msg__bubble dc-msg__bubble--ped">
                  <p>{msg.text}</p>
                  <span className="dc-msg__time">{msg.time}</span>
                </div>
              </div>
            ))}
            {isDoctorTyping && (
              <div className="dc-msg dc-msg--doctor">
                <div className="dc-msg__avatar dc-msg__avatar--teal">EW</div>
                <div className="dc-msg__bubble dc-msg__bubble--typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="dc-chat__input">
            <input
              type="text"
              placeholder="Type your message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button className="btn btn--primary dc-send-btn dc-send-btn--teal" type="button" onClick={handleSendMessage} disabled={!messageInput.trim()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
        {showEndConfirm && (
          <div className="modal-overlay" onClick={() => setShowEndConfirm(false)}>
            <div className="dc-confirm" onClick={(e) => e.stopPropagation()}>
              <h3>End consultation?</h3>
              <p>A prescription for {formData.childName} will be sent to your email if issued.</p>
              <div className="dc-confirm__actions">
                <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowEndConfirm(false)}>Continue</button>
                <button className="btn btn--primary btn--sm ped-btn--primary" type="button" onClick={() => { setShowEndConfirm(false); setStatus('completed') }}>End &amp; finish</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Completed
  if (status === 'completed') {
    return (
      <div className="dc-page">
        <div className="dc-complete">
          <div className="dc-complete__icon dc-complete__icon--teal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2>Consultation complete</h2>
          <p className="dc-complete__sub">
            Thank you for consulting with {PEDIATRICIAN.name} for {formData.childName}.
          </p>
          <div className="dc-complete__summary">
            <div className="dc-complete__row"><span>Pediatrician</span><strong>{PEDIATRICIAN.name}</strong></div>
            <div className="dc-complete__row"><span>Child</span><strong>{formData.childName}</strong></div>
            <div className="dc-complete__row"><span>Parent</span><strong>{formData.parentName}</strong></div>
            <div className="dc-complete__row"><span>Prescription</span><strong>Sent to {formData.email}</strong></div>
          </div>
          <div className="dc-complete__actions">
            <Link to="/products" className="btn btn--primary ped-btn--primary">Browse Medicines</Link>
            <Link to="/" className="btn btn--outline">Back to Home</Link>
          </div>
        </div>
      </div>
    )
  }

  // Form view
  return (
    <div className="dc-page">
      <a href="#ped-form" className="skip-to-content">Skip to form</a>

      {/* Hero */}
      <section className="page-hero page-hero--ped">
        <div className="container">
          <nav className="page-hero__breadcrumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/health-services">Health Services</Link>
            <span>/</span>
            <span>Pediatric Consultation</span>
          </nav>
          <h1 className="page-hero__title">Pediatric Consultation</h1>
          <p className="page-hero__sub">Expert care for your child from certified pediatricians. Start an instant chat consultation.</p>
          <div className="page-hero__pills">
            <span className="page-hero__pill page-hero__pill--teal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Child Specialists
            </span>
            <span className="page-hero__pill page-hero__pill--teal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              Ages 0-18
            </span>
            <span className="page-hero__pill page-hero__pill--teal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Instant Chat
            </span>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="container">
        <div className="dc-body" id="ped-form">

          {/* Form card */}
          <div className="dc-form-card">
            <h2 className="dc-form-card__title">Start pediatric consultation</h2>
            <p className="dc-form-card__sub">Fill in your child's details and we'll connect you with a certified pediatrician.</p>

            <form onSubmit={handleSubmit} noValidate>

              <p className="ped-section-label">Parent / Guardian</p>
              <div className="dc-form-row">
                <div className="dc-field">
                  <label htmlFor="ped-parent">Full name</label>
                  <input
                    id="ped-parent"
                    type="text"
                    value={formData.parentName}
                    onChange={(e) => setField('parentName', e.target.value)}
                    aria-invalid={!!formErrors.parentName}
                    placeholder="Jane Mwangi"
                  />
                  {formErrors.parentName && <span className="dc-field-error">{formErrors.parentName}</span>}
                </div>
                <div className="dc-field">
                  <label htmlFor="ped-email">Email address</label>
                  <input
                    id="ped-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setField('email', e.target.value)}
                    aria-invalid={!!formErrors.email}
                    placeholder="you@example.com"
                  />
                  {formErrors.email && <span className="dc-field-error">{formErrors.email}</span>}
                </div>
              </div>

              <div className="dc-form-row" style={{ marginBottom: '1.75rem' }}>
                <div className="dc-field">
                  <label htmlFor="ped-phone">Phone number</label>
                  <input
                    id="ped-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    aria-invalid={!!formErrors.phone}
                    placeholder="+254 700 000 000"
                  />
                  {formErrors.phone && <span className="dc-field-error">{formErrors.phone}</span>}
                </div>
                <div className="dc-field" />
              </div>

              <p className="ped-section-label">Child Information</p>
              <div className="dc-form-row" style={{ marginBottom: '1.25rem' }}>
                <div className="dc-field">
                  <label htmlFor="ped-child-name">Child's name</label>
                  <input
                    id="ped-child-name"
                    type="text"
                    value={formData.childName}
                    onChange={(e) => setField('childName', e.target.value)}
                    aria-invalid={!!formErrors.childName}
                    placeholder="e.g. Emily"
                  />
                  {formErrors.childName && <span className="dc-field-error">{formErrors.childName}</span>}
                </div>
                <div className="dc-field">
                  <label htmlFor="ped-child-age">Age in years (0-18)</label>
                  <input
                    id="ped-child-age"
                    type="number"
                    min="0"
                    max="18"
                    value={formData.childAge}
                    onChange={(e) => setField('childAge', e.target.value)}
                    aria-invalid={!!formErrors.childAge}
                    placeholder="e.g. 5"
                  />
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
                  placeholder="Describe your child's symptoms, how long they've had them, and any relevant history or allergies..."
                  value={formData.symptoms}
                  onChange={(e) => setField('symptoms', e.target.value)}
                  aria-invalid={!!formErrors.symptoms}
                />
                {formErrors.symptoms && <span className="dc-field-error">{formErrors.symptoms}</span>}
              </div>

              <div className="dc-field" style={{ marginBottom: '1.75rem' }}>
                <label htmlFor="ped-vaccine">
                  Vaccine history
                  <span className="dc-field-optional">optional</span>
                </label>
                <textarea
                  id="ped-vaccine"
                  rows={2}
                  placeholder="Recent vaccinations or any pending ones..."
                  value={formData.vaccineHistory}
                  onChange={(e) => setField('vaccineHistory', e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn--primary dc-submit-btn ped-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Joining queue...' : 'Start chat consultation →'}
              </button>
            </form>

            <div className="dc-steps">
              {[
                { n: '1', label: 'Fill details',   desc: 'Enter parent and child info' },
                { n: '2', label: 'Join queue',     desc: 'Avg. wait 3-6 minutes' },
                { n: '3', label: 'Chat',           desc: 'Secure chat with pediatrician' },
                { n: '4', label: 'Prescription',   desc: 'Sent to your email' },
              ].map((s) => (
                <div key={s.n} className="dc-step">
                  <div className="dc-step__dot ped-step__dot">{s.n}</div>
                  <div>
                    <p className="dc-step__label">{s.label}</p>
                    <p className="dc-step__desc">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="dc-sidebar">
            <div className="dc-sidebar__card dc-fee-card">
              <p className="dc-fee-card__label">Consultation fee</p>
              <p className="dc-fee-card__amount ped-fee-amount">KSh 1,800</p>
              <p className="dc-fee-card__note">Pay after consultation · No upfront charge</p>
              <div className="dc-fee-card__includes">
                <p className="dc-fee-card__includes-title">Includes:</p>
                <ul>
                  <li>One pediatric session</li>
                  <li>Digital prescription (if needed)</li>
                  <li>Vaccination guidance</li>
                </ul>
              </div>
            </div>

            <div className="dc-sidebar__card">
              <p className="dc-sidebar__card-title">Available pediatricians</p>
              <div className="dc-doctors-list">
                {AVAILABLE_PEDIATRICIANS.map((doc) => (
                  <div key={doc.name} className="dc-doctor-item">
                    <div className="dc-doctor-item__avatar ped-doctor-avatar">{doc.initials}</div>
                    <div className="dc-doctor-item__info">
                      <p className="dc-doctor-item__name">{doc.name}</p>
                      <p className="dc-doctor-item__spec">{doc.specialty} · Online</p>
                    </div>
                    <div className="dc-doctor-item__rating"><span>★ {doc.rating}</span></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dc-sidebar__card dc-trust-card">
              <div className="dc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>Certified pediatric specialists</span>
              </div>
              <div className="dc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>End-to-end encrypted chat</span>
              </div>
              <div className="dc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>Ages 0-18 covered</span>
              </div>
            </div>

            <a href="tel:+254700000000" className="dc-emergency-btn">
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
