import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ProfessionalRegistrationError,
  professionalRegistrationService,
  type ProfessionalResubmissionDetail,
} from '../../services/professionalRegistrationService'
import '../../styles/pages/ProfessionalRegisterPage.css'

function ProfessionalResubmissionPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [details, setDetails] = useState<ProfessionalResubmissionDetail | null>(null)
  const [documents, setDocuments] = useState<File[]>([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const roleLabel = useMemo(() => {
    const rawType = details?.application.type || details?.application.provider_type || ''
    return rawType === 'pediatrician' ? 'Pediatrician' : 'Doctor'
  }, [details])

  useEffect(() => {
    let mounted = true

    async function loadApplication() {
      if (!token) {
        setErrorMessage('This document upload link is missing a verification token.')
        setLoading(false)
        return
      }

      setLoading(true)
      setErrorMessage('')
      try {
        const response = await professionalRegistrationService.getResubmission(token)
        if (mounted) {
          setDetails(response)
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(error instanceof ProfessionalRegistrationError ? error.message : 'Unable to load this document request.')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadApplication()
    return () => {
      mounted = false
    }
  }, [token])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('')
    setSuccessMessage('')
    setDocuments(Array.from(event.target.files || []))
  }

  const removeFile = (fileName: string) => {
    setDocuments((current) => current.filter((file) => file.name !== fileName))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!token) {
      setErrorMessage('This document upload link is missing a verification token.')
      return
    }

    if (!documents.length) {
      setErrorMessage('Please upload at least one requested document before submitting.')
      return
    }

    const formData = new FormData()
    documents.forEach((file) => {
      formData.append('documents', file)
      formData.append('document_names', file.name)
    })
    if (note.trim()) {
      formData.append('note', note.trim())
    }

    setSubmitting(true)
    try {
      const response = await professionalRegistrationService.submitResubmission(token, formData)
      setDetails(response)
      setDocuments([])
      setNote('')
      setSuccessMessage(response.detail || 'Documents resubmitted successfully.')
    } catch (error) {
      setErrorMessage(error instanceof ProfessionalRegistrationError ? error.message : 'Unable to submit these documents.')
    } finally {
      setSubmitting(false)
    }
  }

  if (successMessage) {
    return (
      <main className="pr-page--success">
        <section className="pr-success" aria-live="polite">
          <div className="pr-success__icon" aria-hidden="true">✓</div>
          <h1 className="pr-success__title">Documents received</h1>
          <p className="pr-success__sub">
            {successMessage} Admin will review your updated documents and email you once a decision is made.
          </p>
          <div className="pr-success__timeline">
            <div className="pr-tl-step pr-tl-step--done">
              <span className="pr-tl-dot">✓</span>
              <span className="pr-tl-label">Documents uploaded</span>
            </div>
            <div className="pr-tl-step">
              <span className="pr-tl-dot">2</span>
              <span className="pr-tl-label">Admin review continues</span>
            </div>
            <div className="pr-tl-step">
              <span className="pr-tl-dot">3</span>
              <span className="pr-tl-label">Approval email and activation link sent</span>
            </div>
          </div>
          <p className="pr-success__contact">
            Need help? Contact <a href="mailto:support@avapharmacy.co.ke">support@avapharmacy.co.ke</a>
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="pr-page">
      <header className="pr-header">
        <div className="pr-header__inner">
          <Link to="/" className="pr-header__brand">
            <span>AVA Health</span>
          </Link>
          <div className="pr-header__progress" aria-hidden="true">
            <span>Document update</span>
            <div className="pr-header__bar">
              <div className="pr-header__fill" style={{ width: '65%' }} />
            </div>
          </div>
        </div>
      </header>

      <section className="pr-content">
        <form className="pr-step" onSubmit={handleSubmit}>
          <div className="pr-step__head">
            <h1 className="pr-step__title">Submit requested documents</h1>
            <p className="pr-step__sub">
              Upload the missing or corrected files requested by the Ava Pharmacy admin team.
            </p>
          </div>

          {loading && (
            <div className="pr-error-summary" role="status">
              <p className="pr-error-summary__title">Loading application...</p>
            </div>
          )}

          {errorMessage && (
            <div className="pr-error-summary" role="alert">
              <p className="pr-error-summary__title">Please fix the following before submitting:</p>
              <ul className="pr-error-summary__list">
                <li>{errorMessage}</li>
              </ul>
            </div>
          )}

          {details && (
            <div className="pr-summary-card">
              <div className="pr-summary-row">
                <span>Applicant</span>
                <strong>{details.application.name}</strong>
              </div>
              <div className="pr-summary-row">
                <span>Application</span>
                <strong>{details.application.reference || details.application.id}</strong>
              </div>
              <div className="pr-summary-row">
                <span>Role</span>
                <strong>{roleLabel}</strong>
              </div>
              <div className="pr-summary-row">
                <span>Admin request</span>
                <strong>{details.requested_documents_note || 'Please upload the additional documents requested by admin.'}</strong>
              </div>
            </div>
          )}

          <div className="pr-fields">
            <label className="pr-field">
              <span>Requested documents</span>
              <span className="pr-file-zone">
                <span className="pr-file-zone__text">Click to upload files</span>
                <span className="pr-file-zone__hint">PDF, JPG, PNG, or DOC files. Upload every document requested by admin.</span>
                <input
                  className="pr-file-zone__input"
                  type="file"
                  multiple
                  required
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  disabled={loading || submitting}
                />
              </span>
            </label>

            {documents.length > 0 && (
              <div className="pr-file-list">
                {documents.map((file) => (
                  <div className="pr-file-item" key={`${file.name}-${file.lastModified}`}>
                    <span>{file.name}</span>
                    <button type="button" onClick={() => removeFile(file.name)} disabled={submitting}>Remove</button>
                  </div>
                ))}
              </div>
            )}

            <label className="pr-field">
              <span>Note to admin</span>
              <textarea
                value={note}
                onChange={(event) => {
                  setNote(event.target.value)
                  setErrorMessage('')
                }}
                rows={4}
                placeholder="Add any context about the updated documents."
                disabled={loading || submitting}
              />
            </label>
          </div>

          <div className="pr-bottom-nav__inner" style={{ paddingInline: 0, paddingBottom: 0 }}>
            <Link to="/professional/register" className="pr-nav-back">Start a new application</Link>
            <button className="pr-nav-next" type="submit" disabled={loading || submitting || !documents.length}>
              {submitting ? 'Submitting...' : 'Submit documents'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default ProfessionalResubmissionPage
