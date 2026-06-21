import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { PrescriptionRecord } from '../../data/prescriptions'
import { formatPhoneHref } from '../../services/siteSettingsService'
import { prescriptionService } from '../../services/prescriptionService'
import {
  ClinicianSummary,
  CreateConsultationPayload,
  ConsultationPaymentIntent,
  ConsultationPrescriptionSummary,
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
type ConsultationStatusKey = ConsultationRecord['status']
type StatusFilter = 'all' | ConsultationStatusKey
type MpesaFlow = 'stk' | 'paybill'
type ConsultationPaymentStatus = 'idle' | 'review' | 'waiting' | 'processing' | 'confirmed' | 'failed'

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

function getTypeConfig(_consultation: ConsultationRecord) {
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

function formatPrescriptionItemSchedule(item: ConsultationPrescriptionSummary['items'][number]) {
  const seen = new Set<string>()
  return [item.dose, item.frequency, item.duration]
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false
      const key = part.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .join(' · ')
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
  const [showManualPaymentCheck, setShowManualPaymentCheck] = useState(false)
  const [mpesaPhone, setMpesaPhone] = useState(user?.phone ?? '')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isEndingConsultation, setIsEndingConsultation] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [activePrescriptionModal, setActivePrescriptionModal] = useState<{
    consultation: ConsultationRecord
    prescription: ConsultationPrescriptionSummary
  } | null>(null)
  const [customerPrescriptions, setCustomerPrescriptions] = useState<PrescriptionRecord[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const finalizingPaymentIntentRef = useRef<number | null>(null)

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
    const refreshPrescriptions = () => {
      void prescriptionService.list({ scope: 'patient' }).then((response) => {
        if (isMounted) setCustomerPrescriptions(response.data)
      }).catch(() => undefined)
    }
    refreshPrescriptions()
    const intervalId = window.setInterval(refreshPrescriptions, 10000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshPrescriptions()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      isMounted = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setIsLoading(true)
      setLoadError('')
      try {
        const [doctorList, consultations] = await Promise.all([fetchDoctors(), fetchMyConsultations()])
        if (!isMounted) return

        const activeDoctors = doctorList.filter((doctor) => doctor.status === 'active')
        const doctorConsultations = consultations.filter((consultation) => !consultation.isPediatric)
        setDoctors(activeDoctors)
        setConsultations(sortConsultations(doctorConsultations))

        const activeConsultation = doctorConsultations.find(
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

  const token = typeof window !== 'undefined' ? (localStorage.getItem('ava_access_token') ?? null) : null
  const socketConsultationId = currentConsultation
    && isChatOpen
    && (currentConsultation.status === 'in_progress' || currentConsultation.messages.length > 0)
    ? currentConsultation.id
    : null
  const { messages: wsMessages, isConnected: wsConnected, typingUsers, sendMessage: wsSend, sendTyping } = useConsultationSocket(
    socketConsultationId,
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
  const paymentPlaceholderAmount = CONSULTATION_PAYMENT_PLACEHOLDER
  const queueLabel = formData.urgency === 'Urgent' ? 'Priority queue' : 'Standard queue'
  const routingLabel = formData.specialty || 'General consultation'
  const hubFiltered = useMemo(() => {
    if (activeStatus === 'all') return consultations
    return consultations.filter((consultation) => consultation.status === activeStatus)
  }, [activeStatus, consultations])
  const hubTypedConsultations = consultations
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

  const handleAddPrescriptionToCart = async (_consultation: ConsultationRecord, prescription: ConsultationPrescriptionSummary) => {
    const dispensingPrescription = customerPrescriptions.find((item) => item.clinicianPrescriptionId === prescription.id)
    if (!dispensingPrescription || dispensingPrescription.status !== 'Approved') {
      setSubmitError('This prescription is still awaiting pharmacist approval.')
      return
    }

    const eligibleItems = dispensingPrescription.items.filter((item) => !item.isPaidFor && item.backendId && (item.productId || item.variantId))
    if (!eligibleItems.length) {
      setSubmitError('This prescription has no approved unpaid medicines available for cart addition.')
      return
    }

    setSubmitError('')
    try {
      for (const item of eligibleItems) {
        await prescriptionService.addApprovedItemToCart(dispensingPrescription.id, item.backendId as number)
      }
    } catch {
      setSubmitError('Unable to add this prescription to cart right now.')
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
    setPendingPayload({
      doctor: null,
      patient_name: formData.name.trim(),
      patient_email: formData.email.trim(),
      patient_phone: formData.phone.trim(),
      issue: formData.symptoms.trim(),
      requested_specialty: formData.specialty.trim(),
      priority: formData.urgency === 'Urgent' ? 'priority' : 'routine',
    })
    setMpesaFlow('stk')
    setPaymentIntent(null)
    setShowManualPaymentCheck(false)
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
    setShowManualPaymentCheck(false)
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
          ? `STK Push sent to ${intent.phoneNumber || mpesaPhone}. Waiting for M-Pesa confirmation...`
          : 'Use the Paybill details shown. We will confirm the payment automatically once Safaricom sends the payment update.',
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

  const handleFinalizePaidIntent = useCallback(async (intent: ConsultationPaymentIntent) => {
    if (intent.status !== 'succeeded') {
      setPaymentNotice('Payment confirmation has not reached us yet. Keep this page open while we continue checking.')
      return
    }
    if (finalizingPaymentIntentRef.current === intent.id) return
    finalizingPaymentIntentRef.current = intent.id
    setPaymentStatus('confirmed')
    setPaymentNotice('Payment confirmed. Starting your consultation...')
    try {
      const created = await finalizePaidConsultation(intent.id)
      setCurrentConsultation(created)
      setConsultations((prev) => sortConsultations([created, ...prev.filter((item) => item.id !== created.id)]))
      setPaymentStatus('confirmed')
      setPendingPayload(null)
      setPaymentIntent({ ...intent, consultation: created.id })
      setShowManualPaymentCheck(false)
      setIsChatOpen(true)
      setShowStartForm(false)
    } catch (error) {
      finalizingPaymentIntentRef.current = null
      const message = apiErrorMessage(error, 'Payment was confirmed, but we could not start the consultation automatically. Please check again.')
      setPaymentStatus('waiting')
      setShowManualPaymentCheck(true)
      setPaymentNotice(message)
      setSubmitError(message)
    }
  }, [])

  const handleConfirmConsultationPayment = async () => {
    if (!paymentIntent) {
      setSubmitError('Start an M-Pesa payment first.')
      return
    }
    setIsSubmitting(true)
    setSubmitError('')
    setShowManualPaymentCheck(false)
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
        setPaymentNotice(intent.lastError || 'Payment confirmation has not reached us yet. We are still checking automatically.')
      }
    } catch (error) {
      const message = apiErrorMessage(error, 'Payment confirmation has not reached us yet. Keep this page open while we continue checking.')
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
          setPaymentStatus('confirmed')
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
  }, [handleFinalizePaidIntent, paymentIntent?.id, paymentStatus])

  useEffect(() => {
    if (paymentStatus !== 'waiting') {
      setShowManualPaymentCheck(false)
      return undefined
    }
    const timer = window.setTimeout(() => {
      setShowManualPaymentCheck(true)
    }, 60000)
    return () => window.clearTimeout(timer)
  }, [paymentStatus, paymentIntent?.id])

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

  const openPrescriptionModal = (consultation: ConsultationRecord, prescription: ConsultationPrescriptionSummary) => {
    setActivePrescriptionModal({ consultation, prescription })
  }

  const renderPrescriptionModal = () => {
    if (!activePrescriptionModal) return null
    const { consultation, prescription } = activePrescriptionModal
    const modalStatus = prescription.status === 'sent' ? 'Under pharmacist review' : prescription.status
    const prescriptionItems = prescription.items ?? []
    const doctorNotes = prescription.notes.trim()
    const itemTotal = prescriptionItems.length || prescription.itemsCount
    const itemCountLabel = `${itemTotal} item${itemTotal === 1 ? '' : 's'}`

    return (
      <div className="dc-rx-modal" role="dialog" aria-modal="true" aria-labelledby="dc-rx-modal-title">
        <div className="dc-rx-modal__backdrop" onClick={() => setActivePrescriptionModal(null)} />
        <div className="dc-rx-modal__panel">
          <div className="dc-rx-modal__header">
            <div>
              <p className="dc-rx-modal__eyebrow">Prescription</p>
              <h2 id="dc-rx-modal-title">{prescription.reference}</h2>
            </div>
            <button type="button" className="dc-rx-modal__close" onClick={() => setActivePrescriptionModal(null)} aria-label="Close prescription details">
              ×
            </button>
          </div>

          <div className="dc-rx-modal__notice">
            <strong>Pharmacist review in progress</strong>
            <span>Your doctor has issued this prescription. A pharmacist will review it before checkout and payment.</span>
          </div>

          <dl className="dc-rx-modal__details">
            <div>
              <dt>Consultation</dt>
              <dd>{consultation.reference}</dd>
            </div>
            <div>
              <dt>Doctor</dt>
              <dd>{consultation.doctorName || 'Assigned doctor'}</dd>
            </div>
            <div>
              <dt>Items</dt>
              <dd>{itemTotal}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{modalStatus}</dd>
            </div>
            <div>
              <dt>Issued</dt>
              <dd>{formatDateTime(prescription.sentAt || prescription.createdAt)}</dd>
            </div>
          </dl>

          {prescriptionItems.length > 0 && (
            <section className="dc-rx-modal__section" aria-label="Medication details">
              <div className="dc-rx-modal__section-head">
                <h3>Medication details</h3>
                <span>{itemCountLabel}</span>
              </div>
              <ul className="dc-rx-modal__items">
                {prescriptionItems.map((item, index) => {
                  const medicineName = item.drugName || item.catalogName || 'Medication'
                  const schedule = formatPrescriptionItemSchedule(item)
                  const catalogLabel = item.catalogName && item.catalogName !== medicineName ? item.catalogName : ''

                  return (
                    <li key={`${medicineName}-${index}`} className="dc-rx-modal__item">
                      <div className="dc-rx-modal__item-top">
                        <div>
                          <strong>{medicineName}</strong>
                          {catalogLabel && <span>{catalogLabel}</span>}
                        </div>
                        <em>Qty {item.quantity}</em>
                      </div>
                      {(schedule || item.sku) && (
                        <div className="dc-rx-modal__item-meta">
                          {schedule && <span>{schedule}</span>}
                          {item.sku && <span>{item.sku}</span>}
                        </div>
                      )}
                      {item.notes && <p>{item.notes}</p>}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {doctorNotes && (
            <section className="dc-rx-modal__section dc-rx-modal__section--notes" aria-label="Doctor notes">
              <div className="dc-rx-modal__section-head">
                <h3>Doctor notes</h3>
              </div>
              <p>{doctorNotes}</p>
            </section>
          )}

          <div className="dc-rx-modal__actions">
            <Link to="/prescriptions" className="btn btn--primary btn--sm" onClick={() => setActivePrescriptionModal(null)}>
              Open prescriptions
            </Link>
            <button
              type="button"
              className="btn btn--primary btn--sm dc-add-to-cart-btn"
              onClick={() => { void handleAddPrescriptionToCart(consultation, prescription) }}
            >
              Add to cart
            </button>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setActivePrescriptionModal(null)}>
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderConsultationWorkspace = () => (
    <>
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
              const latestCardPrescription = consultation.prescriptions?.[0] ?? null
              const dispensingPrescription = latestCardPrescription
                ? customerPrescriptions.find((prescription) => prescription.clinicianPrescriptionId === latestCardPrescription.id) ?? null
                : null

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
                          <span className="ac-card__doctor">{consultation.doctorName || 'Waiting for doctor'}</span>
                          <span className="ac-card__type-badge" style={{ background: type.bg, color: type.color }}>
                            {type.label}
                          </span>
                        </div>
                        <p className="ac-card__specialty">{consultation.doctorSpecialty || 'General medicine'}</p>
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

                      {latestCardPrescription && (
                        <div className="ac-card__followup dc-card-rx-alert">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <path d="M14 2v6h6"/>
                            <path d="M12 18v-6"/>
                            <path d="M9 15h6"/>
                          </svg>
                          Prescription <strong>{latestCardPrescription.reference}</strong>{' '}
                          {dispensingPrescription?.status === 'Approved'
                            ? 'has been approved and is ready for checkout.'
                            : dispensingPrescription?.status === 'Clarification'
                              ? 'needs clarification before it can be approved.'
                              : dispensingPrescription?.status === 'Rejected'
                                ? 'was not approved. Review the pharmacist notes.'
                                : 'is awaiting pharmacist approval.'}
                        </div>
                      )}

                      <div className="ac-card__actions">
                        {(consultation.status === 'waiting' || consultation.status === 'in_progress') && (
                          <button type="button" className="btn btn--primary btn--sm" onClick={() => { void openDoctorConsultation(consultation) }}>
                            Open chat
                          </button>
                        )}
                        {consultation.status === 'completed' && (
                          <button type="button" className="btn btn--primary btn--sm" onClick={startNewConsultation}>
                            Book follow-up
                          </button>
                        )}
                        {latestCardPrescription && (
                          <Link to={dispensingPrescription?.backendId ? `/prescriptions?prescription=${dispensingPrescription.backendId}` : '/prescriptions'} className="btn btn--outline btn--sm dc-view-rx-btn">
                            View prescription
                          </Link>
                        )}
                        {latestCardPrescription && (
                          <Link to={dispensingPrescription?.backendId ? `/prescriptions?prescription=${dispensingPrescription.backendId}` : '/prescriptions'} className="btn btn--primary btn--sm dc-add-to-cart-btn">
                            Add items to cart
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
      {renderPrescriptionModal()}
    </>
  )

  if (isLoading) {
    return <div className="dc-page" />
  }

  if (!isChatOpen && !showStartForm) {
    return renderConsultationWorkspace()
  }

  if (viewState === 'waiting' && currentConsultation) {
    return (
      <>
      <div className="dc-page">
        <div className="dc-waiting">
          <div className="dc-waiting__shell">
            <section className="dc-waiting__summary" aria-label="Consultation status">
              <button type="button" className="dc-state-back" onClick={backToConsultationHub}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                Back
              </button>
              <span className="dc-waiting__eyebrow">Doctor consultation</span>
              <h1>Waiting for doctor</h1>
              <p className="dc-waiting__lead">Your request is in the doctor queue. Keep this page open and the chat will appear when the clinician joins.</p>
              <div className="dc-waiting__reference">
                <span>Reference</span>
                <strong>{currentConsultation.reference}</strong>
              </div>
              <div className="dc-waiting__steps" aria-label="Progress">
                <div className="dc-waiting__step dc-waiting__step--done">
                  <span>1</span>
                  <p>Request received</p>
                </div>
                <div className="dc-waiting__step dc-waiting__step--active">
                  <span>2</span>
                  <p>Doctor joining</p>
                </div>
                <div className="dc-waiting__step">
                  <span>3</span>
                  <p>Chat starts</p>
                </div>
              </div>
            </section>

            <div className="dc-waiting__card">
              <div className="dc-waiting__card-top">
                <div className="dc-waiting__avatar-wrap">
                  <div className="dc-waiting__pulse-ring" />
                  <div className="dc-waiting__avatar">{getInitials(currentConsultation.doctorName || assignedDoctor?.name || 'DR')}</div>
                </div>
                <div>
                  <span className="dc-waiting__status-badge">Request received</span>
                  <p className="dc-waiting__doctor-name">{currentConsultation.doctorName || assignedDoctor?.name || 'Waiting for doctor'}</p>
                  <p className="dc-waiting__doctor-spec">{currentConsultation.doctorSpecialty || assignedDoctor?.specialty || currentConsultation.requestedSpecialty || 'General consultation'}</p>
                </div>
              </div>

              <div className="dc-waiting__meta">
                <div className="dc-waiting__meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>{formatDateTime(currentConsultation.createdAt)}</span>
                </div>
                <div className="dc-waiting__meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span>Doctor queue</span>
                </div>
              </div>

              <div className="dc-waiting__status-line">
                <div className="dc-waiting__connecting">
                  <span /><span /><span />
                </div>
                <p>Refreshing automatically</p>
              </div>
              <p className="dc-waiting__tip">You can leave and return from your consultation history if needed.</p>
              {submitError && <p className="dc-field-error dc-waiting__error">{submitError}</p>}
              <div className="dc-waiting__actions">
                <button type="button" className="btn btn--primary btn--sm" onClick={() => { void handleRefreshConsultation() }}>
                  Refresh
                </button>
                <button type="button" className="btn btn--outline btn--sm" onClick={backToConsultationHub}>
                  View all
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {renderPrescriptionModal()}
      </>
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
                      {latestPrescription ? 'Issued and under pharmacist review' : 'Not issued yet'}
                    </p>
                  </div>
                </div>
                {latestPrescription ? (
                  <>
                    <p className="dc-prescription-status__alert">
                      Your doctor has issued a prescription. A pharmacist is reviewing it for processing. Once approved, you can proceed with payment.
                    </p>
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
                    <button
                      type="button"
                      className="dc-prescription-status__link"
                      onClick={() => openPrescriptionModal(currentConsultation, latestPrescription)}
                    >
                      View prescription
                    </button>
                  </>
                ) : (
                  <p className="dc-prescription-status__copy">
                    If medicine is needed, your doctor will issue an e-prescription here. It will then move to pharmacist review.
                  </p>
                )}
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
                    <p>Choose a specialty or leave it as a general consultation.</p>
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
                    <option value="">General consultation</option>
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
                      setShowManualPaymentCheck(false)
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
                      setShowManualPaymentCheck(false)
                      setPaymentNotice('Create Paybill details and pay via M-Pesa. We will confirm it automatically.')
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
                      After paying through M-Pesa, keep this page open. We will open the chat once the payment is verified.
                    </p>
                  </div>
                )}

                <div className={`dc-payment-notice dc-payment-notice--${paymentStatus}`}>
                  {(paymentStatus === 'processing' || paymentStatus === 'waiting') && <span className="dc-payment-spinner" />}
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
                      setShowManualPaymentCheck(false)
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
                  {paymentStatus === 'waiting' && showManualPaymentCheck && (
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
              <p className="dc-fee-card__note">Paid before your request joins the doctor queue. Medicines, lab tests, and delivery are billed separately.</p>
              <div className="dc-fee-card__includes">
                <p className="dc-fee-card__includes-title">Includes</p>
                <div className="dc-include-grid">
                  <span>Secure chat</span>
                  <span>Clinical notes</span>
                  <span>Digital Rx</span>
                  <span>Saved history</span>
                </div>
              </div>
              <div className="dc-fee-card__routing">
                <span>Routed to</span>
                <strong>{routingLabel}</strong>
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
