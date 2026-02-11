import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminShared.css'
import './PayoutManagement.css'
import { logAdminAction } from '../../data/adminAudit'
import { loadDoctorProfiles } from '../../data/telemedicine'
import {
  AdminPayout,
  PayoutMethod,
  PayoutRole,
  PayoutStatus,
  loadAdminPayouts,
  saveAdminPayouts,
} from '../../data/payouts'

const payoutMethods: PayoutMethod[] = ['Bank Transfer', 'M-Pesa', 'Cheque', 'Cash']
const payoutRoles: PayoutRole[] = ['Doctor', 'Pediatrician', 'Pharmacist', 'Lab Partner']

function PayoutManagement() {
  const navigate = useNavigate()
  const [payouts, setPayouts] = useState<AdminPayout[]>(() => loadAdminPayouts())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<'all' | PayoutRole>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | PayoutStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showModal, setShowModal] = useState(false)

  const [recipientRole, setRecipientRole] = useState<PayoutRole>('Doctor')
  const [recipientId, setRecipientId] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [period, setPeriod] = useState('Feb 2026')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PayoutMethod>('Bank Transfer')
  const [reference, setReference] = useState('')
  const [status, setStatus] = useState<PayoutStatus>('Pending')
  const [notes, setNotes] = useState('')

  const doctors = useMemo(() => {
    return loadDoctorProfiles().filter((profile) => profile.status !== 'Suspended')
  }, [])

  const recipientOptions = useMemo(() => {
    if (recipientRole === 'Doctor') {
      return doctors.filter((profile) => profile.type === 'Doctor')
    }
    if (recipientRole === 'Pediatrician') {
      return doctors.filter((profile) => profile.type === 'Pediatrician')
    }
    return []
  }, [doctors, recipientRole])

  useEffect(() => {
    saveAdminPayouts(payouts)
  }, [payouts])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedRole, selectedStatus])

  const filteredPayouts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return payouts.filter((payout) => {
      const roleMatch = selectedRole === 'all' || payout.role === selectedRole
      const statusMatch = selectedStatus === 'all' || payout.status === selectedStatus
      if (!query) return roleMatch && statusMatch
      const queryMatch = [payout.id, payout.recipientName, payout.reference, payout.period]
        .some((value) => value.toLowerCase().includes(query))
      return roleMatch && statusMatch && queryMatch
    })
  }, [payouts, searchTerm, selectedRole, selectedStatus])

  const PAGE_SIZE = 10
  const totalPages = Math.max(1, Math.ceil(filteredPayouts.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedPayouts = filteredPayouts.slice(startIndex, startIndex + PAGE_SIZE)

  const stats = useMemo(() => {
    const pending = payouts.filter((payout) => payout.status === 'Pending').length
    const paid = payouts.filter((payout) => payout.status === 'Paid').length
    const totalAmount = payouts
      .filter((payout) => payout.status === 'Paid')
      .reduce((sum, payout) => sum + payout.amount, 0)
    return { pending, paid, totalAmount }
  }, [payouts])

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/admin')
  }

  const openModal = () => {
    setRecipientRole('Doctor')
    setRecipientId('')
    setRecipientName('')
    setPeriod('Feb 2026')
    setAmount('')
    setMethod('Bank Transfer')
    setReference('')
    setStatus('Pending')
    setNotes('')
    setShowModal(true)
  }

  const updatePayoutStatus = (payoutId: string, nextStatus: PayoutStatus) => {
    setPayouts((prev) =>
      prev.map((payout) =>
        payout.id === payoutId
          ? {
            ...payout,
            status: nextStatus,
            paidAt: nextStatus === 'Paid' ? new Date().toISOString().slice(0, 10) : payout.paidAt,
          }
          : payout
      )
    )
    logAdminAction({
      action: 'Update payout status',
      entity: 'Payout',
      entityId: payoutId,
      detail: `Status updated to ${nextStatus}`,
    })
  }

  const handleSavePayout = () => {
    const normalizedAmount = Number.parseFloat(amount)
    const resolvedRecipientName = recipientId
      ? recipientOptions.find((profile) => profile.id === recipientId)?.name ?? ''
      : recipientName.trim()

    if (!resolvedRecipientName || !period.trim() || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return
    }

    const generatedId = `PAY-${1000 + payouts.length + 1}`
    const generatedReference = reference.trim() || `REF-${Date.now().toString().slice(-6)}`
    const payout: AdminPayout = {
      id: generatedId,
      recipientId: recipientId || undefined,
      recipientName: resolvedRecipientName,
      role: recipientRole,
      period: period.trim(),
      amount: normalizedAmount,
      method,
      reference: generatedReference,
      status,
      requestedAt: new Date().toISOString().slice(0, 10),
      paidAt: status === 'Paid' ? new Date().toISOString().slice(0, 10) : undefined,
      notes: notes.trim() || undefined,
    }

    setPayouts((prev) => [payout, ...prev])
    logAdminAction({
      action: 'Register payout',
      entity: 'Payout',
      entityId: generatedId,
      detail: `${resolvedRecipientName} · KSh ${normalizedAmount.toLocaleString()} · ${status}`,
    })
    setShowModal(false)
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
            Back
          </button>
          <h1>Payout Management</h1>
        </div>
        <button className="btn btn--primary btn--sm" type="button" onClick={openModal}>
          Register payout
        </button>
      </div>

      <div className="payout-stats">
        <div className="payout-stat">
          <span className="payout-stat__label">Pending Payouts</span>
          <span className="payout-stat__value">{stats.pending}</span>
        </div>
        <div className="payout-stat">
          <span className="payout-stat__label">Paid Payouts</span>
          <span className="payout-stat__value">{stats.paid}</span>
        </div>
        <div className="payout-stat">
          <span className="payout-stat__label">Total Paid</span>
          <span className="payout-stat__value">KSh {stats.totalAmount.toLocaleString()}</span>
        </div>
      </div>

      <div className="admin-page__filters">
        <input
          type="text"
          placeholder="Search by payout ID, recipient, period, reference"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as 'all' | PayoutRole)}>
          <option value="all">All roles</option>
          {payoutRoles.map((roleOption) => (
            <option key={roleOption} value={roleOption}>{roleOption}</option>
          ))}
        </select>
        <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as 'all' | PayoutStatus)}>
          <option value="all">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
          <option value="Failed">Failed</option>
        </select>
      </div>

      <div className="admin-page__table">
        <table>
          <thead>
            <tr>
              <th>Payout ID</th>
              <th>Recipient</th>
              <th>Role</th>
              <th>Period</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pagedPayouts.map((payout) => (
              <tr key={payout.id}>
                <td>{payout.id}</td>
                <td>{payout.recipientName}</td>
                <td>{payout.role}</td>
                <td>{payout.period}</td>
                <td>KSh {payout.amount.toLocaleString()}</td>
                <td>{payout.method}</td>
                <td>{payout.reference}</td>
                <td>
                  <span className={`admin-status ${payout.status === 'Paid' ? 'admin-status--success' : payout.status === 'Pending' ? 'admin-status--warning' : 'admin-status--danger'}`}>
                    {payout.status}
                  </span>
                </td>
                <td>
                  <div className="payout-actions">
                    {payout.status !== 'Paid' && (
                      <button
                        className="btn btn--outline btn--sm"
                        type="button"
                        onClick={() => updatePayoutStatus(payout.id, 'Paid')}
                      >
                        Mark paid
                      </button>
                    )}
                    {payout.status !== 'Failed' && payout.status !== 'Paid' && (
                      <button
                        className="btn btn--outline btn--sm"
                        type="button"
                        onClick={() => updatePayoutStatus(payout.id, 'Failed')}
                      >
                        Mark failed
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredPayouts.length === 0 && (
              <tr>
                <td colSpan={9} className="payout-empty">No payouts match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredPayouts.length > 0 && (
        <div className="payout-pagination">
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal payout-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Register payout</h2>
              <button className="modal__close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="form-group">
                <label>Recipient role</label>
                <select
                  value={recipientRole}
                  onChange={(event) => {
                    setRecipientRole(event.target.value as PayoutRole)
                    setRecipientId('')
                    setRecipientName('')
                  }}
                >
                  {payoutRoles.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>{roleOption}</option>
                  ))}
                </select>
              </div>

              {recipientRole === 'Doctor' || recipientRole === 'Pediatrician' ? (
                <div className="form-group">
                  <label>Recipient</label>
                  <select
                    value={recipientId}
                    onChange={(event) => setRecipientId(event.target.value)}
                  >
                    <option value="">Select recipient</option>
                    {recipientOptions.map((profile) => (
                      <option key={profile.id} value={profile.id}>{profile.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label>Recipient name</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(event) => setRecipientName(event.target.value)}
                    placeholder="Enter recipient name"
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Period</label>
                  <input
                    type="text"
                    value={period}
                    onChange={(event) => setPeriod(event.target.value)}
                    placeholder="Feb 2026"
                  />
                </div>
                <div className="form-group">
                  <label>Amount (KSh)</label>
                  <input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Method</label>
                  <select value={method} onChange={(event) => setMethod(event.target.value as PayoutMethod)}>
                    {payoutMethods.map((methodOption) => (
                      <option key={methodOption} value={methodOption}>{methodOption}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Reference</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="Auto-generated if empty"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select value={status} onChange={(event) => setStatus(event.target.value as PayoutStatus)}>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add details for finance team"
                />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn--primary btn--sm" onClick={handleSavePayout}>
                Save payout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PayoutManagement
