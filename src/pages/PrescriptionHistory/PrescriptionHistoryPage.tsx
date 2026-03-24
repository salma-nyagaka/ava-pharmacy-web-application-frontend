
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PrescriptionRecord } from '../../data/prescriptions'
import { prescriptionService } from '../../services/prescriptionService'
import '../../styles/pages/PrescriptionHistoryPage.css'

type SourceFilter = 'all' | 'upload' | 'e_prescription'

function statusPillClass(status: string) {
  if (status === 'Approved') return 'status-pill--success'
  if (status === 'Pending') return 'status-pill--warning'
  if (status === 'Clarification') return 'status-pill--warning'
  return 'status-pill--danger'
}

function PrescriptionHistoryPage() {
  const navigate = useNavigate()
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([])
  const [activeRx, setActiveRx] = useState<PrescriptionRecord | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isAddingItemId, setIsAddingItemId] = useState<number | null>(null)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')

  useEffect(() => {
    void prescriptionService.list().then((response) => setPrescriptions(response.data))
  }, [])

  const sortedPrescriptions = useMemo(() => {
    const filtered = prescriptions.filter((rx) => {
      if (sourceFilter === 'e_prescription') return rx.notes?.toLowerCase().includes('e-prescription') || rx.doctor?.toLowerCase().includes('clinician')
      if (sourceFilter === 'upload') return !rx.notes?.toLowerCase().includes('e-prescription')
      return true
    })
    return [...filtered].sort((a, b) => b.id.localeCompare(a.id))
  }, [prescriptions, sourceFilter])

  const handleAddApprovedItem = async (prescriptionId: string, itemId?: number, name?: string) => {
    if (!itemId) { setMessage('This approved item is not mapped to a product yet.'); return }
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

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div className="rx-page">
      <div className="rx-header">
        <div>
          <h2 className="rx-header__title">Prescription history</h2>
          <p className="rx-header__sub">Track approvals, re-uploads, and pharmacist feedback for your prescriptions.</p>
        </div>
        <span className="rx-header__badge">Prescriptions</span>
      </div>

      <div className="rx-source-tabs">
        {(['all', 'upload', 'e_prescription'] as SourceFilter[]).map((s) => (
          <button
            key={s}
            type="button"
            className={`rx-source-tab ${sourceFilter === s ? 'rx-source-tab--active' : ''}`}
            onClick={() => setSourceFilter(s)}
          >
            {s === 'all' ? 'All' : s === 'upload' ? 'Uploaded' : 'E-Prescription'}
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
              <>
                <tr key={rx.id}>
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
                    </div>
                  </td>
                </tr>

                {expandedId === rx.id && (
                  <tr key={`${rx.id}-exp`} className="rx-expanded-row">
                    <td colSpan={7}>
                      <div className="rx-expanded">
                        {rx.notes && (
                          <div className="rx-expanded__section">
                            <p className="rx-expanded__label">Pharmacist notes</p>
                            <p className="rx-expanded__value">{rx.notes}</p>
                          </div>
                        )}
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
                              {rx.audit.map((entry, i) => (
                                <div key={i} className="rx-audit__entry">
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
              </>
            ))}
          </tbody>
        </table>
        {message && <p className="card__meta" style={{ marginTop: '0.75rem' }}>{message}</p>}
      </div>

      {activeRx && (
        <div className="modal-overlay" onClick={() => setActiveRx(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{activeRx.id}</h2>
              <button className="modal__close" type="button" onClick={() => setActiveRx(null)}>×</button>
            </div>
            <div className="modal__content">
              <p className="card__meta"><strong>Patient:</strong> {activeRx.patient}</p>
              <p className="card__meta"><strong>Doctor:</strong> {activeRx.doctor}</p>
              <p className="card__meta"><strong>Submitted:</strong> {activeRx.submitted}</p>
              <p className="card__meta"><strong>Status:</strong> {activeRx.status}</p>
              <p className="card__meta"><strong>Dispatch:</strong> {activeRx.dispatchStatus}</p>
              <p className="card__meta"><strong>Files:</strong> {activeRx.files.join(', ')}</p>
              <p className="card__meta"><strong>Notes:</strong> {activeRx.notes}</p>
              <div className="rx-approved-items">
                <h3 className="rx-approved-items__title">Approved items</h3>
                {activeRx.items.length === 0 ? (
                  <p className="card__meta">No fulfilment items have been set yet.</p>
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
            </div>
            <div className="modal__footer">
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
