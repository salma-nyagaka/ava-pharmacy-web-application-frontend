import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { formatPhoneHref } from '../../services/siteSettingsService'
import {
  ChildPatient,
  ClinicianSummary,
  ConsultationPaymentIntent,
  ConsultationRecord,
  createChildPatient,
  createConsultationPaymentIntent,
  fetchConsultation,
  fetchGuardianChildren,
  fetchMyConsultations,
  fetchPediatricians,
  finalizePaidConsultation,
  grantConsultationConsent,
  sendConsultationMessage,
  syncConsultationPaymentIntent,
  updateChildPatient,
  updateConsultation,
} from '../../services/consultationService'
import '../../styles/pages/ConsultationPage.css'
import '../../styles/pages/AccountConsultationsPage.css'

type ConsultationViewState = 'form' | 'waiting' | 'chatting' | 'completed'
type ConsultationStatusKey = ConsultationRecord['status']
type StatusFilter = 'all' | ConsultationStatusKey
type HubView = 'consultations' | 'children'
type PediatricPaymentStage = 'idle' | 'processing' | 'waiting' | 'completed' | 'failed'
type ChildProfileDraft = {
  fullName: string
  ageYears: string
  gender: string
  weightKg: string
  allergies: string
  chronicConditions: string
  currentMedications: string
  vaccinationNotes: string
  notes: string
}

const PEDIATRIC_CARE_NEEDS = [
  'General pediatric consultation',
  'Fever or infection',
  'Cough, cold, or breathing concern',
  'Stomach pain, vomiting, or diarrhea',
  'Skin rash or allergy',
  'Growth, feeding, or nutrition',
  'Newborn or infant care',
  'Vaccination guidance',
  'Development or behavior concern',
  'Medication review',
  'Other child health concern',
]

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

const PEDIATRIC_TYPE = { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', label: 'Paediatric' }
const NEW_CHILD_VALUE = 'new'

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function splitChildName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  }
}

function childAgeLabel(child: ChildPatient) {
  if (child.ageYears != null) return `${child.ageYears} year${child.ageYears === 1 ? '' : 's'}`
  if (child.dateOfBirth) return `Born ${child.dateOfBirth}`
  return 'Age not recorded'
}

function childToDraft(child: ChildPatient): ChildProfileDraft {
  return {
    fullName: child.fullName,
    ageYears: child.ageYears == null ? '' : String(child.ageYears),
    gender: child.gender,
    weightKg: child.weightKg ?? '',
    allergies: child.allergies.join(', '),
    chronicConditions: child.chronicConditions.join(', '),
    currentMedications: child.currentMedications.join(', '),
    vaccinationNotes: child.vaccinationNotes,
    notes: child.notes,
  }
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

function sortConsultations(items: ConsultationRecord[]) {
  return [...items].sort((a, b) => {
    const left = new Date(a.scheduledAt || a.lastMessageAt || a.createdAt).getTime()
    const right = new Date(b.scheduledAt || b.lastMessageAt || b.createdAt).getTime()
    return right - left
  })
}

function PediatricianConsultation() {
  const { user } = useAuth()
  const { settings } = useSiteSettings()
  const [pediatricians, setPediatricians] = useState<ClinicianSummary[]>([])
  const [children, setChildren] = useState<ChildPatient[]>([])
  const [consultations, setConsultations] = useState<ConsultationRecord[]>([])
  const [currentConsultation, setCurrentConsultation] = useState<ConsultationRecord | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [showStartForm, setShowStartForm] = useState(false)
  const [activeHubView, setActiveHubView] = useState<HubView>('consultations')
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [selectedPediatricianId, setSelectedPediatricianId] = useState<number | null>(null)
  const [selectedChildId, setSelectedChildId] = useState<string>(NEW_CHILD_VALUE)
  const [editingChildId, setEditingChildId] = useState<number | null>(null)
  const [childDraft, setChildDraft] = useState<ChildProfileDraft | null>(null)
  const [childProfileNotice, setChildProfileNotice] = useState('')
  const [childProfileError, setChildProfileError] = useState('')
  const [isSavingChildProfile, setIsSavingChildProfile] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [formData, setFormData] = useState({
    parentName: user?.name ?? '',
    childName: '',
    childAge: '',
    childGender: '',
    childWeightKg: '',
    childAllergies: '',
    childChronicConditions: '',
    childCurrentMedications: '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    careNeed: 'General pediatric consultation',
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
  const [paymentIntent, setPaymentIntent] = useState<ConsultationPaymentIntent | null>(null)
  const [paymentNotice, setPaymentNotice] = useState('')
  const [paymentStage, setPaymentStage] = useState<PediatricPaymentStage>('idle')
  const [isCheckingPayment, setIsCheckingPayment] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const finalizingPaymentIntentRef = useRef<number | null>(null)

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
        const [providers, consultations, childProfiles] = await Promise.all([fetchPediatricians(), fetchMyConsultations(), fetchGuardianChildren().catch(() => [])])
        if (!isMounted) return

        const activeProviders = providers.filter((provider) => provider.status === 'active')
        setPediatricians(activeProviders)
        setChildren(childProfiles)
        setSelectedPediatricianId(activeProviders[0]?.id ?? null)
        setConsultations(sortConsultations(consultations.filter((consultation) => consultation.isPediatric)))
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
    if (!isChatOpen || !currentConsultation || !['waiting', 'in_progress'].includes(currentConsultation.status)) return undefined

    const timer = window.setInterval(async () => {
      try {
        const detail = await fetchConsultation(currentConsultation.id)
        setCurrentConsultation(detail)
        setConsultations((prev) => sortConsultations(prev.map((item) => (item.id === detail.id ? detail : item))))
      } catch {
        // Ignore transient polling errors.
      }
    }, 2500)

    return () => window.clearInterval(timer)
  }, [currentConsultation?.id, currentConsultation?.status, isChatOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentConsultation?.messages.length])

  const selectedPediatrician = useMemo(
    () => pediatricians.find((provider) => provider.id === selectedPediatricianId) ?? pediatricians[0] ?? null,
    [pediatricians, selectedPediatricianId],
  )
  const selectedChild = useMemo(
    () => children.find((child) => String(child.id) === selectedChildId) ?? null,
    [children, selectedChildId],
  )
  const isUsingRegisteredChild = Boolean(selectedChild)

  const viewState = mapViewState(currentConsultation)
  const assignedPediatrician = useMemo(() => {
    if (currentConsultation?.pediatrician) {
      return pediatricians.find((provider) => provider.id === currentConsultation.pediatrician) ?? null
    }
    return selectedPediatrician
  }, [currentConsultation?.pediatrician, pediatricians, selectedPediatrician])

  const filteredConsultations = useMemo(() => {
    if (activeStatus === 'all') return consultations
    return consultations.filter((consultation) => consultation.status === activeStatus)
  }, [activeStatus, consultations])

  const statusCounts = useMemo(() => ({
    waiting: consultations.filter((consultation) => consultation.status === 'waiting').length,
    in_progress: consultations.filter((consultation) => consultation.status === 'in_progress').length,
    completed: consultations.filter((consultation) => consultation.status === 'completed').length,
  }), [consultations])

  const openPediatricConsultation = async (consultation: ConsultationRecord) => {
    setSubmitError('')
    try {
      const detail = await fetchConsultation(consultation.id)
      setCurrentConsultation(detail)
      setConsultations((prev) => sortConsultations(prev.map((item) => (item.id === detail.id ? detail : item))))
      setIsChatOpen(true)
      setShowStartForm(false)
    } catch {
      setSubmitError('Unable to open this paediatric consultation right now.')
    }
  }

  const backToConsultationHub = () => {
    setIsChatOpen(false)
    setShowStartForm(false)
    setSubmitError('')
  }

  const startNewConsultation = () => {
    setCurrentConsultation(null)
    setIsChatOpen(false)
    setShowStartForm(true)
    setPaymentIntent(null)
    setPaymentNotice('')
    setPaymentStage('idle')
    setSubmitError('')
    window.requestAnimationFrame(() => {
      document.getElementById('ped-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const setField = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setFormErrors((prev) => ({ ...prev, [key]: '' }))
    setSubmitError('')
  }

  const fillChildFields = (child: ChildPatient) => {
    setFormData((prev) => ({
      ...prev,
      childName: child.fullName,
      childAge: child.ageYears == null ? '' : String(child.ageYears),
      childGender: child.gender,
      childWeightKg: child.weightKg ?? '',
      childAllergies: child.allergies.join(', '),
      childChronicConditions: child.chronicConditions.join(', '),
      childCurrentMedications: child.currentMedications.join(', '),
      vaccineHistory: child.vaccinationNotes,
    }))
    setFormErrors((prev) => ({ ...prev, childName: '', childAge: '' }))
    setSubmitError('')
  }

  const resetChildFields = () => {
    setFormData((prev) => ({
      ...prev,
      childName: '',
      childAge: '',
      childGender: '',
      childWeightKg: '',
      childAllergies: '',
      childChronicConditions: '',
      childCurrentMedications: '',
      vaccineHistory: '',
    }))
    setFormErrors((prev) => ({ ...prev, childName: '', childAge: '' }))
    setSubmitError('')
  }

  const handleChildSelection = (value: string) => {
    setSelectedChildId(value)
    setChildProfileNotice('')
    setChildProfileError('')
    if (value === NEW_CHILD_VALUE) {
      resetChildFields()
      return
    }
    const child = children.find((item) => String(item.id) === value)
    if (child) fillChildFields(child)
  }

  const startEditingChild = (child: ChildPatient) => {
    setEditingChildId(child.id)
    setChildDraft(childToDraft(child))
    setChildProfileNotice('')
    setChildProfileError('')
  }

  const cancelEditingChild = () => {
    setEditingChildId(null)
    setChildDraft(null)
    setChildProfileError('')
  }

  const setChildDraftField = (key: keyof ChildProfileDraft, value: string) => {
    setChildDraft((prev) => prev ? { ...prev, [key]: value } : prev)
    setChildProfileError('')
    setChildProfileNotice('')
  }

  const saveChildProfile = async (child: ChildPatient) => {
    if (!childDraft) return
    const { firstName, lastName } = splitChildName(childDraft.fullName)
    if (!firstName) {
      setChildProfileError('Child name is required.')
      return
    }
    const ageValue = childDraft.ageYears.trim()
    if (ageValue && (Number.isNaN(Number(ageValue)) || Number(ageValue) < 0 || Number(ageValue) > 18)) {
      setChildProfileError('Enter a valid age between 0 and 18.')
      return
    }
    setIsSavingChildProfile(true)
    setChildProfileError('')
    try {
      const updated = await updateChildPatient(child.id, {
        first_name: firstName,
        last_name: lastName,
        age_years: ageValue ? Number(ageValue) : null,
        gender: childDraft.gender,
        weight_kg: childDraft.weightKg || null,
        allergies: splitList(childDraft.allergies),
        chronic_conditions: splitList(childDraft.chronicConditions),
        current_medications: splitList(childDraft.currentMedications),
        vaccination_notes: childDraft.vaccinationNotes.trim(),
        notes: childDraft.notes.trim(),
      })
      setChildren((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      if (selectedChildId === String(updated.id)) fillChildFields(updated)
      setEditingChildId(null)
      setChildDraft(null)
      setChildProfileNotice(`${updated.fullName} updated.`)
    } catch {
      setChildProfileError('Unable to update this child profile right now.')
    } finally {
      setIsSavingChildProfile(false)
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.parentName.trim()) errors.parentName = 'Parent or guardian name is required'
    if (!formData.childName.trim()) errors.childName = 'Child name is required'
    if (!isUsingRegisteredChild && !formData.childAge.trim()) errors.childAge = 'Age is required'
    else if (formData.childAge.trim() && (Number.isNaN(Number(formData.childAge)) || Number(formData.childAge) < 0 || Number(formData.childAge) > 18)) {
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

  const finalizePaymentAndOpenChat = useCallback(async (intent: ConsultationPaymentIntent) => {
    if (intent.status !== 'succeeded' || finalizingPaymentIntentRef.current === intent.id) return

    finalizingPaymentIntentRef.current = intent.id
    setPaymentStage('completed')
    setPaymentNotice('Payment completed. Preparing your consultation chat…')

    try {
      const created = await finalizePaidConsultation(intent.id)
      await grantConsultationConsent(created.id).catch(() => undefined)
      const detail = await fetchConsultation(created.id)
      setCurrentConsultation(detail)
      setConsultations((prev) => sortConsultations([detail, ...prev.filter((item) => item.id !== detail.id)]))

      // Keep the completion confirmation visible before moving into the chat.
      await new Promise((resolve) => window.setTimeout(resolve, 900))
      setIsChatOpen(true)
      setShowStartForm(false)
      setPaymentIntent(null)
      setPaymentNotice('')
      setPaymentStage('idle')
    } catch (error) {
      finalizingPaymentIntentRef.current = null
      const message = apiErrorMessage(error, 'Payment was completed, but the consultation chat could not be opened. Please check again.')
      setPaymentStage('waiting')
      setPaymentNotice(message)
      setSubmitError(message)
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validateForm() || !selectedPediatrician) return

    setIsSubmitting(true)
    setSubmitError('')
    setPaymentStage('processing')
    setPaymentNotice('Starting M-Pesa payment…')
    try {
      const medicalContext = [
        formData.childAllergies.trim() ? `Allergies: ${formData.childAllergies.trim()}` : '',
        formData.childChronicConditions.trim() ? `Chronic conditions: ${formData.childChronicConditions.trim()}` : '',
        formData.childCurrentMedications.trim() ? `Current medications: ${formData.childCurrentMedications.trim()}` : '',
      ].filter(Boolean)
      const issueParts = [
        `Care need: ${formData.careNeed}`,
        formData.symptoms.trim(),
        ...medicalContext,
        formData.vaccineHistory.trim() ? `Vaccine history: ${formData.vaccineHistory.trim()}` : '',
      ].filter(Boolean)
      const issue = issueParts.join('\n\n')

      let child = selectedChild
      if (!child) {
        const { firstName, lastName } = splitChildName(formData.childName)
        const createdChild = await createChildPatient({
          first_name: firstName,
          last_name: lastName,
          age_years: Number(formData.childAge),
          gender: formData.childGender,
          weight_kg: formData.childWeightKg || null,
          allergies: splitList(formData.childAllergies),
          chronic_conditions: splitList(formData.childChronicConditions),
          current_medications: splitList(formData.childCurrentMedications),
          vaccination_notes: formData.vaccineHistory.trim(),
        })
        child = createdChild
        setChildren((prev) => [createdChild, ...prev.filter((item) => item.id !== createdChild.id)])
        setSelectedChildId(String(createdChild.id))
      }

      const intent = await createConsultationPaymentIntent({
        provider: 'mpesa',
        phone: formData.phone.trim(),
        consultation: {
          pediatrician: selectedPediatrician.id,
          child_patient_id: child.id,
          patient_name: formData.parentName.trim(),
          patient_email: formData.email.trim(),
          patient_phone: formData.phone.trim(),
          issue,
          requested_specialty: formData.careNeed,
          priority: 'routine',
          is_pediatric: true,
          guardian_name: formData.parentName.trim(),
        },
      })
      setPaymentIntent(intent)
      setPaymentStage(intent.status === 'succeeded' ? 'completed' : 'waiting')
      setPaymentNotice(intent.status === 'succeeded'
        ? 'Payment completed. Preparing your consultation chat…'
        : `Payment in progress. Approve the STK Push sent to ${intent.phoneNumber || formData.phone}.`)
      if (intent.status === 'succeeded') {
        await finalizePaymentAndOpenChat(intent)
      }
    } catch (error) {
      const message = apiErrorMessage(error, 'Unable to start the pediatric consultation right now. Please try again.')
      setPaymentStage('failed')
      setPaymentNotice(message)
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCheckPayment = async () => {
    if (!paymentIntent) return
    setIsCheckingPayment(true)
    setSubmitError('')
    try {
      const intent = await syncConsultationPaymentIntent(paymentIntent.id)
      setPaymentIntent(intent)
      if (intent.status !== 'succeeded') {
        if (intent.status === 'failed' || intent.status === 'cancelled') {
          setPaymentStage('failed')
          setPaymentNotice(intent.lastError || 'Payment was not completed. Please try again.')
          return
        }
        setPaymentStage('waiting')
        setPaymentNotice(intent.lastError || 'Payment confirmation has not reached us yet. Complete the STK Push, then check again.')
        return
      }
      await finalizePaymentAndOpenChat(intent)
    } catch (error) {
      const message = apiErrorMessage(error, 'Unable to confirm payment right now. Please try again.')
      setSubmitError(message)
      setPaymentNotice(message)
    } finally {
      setIsCheckingPayment(false)
    }
  }

  useEffect(() => {
    if (!paymentIntent || paymentStage !== 'waiting') return undefined

    let cancelled = false
    const checkPayment = async () => {
      try {
        const intent = await syncConsultationPaymentIntent(paymentIntent.id)
        if (cancelled) return
        setPaymentIntent(intent)
        if (intent.status === 'succeeded') {
          await finalizePaymentAndOpenChat(intent)
        } else if (intent.status === 'failed' || intent.status === 'cancelled') {
          setPaymentStage('failed')
          setPaymentNotice(intent.lastError || 'Payment was not completed. Please try again.')
        }
      } catch {
        // Keep polling; the manual status check remains available for transient errors.
      }
    }

    const timer = window.setInterval(() => { void checkPayment() }, 3000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [finalizePaymentAndOpenChat, paymentIntent?.id, paymentStage])

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

  const handleGrantConsent = async () => {
    if (!currentConsultation) return
    setIsGrantingConsent(true)
    try {
      await grantConsultationConsent(currentConsultation.id)
      const detail = await fetchConsultation(currentConsultation.id)
      setCurrentConsultation(detail)
      setConsultations((prev) => sortConsultations(prev.map((item) => (item.id === detail.id ? detail : item))))
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
      const updated = await updateConsultation(currentConsultation.id, { status: 'completed' })
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

  const renderConsultationWorkspace = () => (
    <div className="dc-page ac-page dc-hub-page">
      <div className="container">
        <div className="ac-header">
          <div>
            <p className="ac-header__eyebrow">Paediatric Consultation</p>
            <h1 className="ac-header__title">My Consultations</h1>
            <p className="ac-header__sub">Track active paediatric chats, review completed consultations, or start a new request.</p>
          </div>
          <div className="dc-header-actions">
            <Link to="/health-services" className="dc-back-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
              Back to health services
            </Link>
            <button type="button" className="ac-header__action dc-link-button" onClick={startNewConsultation}>
              New consultation
            </button>
          </div>
        </div>

        <div className="ac-overview">
          <div className="ac-overview__item">
            <span>Waiting</span>
            <strong>{statusCounts.waiting}</strong>
          </div>
          <div className="ac-overview__item">
            <span>In progress</span>
            <strong>{statusCounts.in_progress}</strong>
          </div>
          <div className="ac-overview__item">
            <span>Completed</span>
            <strong>{statusCounts.completed}</strong>
          </div>
        </div>

        <div className="ac-controls">
          <div className="ac-tabs">
            <button
              type="button"
              className={`ac-tab${activeHubView === 'consultations' ? ' ac-tab--active' : ''}`}
              onClick={() => setActiveHubView('consultations')}
            >
              Consultations
              <span className="ac-tab__count">{consultations.length}</span>
            </button>
            <button
              type="button"
              className={`ac-tab${activeHubView === 'children' ? ' ac-tab--active' : ''}`}
              onClick={() => setActiveHubView('children')}
            >
              Child profiles
              <span className="ac-tab__count">{children.length}</span>
            </button>
          </div>
          {activeHubView === 'consultations' && (
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
          )}
        </div>

        {submitError && (
          <div className="ac-empty dc-hub-error">
            <p className="ac-empty__title">Something went wrong</p>
            <p className="ac-empty__sub">{submitError}</p>
          </div>
        )}

        {activeHubView === 'children' ? (
          <div className="pc-child-profiles">
            {(childProfileNotice || childProfileError) && (
              <div className={`pc-child-profile-alert${childProfileError ? ' pc-child-profile-alert--error' : ''}`}>
                {childProfileError || childProfileNotice}
              </div>
            )}
            {children.length === 0 ? (
              <div className="ac-empty">
                <div className="ac-empty__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </div>
                <p className="ac-empty__title">No child profiles yet</p>
                <p className="ac-empty__sub">Start a new pediatric consultation and choose Add a new child to save the first profile.</p>
                <button type="button" className="btn btn--primary btn--sm dc-empty-cta" onClick={startNewConsultation}>
                  Add child
                </button>
              </div>
            ) : (
              <div className="pc-child-profile-grid">
                {children.map((child) => {
                  const isEditing = editingChildId === child.id && childDraft
                  return (
                    <article key={child.id} className="pc-child-profile-card">
                      {isEditing ? (
                        <>
                          <div className="pc-child-profile-card__header">
                            <div>
                              <span>{child.reference}</span>
                              <h3>Edit child profile</h3>
                            </div>
                          </div>
                          <div className="pc-child-edit-grid">
                            <div className="dc-field">
                              <label htmlFor={`child-name-${child.id}`}>Full name</label>
                              <input id={`child-name-${child.id}`} type="text" value={childDraft.fullName} onChange={(event) => setChildDraftField('fullName', event.target.value)} />
                            </div>
                            <div className="dc-field">
                              <label htmlFor={`child-age-${child.id}`}>Age in years</label>
                              <input id={`child-age-${child.id}`} type="number" min="0" max="18" value={childDraft.ageYears} onChange={(event) => setChildDraftField('ageYears', event.target.value)} />
                            </div>
                            <div className="dc-field">
                              <label htmlFor={`child-gender-${child.id}`}>Gender</label>
                              <select id={`child-gender-${child.id}`} value={childDraft.gender} onChange={(event) => setChildDraftField('gender', event.target.value)}>
                                <option value="">Not specified</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <div className="dc-field">
                              <label htmlFor={`child-weight-${child.id}`}>Weight in kg</label>
                              <input id={`child-weight-${child.id}`} type="number" min="0" step="0.1" value={childDraft.weightKg} onChange={(event) => setChildDraftField('weightKg', event.target.value)} />
                            </div>
                            <div className="dc-field">
                              <label htmlFor={`child-allergies-${child.id}`}>Allergies</label>
                              <input id={`child-allergies-${child.id}`} type="text" value={childDraft.allergies} onChange={(event) => setChildDraftField('allergies', event.target.value)} placeholder="Separate with commas" />
                            </div>
                            <div className="dc-field">
                              <label htmlFor={`child-meds-${child.id}`}>Current medications</label>
                              <input id={`child-meds-${child.id}`} type="text" value={childDraft.currentMedications} onChange={(event) => setChildDraftField('currentMedications', event.target.value)} placeholder="Separate with commas" />
                            </div>
                          </div>
                          <div className="dc-field">
                            <label htmlFor={`child-conditions-${child.id}`}>Chronic conditions</label>
                            <input id={`child-conditions-${child.id}`} type="text" value={childDraft.chronicConditions} onChange={(event) => setChildDraftField('chronicConditions', event.target.value)} placeholder="Separate with commas" />
                          </div>
                          <div className="dc-field">
                            <label htmlFor={`child-vaccine-${child.id}`}>Vaccination notes</label>
                            <textarea id={`child-vaccine-${child.id}`} rows={2} value={childDraft.vaccinationNotes} onChange={(event) => setChildDraftField('vaccinationNotes', event.target.value)} />
                          </div>
                          <div className="dc-field">
                            <label htmlFor={`child-notes-${child.id}`}>Notes</label>
                            <textarea id={`child-notes-${child.id}`} rows={2} value={childDraft.notes} onChange={(event) => setChildDraftField('notes', event.target.value)} />
                          </div>
                          <div className="pc-child-profile-card__actions">
                            <button type="button" className="btn btn--outline btn--sm" onClick={cancelEditingChild} disabled={isSavingChildProfile}>
                              Cancel
                            </button>
                            <button type="button" className="btn btn--primary btn--sm" onClick={() => { void saveChildProfile(child) }} disabled={isSavingChildProfile}>
                              {isSavingChildProfile ? 'Saving...' : 'Save changes'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="pc-child-profile-card__header">
                            <div>
                              <span>{child.reference}</span>
                              <h3>{child.fullName}</h3>
                            </div>
                            <button type="button" className="btn btn--outline btn--sm" onClick={() => startEditingChild(child)}>
                              Edit
                            </button>
                          </div>
                          <dl className="pc-child-profile-details">
                            <div><dt>Age</dt><dd>{childAgeLabel(child)}</dd></div>
                            <div><dt>Gender</dt><dd>{child.gender || 'Not specified'}</dd></div>
                            <div><dt>Weight</dt><dd>{child.weightKg ? `${child.weightKg} kg` : 'Not recorded'}</dd></div>
                            <div><dt>Allergies</dt><dd>{child.allergies.length ? child.allergies.join(', ') : 'None recorded'}</dd></div>
                            <div><dt>Current medication</dt><dd>{child.currentMedications.length ? child.currentMedications.join(', ') : 'None recorded'}</dd></div>
                            <div><dt>Chronic conditions</dt><dd>{child.chronicConditions.length ? child.chronicConditions.join(', ') : 'None recorded'}</dd></div>
                          </dl>
                          {child.vaccinationNotes && (
                            <p className="pc-child-profile-note"><strong>Vaccination notes:</strong> {child.vaccinationNotes}</p>
                          )}
                          {child.notes && (
                            <p className="pc-child-profile-note"><strong>Notes:</strong> {child.notes}</p>
                          )}
                          <div className="pc-child-profile-card__actions">
                            <button type="button" className="btn btn--primary btn--sm" onClick={() => {
                              handleChildSelection(String(child.id))
                              startNewConsultation()
                            }}>
                              Start consultation
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        ) : filteredConsultations.length === 0 ? (
          <div className="ac-empty">
            <div className="ac-empty__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
              </svg>
            </div>
            <p className="ac-empty__title">No paediatric consultations yet</p>
            <p className="ac-empty__sub">Start with your child&apos;s symptoms, pay the consultation fee, then your request joins the paediatric queue.</p>
            <button type="button" className="btn btn--primary btn--sm dc-empty-cta" onClick={startNewConsultation}>
              Start consultation
            </button>
          </div>
        ) : (
          <ul className="ac-list">
            {filteredConsultations.map((consultation) => {
              const status = STATUS_CFG[consultation.status]
              const isExpanded = expandedId === consultation.id
              const activityDate = consultation.scheduledAt || consultation.lastMessageAt || consultation.createdAt

              return (
                <li key={consultation.id} className="ac-card">
                  <button
                    type="button"
                    className="ac-card__header"
                    onClick={() => setExpandedId((prev) => (prev === consultation.id ? null : consultation.id))}
                    aria-expanded={isExpanded}
                  >
                    <div className="ac-card__left">
                      <div className="ac-card__avatar" style={{ background: PEDIATRIC_TYPE.bg, color: PEDIATRIC_TYPE.color }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="8" r="4"/>
                          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                        </svg>
                      </div>
                      <div className="ac-card__meta">
                        <div className="ac-card__top-row">
                          <span className="ac-card__doctor">{consultation.doctorName || 'Waiting for pediatrician'}</span>
                          <span className="ac-card__type-badge" style={{ background: PEDIATRIC_TYPE.bg, color: PEDIATRIC_TYPE.color }}>
                            {PEDIATRIC_TYPE.label}
                          </span>
                        </div>
                        <p className="ac-card__specialty">{consultation.doctorSpecialty || 'Paediatrics'}</p>
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

                      <div className="ac-card__followup" style={{ color: '#7c3aed', background: 'rgba(124,58,237,0.08)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="8" r="4"/>
                          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                        </svg>
                        Child: <strong>{consultation.childName || 'Not provided'}</strong> · Consent {consultation.consentStatus}
                      </div>

                      <div className="ac-card__actions">
                        {(consultation.status === 'waiting' || consultation.status === 'in_progress') && (
                          <button type="button" className="btn btn--primary btn--sm" onClick={() => { void openPediatricConsultation(consultation) }}>
                            Open chat
                          </button>
                        )}
                        {consultation.status === 'completed' && (
                          <button type="button" className="btn btn--primary btn--sm" onClick={startNewConsultation}>
                            Book follow-up
                          </button>
                        )}
                        {consultation.status === 'cancelled' && (
                          <button type="button" className="btn btn--primary btn--sm" onClick={startNewConsultation}>
                            Book again
                          </button>
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
          <div className="dc-waiting__shell">
            <section className="dc-waiting__summary" aria-label="Consultation status">
              <button type="button" className="dc-state-back" onClick={backToConsultationHub}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                Back
              </button>
              <span className="dc-waiting__eyebrow">Pediatric consultation</span>
              <h1>Finding an available pediatrician</h1>
              <p className="dc-waiting__lead">Your request has been shared with all available pediatricians. The first pediatrician to accept it will join the consultation chat.</p>
              <div className="dc-waiting__reference">
                <span>Reference</span>
                <strong>{currentConsultation.reference}</strong>
              </div>
              <div className="dc-waiting__steps" aria-label="Progress">
                <div className="dc-waiting__step dc-waiting__step--done">
                  <span>1</span>
                  <p>Request shared</p>
                </div>
                <div className="dc-waiting__step dc-waiting__step--active">
                  <span>2</span>
                  <p>Awaiting acceptance</p>
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
                  <div className="dc-waiting__avatar">PED</div>
                </div>
                <div>
                  <span className="dc-waiting__status-badge">Shared with pediatricians</span>
                  <p className="dc-waiting__doctor-name">Pediatrician consultation queue</p>
                  <p className="dc-waiting__doctor-spec">Waiting for an available pediatrician to accept {currentConsultation.childName || formData.childName || 'your child'}&apos;s request</p>
                </div>
              </div>

              <div className="dc-waiting__meta">
                <div className="dc-waiting__meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>{formatDateTime(currentConsultation.createdAt)}</span>
                </div>
                <div className="dc-waiting__meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span>{pediatricians.length} available pediatrician{pediatricians.length === 1 ? '' : 's'} notified</span>
                </div>
              </div>

              <div className="dc-waiting__status-line">
                <div className="dc-waiting__connecting">
                  <span /><span /><span />
                </div>
                <p>Waiting for a pediatrician to accept</p>
              </div>
              <p className="dc-waiting__tip">This page refreshes automatically. You can also leave and return from your consultation history.</p>
              {submitError && <p className="dc-field-error dc-waiting__error">{submitError}</p>}
              {currentConsultation.consentStatus !== 'granted' && (
                <div className="dc-waiting__actions">
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => { void handleGrantConsent() }} disabled={isGrantingConsent}>
                    {isGrantingConsent ? 'Granting consent…' : 'Grant guardian consent'}
                  </button>
                </div>
              )}
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
    )
  }

  if (viewState === 'chatting' && currentConsultation) {
    const clinicianName = currentConsultation.doctorName || assignedPediatrician?.name || 'Assigned pediatrician'
    const clinicianSpecialty = assignedPediatrician?.specialty || 'Pediatrics'
    const consultationFee = assignedPediatrician?.consultFee ?? 0
    const consentGranted = currentConsultation.consentStatus === 'granted'

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
                      {clinicianSpecialty} · Consulting for {currentConsultation.childName || 'your child'}
                    </p>
                  </div>
                </div>
                <div className="dc-chat__header-actions">
                  <button type="button" className="dc-chat__history-link" onClick={backToConsultationHub}>
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
                <p>Share updates, symptoms, medication use, allergies, or photos requested by your pediatrician.</p>
              </div>

              <div className="dc-chat__messages">
                {currentConsultation.messages.length === 0 && (
                  <div className="dc-msg dc-msg--doctor">
                    <div className="dc-msg__avatar">{getInitials(clinicianName)}</div>
                    <div className="dc-msg__bubble">
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
                <button className="btn btn--primary" type="button" onClick={() => { void handleSendMessage() }} disabled={!messageInput.trim() || isSendingMessage}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
              {submitError && <p className="dc-field-error dc-chat__error">{submitError}</p>}
            </div>

            <aside className="dc-chat-panel" aria-label="Consultation details">
              <div className="dc-chat-panel__card dc-chat-panel__card--doctor">
                <div className="dc-chat-panel__avatar">{getInitials(clinicianName)}</div>
                <div>
                  <p className="dc-chat-panel__eyebrow">Your pediatrician</p>
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
                  <span>Child</span>
                  <strong>{currentConsultation.childName || '—'}</strong>
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
                <p className="dc-chat-panel__issue">{formData.symptoms || 'No symptom summary recorded.'}</p>
              </div>

              <div className={`dc-chat-panel__card dc-prescription-status ${consentGranted ? 'dc-prescription-status--issued' : ''}`}>
                <div className="dc-prescription-status__top">
                  <div className="dc-prescription-status__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <path d="M9 12l2 2 4-4"/>
                    </svg>
                  </div>
                  <div>
                    <p className="dc-chat-panel__title">Guardian consent</p>
                    <p className="dc-prescription-status__state">
                      {consentGranted ? 'Granted for this consultation' : 'Awaiting guardian consent'}
                    </p>
                  </div>
                </div>
                {consentGranted ? (
                  <p className="dc-prescription-status__alert">
                    Guardian consent is on record. The pediatrician may proceed with clinical guidance and, where appropriate, an e-prescription for your child.
                  </p>
                ) : (
                  <>
                    <p className="dc-prescription-status__copy">
                      Guardian consent is required before the pediatrician can issue any prescription on your child&apos;s behalf.
                    </p>
                    <button
                      type="button"
                      className="dc-prescription-status__link"
                      onClick={() => { void handleGrantConsent() }}
                      disabled={isGrantingConsent}
                    >
                      {isGrantingConsent ? 'Granting consent…' : 'Grant consent'}
                    </button>
                  </>
                )}
              </div>

              <a href={`tel:${formatPhoneHref(settings.supportPhone)}`} className="dc-emergency-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Pediatric emergency? Call now
              </a>
            </aside>
          </div>
        </div>

        {showEndConfirm && (
          <div className="modal-overlay" onClick={() => setShowEndConfirm(false)}>
            <div className="dc-confirm" onClick={(event) => event.stopPropagation()}>
              <h3>End consultation?</h3>
              <p>This will mark the pediatric consultation as completed.</p>
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
      <a href="#ped-form" className="skip-to-content">Skip to form</a>

      <section className="page-hero page-hero--doctor">
        <div className="container">
          <Link to="/health-services" className="dc-back-btn dc-back-btn--hero">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Back to health services
          </Link>
          <nav className="svc-hero__breadcrumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/health-services">Health Services</Link>
            <span>/</span>
            <span>Pediatric Consultation</span>
          </nav>
          <h1 className="svc-hero__title">Pediatric Consultation</h1>
          <p className="svc-hero__sub">Expert care for your child from certified pediatricians. Start a secure chat consultation and receive clinical guidance or a digital prescription when appropriate.</p>
          <div className="page-hero__pills">
            <span className="page-hero__pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Licensed &amp; verified</span>
            <span className="page-hero__pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Ages 0–18</span>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="dc-body" id="ped-form">
          <div className="dc-form-card">
            <div className="dc-form-card__header">
              <div>
                <p className="dc-section-kicker">Secure pediatric chat</p>
                <h2 className="dc-form-card__title">Start pediatric consultation</h2>
                <p className="dc-form-card__sub">Fill in your child&apos;s details and we will route you to an available pediatrician.</p>
              </div>
              <span className="dc-form-card__badge">Guardian consent</span>
            </div>

            {loadError && <p className="dc-field-error" style={{ marginBottom: '1rem' }}>{loadError}</p>}
            {submitError && <p className="dc-field-error" style={{ marginBottom: '1rem' }}>{submitError}</p>}
            {paymentNotice && (
              <div
                className={`ped-payment-progress ped-payment-progress--${paymentStage}`}
                role="status"
                aria-live="polite"
              >
                <span className="ped-payment-progress__icon" aria-hidden="true">
                  {paymentStage === 'completed' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 4 4L19 6" /></svg>
                  ) : paymentStage === 'failed' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M18 6 6 18" /></svg>
                  ) : (
                    <span className="dc-payment-spinner" />
                  )}
                </span>
                <div className="ped-payment-progress__copy">
                  <strong>{paymentStage === 'completed' ? 'Payment completed' : paymentStage === 'failed' ? 'Payment unsuccessful' : 'Payment in progress'}</strong>
                  <p>{paymentNotice}</p>
                </div>
                {paymentIntent && paymentIntent.status !== 'succeeded' && (
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => { void handleCheckPayment() }} disabled={isCheckingPayment}>
                    {isCheckingPayment ? 'Checking payment...' : 'Check payment status'}
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="dc-form-section">
                <div className="dc-form-section__heading">
                  <span>1</span>
                  <div>
                    <h3>Guardian contact details</h3>
                    <p>Used for consultation updates and follow-up notes.</p>
                  </div>
                </div>
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
                <div className="dc-form-row">
                  <div className="dc-field">
                    <label htmlFor="ped-phone">Phone number</label>
                    <input id="ped-phone" type="tel" value={formData.phone} onChange={(event) => setField('phone', event.target.value)} aria-invalid={!!formErrors.phone} placeholder="+254 700 000 000" />
                    {formErrors.phone && <span className="dc-field-error">{formErrors.phone}</span>}
                  </div>
                  <div className="dc-field" />
                </div>
              </div>

              <div className="dc-form-section">
                <div className="dc-form-section__heading">
                  <span>2</span>
                  <div>
                    <h3>Child information</h3>
                    <p>Select a registered child or add a new child profile.</p>
                  </div>
                </div>
                <div className="dc-field">
                  <label htmlFor="ped-child-profile">Child profile</label>
                  <select id="ped-child-profile" value={selectedChildId} onChange={(event) => handleChildSelection(event.target.value)}>
                    <option value={NEW_CHILD_VALUE}>Add a new child</option>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.fullName} · {childAgeLabel(child)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="dc-form-row">
                  <div className="dc-field">
                    <label htmlFor="ped-child-name">Child's name</label>
                    <input id="ped-child-name" type="text" value={formData.childName} onChange={(event) => setField('childName', event.target.value)} aria-invalid={!!formErrors.childName} placeholder="e.g. Emily" readOnly={isUsingRegisteredChild} />
                    {formErrors.childName && <span className="dc-field-error">{formErrors.childName}</span>}
                  </div>
                  <div className="dc-field">
                    <label htmlFor="ped-child-age">Age in years (0-18)</label>
                    <input id="ped-child-age" type="number" min="0" max="18" value={formData.childAge} onChange={(event) => setField('childAge', event.target.value)} aria-invalid={!!formErrors.childAge} placeholder="e.g. 5" readOnly={isUsingRegisteredChild} />
                    {formErrors.childAge && <span className="dc-field-error">{formErrors.childAge}</span>}
                  </div>
                </div>
                <div className="dc-form-row">
                  <div className="dc-field">
                    <label htmlFor="ped-child-gender">Gender <span className="dc-field-optional">optional</span></label>
                    <select id="ped-child-gender" value={formData.childGender} onChange={(event) => setField('childGender', event.target.value)} disabled={isUsingRegisteredChild}>
                      <option value="">Not specified</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="dc-field">
                    <label htmlFor="ped-child-weight">Weight in kg <span className="dc-field-optional">optional</span></label>
                    <input id="ped-child-weight" type="number" min="0" step="0.1" value={formData.childWeightKg} onChange={(event) => setField('childWeightKg', event.target.value)} placeholder="e.g. 18.5" readOnly={isUsingRegisteredChild} />
                  </div>
                </div>
                <div className="dc-form-row">
                  <div className="dc-field">
                    <label htmlFor="ped-child-allergies">Allergies <span className="dc-field-optional">optional</span></label>
                    <input id="ped-child-allergies" type="text" value={formData.childAllergies} onChange={(event) => setField('childAllergies', event.target.value)} placeholder="Separate with commas" readOnly={isUsingRegisteredChild} />
                  </div>
                  <div className="dc-field">
                    <label htmlFor="ped-child-medications">Current medications <span className="dc-field-optional">optional</span></label>
                    <input id="ped-child-medications" type="text" value={formData.childCurrentMedications} onChange={(event) => setField('childCurrentMedications', event.target.value)} placeholder="Separate with commas" readOnly={isUsingRegisteredChild} />
                  </div>
                </div>
                <div className="dc-field">
                  <label htmlFor="ped-child-conditions">Chronic conditions <span className="dc-field-optional">optional</span></label>
                  <input id="ped-child-conditions" type="text" value={formData.childChronicConditions} onChange={(event) => setField('childChronicConditions', event.target.value)} placeholder="Separate with commas" readOnly={isUsingRegisteredChild} />
                </div>
                <div className="dc-field">
                  <label htmlFor="ped-care-need">Care need</label>
                  <select id="ped-care-need" value={formData.careNeed} onChange={(event) => setField('careNeed', event.target.value)}>
                    {PEDIATRIC_CARE_NEEDS.map((careNeed) => (
                      <option key={careNeed} value={careNeed}>{careNeed}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="dc-form-section">
                <div className="dc-form-section__heading">
                  <span>3</span>
                  <div>
                    <h3>Symptoms &amp; consent</h3>
                    <p>Add enough detail for the pediatrician, then give guardian consent.</p>
                  </div>
                </div>
                <div className="dc-field">
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

                <div className="dc-field">
                  <label htmlFor="ped-vaccine">
                    Vaccine history
                    <span className="dc-field-optional">optional</span>
                  </label>
                  <textarea id="ped-vaccine" rows={2} placeholder="Recent vaccinations or any pending ones..." value={formData.vaccineHistory} onChange={(event) => setField('vaccineHistory', event.target.value)} readOnly={isUsingRegisteredChild} />
                </div>

                <div className="dc-field dc-field--compact">
                  <label className="ped-consent-label">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                    />
                    I, as parent/guardian, give consent for this telemedicine consultation on behalf of my child.
                  </label>
                  {formErrors.consent && <span className="dc-field-error">{formErrors.consent}</span>}
                </div>
              </div>

              <button type="submit" className="btn btn--primary dc-submit-btn" disabled={isSubmitting || paymentStage === 'waiting' || paymentStage === 'completed' || !consentChecked}>
                {isSubmitting ? <><span className="dc-button-spinner" aria-hidden="true" />Starting payment…</> : paymentStage === 'waiting' ? <><span className="dc-button-spinner" aria-hidden="true" />Payment in progress…</> : paymentStage === 'completed' ? 'Payment completed ✓' : 'Pay and start consultation →'}
              </button>
            </form>
          </div>

          <aside className="dc-sidebar" aria-label="Pediatric consultation support panel">
            <div className="dc-sidebar__card dc-fee-card dc-care-summary">
              <div className="dc-care-summary__top">
                <div>
                  <p className="dc-fee-card__label">Consultation fee</p>
                  <p className="dc-fee-card__amount">KSh {(selectedPediatrician?.consultFee ?? 0).toLocaleString()}</p>
                </div>
                <span>Assigned pediatrician</span>
              </div>
              <p className="dc-fee-card__note">Payment is required before the pediatric consultation starts. Medicines, lab tests, and delivery are billed separately if needed.</p>
              <div className="dc-fee-card__includes">
                <p className="dc-fee-card__includes-title">Includes</p>
                <div className="dc-include-grid">
                  <span>Secure chat</span>
                  <span>Guardian consent</span>
                  <span>Digital Rx</span>
                  <span>Saved history</span>
                </div>
              </div>
              <div className="dc-fee-card__routing">
                <span>Routed to</span>
                <strong>{formData.careNeed}</strong>
              </div>
            </div>

            <div className="dc-sidebar__card">
              <div className="dc-sidebar__title-row">
                <p className="dc-sidebar__card-title">Registered children</p>
                <span>{children.length}</span>
              </div>
              <div className="dc-child-profile-list">
                {children.length === 0 && (
                  <p className="card__meta">No child profiles yet. Add one in the form and it will be saved for future pediatric consultations.</p>
                )}
                {children.map((child) => {
                  const isSelected = selectedChildId === String(child.id)
                  return (
                    <button
                      key={child.id}
                      type="button"
                      className={`dc-child-profile${isSelected ? ' dc-child-profile--selected' : ''}`}
                      onClick={() => handleChildSelection(String(child.id))}
                    >
                      <div className="dc-child-profile__top">
                        <strong>{child.fullName}</strong>
                        <span>{child.reference}</span>
                      </div>
                      <div className="dc-child-profile__meta">
                        <span>{childAgeLabel(child)}</span>
                        {child.gender && <span>{child.gender}</span>}
                        {child.weightKg && <span>{child.weightKg} kg</span>}
                      </div>
                      {(child.allergies.length > 0 || child.currentMedications.length > 0) && (
                        <p>
                          {child.allergies.length > 0 ? `Allergies: ${child.allergies.join(', ')}` : ''}
                          {child.allergies.length > 0 && child.currentMedications.length > 0 ? ' · ' : ''}
                          {child.currentMedications.length > 0 ? `Meds: ${child.currentMedications.join(', ')}` : ''}
                        </p>
                      )}
                    </button>
                  )
                })}
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
                      className={`dc-doctor-item${isSelected ? ' dc-doctor-item--selected' : ''}`}
                      onClick={() => setSelectedPediatricianId(provider.id)}
                    >
                      <div className="dc-doctor-item__avatar">{getInitials(provider.name)}</div>
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
