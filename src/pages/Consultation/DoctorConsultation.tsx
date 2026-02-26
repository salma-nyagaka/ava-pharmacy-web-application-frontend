import { useState } from 'react'
import { Link } from 'react-router-dom'
import './ConsultationPage.css'

type ConsultationStatus = 'form' | 'waiting' | 'chatting' | 'completed'

function DoctorConsultation() {
  const [status, setStatus] = useState<ConsultationStatus>('form')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    symptoms: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [queuePosition, setQueuePosition] = useState(3)
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'doctor' | 'patient', text: string }>>([])
  const [messageInput, setMessageInput] = useState('')


  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) errors.name = 'Name is required'
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
    if (!formData.symptoms.trim()) errors.symptoms = 'Please describe your symptoms'

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
      setQueuePosition(2)
    }, 3000)

    setTimeout(() => {
      setQueuePosition(1)
    }, 6000)

    setTimeout(() => {
      setStatus('chatting')
      setChatMessages([
        { sender: 'doctor', text: `Hello ${formData.name}, I'm Dr. Sarah Johnson. I've reviewed your symptoms. How long have you been experiencing these issues?` }
      ])
    }, 9000)
  }

  const handleSendMessage = () => {
    if (!messageInput.trim()) return

    setChatMessages([...chatMessages, { sender: 'patient', text: messageInput }])
    setMessageInput('')

    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: 'doctor', text: 'Thank you for that information. Based on what you\'ve told me, I recommend...' }])
    }, 2000)
  }

  const handleEndChat = () => {
    setStatus('completed')
  }

  if (status === 'waiting') {
    return (
      <div className="consultation-page">
        <section className="consultation-hero">
          <div className="container">
            <div className="waiting-room">
              <div className="waiting-room__spinner">
                <svg viewBox="0 0 50 50">
                  <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="31.4 31.4" />
                </svg>
              </div>
              <h2>You're in the queue</h2>
              <p className="waiting-room__position">Position: <strong>{queuePosition}</strong></p>
              <p>A doctor will connect with you shortly. Please stay on this page.</p>
              <div className="waiting-room__info">
                <p><strong>Average wait time:</strong> 2-5 minutes</p>
                <p><strong>Doctors available:</strong> 3 online now</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (status === 'chatting') {
    return (
      <div className="consultation-page">
        <section className="consultation-hero">
          <div className="container">
            <div className="chat-room">
              <div className="chat-room__header">
                <div>
                  <h2>Dr. Sarah Johnson</h2>
                  <p>General Practitioner</p>
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
      <div className="consultation-page">
        <section className="consultation-hero">
          <div className="container">
            <div className="consultation-complete">
              <svg viewBox="0 0 24 24" fill="currentColor" className="consultation-complete__icon">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <h2>Consultation Complete</h2>
              <p>Thank you for consulting with AVA Pharmacy. Your prescription will be sent to your email shortly.</p>
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
    <div className="consultation-page">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <section className="consultation-hero" id="main-content">
        <div className="container">
          <div className="consultation-hero__content">
            <h1 className="consultation-hero__title">Doctor Consultation</h1>
            <p className="consultation-hero__subtitle">
              Connect with licensed doctors online. Start a chat consultation and get professional medical advice instantly.
            </p>
            <div className="consultation-hero__features">
              <div className="feature-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>Licensed Doctors</span>
              </div>
              <div className="feature-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>24/7 Available</span>
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
          <h2 className="section-title">Start Your Consultation</h2>
          <p style={{ textAlign: 'center', marginBottom: '2rem' }}>
            Fill in your details below and you'll be connected with the next available doctor.
          </p>
          <form className="consultation-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  aria-required="true"
                  aria-invalid={!!formErrors.name}
                />
                {formErrors.name && <span className="form-error" role="alert">{formErrors.name}</span>}
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
            <div className="form-group">
              <label htmlFor="symptoms">Describe Your Symptoms *</label>
              <textarea
                id="symptoms"
                rows={4}
                placeholder="Please describe your symptoms and any relevant medical history..."
                value={formData.symptoms}
                onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                aria-required="true"
                aria-invalid={!!formErrors.symptoms}
              />
              {formErrors.symptoms && <span className="form-error" role="alert">{formErrors.symptoms}</span>}
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn--primary btn--lg" disabled={isSubmitting}>
                {isSubmitting ? 'Joining Queue...' : 'Start Chat Consultation'}
              </button>
              <p className="form-note">
                Consultation Fee: <strong>KSh 1,500</strong> (Pay after consultation)
              </p>
            </div>
          </form>
        </div>
      </section>

      <section className="consultation-section consultation-section--alt">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-card__number">1</div>
              <h3>Fill Details</h3>
              <p>Provide your information and describe your symptoms</p>
            </div>
            <div className="step-card">
              <div className="step-card__number">2</div>
              <h3>Join Queue</h3>
              <p>Enter the consultation queue and wait for the next available doctor</p>
            </div>
            <div className="step-card">
              <div className="step-card__number">3</div>
              <h3>Chat Consultation</h3>
              <p>Doctor connects with you and provides consultation via secure chat</p>
            </div>
            <div className="step-card">
              <div className="step-card__number">4</div>
              <h3>Get Prescription</h3>
              <p>Receive digital prescription and order medicines directly from us</p>
            </div>
          </div>
        </div>
      </section>

      <section className="consultation-section">
        <div className="container">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <div className="faq-list">
            <details className="faq-item">
              <summary>How does the consultation work?</summary>
              <p>After submitting your details, you'll join a queue. The next available doctor will connect with you via secure chat. Stay on the waiting page until you're connected.</p>
            </details>
            <details className="faq-item">
              <summary>How long will I wait?</summary>
              <p>Average wait time is 2-5 minutes. We have multiple doctors online 24/7 to ensure quick service. Your queue position will be shown while you wait.</p>
            </details>
            <details className="faq-item">
              <summary>Can I choose my doctor?</summary>
              <p>Doctors pick up consultations from the queue based on availability. This ensures you get the fastest service. All our doctors are licensed and experienced.</p>
            </details>
            <details className="faq-item">
              <summary>Will I get a prescription?</summary>
              <p>Yes, if the doctor determines you need medication, you'll receive a digital prescription via email that you can use to order medicines from AVA Pharmacy.</p>
            </details>
            <details className="faq-item">
              <summary>Is my consultation private and secure?</summary>
              <p>Absolutely. All consultations are confidential and conducted through secure, encrypted chat. Your medical information is protected according to healthcare privacy standards.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="consultation-cta">
        <div className="container">
          <div className="cta-card">
            <h2>Need Immediate Assistance?</h2>
            <p>For urgent medical concerns, contact our 24/7 emergency helpline</p>
            <div className="cta-actions">
              <a href="tel:+254700000000" className="btn btn--secondary btn--lg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                Call Now
              </a>
              <Link to="/help" className="btn btn--outline btn--lg">View FAQs</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default DoctorConsultation
