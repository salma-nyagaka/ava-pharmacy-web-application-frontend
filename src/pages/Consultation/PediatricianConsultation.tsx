import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './ConsultationPage.css'

type ConsultationStatus = 'form' | 'waiting' | 'chatting' | 'completed'

const PEDIATRICIAN = { name: 'Dr. Emily Wanjiku', specialty: 'Pediatrics' }

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
    if (!formData.childName.trim()) errors.childName = 'Child name is required'
    if (!formData.childAge.trim()) {
      errors.childAge = 'Child age is required'
    } else if (isNaN(Number(formData.childAge)) || Number(formData.childAge) < 0 || Number(formData.childAge) > 18) {
      errors.childAge = 'Please enter a valid age (0–18)'
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
    if (!formData.symptoms.trim()) errors.symptoms = 'Please describe symptoms'
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
        text: `Thank you for that information. Based on what you've described about ${formData.childName}, I'll prepare appropriate treatment guidance and a digital prescription shortly.`,
        time: nowTime(),
      }])
    }, 2500)
  }

  // ── Waiting room ───────────────────────────────────────────────────────────
  if (status === 'waiting') {
    const percent = queuePosition === 2 ? 50 : 88
    const statusMsg = queuePosition === 1 ? "You're next!" : 'Finding your pediatrician…'
    return (
      <div className="dc-page">
        <div className="dc-waiting dc-waiting--pediatric">
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
                  <div key={n} className={`dc-waiting__queue-step dc-waiting__queue-step--teal ${n > queuePosition ? 'dc-waiting__queue-step--done' : n === queuePosition ? 'dc-waiting__queue-step--active' : ''}`}>
                    {n > queuePosition ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : <span>{n}</span>}
                  </div>
                ))}
                <div className="dc-waiting__queue-track">
                  <div className="dc-waiting__queue-fill dc-waiting__queue-fill--teal" style={{ width: `${percent}%` }} />
                </div>
              </div>
              <p className="dc-waiting__position">
                Position <strong>{queuePosition}</strong> of 2
              </p>
            </div>

            <div className="dc-waiting__meta">
              <div className="dc-waiting__meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>Avg. wait: 3–6 min</span>
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

  // ── Chat room ──────────────────────────────────────────────────────────────
  if (status === 'chatting') {
    return (
      <div className="dc-page">
        <div className="dc-chat dc-chat--pediatric">
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
                <div className="dc-msg__bubble">
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
              placeholder="Type your message…"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button className="btn btn--primary dc-send-btn--teal" type="button" onClick={handleSendMessage} disabled={!messageInput.trim()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>

        {showEndConfirm && (
          <div className="modal-overlay" onClick={() => setShowEndConfirm(false)}>
            <div className="dc-confirm" onClick={(e) => e.stopPropagation()}>
              <h3>End consultation?</h3>
              <p>Are you sure? A prescription for {formData.childName} will be sent to your email.</p>
              <div className="dc-confirm__actions">
                <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowEndConfirm(false)}>Continue</button>
                <button className="btn btn--primary btn--sm" type="button" onClick={() => { setShowEndConfirm(false); setStatus('completed') }}>End &amp; finish</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Completed ──────────────────────────────────────────────────────────────
  if (status === 'completed') {
    return (
      <div className="dc-page">
        <div className="dc-complete dc-complete--teal">
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
            <Link to="/products" className="btn btn--primary">Browse Medicines</Link>
            <Link to="/" className="btn btn--outline">Back to Home</Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="consultation-page pediatric-page">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>

      <div className="container" style={{ paddingTop: '1.25rem' }}>
        <Link to="/health-services" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', textDecoration: 'none', padding: '0.45rem 0.875rem', border: '1px solid rgba(15,23,42,0.12)', borderRadius: '8px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M15 18l-6-6 6-6"/></svg>
          Health Services
        </Link>
      </div>

      <section className="consultation-hero consultation-hero--pediatric" id="main-content">
        <div className="container">
          <div className="consultation-hero__content">
            <h1 className="consultation-hero__title">Pediatric Consultation</h1>
            <p className="consultation-hero__subtitle">
              Expert care for your child from certified pediatricians online. Start an instant chat consultation.
            </p>
            <div className="consultation-hero__features">
              <div className="feature-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>Child Specialists</span>
              </div>
              <div className="feature-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <span>Age 0–18 Years</span>
              </div>
              <div className="feature-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span>Instant Chat</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="consultation-section">
        <div className="container">
          <h2 className="section-title">Start Pediatric Consultation</h2>
          <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#6b7280' }}>
            Fill in your child's details and you'll be connected with the next available pediatrician.
          </p>
          <form className="consultation-form" onSubmit={handleSubmit} noValidate>

            <div className="form-section">
              <h3 className="form-section-title">Parent / Guardian Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="parent-name">Parent / Guardian Name *</label>
                  <input
                    type="text"
                    id="parent-name"
                    value={formData.parentName}
                    onChange={(e) => setField('parentName', e.target.value)}
                    aria-required="true"
                    aria-invalid={!!formErrors.parentName}
                  />
                  {formErrors.parentName && <span className="form-error" role="alert">{formErrors.parentName}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="ped-email">Email Address *</label>
                  <input
                    type="email"
                    id="ped-email"
                    value={formData.email}
                    onChange={(e) => setField('email', e.target.value)}
                    aria-required="true"
                    aria-invalid={!!formErrors.email}
                  />
                  {formErrors.email && <span className="form-error" role="alert">{formErrors.email}</span>}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="ped-phone">Phone Number *</label>
                <input
                  type="tel"
                  id="ped-phone"
                  placeholder="+254 700 000 000"
                  value={formData.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  aria-required="true"
                  aria-invalid={!!formErrors.phone}
                />
                {formErrors.phone && <span className="form-error" role="alert">{formErrors.phone}</span>}
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">Child Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="child-name">Child's Name *</label>
                  <input
                    type="text"
                    id="child-name"
                    value={formData.childName}
                    onChange={(e) => setField('childName', e.target.value)}
                    aria-required="true"
                    aria-invalid={!!formErrors.childName}
                  />
                  {formErrors.childName && <span className="form-error" role="alert">{formErrors.childName}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="child-age">Child's Age (Years) *</label>
                  <input
                    type="number"
                    id="child-age"
                    min="0"
                    max="18"
                    value={formData.childAge}
                    onChange={(e) => setField('childAge', e.target.value)}
                    aria-required="true"
                    aria-invalid={!!formErrors.childAge}
                  />
                  {formErrors.childAge && <span className="form-error" role="alert">{formErrors.childAge}</span>}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="ped-symptoms">Describe Symptoms *</label>
              <textarea
                id="ped-symptoms"
                rows={4}
                placeholder="Please describe your child's symptoms, when they started, and any other relevant information…"
                value={formData.symptoms}
                onChange={(e) => setField('symptoms', e.target.value)}
                aria-required="true"
                aria-invalid={!!formErrors.symptoms}
              />
              {formErrors.symptoms && <span className="form-error" role="alert">{formErrors.symptoms}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="vaccine-history">Vaccine History (Optional)</label>
              <textarea
                id="vaccine-history"
                rows={3}
                placeholder="Please mention recent vaccinations or any pending ones…"
                value={formData.vaccineHistory}
                onChange={(e) => setField('vaccineHistory', e.target.value)}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn--primary btn--lg" disabled={isSubmitting}>
                {isSubmitting ? 'Joining queue…' : 'Start Chat Consultation'}
              </button>
              <p className="form-note">
                Consultation Fee: <strong>KSh 1,800</strong> (Pay after consultation)
              </p>
            </div>
          </form>
        </div>
      </section>

      <section className="consultation-section consultation-section--alt">
        <div className="container">
          <h2 className="section-title">Common Pediatric Concerns We Treat</h2>
          <div className="concerns-grid">
            <div className="concern-card">
              <div className="concern-icon">🤒</div>
              <h3>Fever &amp; Infections</h3>
              <p>Common colds, flu, ear infections, and other childhood illnesses</p>
            </div>
            <div className="concern-card">
              <div className="concern-icon">💉</div>
              <h3>Vaccinations</h3>
              <p>Immunization schedules and vaccine guidance for all age groups</p>
            </div>
            <div className="concern-card">
              <div className="concern-icon">🍼</div>
              <h3>Nutrition &amp; Growth</h3>
              <p>Feeding advice, growth monitoring, and developmental milestones</p>
            </div>
            <div className="concern-card">
              <div className="concern-icon">😴</div>
              <h3>Sleep Issues</h3>
              <p>Sleep patterns, bedtime routines, and sleep disorders</p>
            </div>
            <div className="concern-card">
              <div className="concern-icon">🤧</div>
              <h3>Allergies &amp; Asthma</h3>
              <p>Allergy testing, asthma management, and treatment plans</p>
            </div>
            <div className="concern-card">
              <div className="concern-icon">🧠</div>
              <h3>Behavioral Health</h3>
              <p>ADHD, anxiety, developmental concerns, and mental health</p>
            </div>
          </div>
        </div>
      </section>

      <section className="consultation-section">
        <div className="container">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <div className="faq-list">
            <details className="faq-item">
              <summary>What age range do your pediatricians treat?</summary>
              <p>Our pediatricians provide care for children from birth up to 18 years of age.</p>
            </details>
            <details className="faq-item">
              <summary>How long will I wait for a pediatrician?</summary>
              <p>Average wait time is 3–6 minutes. Your queue position will be shown while you wait.</p>
            </details>
            <details className="faq-item">
              <summary>Can I choose which pediatrician to see?</summary>
              <p>Pediatricians pick up consultations from the queue based on availability to ensure the fastest service.</p>
            </details>
            <details className="faq-item">
              <summary>Do I need vaccination records for the chat?</summary>
              <p>While not mandatory, mentioning recent vaccinations helps the pediatrician provide better recommendations.</p>
            </details>
            <details className="faq-item">
              <summary>Will I receive a prescription?</summary>
              <p>Yes, if necessary, the pediatrician will provide a digital prescription via email for AVA Pharmacy delivery.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="consultation-cta">
        <div className="container">
          <div className="cta-card">
            <h2>Need Pediatric Emergency Care?</h2>
            <p>For urgent pediatric concerns, contact our 24/7 pediatric emergency helpline</p>
            <div className="cta-actions">
              <a href="tel:+254700000000" className="btn btn--secondary btn--lg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Call Pediatric Line
              </a>
              <Link to="/doctor-consultation" className="btn btn--outline btn--lg">General Doctor</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PediatricianConsultation
