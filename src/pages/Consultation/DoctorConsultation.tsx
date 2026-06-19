import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { formatPhoneHref } from '../../services/siteSettingsService'
import {
  ClinicianSummary,
  CreateConsultationPayload,
  ConsultationPaymentIntent,
  ConsultationRecord,
  createConsultationPaymentIntent,
  endConsultation,
  fetchConsultation,
  fetchDoctors,
  fetchMyConsultations,
  finalizePaidConsultation,
  sendConsultationMessage,
  syncConsultationPaymentIntent,
  updateConsultation,
} from '../../services/consultationService'
import { useConsultationSocket } from '../../hooks/useConsultationSocket'
import '../../styles/pages/ConsultationPage.css'
import '../../styles/pages/AccountConsultationsPage.css'

type ConsultationViewState = 'form' | 'waiting' | 'chatting' | 'completed'
type HubTab = 'All' | 'Doctor' | 'Paediatric'
type ConsultationStatusKey = ConsultationRecord['status']
type StatusFilter = 'all' | ConsultationStatusKey
type MpesaFlow = 'stk' | 'paybill'
type ConsultationPaymentStatus = 'idle' | 'review' | 'waiting' | 'processing' | 'confirmed' | 'failed'

const HUB_TABS: readonly HubTab[] = ['All', 'Doctor', 'Paediatric']
const STATUS_FILTERS: readonly { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All status' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
]

const STATUS_CFG: Record<ConsultationStatusKey, { label: string; color: string; bg: string; icon: string }> = {
  completed: { label: 'Completed', color: '#16803c', bg: 'rgba(22,128,60,0.1)', icon: '✓' },
  in_progress: { label: 'In progress', color: '#2563eb', bg: 'rgba(37,99,235,0.1)', icon: '•' },
  waiting: { label: 'Waiting', color: '#b45309', bg: 'rgba(180,83,9,0.1)', icon: '•' },
  cancelled: { label: 'Cancelled', color: '#dc2626', bg: 'rgba(220,38,38,0.1)', icon: '×' },
}

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
const CONSULTATION_PAYMENT_PLACEHOLDER = 1

function sortConsultations(items: ConsultationRecord[]) {
  return [...items].sort((a, b) => {
    const left = new Date(a.scheduledAt || a.lastMessageAt || a.createdAt).getTime()
    const right = new Date(b.scheduledAt || b.lastMessageAt || b.createdAt).getTime()
    return right - left
  })
}

function getTypeConfig(consultation: ConsultationRecord) {
  if (consultation.isPediatric) {
    return { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', label: 'Paediatric' }
  }
  return { color: '#ec4899', bg: 'rgba(236,72,153,0.1)', label: 'Doctor' }
}

function getInitials(name: string) {
  return name
    .replace(/^Dr\.\s*/i, '')
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
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

function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { error?: { message?: string }; detail?: string | string[]; message?: string } } })?.response?.data
  const detail = data?.error?.message ?? data?.message ?? data?.detail
  if (Array.isArray(detail)) return detail[0] || fallback
  return detail || fallback
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
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState<ClinicianSummary[]>([])
  const [consultations, setConsultations] = useState<ConsultationRecord[]>([])
  const [currentConsultation, setCurrentConsultation] = useState<ConsultationRecord | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [showStartForm, setShowStartForm] = useState(false)
  const [activeHubTab, setActiveHubTab] = useState<HubTab>('All')
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)
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
  const [pendingPayload, setPendingPayload] = useState<CreateConsultationPayload | null>(null)
  const [paymentIntent, setPaymentIntent] = useState<ConsultationPaymentIntent | null>(null)
  const [mpesaFlow, setMpesaFlow] = useState<MpesaFlow>('stk')
  const [paymentStatus, setPaymentStatus] = useState<ConsultationPaymentStatus>('idle')
  const [paymentNotice, setPaymentNotice] = useState('')
  const [mpesaPhone, setMpesaPhone] = useState(user?.phone ?? '')
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
    setMpesaPhone((prev) => prev || user?.phone || '')
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
        setConsultations(sortConsultations(consultations))

        const activeConsultation = consultations.find(
          (consultation) => !consultation.isPediatric && (consultation.status === 'waiting' || consultation.status === 'in_progress'),
        )

        if (activeConsultation) {
          const detail = await fetchConsultation(activeConsultation.id)
          if (!isMounted) return
          setCurrentConsultation(detail)
          setConsultations((prev) => sortConsultations(prev.map((item) => (item.id === detail.id ? detail : item))))
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
        setConsultations((prev) => sortConsultations(prev.map((item) => (item.id === detail.id ? detail : item))))
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

  const viewState = isChatOpen ? mapViewState(currentConsultation) : 'form'
  const assignedDoctor = useMemo(() => {
    if (currentConsultation?.doctor) {
      return doctors.find((doctor) => doctor.id === currentConsultation.doctor) ?? null
    }
    return null
  }, [currentConsultation?.doctor, doctors])
  const routingDoctorsCount = filteredDoctors.length
  const paymentPlaceholderAmount = CONSULTATION_PAYMENT_PLACEHOLDER
  const queueLabel = formData.urgency === 'Urgent' ? 'Priority queue' : 'Standard queue'
  const routingLabel = formData.specialty || 'Any available doctor'
  const hubFiltered = useMemo(() => {
    const byType = activeHubTab === 'All'
      ? consultations
      : consultations.filter((consultation) => consultation.isPediatric === (activeHubTab === 'Paediatric'))
    if (activeStatus === 'all') return byType
    return byType.filter((consultation) => consultation.status === activeStatus)
  }, [activeHubTab, activeStatus, consultations])
  const hubTypedConsultations = useMemo(() => {
    if (activeHubTab === 'All') return consultations
    const targetIsPediatric = activeHubTab === 'Paediatric'
    return consultations.filter((consultation) => consultation.isPediatric === targetIsPediatric)
  }, [activeHubTab, consultations])
  const hubCounts = useMemo(() => ({
    All: consultations.length,
    Doctor: consultations.filter((consultation) => !consultation.isPediatric).length,
    Paediatric: consultations.filter((consultation) => consultation.isPediatric).length,
  }), [consultations])
  const hubStatusCounts = useMemo(() => ({
    waiting: hubTypedConsultations.filter((consultation) => consultation.status === 'waiting').length,
    in_progress: hubTypedConsultations.filter((consultation) => consultation.status === 'in_progress').length,
    completed: hubTypedConsultations.filter((consultation) => consultation.status === 'completed').length,
  }), [hubTypedConsultations])

  const toggleHubCard = (id: number) => setExpandedId((prev) => (prev === id ? null : id))

  const backToConsultationHub = () => {
    setIsChatOpen(false)
    setShowStartForm(false)
    setSubmitError('')
  }

  const startNewConsultation = () => {
    setCurrentConsultation(null)
    setIsChatOpen(false)
    setShowStartForm(true)
    setPendingPayload(null)
    setPaymentIntent(null)
    setPaymentStatus('idle')
    setPaymentNotice('')
    setSubmitError('')
    window.requestAnimationFrame(() => {
      document.getElementById('dc-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const openDoctorConsultation = async (consultation: ConsultationRecord) => {
    if (consultation.isPediatric) return
    setSubmitError('')
    try {
      const detail = await fetchConsultation(consultation.id)
      setCurrentConsultation(detail)
      setConsultations((prev) => sortConsultations(prev.map((item) => (item.id === detail.id ? detail : item))))
      setIsChatOpen(true)
      setShowStartForm(false)
    } catch {
      setSubmitError('Unable to open this consultation right now.')
    }
  }

  const setField = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setFormErrors((prev) => ({ ...prev, [key]: '' }))
    setSubmitError('')
    setPaymentStatus('idle')
    setPaymentNotice('')
    setPendingPayload(null)
    setPaymentIntent(null)
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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!validateForm()) return

    setSubmitError('')
    const issue = formData.specialty.trim()
      ? `${formData.symptoms.trim()}\n\nPreferred specialty: ${formData.specialty.trim()}`
      : formData.symptoms.trim()

    setPendingPayload({
      doctor: null,
      patient_name: formData.name.trim(),
      patient_email: formData.email.trim(),
      patient_phone: formData.phone.trim(),
      issue,
      priority: formData.urgency === 'Urgent' ? 'priority' : 'routine',
    })
    setMpesaFlow('stk')
    setPaymentIntent(null)
    setPaymentStatus('review')
    setPaymentNotice('Choose STK Push or Paybill. The consultation will only start after payment is successful.')
    window.requestAnimationFrame(() => {
      document.getElementById('dc-payment-step')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const handleInitiateConsultationPayment = async () => {
    if (!pendingPayload) {
      setSubmitError('Please complete your consultation details first.')
      return
    }
    if (mpesaFlow === 'stk') {
      const normalized = mpesaPhone.trim().replace(/\s+/g, '')
      if (!/^(\+?254|0)?7\d{8}$/.test(normalized)) {
        setSubmitError('Enter a valid M-Pesa number before sending STK Push.')
        return
      }
    }

    setIsSubmitting(true)
    setSubmitError('')
    setPaymentStatus('processing')
    setPaymentNotice(mpesaFlow === 'stk' ? 'Sending STK Push request...' : 'Creating Paybill payment reference...')
    try {
      const intent = await createConsultationPaymentIntent({
        provider: mpesaFlow === 'stk' ? 'mpesa' : 'paybill',
        phone: mpesaFlow === 'stk' ? mpesaPhone : formData.phone,
        consultation: pendingPayload,
      })
      setPaymentIntent(intent)
      if (intent.status === 'succeeded') {
        await handleFinalizePaidIntent(intent)
        return
      }
      if (intent.status === 'failed' || intent.status === 'cancelled') {
        setPaymentStatus('failed')
        setPaymentNotice(intent.lastError || 'Payment could not be started. Please try again.')
        return
      }
      setPaymentStatus('waiting')
      setPaymentNotice(
        mpesaFlow === 'stk'
          ? (intent.clientSecret || `STK Push sent to ${intent.phoneNumber || mpesaPhone}. Complete the payment on your phone, then check status.`)
          : 'Use the Paybill details shown, then click Confirm payment. Chat opens only after Safaricom confirms the payment.',
      )
    } catch (error) {
      const message = apiErrorMessage(error, 'Unable to start M-Pesa payment. Please try again.')
      setPaymentStatus('failed')
      setPaymentNotice(message)
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFinalizePaidIntent = async (intent: ConsultationPaymentIntent) => {
    if (intent.status !== 'succeeded') {
      setPaymentNotice('Payment is not confirmed yet. Complete M-Pesa payment, then check status again.')
      return
    }
    const created = await finalizePaidConsultation(intent.id)
    setCurrentConsultation(created)
    setConsultations((prev) => sortConsultations([created, ...prev.filter((item) => item.id !== created.id)]))
    setPaymentStatus('confirmed')
    setPendingPayload(null)
    setPaymentIntent({ ...intent, consultation: created.id })
    setIsChatOpen(true)
    setShowStartForm(false)
  }

  const handleConfirmConsultationPayment = async () => {
    if (!paymentIntent) {
      setSubmitError('Start an M-Pesa payment first.')
      return
    }
    setIsSubmitting(true)
    setSubmitError('')
    setPaymentStatus('processing')
    setPaymentNotice('Checking M-Pesa payment status...')

    try {
      const intent = await syncConsultationPaymentIntent(paymentIntent.id)
      setPaymentIntent(intent)
      if (intent.status === 'succeeded') {
        await handleFinalizePaidIntent(intent)
      } else if (intent.status === 'failed' || intent.status === 'cancelled') {
        setPaymentStatus('failed')
        setPaymentNotice(intent.lastError || 'M-Pesa payment was not successful. Please try again.')
      } else {
        setPaymentStatus('waiting')
        setPaymentNotice('Payment is not confirmed yet. Complete the M-Pesa payment, then check status again.')
      }
    } catch (error) {
      const message = apiErrorMessage(error, 'Payment is not confirmed yet. Please check again after completing M-Pesa payment.')
      setPaymentStatus('waiting')
      setPaymentNotice(message)
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!paymentIntent || paymentStatus !== 'waiting') return undefined
    const timer = window.setInterval(async () => {
      try {
        const intent = await syncConsultationPaymentIntent(paymentIntent.id)
        setPaymentIntent(intent)
        if (intent.status === 'succeeded') {
          window.clearInterval(timer)
          setPaymentStatus('processing')
          setPaymentNotice('Payment confirmed. Starting your consultation...')
          await handleFinalizePaidIntent(intent)
        } else if (intent.status === 'failed' || intent.status === 'cancelled') {
          window.clearInterval(timer)
          setPaymentStatus('failed')
          setPaymentNotice(intent.lastError || 'M-Pesa payment was not successful. Please try again.')
        }
      } catch {
        // Manual status check remains available if a transient poll fails.
      }
    }, 5000)
    return () => window.clearInterval(timer)
  }, [paymentIntent?.id, paymentStatus])

  const handleRefreshConsultation = async () => {
    if (!currentConsultation) return
    try {
      const detail = await fetchConsultation(currentConsultation.id)
      setCurrentConsultation(detail)
      setConsultations((prev) => sortConsultations(prev.map((item) => (item.id === detail.id ? detail : item))))
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
      setConsultations((prev) => sortConsultations(prev.map((item) => (item.id === detail.id ? detail : item))))
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
      setConsultations((prev) => sortConsultations(prev.map((item) => (item.id === updated.id ? updated : item))))
      setIsChatOpen(false)
      setShowStartForm(false)
      setExpandedId(updated.id)
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

  const renderConsultationWorkspace = () => (
    <div className="dc-page ac-page dc-hub-page">
      <div className="container">
        <div className="ac-header">
          <div>
            <p className="ac-header__eyebrow">Doctor Consultation</p>
            <h1 className="ac-header__title">My Consultations</h1>
            <p className="ac-header__sub">Track active doctor chats, review completed consultations, or start a new request.</p>
          </div>
          <div className="dc-header-actions">
            <button type="button" className="dc-back-btn" onClick={() => navigate('/health-services')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
              Back to health services
            </button>
            <button type="button" className="ac-header__action dc-link-button" onClick={startNewConsultation}>
              New consultation
            </button>
          </div>
        </div>

        <div className="ac-overview">
          <div className="ac-overview__item">
            <span>Waiting</span>
            <strong>{hubStatusCounts.waiting}</strong>
          </div>
          <div className="ac-overview__item">
            <span>In progress</span>
            <strong>{hubStatusCounts.in_progress}</strong>
          </div>
          <div className="ac-overview__item">
            <span>Completed</span>
            <strong>{hubStatusCounts.completed}</strong>
          </div>
        </div>

        <div className="ac-controls">
          <div className="ac-tabs">
            {HUB_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`ac-tab${activeHubTab === tab ? ' ac-tab--active' : ''}`}
                onClick={() => setActiveHubTab(tab)}
              >
                {tab}
                <span className="ac-tab__count">{hubCounts[tab]}</span>
              </button>
            ))}
          </div>
          <div className="ac-status-tabs" aria-label="Consultation status filter">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`ac-status-tab${activeStatus === filter.key ? ' ac-status-tab--active' : ''}`}
                onClick={() => setActiveStatus(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {submitError && (
          <div className="ac-empty dc-hub-error">
            <p className="ac-empty__title">Something went wrong</p>
            <p className="ac-empty__sub">{submitError}</p>
          </div>
        )}

        {hubFiltered.length === 0 ? (
          <div className="ac-empty">
            <div className="ac-empty__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
              </svg>
            </div>
            <p className="ac-empty__title">No doctor consultations yet</p>
            <p className="ac-empty__sub">Start with your symptoms, pay the consultation fee, then your request joins the doctor queue.</p>
            <button type="button" className="btn btn--primary btn--sm dc-empty-cta" onClick={startNewConsultation}>
              Start consultation
            </button>
          </div>
        ) : (
          <ul className="ac-list">
            {hubFiltered.map((consultation) => {
              const status = STATUS_CFG[consultation.status]
              const type = getTypeConfig(consultation)
              const isExpanded = expandedId === consultation.id
              const activityDate = consultation.scheduledAt || consultation.lastMessageAt || consultation.createdAt

              return (
                <li key={consultation.id} className="ac-card">
                  <button
                    type="button"
                    className="ac-card__header"
                    onClick={() => toggleHubCard(consultation.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="ac-card__left">
                      <div className="ac-card__avatar" style={{ background: type.bg, color: type.color }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="8" r="4"/>
                          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                        </svg>
                      </div>
                      <div className="ac-card__meta">
                        <div className="ac-card__top-row">
                          <span className="ac-card__doctor">{consultation.doctorName || 'Clinician assigned'}</span>
                          <span className="ac-card__type-badge" style={{ background: type.bg, color: type.color }}>
                            {type.label}
                          </span>
                        </div>
                        <p className="ac-card__specialty">{consultation.doctorSpecialty || (consultation.isPediatric ? 'Paediatrics' : 'General medicine')}</p>
                        <p className="ac-card__datetime">{formatDateTime(activityDate)} · {consultation.reference}</p>
                      </div>
                    </div>

                    <div className="ac-card__right">
                      <span className="ac-card__status" style={{ color: status.color, background: status.bg }}>
                        {status.icon} {status.label}
                      </span>
                      <svg
                        className={`ac-card__chevron${isExpanded ? ' ac-card__chevron--open' : ''}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      >
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="ac-card__body">
                      <div className="ac-card__summary">
                        <p className="ac-card__summary-label">Reason for consultation</p>
                        <p className="ac-card__summary-text">{consultation.issue || 'No summary recorded yet.'}</p>
                      </div>

                      <div className="ac-card__info-grid">
                        <div>
                          <span>Status</span>
                          <strong>{status.label}</strong>
                        </div>
                        <div>
                          <span>Started</span>
                          <strong>{formatDateTime(consultation.createdAt)}</strong>
                        </div>
                        <div>
                          <span>Last activity</span>
                          <strong>{formatDateTime(activityDate)}</strong>
                        </div>
                      </div>

                      {consultation.isPediatric && (
                        <div className="ac-card__followup" style={{ color: '#7c3aed', background: 'rgba(124,58,237,0.08)' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="8" r="4"/>
                            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                          </svg>
                          Child: <strong>{consultation.childName || 'Not provided'}</strong> · Consent {consultation.consentStatus}
                        </div>
                      )}

                      <div className="ac-card__actions">
                        {!consultation.isPediatric && (consultation.status === 'waiting' || consultation.status === 'in_progress') && (
                          <button type="button" className="btn btn--primary btn--sm" onClick={() => { void openDoctorConsultation(consultation) }}>
                            Open chat
                          </button>
                        )}
                        {consultation.isPediatric && (consultation.status === 'waiting' || consultation.status === 'in_progress') && (
                          <Link to="/pediatric-consultation" className="btn btn--primary btn--sm">
                            Open paediatric chat
                          </Link>
                        )}
                        {!consultation.isPediatric && consultation.status === 'completed' && (
                          <button type="button" className="btn btn--primary btn--sm" onClick={startNewConsultation}>
                            Book follow-up
                          </button>
                        )}
                        {consultation.isPediatric && consultation.status === 'completed' && (
                          <Link to="/pediatric-consultation" className="btn btn--primary btn--sm">
                            Book paediatric follow-up
                          </Link>
                        )}
                        {consultation.status === 'completed' && (
                          <Link to="/prescriptions" className="btn btn--outline btn--sm">
                            Upload prescription
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <div className="ac-cta-row">
          <div className="ac-cta-card ac-cta-card--labs">
            <div className="ac-cta-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 2v6.5L4.4 18.4A2.4 2.4 0 0 0 6.5 22h11a2.4 2.4 0 0 0 2.1-3.6L14 8.5V2"/>
                <path d="M8 2h8"/>
                <path d="M7.5 15h9"/>
              </svg>
            </div>
            <div>
              <h3>Book lab tests</h3>
              <p>Choose tests, schedule sample collection, and track results from your account.</p>
            </div>
            <Link to="/lab-tests" className="btn btn--primary btn--sm ac-cta-card__btn">
              Browse tests
            </Link>
          </div>

          <div className="ac-cta-card ac-cta-card--rx">
            <div className="ac-cta-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path d="M14 2v6h6"/>
                <path d="M12 18v-6"/>
                <path d="M9 15h6"/>
              </svg>
            </div>
            <div>
              <h3>Upload prescription</h3>
              <p>Send your prescription for pharmacist review and continue to checkout when approved.</p>
            </div>
            <Link to="/prescriptions" className="btn btn--primary btn--sm ac-cta-card__btn">
              Upload now
            </Link>
          </div>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return <div className="dc-page" />
  }

  if (!isChatOpen && !showStartForm) {
    return renderConsultationWorkspace()
  }

  if (viewState === 'waiting' && currentConsultation) {
    return (
      <div className="dc-page">
        <div className="dc-waiting">
          <button type="button" className="dc-state-back" onClick={backToConsultationHub}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Back to consultations
          </button>
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
              <button type="button" className="btn btn--outline" onClick={backToConsultationHub}>
                View all consultations
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (viewState === 'chatting' && currentConsultation) {
    const clinicianName = currentConsultation.doctorName || assignedDoctor?.name || 'Assigned doctor'
    const clinicianSpecialty = currentConsultation.doctorSpecialty || assignedDoctor?.specialty || 'Doctor consultation'
    const consultationFee = assignedDoctor?.consultFee ?? 0
    const latestPrescription = currentConsultation.prescriptions?.[0] ?? null

    return (
      <div className="dc-page">
        <div className="container">
          <div className="dc-active-shell">
            <div className="dc-chat">
              <div className="dc-chat__header">
                <div className="dc-chat__doc-info">
                  <div className="dc-chat__doc-avatar">{getInitials(clinicianName)}</div>
                  <div>
                    <p className="dc-chat__doc-name">{clinicianName}</p>
                    <p className="dc-chat__doc-spec">
                      <span className="dc-chat__online-dot" />
                      {clinicianSpecialty}
                    </p>
                  </div>
                </div>
                <div className="dc-chat__header-actions">
                  <button type="button" className="dc-chat__history-link" onClick={() => { setIsChatOpen(false); setShowStartForm(false) }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                    Back to consultations
                  </button>
                  <button className="btn btn--outline btn--sm dc-chat__end-btn" type="button" onClick={() => setShowEndConfirm(true)}>
                    End Consultation
                  </button>
                </div>
              </div>

              <div className="dc-chat__notice">
                <span>Active consultation</span>
                <p>Share updates, symptoms, medication use, allergies, or photos requested by your doctor.</p>
              </div>

              <div className="dc-chat__messages">
                {currentConsultation.messages.length === 0 && (
                  <div className="dc-msg dc-msg--doctor">
                    <div className="dc-msg__avatar">{getInitials(clinicianName)}</div>
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
                        <div className="dc-msg__avatar">{getInitials(clinicianName)}</div>
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
                <p className="dc-chat__typing">{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</p>
              )}
              <div className="dc-chat__input">
                <input
                  type="text"
                  placeholder="Type your message..."
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
              {submitError && <p className="dc-field-error dc-chat__error">{submitError}</p>}
            </div>

            <aside className="dc-chat-panel" aria-label="Consultation details">
              <div className="dc-chat-panel__card dc-chat-panel__card--doctor">
                <div className="dc-chat-panel__avatar">{getInitials(clinicianName)}</div>
                <div>
                  <p className="dc-chat-panel__eyebrow">Your doctor</p>
                  <h2>{clinicianName}</h2>
                  <span>{clinicianSpecialty}</span>
                </div>
              </div>

              <div className="dc-chat-panel__card">
                <p className="dc-chat-panel__title">Consultation summary</p>
                <div className="dc-chat-detail">
                  <span>Reference</span>
                  <strong>{currentConsultation.reference}</strong>
                </div>
                <div className="dc-chat-detail">
                  <span>Started</span>
                  <strong>{formatDateTime(currentConsultation.createdAt)}</strong>
                </div>
                <div className="dc-chat-detail">
                  <span>Status</span>
                  <strong>In progress</strong>
                </div>
                {consultationFee > 0 && (
                  <div className="dc-chat-detail">
                    <span>Estimated fee</span>
                    <strong>KSh {consultationFee.toLocaleString()}</strong>
                  </div>
                )}
              </div>

              <div className="dc-chat-panel__card">
                <p className="dc-chat-panel__title">Original concern</p>
                <p className="dc-chat-panel__issue">{currentConsultation.issue || 'No symptom summary recorded.'}</p>
              </div>

              <div className={`dc-chat-panel__card dc-prescription-status ${latestPrescription ? 'dc-prescription-status--issued' : ''}`}>
                <div className="dc-prescription-status__top">
                  <div className="dc-prescription-status__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <path d="M14 2v6h6"/>
                      <path d="M12 18v-6"/>
                      <path d="M9 15h6"/>
                    </svg>
                  </div>
                  <div>
                    <p className="dc-chat-panel__title">Prescription</p>
                    <p className="dc-prescription-status__state">
                      {latestPrescription ? 'Issued by your doctor' : 'Not issued yet'}
                    </p>
                  </div>
                </div>
                {latestPrescription ? (
                  <>
                    <div className="dc-chat-detail">
                      <span>Reference</span>
                      <strong>{latestPrescription.reference}</strong>
                    </div>
                    <div className="dc-chat-detail">
                      <span>Items</span>
                      <strong>{latestPrescription.itemsCount}</strong>
                    </div>
                    <div className="dc-chat-detail">
                      <span>Status</span>
                      <strong>{latestPrescription.status}</strong>
                    </div>
                    <Link to="/prescriptions/history" className="dc-prescription-status__link">
                      View prescription
                    </Link>
                  </>
                ) : (
                  <p className="dc-prescription-status__copy">
                    If medicine is needed, your doctor will issue an e-prescription here. It will then move to pharmacist review.
                  </p>
                )}
              </div>

              <div className="dc-chat-panel__card dc-chat-panel__tips">
                <p className="dc-chat-panel__title">Helpful to send</p>
                <ul>
                  <li>When symptoms started</li>
                  <li>Current medicines or allergies</li>
                  <li>Any worsening or urgent signs</li>
                </ul>
              </div>

              <a href={`tel:${formatPhoneHref(settings.supportPhone)}`} className="dc-emergency-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Emergency? Call now
              </a>
            </aside>
          </div>
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
    return renderConsultationWorkspace()
  }

  return (
    <div className="dc-page">
      <a href="#dc-form" className="skip-to-content">Skip to form</a>

      <section className="page-hero page-hero--doctor">
        <div className="container">
          <button type="button" className="dc-back-btn dc-back-btn--hero" onClick={backToConsultationHub}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Back to consultations
          </button>
          <nav className="svc-hero__breadcrumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/health-services">Health Services</Link>
            <span>/</span>
            <span>Doctor Consultation</span>
          </nav>
          <h1 className="svc-hero__title">Doctor Consultation</h1>
          <p className="svc-hero__sub">Start a secure chat with a licensed doctor, share symptoms, and receive clinical guidance or a digital prescription when appropriate.</p>
          <div className="page-hero__pills">
            <span className="page-hero__pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Licensed &amp; verified</span>
            <span className="page-hero__pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Encrypted &amp; private</span>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="dc-body" id="dc-form">
          <div className="dc-form-card">
            <div className="dc-form-card__header">
              <div>
                <p className="dc-section-kicker">Secure doctor chat</p>
                <h2 className="dc-form-card__title">Start your consultation</h2>
                <p className="dc-form-card__sub">Tell the doctor what is happening. We will use this to route your request and open the chat.</p>
              </div>
              <span className="dc-form-card__badge">{queueLabel}</span>
            </div>

            {loadError && <p className="dc-field-error" style={{ marginBottom: '1rem' }}>{loadError}</p>}
            {submitError && <p className="dc-field-error" style={{ marginBottom: '1rem' }}>{submitError}</p>}

            <form onSubmit={handleSubmit} noValidate>
              <div className="dc-form-section">
                <div className="dc-form-section__heading">
                  <span>1</span>
                  <div>
                    <h3>Your contact details</h3>
                    <p>Used for consultation updates and follow-up notes.</p>
                  </div>
                </div>
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
              </div>

              <div className="dc-form-section">
                <div className="dc-form-section__heading">
                  <span>2</span>
                  <div>
                    <h3>Care preference</h3>
                    <p>Choose a specialty or leave it open for the fastest available doctor.</p>
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
              </div>

              <div className="dc-form-section">
                <div className="dc-form-section__heading">
                  <span>3</span>
                  <div>
                    <h3>Symptoms</h3>
                    <p>Add enough detail for the doctor to make the first response useful.</p>
                  </div>
                </div>
              <div className="dc-field dc-field--compact">
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

              <div className="dc-field">
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
              </div>

              <button type="submit" className="btn btn--primary dc-submit-btn" disabled={isSubmitting || !formData.symptoms.trim()}>
                Continue to payment
              </button>
            </form>

            {paymentStatus !== 'idle' && pendingPayload && (
              <div className="dc-payment-card" id="dc-payment-step">
                <div className="dc-payment-card__header">
                  <div>
                    <p className="dc-section-kicker">Payment required</p>
                    <h3>Pay consultation fee</h3>
                    <p>Payment is required before your request enters the doctor queue. Medicines, lab tests, and delivery are billed separately if needed.</p>
                  </div>
                  <strong>KSh {paymentPlaceholderAmount.toLocaleString()}</strong>
                </div>

                <div className="dc-payment-methods" aria-label="Consultation payment method">
                  <button
                    type="button"
                    className={`dc-payment-method${mpesaFlow === 'stk' ? ' dc-payment-method--active' : ''}`}
                    onClick={() => {
                      setMpesaFlow('stk')
                      setPaymentStatus('review')
                      setPaymentIntent(null)
                      setPaymentNotice('Send an STK Push and complete payment on your phone.')
                    }}
                    disabled={isSubmitting}
                  >
                    <span>STK Push</span>
                    <small>Prompt sent to your phone</small>
                  </button>
                  <button
                    type="button"
                    className={`dc-payment-method${mpesaFlow === 'paybill' ? ' dc-payment-method--active' : ''}`}
                    onClick={() => {
                      setMpesaFlow('paybill')
                      setPaymentStatus('review')
                      setPaymentIntent(null)
                      setPaymentNotice('Create Paybill details, pay via M-Pesa, then use Confirm payment to continue.')
                    }}
                    disabled={isSubmitting}
                  >
                    <span>Paybill</span>
                    <small>Pay manually via M-Pesa</small>
                  </button>
                </div>

                {mpesaFlow === 'stk' && (
                  <div className="dc-field dc-payment-phone">
                    <label htmlFor="dc-mpesa-phone">M-Pesa number</label>
                    <input
                      id="dc-mpesa-phone"
                      type="tel"
                      value={mpesaPhone}
                      onChange={(event) => setMpesaPhone(event.target.value)}
                      placeholder="0712345678"
                    />
                  </div>
                )}

                {mpesaFlow === 'paybill' && (
                  <div className="dc-paybill-box">
                    <div className="dc-paybill-box__row">
                      <span>Paybill Number</span>
                      <strong>{paymentIntent?.paybillNumber || 'Create reference first'}</strong>
                    </div>
                    <div className="dc-paybill-box__row">
                      <span>{paymentIntent?.paybillAccountLabel || 'Account Number'}</span>
                      <strong>{paymentIntent?.paybillAccountReference || 'Create reference first'}</strong>
                    </div>
                    <div className="dc-paybill-box__row">
                      <span>Amount</span>
                      <strong>KSh {(paymentIntent?.amount || paymentPlaceholderAmount).toLocaleString()}</strong>
                    </div>
                    <p className="dc-paybill-box__hint">
                      After paying through M-Pesa, click Confirm payment. The chat opens only after payment is verified.
                    </p>
                  </div>
                )}

                <div className={`dc-payment-notice dc-payment-notice--${paymentStatus}`}>
                  {paymentStatus === 'processing' && <span className="dc-payment-spinner" />}
                  <p>{paymentNotice}</p>
                </div>

                <div className="dc-payment-actions">
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => {
                      setPaymentStatus('idle')
                      setPaymentNotice('')
                      setPendingPayload(null)
                      setPaymentIntent(null)
                    }}
                    disabled={isSubmitting}
                  >
                    Edit details
                  </button>
                  {paymentStatus !== 'waiting' && (
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => { void handleInitiateConsultationPayment() }}
                      disabled={isSubmitting}
                    >
                      {mpesaFlow === 'stk' ? `Send STK Push for KSh ${paymentPlaceholderAmount.toLocaleString()}` : 'Create Paybill payment reference'}
                    </button>
                  )}
                  {paymentStatus === 'waiting' && (
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => { void handleConfirmConsultationPayment() }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Confirming payment...' : mpesaFlow === 'paybill' ? 'Confirm payment' : 'Check payment status'}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="dc-steps">
              {[
                { n: '1', label: 'Fill details', desc: 'Provide your symptoms and contact details' },
                { n: '2', label: 'Pay fee', desc: 'Confirm the consultation payment before queueing' },
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

          <aside className="dc-sidebar" aria-label="Consultation support panel">
            <div className="dc-sidebar__card dc-fee-card dc-care-summary">
              <div className="dc-care-summary__top">
                <div>
                  <p className="dc-fee-card__label">Consultation fee</p>
                  <p className="dc-fee-card__amount">KSh {paymentPlaceholderAmount.toLocaleString()}</p>
                </div>
                <span>{queueLabel}</span>
              </div>
              <p className="dc-fee-card__note">This fee is paid before your request joins the doctor queue. Medicines, lab tests, and delivery are billed separately.</p>
              <div className="dc-fee-card__includes">
                <p className="dc-fee-card__includes-title">Includes:</p>
                <div className="dc-include-grid">
                  <span>Secure chat</span>
                  <span>Clinical notes</span>
                  <span>Digital prescription</span>
                  <span>Saved history</span>
                </div>
              </div>
            </div>

            <div className="dc-sidebar__card dc-routing-card">
              <div className="dc-sidebar__title-row">
                <p className="dc-sidebar__card-title">Care routing</p>
                <span>{routingDoctorsCount} available</span>
              </div>
              <p className="dc-routing-card__copy">
                Choose a specialty or leave it open. After payment, we assign your request to an available verified doctor.
              </p>
              <div className="dc-routing-card__summary">
                <div>
                  <span>Routing preference</span>
                  <strong>{routingLabel}</strong>
                </div>
              </div>
            </div>

            <div className="dc-sidebar__card dc-trust-card">
              <p className="dc-sidebar__card-title">Before you start</p>
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
