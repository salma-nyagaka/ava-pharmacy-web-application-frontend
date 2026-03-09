import { useEffect, useMemo, useState } from 'react'
import { PrescriptionRecord } from '../../data/prescriptions'
import { cartService } from '../../services/cartService'
import { prescriptionService } from '../../services/prescriptionService'
import './PrescriptionHistoryPage.css'

function PrescriptionHistoryPage() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([])
  const [activeRx, setActiveRx] = useState<PrescriptionRecord | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void prescriptionService.list().then((response) => setPrescriptions(response.data))
  }, [])

  const sortedPrescriptions = useMemo(() => {
    return [...prescriptions].sort((a, b) => b.id.localeCompare(a.id))
  }, [prescriptions])

  const addPrescriptionItemsToCart = (prescription: PrescriptionRecord) => {
    const validItems = prescription.items.filter((item) => item.qty > 0 && item.name !== 'Pending pharmacist review')
    if (prescription.status !== 'Approved' || validItems.length === 0) {
      setMessage('Only approved prescriptions can be added to cart.')
      return
    }

    validItems.forEach((item, index) => {
      void cartService.add(
        {
          id: Number(`${prescription.id.replace('RX-', '')}${index + 1}`),
          name: item.name,
          brand: 'Prescription item',
          price: 350,
          prescriptionId: prescription.id,
          stockSource: 'warehouse',
        },
        item.qty
      )
    })
    setMessage(`Added ${validItems.length} item(s) from ${prescription.id} to cart.`)
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
                        <button
                          className="btn btn--primary btn--sm"
                          type="button"
                          onClick={() => addPrescriptionItemsToCart(rx)}
                        >
                          Add to cart
                        </button>
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
            </div>
            <div className="modal__footer">
              {activeRx.status === 'Approved' && (
                <button className="btn btn--primary btn--sm" type="button" onClick={() => addPrescriptionItemsToCart(activeRx)}>
                  Add to cart
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
