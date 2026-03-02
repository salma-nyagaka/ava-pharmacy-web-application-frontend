import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './ConsultationPage.css'

type ConsultationStatus = 'form' | 'waiting' | 'chatting' | 'completed'

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

const AVAILABLE_DOCTORS = [
  { name: 'Dr. Sarah Johnson', specialty: 'General Medicine', rating: 4.9, consultations: 1420 },
  { name: 'Dr. Michael Chen', specialty: 'Cardiology', rating: 4.8, consultations: 876 },
  { name: 'Dr. Amina Osei', specialty: 'Dermatology', rating: 4.9, consultations: 1105 },
]

function getInitials(name: string) {
  return name.replace(/^Dr\.\s*/i, '').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function DoctorConsultation() {
  const { user } = useAuth()
  const [status, setStatus] = useState<ConsultationStatus>('form')
  const [formData, setFormData] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: '',
    specialty: '',
    urgency: 'Routine' as 'Routine' | 'Urgent',
    symptoms: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [queuePosition, setQueuePosition] = useState(3)
  const [assignedDoctor] = useState(AVAILABLE_DOCTORS[0])
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
    if (!formData.name.trim()) errors.name = 'Full name is required'
    if (!formData.email.trim()) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email address'
    if (!formData.phone.trim()) errors.phone = 'Phone number is required'
    else if (!/^\+?[0-9]{10,15}$/.test(formData.phone.replace(/\s/g, ''))) errors.phone = 'Invalid phone number'
    if (!formData.symptoms.trim()) errors.symptoms = 'Please describe your symptoms'
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
    setTimeout(() => setQueuePosition(2), 3000)
    setTimeout(() => setQueuePosition(1), 6000)
    setTimeout(() => {
      setStatus('chatting')
      setChatMessages([{
        sender: 'doctor',
        text: `Hello ${formData.name.split(' ')[0]}, I'm ${assignedDoctor.name}. I've reviewed your submitted symptoms. How long have you been experiencing these issues?`,
        time: now(),
      }])
    }, 9000)
  }

  const handleSendMessage = () => {
    if (!messageInput.trim()) return
    setChatMessages((p) => [...p, { sender: 'patient', text: messageInput, time: now() }])
    setMessageInput('')
    setIsDoctorTyping(true)
    setTimeout(() => {
      setIsDoctorTyping(false)
      setChatMessages((p) => [...p, {
        sender: 'doctor',
        text: 'Thank you for that information. Based on what you\'ve described, I recommend a course of treatment. I\'ll prepare a digital prescription for you shortly.',
        time: now(),
      }])
    }, 2500)
  }

  // ── Waiting room ────────────────────────────────────────────────────────────
  if (status === 'waiting') {
    const percent = queuePosition === 3 ? 33 : queuePosition === 2 ? 66 : 90
    const statusMsg = queuePosition === 1 ? "You're next!" : queuePosition === 2 ? 'Almost there…' : 'Finding your doctor…'
    return (
      <div className="dc-page">
        <div className="dc-waiting">
          <div className="dc-waiting__card">
            <div className="dc-waiting__avatar-wrap">
              <div className="dc-waiting__pulse-ring" />
              <div className="dc-waiting__avatar">{getInitials(assignedDoctor.name)}</div>
            </div>

            <span className="dc-waiting__status-badge">{statusMsg}</span>

            <p className="dc-waiting__doctor-name">{assignedDoctor.name}</p>
            <p className="dc-waiting__doctor-spec">{formData.specialty || assignedDoctor.specialty}</p>

            <div className="dc-waiting__queue">
              <div className="dc-waiting__queue-steps">
                {[1, 2, 3].map((n) => (
                  <div key={n} className={`dc-waiting__queue-step ${n > queuePosition ? 'dc-waiting__queue-step--done' : n === queuePosition ? 'dc-waiting__queue-step--active' : ''}`}>
                    {n > queuePosition ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <span>{n}</span>
                    )}
                  </div>
                ))}
                <div className="dc-waiting__queue-track">
                  <div className="dc-waiting__queue-fill" style={{ width: `${percent}%` }} />
                </div>
              </div>
              <p className="dc-waiting__position">
                Position <strong>{queuePosition}</strong> of 3
              </p>
            </div>

            <div className="dc-waiting__meta">
              <div className="dc-waiting__meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>Avg. wait: 2–5 min</span>
              </div>
              <div className="dc-waiting__meta-sep">·</div>
              <div className="dc-waiting__meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>3 doctors online</span>
              </div>
            </div>

            <div className="dc-waiting__connecting">
              <span /><span /><span />
            </div>

            <p className="dc-waiting__tip">Please stay on this page. You&apos;ll be connected automatically.</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Chat room ────────────────────────────────────────────────────────────────
  if (status === 'chatting') {
    return (
      <div className="dc-page">
        <div className="dc-chat">
          <div className="dc-chat__header">
            <div className="dc-chat__doc-info">
              <div className="dc-chat__doc-avatar">{getInitials(assignedDoctor.name)}</div>
              <div>
                <p className="dc-chat__doc-name">{assignedDoctor.name}</p>
                <p className="dc-chat__doc-spec">
                  <span className="dc-chat__online-dot" />
                  {formData.specialty || assignedDoctor.specialty} · Online
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
                  <div className="dc-msg__avatar">{getInitials(assignedDoctor.name)}</div>
                )}
                <div className="dc-msg__bubble">
                  <p>{msg.text}</p>
                  <span className="dc-msg__time">{msg.time}</span>
                </div>
              </div>
            ))}
            {isDoctorTyping && (
              <div className="dc-msg dc-msg--doctor">
                <div className="dc-msg__avatar">{getInitials(assignedDoctor.name)}</div>
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
            <button className="btn btn--primary" type="button" onClick={handleSendMessage} disabled={!messageInput.trim()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>

        {showEndConfirm && (
          <div className="modal-overlay" onClick={() => setShowEndConfirm(false)}>
            <div className="dc-confirm" onClick={(e) => e.stopPropagation()}>
              <h3>End consultation?</h3>
              <p>Are you sure you want to end this session? Your prescription will be sent via email.</p>
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

  // ── Completed ────────────────────────────────────────────────────────────────
  if (status === 'completed') {
    return (
      <div className="dc-page">
        <div className="dc-complete">
          <div className="dc-complete__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2>Consultation complete</h2>
          <p className="dc-complete__sub">Thank you for consulting with {assignedDoctor.name}.</p>
          <div className="dc-complete__summary">
            <div className="dc-complete__row"><span>Doctor</span><strong>{assignedDoctor.name}</strong></div>
            <div className="dc-complete__row"><span>Date</span><strong>{new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
            <div className="dc-complete__row"><span>Fee</span><strong>KSh 1,500</strong></div>
            <div className="dc-complete__row"><span>Prescription</span><strong>Sent to {formData.email}</strong></div>
          </div>
          <div className="dc-complete__next">
            <p className="dc-complete__next-label">What's next?</p>
            <div className="dc-complete__step">
              <span className="dc-complete__step-dot">1</span>
              <span>Check your email for your digital prescription</span>
            </div>
            <div className="dc-complete__step">
              <span className="dc-complete__step-dot">2</span>
              <span>Upload it to get your medicines dispensed</span>
            </div>
            <div className="dc-complete__step">
              <span className="dc-complete__step-dot">3</span>
              <span>We'll prepare and deliver your order</span>
            </div>
          </div>
          <div className="dc-complete__actions">
            <Link to="/prescriptions" className="btn btn--primary">Upload prescription</Link>
            <Link to="/products" className="btn btn--outline">Browse medicines</Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Form (default) ──────────────────────────────────────────────────────────
  return (
    <div className="dc-page">
      <a href="#dc-form" className="skip-to-content">Skip to form</a>

      {/* Hero */}
      <div className="dc-hero">
        <div className="container">
          <div className="dc-hero__content">
            <div className="dc-hero__badge">
              <span className="dc-hero__dot" />
              {AVAILABLE_DOCTORS.length} doctors online now
            </div>
            <h1 className="dc-hero__title">Doctor Consultation</h1>
            <p className="dc-hero__sub">Connect with a licensed doctor via secure chat. Get advice, diagnosis, and a digital prescription — all in minutes.</p>
            <div className="dc-hero__pills">
              <span className="dc-hero__pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Licensed &amp; verified</span>
              <span className="dc-hero__pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>24/7 available</span>
              <span className="dc-hero__pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Encrypted &amp; private</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container">
        <div className="dc-body" id="dc-form">

          {/* ── Form ── */}
          <div className="dc-form-card">
            <h2 className="dc-form-card__title">Start your consultation</h2>
            <p className="dc-form-card__sub">Fill in your details and you'll be connected with the next available doctor.</p>

            <form onSubmit={handleSubmit} noValidate>
              {/* Name + Email */}
              <div className="dc-form-row">
                <div className="dc-field">
                  <label htmlFor="dc-name">Full name</label>
                  <input id="dc-name" type="text" value={formData.name} onChange={(e) => setField('name', e.target.value)} aria-invalid={!!formErrors.name} placeholder="Jane Mwangi" />
                  {formErrors.name && <span className="dc-field-error">{formErrors.name}</span>}
                </div>
                <div className="dc-field">
                  <label htmlFor="dc-email">Email address</label>
                  <input id="dc-email" type="email" value={formData.email} onChange={(e) => setField('email', e.target.value)} aria-invalid={!!formErrors.email} placeholder="you@example.com" />
                  {formErrors.email && <span className="dc-field-error">{formErrors.email}</span>}
                </div>
              </div>

              {/* Phone + Specialty */}
              <div className="dc-form-row">
                <div className="dc-field">
                  <label htmlFor="dc-phone">Phone number</label>
                  <input id="dc-phone" type="tel" value={formData.phone} onChange={(e) => setField('phone', e.target.value)} aria-invalid={!!formErrors.phone} placeholder="+254 700 000 000" />
                  {formErrors.phone && <span className="dc-field-error">{formErrors.phone}</span>}
                </div>
                <div className="dc-field">
                  <label htmlFor="dc-specialty">Specialty <span className="dc-field-optional">optional</span></label>
                  <select id="dc-specialty" value={formData.specialty} onChange={(e) => setField('specialty', e.target.value)}>
                    <option value="">Any available doctor</option>
                    {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Urgency */}
              <div className="dc-field" style={{ marginBottom: '1.25rem' }}>
                <label>Urgency</label>
                <div className="dc-urgency">
                  {(['Routine', 'Urgent'] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      className={`dc-urgency__btn ${formData.urgency === u ? `dc-urgency__btn--${u.toLowerCase()}--active` : ''} dc-urgency__btn--${u.toLowerCase()}`}
                      onClick={() => setField('urgency', u)}
                    >
                      {u === 'Urgent' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Symptoms */}
              <div className="dc-field" style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="dc-symptoms">
                  Describe your symptoms
                  <span className="dc-field-char">{formData.symptoms.length}/500</span>
                </label>
                <textarea
                  id="dc-symptoms"
                  rows={5}
                  maxLength={500}
                  placeholder="Describe your symptoms, how long you've had them, and any relevant medical history or allergies…"
                  value={formData.symptoms}
                  onChange={(e) => setField('symptoms', e.target.value)}
                  aria-invalid={!!formErrors.symptoms}
                />
                {formErrors.symptoms && <span className="dc-field-error">{formErrors.symptoms}</span>}
              </div>

              <button type="submit" className="btn btn--primary dc-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Joining queue…' : 'Start chat consultation →'}
              </button>
            </form>

            {/* How it works */}
            <div className="dc-steps">
              {[
                { n: '1', label: 'Fill details', desc: 'Enter your info and symptoms' },
                { n: '2', label: 'Join queue', desc: 'Avg. wait 2–5 minutes' },
                { n: '3', label: 'Chat', desc: 'Secure chat with your doctor' },
                { n: '4', label: 'Prescription', desc: 'Sent to your email' },
              ].map((s) => (
                <div key={s.n} className="dc-step">
                  <div className="dc-step__dot">{s.n}</div>
                  <div>
                    <p className="dc-step__label">{s.label}</p>
                    <p className="dc-step__desc">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <aside className="dc-sidebar">
            {/* Fee card */}
            <div className="dc-sidebar__card dc-fee-card">
              <p className="dc-fee-card__label">Consultation fee</p>
              <p className="dc-fee-card__amount">KSh 1,500</p>
              <p className="dc-fee-card__note">Pay after consultation · No upfront charge</p>
              <div className="dc-fee-card__includes">
                <p className="dc-fee-card__includes-title">Includes:</p>
                <ul>
                  <li>One consultation session</li>
                  <li>Digital prescription (if needed)</li>
                  <li>Follow-up message within 24h</li>
                </ul>
              </div>
            </div>

            {/* Available doctors */}
            <div className="dc-sidebar__card">
              <p className="dc-sidebar__card-title">Available doctors</p>
              <div className="dc-doctors-list">
                {AVAILABLE_DOCTORS.map((doc) => (
                  <div key={doc.name} className="dc-doctor-item">
                    <div className="dc-doctor-item__avatar">{getInitials(doc.name)}</div>
                    <div className="dc-doctor-item__info">
                      <p className="dc-doctor-item__name">{doc.name}</p>
                      <p className="dc-doctor-item__spec">{doc.specialty}</p>
                    </div>
                    <div className="dc-doctor-item__rating">
                      <span>★ {doc.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust */}
            <div className="dc-sidebar__card dc-trust-card">
              <div className="dc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>End-to-end encrypted chat</span>
              </div>
              <div className="dc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>All doctors are licensed &amp; verified</span>
              </div>
              <div className="dc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="18" height="18"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>Your data is private &amp; confidential</span>
              </div>
            </div>

            <a href="tel:+254700000000" className="dc-emergency-btn">
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
