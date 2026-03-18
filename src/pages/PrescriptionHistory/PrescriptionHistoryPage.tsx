
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PrescriptionRecord } from '../../data/prescriptions'
import { prescriptionService } from '../../services/prescriptionService'
import '../../styles/pages/PrescriptionHistoryPage.css'

function PrescriptionHistoryPage() {
  const navigate = useNavigate()
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([])
  const [activeRx, setActiveRx] = useState<PrescriptionRecord | null>(null)
  const [message, setMessage] = useState('')
  const [isAddingItemId, setIsAddingItemId] = useState<number | null>(null)

  useEffect(() => {
    void prescriptionService.list().then((response) => setPrescriptions(response.data))
  }, [])

  const sortedPrescriptions = useMemo(() => {
    return [...prescriptions].sort((a, b) => b.id.localeCompare(a.id))
  }, [prescriptions])

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
      const detail = error instanceof Error ? error.message : 'Unable to add approved item to cart.'
      setMessage(detail)
    } finally {
      setIsAddingItemId(null)
    }
  }

  return (
    <div className="rx-page">
      <div className="rx-header">
        <div>
          <h2 className="rx-header__title">Prescription history</h2>
          <p className="rx-header__sub">Track approvals, re-uploads, and pharmacist feedback for your prescriptions.</p>
        </div>
        <span className="rx-header__badge">Prescriptions</span>
      </div>
      <div className="rx-table-card">
          <table className="table">
            <thead>
              <tr>
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
                <tr key={rx.id}>
                  <td>{rx.id}</td>
                  <td>{rx.doctor}</td>
                  <td>{rx.submitted}</td>
                  <td>
                    <span className={
                      `status-pill ${
                        rx.status === 'Approved'
                          ? 'status-pill--success'
                          : rx.status === 'Pending'
                            ? 'status-pill--warning'
                            : 'status-pill--danger'
                      }`
                    }>
                      {rx.status}
                    </span>
                  </td>
                  <td>
                    <span className="status-pill status-pill--info">{rx.dispatchStatus}</span>
                  </td>
                  <td>
                    <div className="rx-actions">
                      <button className="btn btn--outline btn--sm" type="button" onClick={() => setActiveRx(rx)}>
                        View
                      </button>
                      {rx.status === 'Approved' && (
                        <span className="status-pill status-pill--success">Approved for fulfilment</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        {message && <p className="card__meta" style={{ marginTop: '0.75rem' }}>{message}</p>}
      </div>

      {activeRx && (
        <div className="modal-overlay" onClick={() => setActiveRx(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
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
                <button className="btn btn--outline btn--sm" type="button" onClick={() => navigate('/cart')}>
                  Open cart
                </button>
              )}
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setActiveRx(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PrescriptionHistoryPage
