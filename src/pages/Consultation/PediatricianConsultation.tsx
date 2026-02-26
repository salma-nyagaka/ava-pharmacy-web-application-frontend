import { useState } from 'react'
import { Link } from 'react-router-dom'
import './ConsultationPage.css'

type ConsultationStatus = 'form' | 'waiting' | 'chatting' | 'completed'

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
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'doctor' | 'patient', text: string }>>([])
  const [messageInput, setMessageInput] = useState('')


  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.parentName.trim()) errors.parentName = 'Parent name is required'
    if (!formData.childName.trim()) errors.childName = 'Child name is required'
    if (!formData.childAge.trim()) {
      errors.childAge = 'Child age is required'
    } else if (isNaN(Number(formData.childAge)) || Number(formData.childAge) < 0 || Number(formData.childAge) > 18) {
      errors.childAge = 'Please enter a valid age (0-18)'
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
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSubmitting(false)
    setStatus('waiting')

    setTimeout(() => {
      setQueuePosition(1)
    }, 4000)

    setTimeout(() => {
      setStatus('chatting')
      setChatMessages([
        { sender: 'doctor', text: `Hello! I'm Dr. Emily Wanjiku. I see ${formData.childName} is experiencing some symptoms. Can you tell me more about when these started?` }
      ])
    }, 8000)
  }

  const handleSendMessage = () => {
    if (!messageInput.trim()) return

    setChatMessages([...chatMessages, { sender: 'patient', text: messageInput }])
    setMessageInput('')

    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: 'doctor', text: 'Thank you for that information. Based on what you\'ve described, I recommend...' }])
    }, 2000)
  }

  const handleEndChat = () => {
    setStatus('completed')
  }

  if (status === 'waiting') {
    return (
      <div className="consultation-page pediatric-page">
        <section className="consultation-hero consultation-hero--pediatric">
          <div className="container">
            <div className="waiting-room">
              <div className="waiting-room__spinner">
                <svg viewBox="0 0 50 50">
                  <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="31.4 31.4" />
                </svg>
              </div>
              <h2>Connecting to pediatrician</h2>
              <p className="waiting-room__position">Position: <strong>{queuePosition}</strong></p>
              <p>A pediatrician will connect with you shortly for {formData.childName}'s consultation.</p>
              <div className="waiting-room__info">
                <p><strong>Average wait time:</strong> 3-6 minutes</p>
                <p><strong>Pediatricians available:</strong> 2 online now</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (status === 'chatting') {
    return (
      <div className="consultation-page pediatric-page">
        <section className="consultation-hero consultation-hero--pediatric">
          <div className="container">
            <div className="chat-room">
              <div className="chat-room__header">
                <div>
                  <h2>Dr. Emily Wanjiku</h2>
                  <p>Pediatrician - Consultation for {formData.childName}</p>
                </div>
                <button className="btn btn--outline btn--sm" onClick={handleEndChat}>End Consultation</button>
              </div>
              <div className="chat-room__messages">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`chat-message chat-message--${msg.sender}`}>
                    <p>{msg.text}</p>
                  </div>
                ))}
              </div>
              <div className="chat-room__input">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button className="btn btn--primary" onClick={handleSendMessage}>Send</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (status === 'completed') {
    return (
      <div className="consultation-page pediatric-page">
        <section className="consultation-hero consultation-hero--pediatric">
          <div className="container">
            <div className="consultation-complete">
              <svg viewBox="0 0 24 24" fill="currentColor" className="consultation-complete__icon">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <h2>Consultation Complete</h2>
              <p>Thank you for consulting with AVA Pharmacy. The prescription for {formData.childName} will be sent to your email shortly.</p>
              <div className="consultation-complete__actions">
                <Link to="/products" className="btn btn--primary">Browse Medicines</Link>
                <Link to="/" className="btn btn--outline">Back to Home</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="consultation-page pediatric-page">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <section className="consultation-hero consultation-hero--pediatric" id="main-content">
        <div className="container">
          <div className="consultation-hero__content">
            <h1 className="consultation-hero__title">Pediatric Consultation</h1>
            <p className="consultation-hero__subtitle">
              Expert care for your child from certified pediatricians online. Start an instant chat consultation.
            </p>
            <div className="consultation-hero__features">
              <div className="feature-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>Child Specialists</span>
              </div>
              <div className="feature-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>Age 0-18 Years</span>
              </div>
              <div className="feature-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>Instant Chat</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="consultation-section">
        <div className="container">
          <h2 className="section-title">Start Pediatric Consultation</h2>
          <p style={{ textAlign: 'center', marginBottom: '2rem' }}>
            Fill in your child's details and you'll be connected with the next available pediatrician.
          </p>
          <form className="consultation-form" onSubmit={handleSubmit}>
            <div className="form-section">
              <h3 className="form-section-title">Parent/Guardian Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="parent-name">Parent/Guardian Name *</label>
                  <input
                    type="text"
                    id="parent-name"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    aria-required="true"
                    aria-invalid={!!formErrors.parentName}
                  />
                  {formErrors.parentName && <span className="form-error" role="alert">{formErrors.parentName}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    aria-required="true"
                    aria-invalid={!!formErrors.email}
                  />
                  {formErrors.email && <span className="form-error" role="alert">{formErrors.email}</span>}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  placeholder="+254 700 000 000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, childAge: e.target.value })}
                    aria-required="true"
                    aria-invalid={!!formErrors.childAge}
                  />
                  {formErrors.childAge && <span className="form-error" role="alert">{formErrors.childAge}</span>}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="symptoms">Describe Symptoms *</label>
              <textarea
                id="symptoms"
                rows={4}
                placeholder="Please describe your child's symptoms, when they started, and any other relevant information..."
                value={formData.symptoms}
                onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
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
                placeholder="Please mention recent vaccinations or any pending ones..."
                value={formData.vaccineHistory}
                onChange={(e) => setFormData({ ...formData, vaccineHistory: e.target.value })}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn--primary btn--lg" disabled={isSubmitting}>
                {isSubmitting ? 'Joining Queue...' : 'Start Chat Consultation'}
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
              <h3>Fever & Infections</h3>
              <p>Common colds, flu, ear infections, and other childhood illnesses</p>
            </div>
            <div className="concern-card">
              <div className="concern-icon">💉</div>
              <h3>Vaccinations</h3>
              <p>Immunization schedules and vaccine guidance for all age groups</p>
            </div>
            <div className="concern-card">
              <div className="concern-icon">🍼</div>
              <h3>Nutrition & Growth</h3>
              <p>Feeding advice, growth monitoring, and developmental milestones</p>
            </div>
            <div className="concern-card">
              <div className="concern-icon">😴</div>
              <h3>Sleep Issues</h3>
              <p>Sleep patterns, bedtime routines, and sleep disorders</p>
            </div>
            <div className="concern-card">
              <div className="concern-icon">🤧</div>
              <h3>Allergies & Asthma</h3>
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
              <p>Our pediatricians provide care for children from birth (newborns) up to 18 years of age, including infants, toddlers, school-age children, and adolescents.</p>
            </details>
            <details className="faq-item">
              <summary>How long will I wait for a pediatrician?</summary>
              <p>Average wait time is 3-6 minutes. We have dedicated pediatricians online to ensure quick service. Your queue position will be shown while you wait.</p>
            </details>
            <details className="faq-item">
              <summary>Can I choose which pediatrician to see?</summary>
              <p>Pediatricians pick up consultations from the queue based on availability to ensure the fastest service. All our pediatricians are licensed and experienced in child healthcare.</p>
            </details>
            <details className="faq-item">
              <summary>Do I need vaccination records for the chat?</summary>
              <p>While not mandatory, mentioning recent vaccinations in the vaccine history field helps the pediatrician provide better care and recommendations.</p>
            </details>
            <details className="faq-item">
              <summary>Will I receive a prescription?</summary>
              <p>Yes, if necessary, the pediatrician will provide a digital prescription via email that you can use to order medications from AVA Pharmacy with home delivery.</p>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
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
