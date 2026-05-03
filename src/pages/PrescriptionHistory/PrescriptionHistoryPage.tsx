import { FormEvent, Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PrescriptionClarificationMessage, PrescriptionRecord } from '../../data/prescriptions'
import { resolveMediaUrl } from '../../lib/apiClient'
import { prescriptionService } from '../../services/prescriptionService'
import '../../styles/pages/PrescriptionHistoryPage.css'

type SourceFilter = 'all' | 'upload' | 'e_prescription'

function statusPillClass(status: string) {
  if (status === 'Approved') return 'status-pill--success'
  if (status === 'Pending') return 'status-pill--warning'
  if (status === 'Clarification') return 'status-pill--warning'
  return 'status-pill--danger'
}

function formatMessageTime(value: string) {
  if (!value) return 'Just now'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString()
}

function formatFileLabel(value: string, index: number) {
  const cleaned = value.split('?')[0]
  const name = cleaned.split('/').filter(Boolean).pop()
  return name || `Prescription file ${index + 1}`
}

function formatSelectedFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function fallbackClarificationMessages(rx: PrescriptionRecord): PrescriptionClarificationMessage[] {
  if (rx.clarificationMessages.length > 0) return rx.clarificationMessages
  if (!rx.clarificationMessage) return []
  return [{
    id: 0,
    senderRole: 'pharmacist',
    senderName: rx.pharmacist,
    senderDisplay: rx.pharmacist,
    message: rx.clarificationMessage,
    createdAt: rx.submitted,
  }]
}

function PrescriptionHistoryPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([])
  const [activeRx, setActiveRx] = useState<PrescriptionRecord | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isAddingItemId, setIsAddingItemId] = useState<number | null>(null)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [selectedResubmitFiles, setSelectedResubmitFiles] = useState<Record<string, File[]>>({})
  const [sendingReplyId, setSendingReplyId] = useState<number | null>(null)
  const [resubmittingId, setResubmittingId] = useState<number | null>(null)

  useEffect(() => {
    void prescriptionService.list().then((response) => setPrescriptions(response.data))
  }, [])

  useEffect(() => {
    if (!prescriptions.length) return
    const target = searchParams.get('prescription')
    if (!target) return
    const match = prescriptions.find((rx) => String(rx.backendId) === target || rx.id === target)
    if (!match) return
    setExpandedId(match.id)
    setActiveRx(match)
  }, [prescriptions, searchParams])

  useEffect(() => {
    if (!activeRx) return
    const updated = prescriptions.find((rx) => rx.id === activeRx.id)
    if (updated && updated !== activeRx) {
      setActiveRx(updated)
    }
  }, [prescriptions, activeRx])

  const sortedPrescriptions = useMemo(() => {
    const filtered = prescriptions.filter((rx) => {
      if (sourceFilter === 'e_prescription') return rx.notes?.toLowerCase().includes('e-prescription') || rx.doctor?.toLowerCase().includes('clinician')
      if (sourceFilter === 'upload') return !rx.notes?.toLowerCase().includes('e-prescription')
      return true
    })
    return [...filtered].sort((a, b) => b.id.localeCompare(a.id))
  }, [prescriptions, sourceFilter])

  const handleAddApprovedItem = async (prescriptionId: string, itemId?: number, name?: string) => {
    if (!itemId) {
      setMessage('This approved item is not mapped to a product yet.')
      return
    }
    setIsAddingItemId(itemId)
    try {
      await prescriptionService.addApprovedItemToCart(prescriptionId, itemId)
      setMessage(`${name || 'Item'} added to cart.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to add approved item to cart.')
    } finally {
      setIsAddingItemId(null)
    }
  }

  const handleReplySubmit = async (rx: PrescriptionRecord, event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (!rx.backendId) {
      setMessage('This prescription is not synced yet. Please try again shortly.')
      return
    }
    const reply = (replyDrafts[rx.id] || '').trim()
    if (!reply) {
      setMessage('Enter your clarification response before sending.')
      return
    }

    setSendingReplyId(rx.backendId)
    try {
      const response = await prescriptionService.replyToClarification(rx.backendId, reply)
      setPrescriptions(response.data)
      setReplyDrafts((current) => ({ ...current, [rx.id]: '' }))
      const updated = response.data.find((entry) => entry.id === rx.id)
      if (updated) {
        setExpandedId(updated.id)
        setActiveRx(updated)
      }
      setMessage('Your response has been sent to the pharmacy team.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to send your clarification response.')
    } finally {
      setSendingReplyId(null)
    }
  }

  const handleResubmitFilesChange = (rxId: string, files: FileList | null) => {
    setSelectedResubmitFiles((current) => ({
      ...current,
      [rxId]: files ? Array.from(files) : [],
    }))
  }

  const handleResubmit = async (rx: PrescriptionRecord) => {
    if (!rx.backendId) {
      setMessage('This prescription is not synced yet. Please try again shortly.')
      return
    }
    const files = selectedResubmitFiles[rx.id] || []
    if (!files.length) {
      setMessage('Choose at least one updated file before resubmitting.')
      return
    }

    setResubmittingId(rx.backendId)
    try {
      const response = await prescriptionService.resubmit(rx.backendId, files)
      setPrescriptions(response.data)
      setSelectedResubmitFiles((current) => ({ ...current, [rx.id]: [] }))
      const updated = response.data.find((entry) => entry.id === rx.id)
      if (updated) {
        setExpandedId(updated.id)
        setActiveRx(updated)
      }
      setMessage('Updated prescription files submitted for pharmacist review.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to resubmit prescription files.')
    } finally {
      setResubmittingId(null)
    }
  }

  const renderClarificationPanel = (rx: PrescriptionRecord) => {
    const thread = fallbackClarificationMessages(rx)
    const replyValue = replyDrafts[rx.id] || ''
    const selectedFiles = selectedResubmitFiles[rx.id] || []
    const isSending = sendingReplyId === rx.backendId
    const isResubmitting = resubmittingId === rx.backendId

    if (thread.length === 0 && rx.status !== 'Clarification') return null

    return (
      <div className="rx-clarification">
        <div className="rx-clarification__head">
          <div>
            <p className="rx-expanded__label">Clarification thread</p>
            <p className="rx-clarification__sub">View messages from the pharmacist, send a response, and resubmit clearer files from this page.</p>
          </div>
          {rx.status === 'Clarification' && <span className="status-pill status-pill--warning">Action needed</span>}
        </div>

        <div className="rx-clarification__thread">
          {thread.map((entry) => (
            <article
              key={`${rx.id}-${entry.id}-${entry.createdAt}`}
              className={`rx-clarification__bubble ${entry.senderRole === 'patient' ? 'rx-clarification__bubble--patient' : 'rx-clarification__bubble--staff'}`}
            >
              <div className="rx-clarification__meta">
                <strong>{entry.senderDisplay}</strong>
                <span>{formatMessageTime(entry.createdAt)}</span>
              </div>
              <p>{entry.message}</p>
            </article>
          ))}
        </div>

        {rx.status === 'Clarification' && (
          <>
            <div className="rx-clarification__upload">
              <div className="rx-clarification__upload-head">
                <div>
                  <p className="rx-expanded__label">Updated files</p>
                  <p className="rx-clarification__sub">Attach a clearer scan or corrected prescription before sending it back for review.</p>
                </div>
                {selectedFiles.length > 0 && <span className="status-pill status-pill--info">{selectedFiles.length} selected</span>}
              </div>

              <div className="rx-clarification__upload-actions">
                <label className="btn btn--outline btn--sm rx-clarification__file-trigger">
                  <input
                    className="rx-clarification__file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    onChange={(event) => handleResubmitFilesChange(rx.id, event.target.files)}
                  />
                  Choose files
                </label>
                <button className="btn btn--primary btn--sm" type="button" onClick={() => void handleResubmit(rx)} disabled={isResubmitting || selectedFiles.length === 0}>
                  {isResubmitting ? 'Resubmitting…' : 'Resubmit'}
                </button>
              </div>

              {selectedFiles.length > 0 && (
                <div className="rx-clarification__selected-files">
                  {selectedFiles.map((file) => (
                    <div key={`${rx.id}-${file.name}-${file.size}`} className="rx-clarification__selected-file">
                      <span>{file.name}</span>
                      <small>{formatSelectedFileSize(file.size)}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form className="rx-clarification__reply" onSubmit={(event) => void handleReplySubmit(rx, event)}>
              <label htmlFor={`clarification-reply-${rx.id}`}>Reply to pharmacist</label>
              <textarea
                id={`clarification-reply-${rx.id}`}
                value={replyValue}
                onChange={(event) => setReplyDrafts((current) => ({ ...current, [rx.id]: event.target.value }))}
                placeholder="Share the missing details, dosage confirmation, or any clarification requested by the pharmacist."
                rows={4}
              />
              <div className="rx-clarification__reply-actions">
                <p>The pharmacist will see this reply under the same prescription thread.</p>
                <button className="btn btn--primary btn--sm" type="submit" disabled={isSending}>
                  {isSending ? 'Sending…' : 'Send response'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    )
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="rx-page">
      <div className="rx-header">
        <div>
          <h2 className="rx-header__title">Prescription history</h2>
          <p className="rx-header__sub">Track approvals, clarification requests, and pharmacist feedback for your prescriptions.</p>
        </div>
        <span className="rx-header__badge">Prescriptions</span>
      </div>

      <div className="rx-source-tabs">
        {(['all', 'upload', 'e_prescription'] as SourceFilter[]).map((source) => (
          <button
            key={source}
            type="button"
            className={`rx-source-tab ${sourceFilter === source ? 'rx-source-tab--active' : ''}`}
            onClick={() => setSourceFilter(source)}
          >
            {source === 'all' ? 'All' : source === 'upload' ? 'Uploaded' : 'E-Prescription'}
          </button>
        ))}
      </div>

      <div className="rx-table-card">
        <table className="table">
          <thead>
            <tr>
              <th />
              <th>Prescription ID</th>
              <th>Doctor</th>
              <th>Date</th>
              <th>Status</th>
              <th>Dispatch</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedPrescriptions.map((rx) => (
              <Fragment key={rx.id}>
                <tr>
                  <td>
                    <button
                      className="rx-expand-btn"
                      type="button"
                      onClick={() => toggleExpand(rx.id)}
                      aria-expanded={expandedId === rx.id}
                      aria-label="Toggle details"
                    >
                      {expandedId === rx.id ? '▲' : '▼'}
                    </button>
                  </td>
                  <td>{rx.id}</td>
                  <td>{rx.doctor}</td>
                  <td>{rx.submitted}</td>
                  <td>
                    <span className={`status-pill ${statusPillClass(rx.status)}`}>{rx.status}</span>
                  </td>
                  <td>
                    <span className="status-pill status-pill--info">{rx.dispatchStatus}</span>
                  </td>
                  <td>
                    <div className="rx-actions">
                      <button className="btn btn--outline btn--sm" type="button" onClick={() => setActiveRx(rx)}>View</button>
                      {rx.status === 'Approved' && <span className="status-pill status-pill--success">Approved</span>}
                      {rx.status === 'Clarification' && <span className="status-pill status-pill--warning">Reply needed</span>}
                    </div>
                  </td>
                </tr>

                {expandedId === rx.id && (
                  <tr className="rx-expanded-row">
                    <td colSpan={7}>
                      <div className="rx-expanded">
                        {rx.notes && (
                          <div className="rx-expanded__section">
                            <p className="rx-expanded__label">Notes</p>
                            <p className="rx-expanded__value">{rx.notes}</p>
                          </div>
                        )}
                        {renderClarificationPanel(rx)}
                        {rx.items.length > 0 && (
                          <div className="rx-expanded__section">
                            <p className="rx-expanded__label">Prescribed items</p>
                            {rx.items.map((item) => (
                              <div key={item.backendId ?? item.name} className="rx-expanded__item">
                                <div>
                                  <span className="rx-expanded__item-name">{item.productName || item.name}</span>
                                  <span className="rx-expanded__item-meta">{item.dose} · {item.frequency} · Qty {item.qty}</span>
                                </div>
                                {rx.status === 'Approved' && item.productId && item.backendId ? (
                                  <button
                                    className="btn btn--primary btn--sm"
                                    type="button"
                                    disabled={isAddingItemId === item.backendId}
                                    onClick={() => void handleAddApprovedItem(rx.id, item.backendId, item.productName || item.name)}
                                  >
                                    {isAddingItemId === item.backendId ? 'Adding…' : 'Add to cart'}
                                  </button>
                                ) : (
                                  <span className="status-pill status-pill--warning">Awaiting mapping</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {rx.audit && rx.audit.length > 0 && (
                          <div className="rx-expanded__section">
                            <p className="rx-expanded__label">Audit log</p>
                            <div className="rx-audit">
                              {rx.audit.map((entry, index) => (
                                <div key={`${entry.action}-${entry.time}-${index}`} className="rx-audit__entry">
                                  <div className="rx-audit__dot" />
                                  <div>
                                    <p className="rx-audit__action">{entry.action}</p>
                                    <p className="rx-audit__time">{entry.time}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {message && <p className="card__meta" style={{ marginTop: '0.75rem' }}>{message}</p>}
      </div>

      {activeRx && (
        <div className="modal-overlay" onClick={() => setActiveRx(null)}>
          <div className="modal rx-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header rx-modal__header">
              <div className="rx-modal__header-main">
                <p className="rx-modal__eyebrow">Prescription</p>
                <h2>{activeRx.id}</h2>
                <p className="rx-modal__sub">Review pharmacist updates, files, and clarification messages for this prescription.</p>
              </div>
              <div className="rx-modal__header-side">
                <span className={`status-pill ${statusPillClass(activeRx.status)}`}>{activeRx.status}</span>
                <button className="modal__close" type="button" onClick={() => setActiveRx(null)}>×</button>
              </div>
            </div>
            <div className="modal__content rx-modal__content">
              <section className="rx-modal__summary">
                <article className="rx-modal__card">
                  <span>Patient</span>
                  <strong>{activeRx.patient}</strong>
                </article>
                <article className="rx-modal__card">
                  <span>Doctor</span>
                  <strong>{activeRx.doctor}</strong>
                </article>
                <article className="rx-modal__card">
                  <span>Submitted</span>
                  <strong>{activeRx.submitted}</strong>
                </article>
                <article className="rx-modal__card">
                  <span>Dispatch</span>
                  <strong>{activeRx.dispatchStatus}</strong>
                </article>
              </section>

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
                        <a
                          key={`${file}-${index}`}
                          className="rx-modal__file-pill"
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                        >
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

              {renderClarificationPanel(activeRx)}

              <section className="rx-modal__section">
                <div className="rx-modal__section-head">
                  <h3>Approved items</h3>
                  <span>{activeRx.items.length}</span>
                </div>
                <div className="rx-approved-items rx-approved-items--modal">
                  {activeRx.items.length === 0 ? (
                    <p className="rx-modal__empty">No fulfilment items have been set yet.</p>
                  ) : (
                    activeRx.items.map((item) => (
                      <div key={`${item.backendId || item.name}-${item.name}`} className="rx-approved-items__row">
                        <div>
                          <p className="rx-approved-items__name">{item.productName || item.name}</p>
                          <p className="rx-approved-items__meta">{item.dose} · {item.frequency} · Qty {item.qty}</p>
                        </div>
                        {activeRx.status === 'Approved' && item.productId && item.backendId ? (
                          <button
                            className="btn btn--primary btn--sm"
                            type="button"
                            disabled={isAddingItemId === item.backendId}
                            onClick={() => void handleAddApprovedItem(activeRx.id, item.backendId, item.productName || item.name)}
                          >
                            {isAddingItemId === item.backendId ? 'Adding…' : 'Add to cart'}
                          </button>
                        ) : (
                          <span className="status-pill status-pill--warning">Awaiting mapping</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
            <div className="modal__footer rx-modal__footer">
              {activeRx.status === 'Approved' && (
                <button className="btn btn--outline btn--sm" type="button" onClick={() => navigate('/cart')}>Open cart</button>
              )}
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setActiveRx(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PrescriptionHistoryPage
