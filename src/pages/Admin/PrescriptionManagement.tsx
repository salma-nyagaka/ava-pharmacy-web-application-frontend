import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logAdminAction } from '../../data/adminAudit'
import {
  DispatchStatus,
  PrescriptionRecord,
  PrescriptionStatus,
} from '../../data/prescriptions'
import { prescriptionService } from '../../services/prescriptionService'
import './AdminShared.css'
import './PrescriptionManagement.css'

const pharmacists = ['Grace N.', 'John K.', 'Lilian M.', 'Samuel P.']

function PrescriptionManagement() {
  const navigate = useNavigate()
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | PrescriptionStatus>('all')
  const [selectedDispatch, setSelectedDispatch] = useState<'all' | DispatchStatus>('all')
  const [selectedPharmacist, setSelectedPharmacist] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeRx, setActiveRx] = useState<PrescriptionRecord | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignId, setAssignId] = useState<string>('')
  const [assignPharmacist, setAssignPharmacist] = useState(pharmacists[0])
  const [overrideStatus, setOverrideStatus] = useState<PrescriptionStatus>('Approved')
  const [overrideReason, setOverrideReason] = useState('')

  useEffect(() => {
    void prescriptionService.list().then((response) => setPrescriptions(response.data))
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedStatus, selectedDispatch, selectedPharmacist])

  useEffect(() => {
    if (!activeRx) return
    const updated = prescriptions.find((item) => item.id === activeRx.id)
    setActiveRx(updated ?? null)
  }, [prescriptions, activeRx])

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/admin')
  }

  const updatePrescriptionRecords = async (
    prescriptionId: string,
    updates: Partial<PrescriptionRecord>,
    auditAction: string
  ) => {
    const response = await prescriptionService.update(prescriptionId, updates, auditAction)
    setPrescriptions(response.data)
  }

  const filteredPrescriptions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return prescriptions.filter((rx) => {
      const matchesStatus = selectedStatus === 'all' || rx.status === selectedStatus
      const matchesDispatch = selectedDispatch === 'all' || rx.dispatchStatus === selectedDispatch
      const matchesPharmacist = selectedPharmacist === 'all' || rx.pharmacist === selectedPharmacist
      if (!query) {
        return matchesStatus && matchesDispatch && matchesPharmacist
      }
      const matchesQuery = [rx.id, rx.patient, rx.pharmacist, rx.doctor]
        .some((value) => value.toLowerCase().includes(query))
      return matchesStatus && matchesDispatch && matchesPharmacist && matchesQuery
    })
  }, [prescriptions, searchTerm, selectedStatus, selectedDispatch, selectedPharmacist])

  const PAGE_SIZE = 6
  const totalPages = Math.max(1, Math.ceil(filteredPrescriptions.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedPrescriptions = filteredPrescriptions.slice(startIndex, startIndex + PAGE_SIZE)

  const openAssignModal = (rxId?: string) => {
    const fallbackId = rxId ?? prescriptions[0]?.id ?? ''
    const rx = prescriptions.find((item) => item.id === fallbackId)
    setAssignId(fallbackId)
    setAssignPharmacist(rx?.pharmacist === 'Unassigned' ? pharmacists[0] : rx?.pharmacist ?? pharmacists[0])
    setShowAssignModal(true)
  }

  const handleAssignSave = () => {
    if (!assignId) return
    void updatePrescriptionRecords(assignId, { pharmacist: assignPharmacist }, `Assigned pharmacist ${assignPharmacist}`)
    logAdminAction({
      action: 'Assign pharmacist',
      entity: 'Prescription',
      entityId: assignId,
      detail: `Assigned to ${assignPharmacist}`,
    })
    setShowAssignModal(false)
  }

  const updateStatus = (rxId: string, status: PrescriptionStatus, note?: string) => {
    const record = prescriptions.find((item) => item.id === rxId)
    if (!record) return
    const updates: Partial<PrescriptionRecord> = { status }
    if (status !== 'Approved') {
      updates.dispatchStatus = 'Not started'
    }
    const detailSuffix = note ? ` · ${note}` : ''
    void updatePrescriptionRecords(rxId, updates, `Status set to ${status}${detailSuffix}`)
    logAdminAction({
      action: 'Update prescription status',
      entity: 'Prescription',
      entityId: rxId,
      detail: `Status set to ${status}${detailSuffix}`,
    })
  }

  const updateDispatchStatus = (rxId: string, dispatchStatus: DispatchStatus) => {
    const record = prescriptions.find((item) => item.id === rxId)
    if (!record) return
    void updatePrescriptionRecords(
      rxId,
      { status: 'Approved', dispatchStatus },
      `Dispatch status set to ${dispatchStatus}`
    )
    logAdminAction({
      action: 'Update dispatch status',
      entity: 'Prescription',
      entityId: rxId,
      detail: dispatchStatus,
    })
  }

  useEffect(() => {
    if (!activeRx) return
    setOverrideStatus(activeRx.status)
    setOverrideReason('')
  }, [activeRx])

  const nextDispatchAction = (dispatchStatus: DispatchStatus): DispatchStatus | null => {
    if (dispatchStatus === 'Not started') return 'Queued'
    if (dispatchStatus === 'Queued') return 'Packed'
    if (dispatchStatus === 'Packed') return 'Dispatched'
    if (dispatchStatus === 'Dispatched') return 'Delivered'
    return null
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
            Back
          </button>
          <h1>Prescription Management</h1>
        </div>
      </div>

      <div className="admin-page__filters">
        <input
          type="text"
          placeholder="Search prescriptions"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as 'all' | PrescriptionStatus)}>
          <option value="all">All statuses</option>
          <option value="Approved">Approved</option>
          <option value="Pending">Pending</option>
          <option value="Clarification">Clarification</option>
          <option value="Rejected">Rejected</option>
        </select>
        <select value={selectedDispatch} onChange={(event) => setSelectedDispatch(event.target.value as 'all' | DispatchStatus)}>
          <option value="all">All dispatch stages</option>
          <option value="Not started">Not started</option>
          <option value="Queued">Queued</option>
          <option value="Packed">Packed</option>
          <option value="Dispatched">Dispatched</option>
          <option value="Delivered">Delivered</option>
        </select>
        <select value={selectedPharmacist} onChange={(event) => setSelectedPharmacist(event.target.value)}>
          <option value="all">All pharmacists</option>
          <option value="Unassigned">Unassigned</option>
          {pharmacists.map((pharmacist) => (
            <option key={pharmacist} value={pharmacist}>{pharmacist}</option>
          ))}
        </select>
      </div>

      <div className="admin-page__table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Patient</th>
              <th>Pharmacist</th>
              <th>Status</th>
              <th>Dispatch</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pagedPrescriptions.map((rx) => (
              <tr key={rx.id}>
                <td>{rx.id}</td>
                <td>{rx.patient}</td>
                <td>{rx.pharmacist}</td>
                <td>
                  <span
                    className={`admin-status ${
                      rx.status === 'Approved'
                        ? 'admin-status--success'
                        : rx.status === 'Pending'
                          ? 'admin-status--warning'
                          : rx.status === 'Clarification'
                            ? 'admin-status--warning'
                            : 'admin-status--danger'
                    }`}
                  >
                    {rx.status}
                  </span>
                </td>
                <td>
                  <span className="admin-status admin-status--info">{rx.dispatchStatus}</span>
                </td>
                <td>
                  <button className="btn btn--outline btn--sm" type="button" onClick={() => setActiveRx(rx)}>
                    View
                  </button>
                  <button className="btn btn--primary btn--sm" type="button" onClick={() => openAssignModal(rx.id)}>
                    Assign pharmacist
                  </button>
                </td>
              </tr>
            ))}
            {filteredPrescriptions.length === 0 && (
              <tr>
                <td colSpan={6} className="prescription-empty">No prescriptions match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredPrescriptions.length > 0 && (
        <div className="prescription-pagination">
          <button
            className="pagination__button"
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <div className="pagination__pages">
            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1
              return (
                <button
                  key={page}
                  className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              )
            })}
          </div>
          <button
            className="pagination__button"
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {activeRx && (
        <div className="modal-overlay" onClick={() => setActiveRx(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Prescription {activeRx.id}</h2>
              <button className="modal__close" onClick={() => setActiveRx(null)}>×</button>
            </div>
            <div className="modal__content">
              <div className="prescription-modal__summary">
                <div>
                  <p className="prescription-modal__label">Patient</p>
                  <p className="prescription-modal__value">{activeRx.patient}</p>
                </div>
                <div>
                  <p className="prescription-modal__label">Doctor</p>
                  <p className="prescription-modal__value">{activeRx.doctor}</p>
                </div>
                <div>
                  <p className="prescription-modal__label">Submitted</p>
                  <p className="prescription-modal__value">{activeRx.submitted}</p>
                </div>
                <div>
                  <p className="prescription-modal__label">Pharmacist</p>
                  <p className="prescription-modal__value">{activeRx.pharmacist}</p>
                </div>
                <div>
                  <p className="prescription-modal__label">Status</p>
                  <p className="prescription-modal__value">{activeRx.status}</p>
                </div>
                <div>
                  <p className="prescription-modal__label">Dispatch status</p>
                  <p className="prescription-modal__value">{activeRx.dispatchStatus}</p>
                </div>
              </div>

              <div className="prescription-modal__files">
                <p className="prescription-modal__label">Uploaded files</p>
                <ul className="files-list">
                  {activeRx.files.map((fileName) => (
                    <li key={fileName}>{fileName}</li>
                  ))}
                </ul>
              </div>

              <div className="prescription-modal__items">
                {activeRx.items.map((item) => (
                  <div key={item.name} className="prescription-item">
                    <div>
                      <strong>{item.name}</strong>
                      <span className="prescription-item__meta">
                        {item.dose} · {item.frequency}
                      </span>
                    </div>
                    <span>Qty {item.qty}</span>
                  </div>
                ))}
              </div>

              <div className="prescription-modal__notes">
                <p className="prescription-modal__label">Notes</p>
                <p className="prescription-modal__value">{activeRx.notes}</p>
              </div>

              <div className="prescription-modal__audit">
                <p className="prescription-modal__label">Audit history</p>
                <ul className="audit-list">
                  {(activeRx.audit ?? []).map((entry, index) => (
                    <li key={`${entry.time}-${index}`}>
                      <strong>{entry.time}</strong> · {entry.action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="modal__footer">
              <button
                className="btn btn--outline btn--sm"
                onClick={() => openAssignModal(activeRx.id)}
              >
                Reassign
              </button>
              <button
                className="btn btn--outline btn--sm"
                onClick={() => updateStatus(activeRx.id, 'Clarification')}
              >
                Request clarification
              </button>
              <button
                className="btn btn--outline btn--sm"
                onClick={() => updateStatus(activeRx.id, 'Rejected')}
              >
                Reject
              </button>
              <button
                className="btn btn--primary btn--sm"
                onClick={() => updateStatus(activeRx.id, 'Approved')}
              >
                Approve
              </button>
            </div>
            <div className="modal__footer modal__footer--override">
              <div className="override-grid">
                <div className="form-group">
                  <label>Override status</label>
                  <select value={overrideStatus} onChange={(event) => setOverrideStatus(event.target.value as PrescriptionStatus)}>
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                    <option value="Clarification">Clarification</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Justification</label>
                  <input
                    type="text"
                    placeholder="Reason for override"
                    value={overrideReason}
                    onChange={(event) => setOverrideReason(event.target.value)}
                  />
                </div>
              </div>
              <button
                className="btn btn--primary btn--sm"
                onClick={() => updateStatus(activeRx.id, overrideStatus, overrideReason)}
              >
                Override decision
              </button>
            </div>
            {activeRx.status === 'Approved' && (
              <div className="modal__footer modal__footer--dispatch">
                {nextDispatchAction(activeRx.dispatchStatus) ? (
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => updateDispatchStatus(activeRx.id, nextDispatchAction(activeRx.dispatchStatus)!)}
                  >
                    {activeRx.dispatchStatus === 'Not started' && 'Queue for dispatch'}
                    {activeRx.dispatchStatus === 'Queued' && 'Mark packed'}
                    {activeRx.dispatchStatus === 'Packed' && 'Mark dispatched'}
                    {activeRx.dispatchStatus === 'Dispatched' && 'Mark delivered'}
                  </button>
                ) : (
                  <span className="dispatch-done">Delivery completed.</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Assign pharmacist</h2>
              <button className="modal__close" onClick={() => setShowAssignModal(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="form-group">
                <label>Prescription</label>
                <select value={assignId} onChange={(event) => setAssignId(event.target.value)}>
                  {prescriptions.map((rx) => (
                    <option key={rx.id} value={rx.id}>{rx.id} · {rx.patient}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Pharmacist</label>
                <select value={assignPharmacist} onChange={(event) => setAssignPharmacist(event.target.value)}>
                  {pharmacists.map((pharmacist) => (
                    <option key={pharmacist} value={pharmacist}>{pharmacist}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowAssignModal(false)}>
                Cancel
              </button>
              <button className="btn btn--primary btn--sm" onClick={handleAssignSave}>
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PrescriptionManagement
