import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PrescriptionClarificationMessage, PrescriptionRecord, PrescriptionStatus } from '../../data/prescriptions'
import { resolveMediaUrl } from '../../lib/apiClient'
import { prescriptionService } from '../../services/prescriptionService'
import '../../styles/pages/ConsultationPage.css'
import '../../styles/pages/AccountConsultationsPage.css'
import '../../styles/pages/PrescriptionHistoryPage.css'
import '../../styles/pages/PrescriptionUploadPage.css'

type SourceFilter = 'all' | 'upload' | 'doctor' | 'pediatrician'
type StatusFilter = 'all' | PrescriptionStatus

const SOURCE_TABS: readonly { key: SourceFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upload', label: 'Uploaded Prescription' },
  { key: 'doctor', label: 'Doctor Prescription' },
  { key: 'pediatrician', label: 'Pediatrician Prescription' },
]
const STATUS_FILTERS: readonly { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All status' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Clarification', label: 'Clarification' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Rejected', label: 'Rejected' },
]

const STATUS_CFG: Record<PrescriptionStatus, { label: string; color: string; bg: string; icon: string }> = {
  Approved: { label: 'Approved', color: '#16803c', bg: 'rgba(22,128,60,0.1)', icon: '✓' },
  Pending: { label: 'Pending', color: '#b45309', bg: 'rgba(180,83,9,0.1)', icon: '•' },
  Clarification: { label: 'Clarification', color: '#2563eb', bg: 'rgba(37,99,235,0.1)', icon: '•' },
  Rejected: { label: 'Rejected', color: '#dc2626', bg: 'rgba(220,38,38,0.1)', icon: '×' },
}

function formatDate(value: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function isEPrescription(rx: PrescriptionRecord) {
  return rx.source === 'e_prescription' || rx.notes?.toLowerCase().includes('e-prescription') || rx.doctor?.toLowerCase().includes('clinician')
}

function isPediatricianPrescription(rx: PrescriptionRecord) {
  const haystack = [rx.id, rx.doctor, rx.notes].join(' ').toLowerCase()
  return isEPrescription(rx) && (
    rx.clinicianType === 'pediatrician'
    || haystack.includes('pediatric')
    || haystack.includes('paediatric')
    || haystack.includes('ped-rx')
  )
}

function isDoctorPrescription(rx: PrescriptionRecord) {
  return isEPrescription(rx) && !isPediatricianPrescription(rx)
}

function sourceLabelForPrescription(rx: PrescriptionRecord) {
  if (isPediatricianPrescription(rx)) return 'Pediatrician Prescription'
  if (isDoctorPrescription(rx)) return 'Doctor Prescription'
  return 'Uploaded'
}

function formatFileLabel(value: string, index: number) {
  const cleaned = value.split('?')[0]
  const name = cleaned.split('/').filter(Boolean).pop()
  return name || `Prescription file ${index + 1}`
}

function buildClarificationThread(rx: PrescriptionRecord): PrescriptionClarificationMessage[] {
  const messages = [...rx.clarificationMessages]
  const hasPharmacyMessage = messages.some((entry) => entry.senderRole === 'pharmacist' || entry.senderRole === 'admin' || entry.senderRole === 'system')
  if (hasPharmacyMessage) return messages

  const auditGuidance = rx.audit.find((entry) => entry.action.toLowerCase().includes('clarification requested'))
  if (auditGuidance) {
    const [, senderPart = '', messagePart = ''] = auditGuidance.action.match(/^Clarification requested by ([^:]+):?\s*(.*)$/i) || []
    messages.unshift({
      id: -1,
      senderRole: 'pharmacist',
      senderName: senderPart || rx.pharmacist,
      senderDisplay: senderPart || rx.pharmacist || 'Pharmacist',
      message: messagePart || auditGuidance.action,
      createdAt: auditGuidance.time,
    })
  } else if (rx.clarificationMessage) {
    messages.unshift({
      id: -1,
      senderRole: 'pharmacist',
      senderName: rx.pharmacist,
      senderDisplay: rx.pharmacist || 'Pharmacist',
      message: rx.clarificationMessage,
      createdAt: rx.submitted,
    })
  }

  return messages
}

function rejectionReason(rx: PrescriptionRecord) {
  if (rx.status !== 'Rejected') return ''
  if (rx.pharmacistNotes?.trim()) return rx.pharmacistNotes.trim()
  if (rx.clarificationMessage?.trim()) return rx.clarificationMessage.trim()
  const auditReason = rx.audit.find((entry) => entry.action.toLowerCase().includes('rejected'))
  if (!auditReason) return ''
  const [, reason = ''] = auditReason.action.match(/rejected by [^:]+:?\s*(.*)$/i) || []
  return reason.trim() || auditReason.action
}

function formatThreadTime(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PrescriptionUploadPage() {
  const { user, isLoggedIn } = useAuth()
  const [searchParams] = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [doctorName, setDoctorName] = useState('')
  const [uploadNotes, setUploadNotes] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedId, setSubmittedId] = useState('')
  const requestedProductName = searchParams.get('product_name')?.trim() ?? ''
  const requestedProductId = Number(searchParams.get('product_id') || 0) || null
  const requestedVariantId = Number(searchParams.get('variant_id') || 0) || null
  const [showUploadForm, setShowUploadForm] = useState(Boolean(requestedProductName))
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([])
  const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeSource, setActiveSource] = useState<SourceFilter>('all')
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [sendingReplyId, setSendingReplyId] = useState<number | null>(null)
  const [replyNotice, setReplyNotice] = useState<Record<string, string>>({})
  const [activeRx, setActiveRx] = useState<PrescriptionRecord | null>(null)

  const patientName = user?.name ?? 'Guest'

  const loadPrescriptions = () => {
    if (!isLoggedIn) {
      setPrescriptions([])
      setIsLoadingPrescriptions(false)
      return
    }

    setIsLoadingPrescriptions(true)
    setLoadError('')
    void prescriptionService.list({ scope: 'patient' }).then((response) => {
      setPrescriptions(response.data)
    }).catch(() => {
      setLoadError('We could not load your prescriptions right now.')
    }).finally(() => {
      setIsLoadingPrescriptions(false)
    })
  }

  useEffect(() => {
    loadPrescriptions()
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn || showUploadForm) return undefined
    const timer = window.setInterval(() => {
      void prescriptionService.list({ scope: 'patient' }).then((response) => {
        setPrescriptions(response.data)
      }).catch(() => undefined)
    }, 10000)
    return () => window.clearInterval(timer)
  }, [isLoggedIn, showUploadForm])

  const counts = useMemo(() => ({
    all: prescriptions.length,
    upload: prescriptions.filter((rx) => !isEPrescription(rx)).length,
    doctor: prescriptions.filter(isDoctorPrescription).length,
    pediatrician: prescriptions.filter(isPediatricianPrescription).length,
    pending: prescriptions.filter((rx) => rx.status === 'Pending').length,
    clarification: prescriptions.filter((rx) => rx.status === 'Clarification').length,
    approved: prescriptions.filter((rx) => rx.status === 'Approved').length,
  }), [prescriptions])

  const filteredPrescriptions = useMemo(() => prescriptions.filter((rx) => {
    if (activeSource === 'upload' && isEPrescription(rx)) return false
    if (activeSource === 'doctor' && !isDoctorPrescription(rx)) return false
    if (activeSource === 'pediatrician' && !isPediatricianPrescription(rx)) return false
    if (activeStatus !== 'all' && rx.status !== activeStatus) return false
    return true
  }), [activeSource, activeStatus, prescriptions])

  const activeThread = useMemo(() => {
    if (!activeRx) return []
    return buildClarificationThread(activeRx)
  }, [activeRx])

  useEffect(() => {
    if (!activeRx) return
    const updated = prescriptions.find((rx) => rx.id === activeRx.id)
    if (updated && updated !== activeRx) {
      setActiveRx(updated)
    }
  }, [activeRx, prescriptions])

  useEffect(() => {
    if (!isLoggedIn || showUploadForm || !activeRx) return undefined
    const timer = window.setInterval(() => {
      void prescriptionService.list({ scope: 'patient' }).then((response) => {
        setPrescriptions(response.data)
      }).catch(() => undefined)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [activeRx?.id, isLoggedIn, showUploadForm])

  const addFiles = (files: File[]) => {
    setUploadedFiles((prev) => {
      const merged = [...prev]
      files.forEach((file) => {
        if (!merged.some((existing) => existing.name === file.name && existing.size === file.size)) {
          merged.push(file)
        }
      })
      return merged
    })
    setUploadError('')
  }

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addFiles(Array.from(event.target.files))
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    const files = Array.from(event.dataTransfer.files).filter((file) =>
      ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)
    )
    if (files.length) addFiles(files)
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  const handleSubmit = () => {
    if (uploadedFiles.length === 0) {
      setUploadError('Please attach at least one prescription file.')
      return
    }
    if (!isLoggedIn) {
      setUploadError('Please sign in before submitting a prescription.')
      return
    }

    setIsSubmitting(true)
    void prescriptionService.upload({
      patient: patientName,
      doctor: doctorName.trim(),
      notes: [
        uploadNotes.trim(),
        requestedProductName ? `Requested product: ${requestedProductName}` : '',
      ].filter(Boolean).join('\n'),
      files: uploadedFiles,
      requestedItem: requestedProductName
        ? {
          name: requestedProductName,
          productId: requestedProductId,
          variantId: requestedVariantId,
          quantity: 1,
        }
        : undefined,
    }).then((response) => {
      const newest = response.data.find(
        (record) => record.patient.toLowerCase() === patientName.toLowerCase() && record.status === 'Pending'
      )
      setSubmittedId(newest?.id ?? '')
      setSubmitted(true)
      setUploadedFiles([])
      setDoctorName('')
      setUploadNotes('')
      setUploadError('')
      loadPrescriptions()
    }).catch((error) => {
      type ApiErr = { response?: { data?: { error?: { message?: string }; detail?: string | Record<string, string> } } }
      const detail = (error as ApiErr)?.response?.data?.error?.message
        ?? (error as ApiErr)?.response?.data?.detail
      setUploadError(typeof detail === 'string' ? detail : 'Failed to submit prescription.')
    }).finally(() => {
      setIsSubmitting(false)
    })
  }

  const resetForm = () => setSubmitted(false)

  const openUploadForm = () => {
    setSubmitted(false)
    setShowUploadForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeUploadForm = () => {
    setSubmitted(false)
    setShowUploadForm(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleClarificationReply = (rx: PrescriptionRecord, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const reply = (replyDrafts[rx.id] || '').trim()
    if (!reply) {
      setReplyNotice((current) => ({ ...current, [rx.id]: 'Enter a response before sending.' }))
      return
    }
    if (!rx.backendId) {
      setReplyNotice((current) => ({ ...current, [rx.id]: 'This prescription is still syncing. Please try again shortly.' }))
      return
    }

    setSendingReplyId(rx.backendId)
    setReplyNotice((current) => ({ ...current, [rx.id]: '' }))
    void prescriptionService.replyToClarification(rx.backendId, reply).then((response) => {
      setPrescriptions(response.data)
      setReplyDrafts((current) => ({ ...current, [rx.id]: '' }))
      setReplyNotice((current) => ({ ...current, [rx.id]: 'Response sent to the pharmacy team.' }))
      setExpandedId(rx.id)
    }).catch((error) => {
      type ApiErr = { response?: { data?: { error?: { message?: string }; detail?: string | Record<string, string> } } }
      const detail = (error as ApiErr)?.response?.data?.error?.message
        ?? (error as ApiErr)?.response?.data?.detail
      setReplyNotice((current) => ({
        ...current,
        [rx.id]: typeof detail === 'string' ? detail : 'Unable to send your response.',
      }))
    }).finally(() => {
      setSendingReplyId(null)
    })
  }

  if (!showUploadForm) {
    return (
      <div className="dc-page ac-page dc-hub-page rup-hub-page">
        <div className="container">
          <div className="ac-header">
            <div>
              <p className="ac-header__eyebrow">Prescriptions</p>
              <h1 className="ac-header__title">My Prescriptions</h1>
              <p className="ac-header__sub">Track pharmacist reviews, respond to clarifications, and upload new prescriptions.</p>
            </div>
            <div className="dc-header-actions">
              <Link to="/health-services" className="dc-back-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                Back to health services
              </Link>
              <button type="button" className="ac-header__action dc-link-button" onClick={openUploadForm}>
                New prescription
              </button>
            </div>
          </div>

          <div className="ac-overview">
            <div className="ac-overview__item">
              <span>Pending review</span>
              <strong>{counts.pending}</strong>
            </div>
            <div className="ac-overview__item">
              <span>Needs clarification</span>
              <strong>{counts.clarification}</strong>
            </div>
            <div className="ac-overview__item">
              <span>Approved</span>
              <strong>{counts.approved}</strong>
            </div>
          </div>

          <div className="ac-controls">
            <div className="ac-tabs">
              {SOURCE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`ac-tab${activeSource === tab.key ? ' ac-tab--active' : ''}`}
                  onClick={() => setActiveSource(tab.key)}
                >
                  {tab.label}
                  <span className="ac-tab__count">{counts[tab.key]}</span>
                </button>
              ))}
            </div>
            <div className="ac-status-tabs" aria-label="Prescription status filter">
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

          {loadError && (
            <div className="ac-empty dc-hub-error">
              <p className="ac-empty__title">Something went wrong</p>
              <p className="ac-empty__sub">{loadError}</p>
            </div>
          )}

          {isLoadingPrescriptions ? (
            <div className="ac-empty">
              <p className="ac-empty__title">Loading prescriptions</p>
              <p className="ac-empty__sub">Fetching your latest prescription activity.</p>
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="ac-empty">
              <div className="ac-empty__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <path d="M14 2v6h6"/>
                  <path d="M12 18v-6"/>
                  <path d="M9 15h6"/>
                </svg>
              </div>
              <p className="ac-empty__title">No prescriptions yet</p>
              <p className="ac-empty__sub">Upload a prescription for pharmacist review, then track approval and fulfilment here.</p>
              <button type="button" className="btn btn--primary btn--sm dc-empty-cta" onClick={openUploadForm}>
                Upload prescription
              </button>
            </div>
          ) : (
            <ul className="ac-list">
              {filteredPrescriptions.map((rx) => {
                const status = STATUS_CFG[rx.status]
                const isExpanded = expandedId === rx.id
                const sourceLabel = sourceLabelForPrescription(rx)
                const threadCount = rx.clarificationMessages.length || (rx.clarificationMessage ? 1 : 0)
                const latestThreadMessage = rx.clarificationMessages.length > 0
                  ? rx.clarificationMessages[rx.clarificationMessages.length - 1]
                  : null
                const rejectedReason = rejectionReason(rx)

                return (
                  <li key={rx.id} className="ac-card">
                    <button
                      type="button"
                      className="ac-card__header"
                      onClick={() => setExpandedId((current) => (current === rx.id ? null : rx.id))}
                      aria-expanded={isExpanded}
                    >
                      <div className="ac-card__left">
                        <div className="ac-card__avatar rup-rx-avatar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <path d="M14 2v6h6"/>
                            <path d="M12 18v-6"/>
                            <path d="M9 15h6"/>
                          </svg>
                        </div>
                        <div className="ac-card__meta">
                          <div className="ac-card__top-row">
                            <span className="ac-card__doctor">{rx.id}</span>
                            <span className="ac-card__type-badge rup-source-badge">
                              {sourceLabel}
                            </span>
                          </div>
                          <p className="ac-card__specialty">{rx.doctor || 'Prescribing doctor not provided'}</p>
                          <p className="ac-card__datetime">{formatDate(rx.submitted)} · {rx.files.length} file{rx.files.length === 1 ? '' : 's'}</p>
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
                          <p className="ac-card__summary-label">Notes</p>
                          <p className="ac-card__summary-text">{rx.notes || 'No notes recorded for this prescription.'}</p>
                        </div>

                        <div className="ac-card__info-grid">
                          <div>
                            <span>Status</span>
                            <strong>{status.label}</strong>
                          </div>
                          <div>
                            <span>Submitted</span>
                            <strong>{formatDate(rx.submitted)}</strong>
                          </div>
                          <div>
                            <span>Dispatch</span>
                            <strong>{rx.dispatchStatus}</strong>
                          </div>
                        </div>

                        {rx.clarificationMessage && (
                          <div className="ac-card__followup rup-clarification-note">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <path d="M12 8v4"/>
                              <path d="M12 16h.01"/>
                            </svg>
                            <span>
                              <strong>Clarification thread</strong> · {threadCount} message{threadCount === 1 ? '' : 's'}
                              <small>{latestThreadMessage?.message || rx.clarificationMessage}</small>
                            </span>
                          </div>
                        )}

                        {rejectedReason && (
                          <div className="ac-card__followup rup-rejection-note">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <path d="M15 9l-6 6"/>
                              <path d="M9 9l6 6"/>
                            </svg>
                            <span>
                              <strong>Reason for rejection</strong>
                              <small>{rejectedReason}</small>
                            </span>
                          </div>
                        )}

                        <div className="ac-card__actions">
                          <button
                            type="button"
                            className={rx.status === 'Clarification' ? 'btn btn--outline btn--sm' : 'btn btn--primary btn--sm'}
                            onClick={() => setActiveRx(rx)}
                          >
                            {rx.status === 'Clarification' ? 'View thread' : 'View details'}
                          </button>
                          {rx.status === 'Approved' && (
                            <Link to="/cart" className="btn btn--outline btn--sm">
                              Open cart
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
                  <path d="M8 7h8"/>
                  <path d="M8 11h8"/>
                  <path d="M8 15h5"/>
                  <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
                </svg>
              </div>
              <div>
                <h3>Need a doctor?</h3>
                <p>Start a consultation when you need a clinician to assess symptoms or issue a digital prescription.</p>
              </div>
              <Link to="/doctor-consultation" className="btn btn--primary btn--sm ac-cta-card__btn">
                Start consultation
              </Link>
            </div>
          </div>

          {activeRx && (
            <div className="modal-overlay" onClick={() => setActiveRx(null)}>
              <div className="modal rx-modal" onClick={(event) => event.stopPropagation()}>
                <div className="modal__header rx-modal__header">
                  <div className="rx-modal__header-main">
                    <p className="rx-modal__eyebrow">Prescription</p>
                    <h2>{activeRx.id}</h2>
                    <p className="rx-modal__sub">Review files, pharmacist notes, clarification messages, and fulfilment items.</p>
                  </div>
                  <div className="rx-modal__header-side">
                    <span className="ac-card__status" style={{ color: STATUS_CFG[activeRx.status].color, background: STATUS_CFG[activeRx.status].bg }}>
                      {STATUS_CFG[activeRx.status].icon} {STATUS_CFG[activeRx.status].label}
                    </span>
                    <button className="modal__close" type="button" onClick={() => setActiveRx(null)}>×</button>
                  </div>
                </div>

                <div className="modal__content rx-modal__content">
                  <ul className="rup-modal-facts" aria-label="Prescription details">
                    <li><span>Patient</span><strong>{activeRx.patient}</strong></li>
                    <li><span>Doctor</span><strong>{activeRx.doctor || 'Not provided'}</strong></li>
                    <li><span>Submitted</span><strong>{formatDate(activeRx.submitted)}</strong></li>
                    <li><span>Dispatch</span><strong>{activeRx.dispatchStatus}</strong></li>
                  </ul>

                  <section className="rx-modal__section">
                    <div className="rx-modal__section-head">
                      <h3>Uploaded files</h3>
                      <span>{activeRx.files.length} file{activeRx.files.length === 1 ? '' : 's'}</span>
                    </div>
                    {activeRx.files.length > 0 ? (
                      <div className="rx-modal__file-list">
                        {activeRx.files.map((file, index) => {
                          const href = resolveMediaUrl(file) || file
                          return (
                            <a key={`${file}-${index}`} className="rx-modal__file-pill" href={href} target="_blank" rel="noreferrer">
                              <span>{formatFileLabel(file, index)}</span>
                              <small>Open</small>
                            </a>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="rx-modal__empty">No files uploaded for this prescription.</p>
                    )}
                  </section>

                  <section className="rx-modal__section">
                    <div className="rx-modal__section-head">
                      <h3>Notes</h3>
                    </div>
                    <div className="rx-modal__note-box">
                      {activeRx.notes || 'No notes added.'}
                    </div>
                  </section>

                  {rejectionReason(activeRx) && (
                    <section className="rx-modal__section rup-rejection-section">
                      <div className="rx-modal__section-head">
                        <h3>Reason for rejection</h3>
                      </div>
                      <p className="rup-rejection-section__text">{rejectionReason(activeRx)}</p>
                    </section>
                  )}

                  {(activeThread.length > 0 || activeRx.status === 'Clarification') && (
                    <section className="rx-modal__section rup-thread-section">
                      <div className="rx-modal__section-head">
                        <h3>Clarification thread</h3>
                        <span>{activeThread.length} message{activeThread.length === 1 ? '' : 's'}</span>
                      </div>

                      {activeThread.length > 0 ? (
                        <div className="rup-thread">
                          {activeThread.map((entry) => (
                            <article
                              key={`${activeRx.id}-${entry.id}-${entry.createdAt}`}
                              className={`rup-thread__message ${entry.senderRole === 'patient' ? 'rup-thread__message--patient' : 'rup-thread__message--staff'}`}
                            >
                              <div className="rup-thread__meta">
                                <strong>{entry.senderRole === 'patient' ? 'You' : (entry.senderDisplay || entry.senderName || 'Pharmacist')}</strong>
                                <span>{formatThreadTime(entry.createdAt)}</span>
                              </div>
                              <p>{entry.message}</p>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="rx-modal__empty">No clarification messages have been added yet.</p>
                      )}

                      {activeRx.status === 'Clarification' && (
                        <form className="rup-clarification-form" onSubmit={(event) => handleClarificationReply(activeRx, event)}>
                          <div className="rup-clarification-form__head">
                            <div>
                              <p className="rup-clarification-form__label">Reply</p>
                              <p className="rup-clarification-form__hint">Your message will be added to this thread.</p>
                            </div>
                          </div>
                          <textarea
                            value={replyDrafts[activeRx.id] || ''}
                            onChange={(event) => {
                              setReplyDrafts((current) => ({ ...current, [activeRx.id]: event.target.value }))
                              setReplyNotice((current) => ({ ...current, [activeRx.id]: '' }))
                            }}
                            rows={3}
                            placeholder="Type a short response..."
                          />
                          <div className="rup-clarification-form__actions">
                            {replyNotice[activeRx.id] && (
                              <p className="rup-clarification-form__notice">{replyNotice[activeRx.id]}</p>
                            )}
                            <button className="btn btn--primary btn--sm" type="submit" disabled={sendingReplyId === activeRx.backendId}>
                              {sendingReplyId === activeRx.backendId ? 'Sending...' : 'Send'}
                            </button>
                          </div>
                        </form>
                      )}
                    </section>
                  )}

                  <section className="rx-modal__section">
                    <div className="rx-modal__section-head">
                      <h3>Approved items</h3>
                      <span>{activeRx.items.length}</span>
                    </div>
                    {activeRx.items.length === 0 ? (
                      <p className="rx-modal__empty">No fulfilment items have been set yet.</p>
                    ) : (
                      <ul className="rx-approved-items rx-approved-items--modal rup-approved-list">
                        {activeRx.items.map((item) => (
                          <li key={`${item.backendId || item.name}-${item.name}`} className="rx-approved-items__row">
                            <div>
                              <p className="rx-approved-items__name">{item.productName || item.name}</p>
                              <p className="rx-approved-items__meta">{item.dose} · {item.frequency} · Qty {item.qty}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>

                <div className="modal__footer rx-modal__footer">
                  {activeRx.status === 'Approved' && (
                    <Link to="/cart" className="btn btn--outline btn--sm">Open cart</Link>
                  )}
                  <button className="btn btn--outline btn--sm" type="button" onClick={() => setActiveRx(null)}>Close</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="dc-page ac-page dc-hub-page rup-hub-page rup-upload-screen">
      <div className="container">
        <div className="ac-header">
          <div>
            <p className="ac-header__eyebrow">Prescriptions</p>
            <h1 className="ac-header__title">Upload Prescription</h1>
            <p className="ac-header__sub">Submit a prescription for pharmacist review, then track updates from this same page.</p>
          </div>
          <div className="dc-header-actions">
            <Link to="/health-services" className="dc-back-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
              Back to health services
            </Link>
            <button type="button" className="ac-header__action dc-link-button" onClick={closeUploadForm}>
              Back to prescriptions
            </button>
            {!isLoggedIn && (
              <Link to="/login?redirect=/prescriptions" className="btn btn--primary btn--sm">Sign in</Link>
            )}
          </div>
        </div>

        <div className="ac-overview">
          <div className="ac-overview__item">
            <span>Pending review</span>
            <strong>{counts.pending}</strong>
          </div>
          <div className="ac-overview__item">
            <span>Needs clarification</span>
            <strong>{counts.clarification}</strong>
          </div>
          <div className="ac-overview__item">
            <span>Approved</span>
            <strong>{counts.approved}</strong>
          </div>
        </div>

        <div className="rup-layout">
            <div className="rup-form-card">
              {submitted ? (
                <div className="rup-success">
                  <div className="rup-success__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h2>Prescription submitted!</h2>
                  <p>Reference: <strong>{submittedId}</strong></p>
                  <p className="rup-success__note">
                    Our pharmacists will review your prescription and notify you once it's approved. Typical review time is under 24 hours.
                  </p>
                  {requestedProductName && (
                    <p className="rup-success__context">
                      We attached <strong>{requestedProductName}</strong> to this prescription request for pharmacist review.
                    </p>
                  )}
                  <div className="rup-success__steps">
                    <div className="rup-success__step rup-success__step--done">
                      <span className="rup-success__step-dot">✓</span>
                      <span>Prescription uploaded</span>
                    </div>
                    <div className="rup-success__step">
                      <span className="rup-success__step-dot rup-success__step-dot--pending">2</span>
                      <span>Pharmacist review</span>
                    </div>
                    <div className="rup-success__step">
                      <span className="rup-success__step-dot rup-success__step-dot--pending">3</span>
                      <span>Approval &amp; dispatch</span>
                    </div>
                    <div className="rup-success__step">
                      <span className="rup-success__step-dot rup-success__step-dot--pending">4</span>
                      <span>Delivery</span>
                    </div>
                  </div>
                  <div className="rup-success__actions">
                    <button className="btn btn--outline btn--sm" type="button" onClick={resetForm}>Upload another prescription</button>
                    <button className="btn btn--primary btn--sm" type="button" onClick={closeUploadForm}>View prescriptions</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rup-form-card__header">
                    <div>
                      <p className="rup-form-card__eyebrow">Prescription upload</p>
                      <h2 className="rup-form-title">Upload Prescription</h2>
                    </div>
                    <span className="rup-form-card__pill">PDF, JPG, PNG</span>
                  </div>
                  {requestedProductName && (
                    <div className="rup-request-context">
                      <p>
                        Upload this prescription to request <strong>{requestedProductName}</strong>. Our pharmacists will verify the document before dispensing.
                      </p>
                    </div>
                  )}

                  <div
                    className={`rup-dropzone ${isDragging ? 'rup-dropzone--active' : ''} ${uploadedFiles.length > 0 ? 'rup-dropzone--has-files' : ''}`}
                    onDragOver={(event) => {
                      event.preventDefault()
                      setIsDragging(true)
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => event.key === 'Enter' && fileInputRef.current?.click()}
                  >
                    <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleFileInput} className="rup-file-input" />
                    <div className="rup-dropzone__icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                    </div>
                    <p className="rup-dropzone__label">Prescription Upload</p>
                    <p className="rup-dropzone__title">{isDragging ? 'Drop files here' : 'Drag & drop files here or browse'}</p>
                    <p className="rup-dropzone__hint">Accepted: PDF, JPG, PNG · Maximum size: 5 MB</p>
                    {isSubmitting && (
                      <div className="rup-upload-progress" aria-label="Uploading prescription">
                        <span />
                      </div>
                    )}
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="rup-files">
                      {uploadedFiles.map((file, index) => (
                        <div key={`${file.name}-${file.size}-${index}`} className="rup-file-item">
                          <svg className="rup-file-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span className="rup-file-item__name">{file.name}</span>
                          <span className="rup-file-item__size">{(file.size / 1024).toFixed(0)} KB</span>
                          <button
                            className="rup-file-item__remove"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              removeFile(index)
                            }}
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rup-meta">
                    <div className="rup-field">
                      <label htmlFor="rx-doctor">Prescribing doctor <span className="rup-field__optional">optional</span></label>
                      <input id="rx-doctor" type="text" placeholder="Dr. Jane Doe" value={doctorName} onChange={(event) => setDoctorName(event.target.value)} />
                    </div>
                    <div className="rup-field">
                      <label htmlFor="rx-notes">Notes for pharmacist <span className="rup-field__optional">optional</span></label>
                      <textarea
                        id="rx-notes"
                        rows={3}
                        placeholder="E.g. delivery after 6 PM, allergies, substitution preferences…"
                        value={uploadNotes}
                        onChange={(event) => setUploadNotes(event.target.value)}
                      />
                    </div>
                  </div>

                  {uploadError && (
                    <p className="rup-error">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {uploadError}
                    </p>
                  )}

                  <button className="btn btn--primary rup-submit-btn" type="button" onClick={handleSubmit} disabled={uploadedFiles.length === 0 || isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Prescription for Review'}
                  </button>

                  <details className="rup-tips">
                    <summary>Tips for Faster Approval</summary>
                    <ul>
                      <li>Ensure the prescription is clear and fully visible</li>
                      <li>Include doctor&apos;s name, signature, and date</li>
                      <li>Upload all prescription pages</li>
                    </ul>
                  </details>

                  <div className="rup-trust-strip" aria-label="Prescription upload assurances">
                    <div className="rup-trust-strip__item">
                      <span>🛡</span>
                      <strong>Secure Upload</strong>
                    </div>
                    <div className="rup-trust-strip__item">
                      <span>⚕</span>
                      <strong>Reviewed by Licensed Pharmacists</strong>
                    </div>
                    <div className="rup-trust-strip__item">
                      <span>⏱</span>
                      <strong>Response Within 24 Hours</strong>
                    </div>
                  </div>
                </>
              )}
            </div>
        </div>
      </div>
    </div>
  )
}

export default PrescriptionUploadPage
