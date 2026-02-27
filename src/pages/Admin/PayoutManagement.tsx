import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { PayoutRule, loadPayoutRules, savePayoutRules } from '../../data/payoutRules'

const payoutMethods: PayoutMethod[] = ['Bank Transfer', 'M-Pesa', 'Card', 'Cheque', 'Cash']
const basePayoutRoles: PayoutRole[] = ['Doctor', 'Pediatrician', 'Lab Technician', 'Lab Partner', 'Pharmacist']
const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`

function PayoutManagement() {
  const navigate = useNavigate()
  const [payouts, setPayouts] = useState<AdminPayout[]>(() => loadAdminPayouts())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<'all' | PayoutRole>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | PayoutStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [activeTab, setActiveTab] = useState<'payouts' | 'rules' | 'register'>('payouts')
  const [showPaidModal, setShowPaidModal] = useState(false)
  const [rules, setRules] = useState<PayoutRule[]>(() => loadPayoutRules())
  const [newRuleRole, setNewRuleRole] = useState('')
  const [newRuleAmount, setNewRuleAmount] = useState('')
  const [newRuleActive, setNewRuleActive] = useState(true)
  const [newRuleError, setNewRuleError] = useState('')

  const [recipientRole, setRecipientRole] = useState<PayoutRole>('Doctor')
  const [recipientId, setRecipientId] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [period, setPeriod] = useState('Feb 2026')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PayoutMethod>('Bank Transfer')
  const [reference, setReference] = useState('')
  const [status, setStatus] = useState<PayoutStatus>('Pending')
  const [notes, setNotes] = useState('')
  const hasFilters = searchTerm.trim().length > 0 || selectedRole !== 'all' || selectedStatus !== 'all'
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [paidTarget, setPaidTarget] = useState<AdminPayout | null>(null)
  const [paidMethod, setPaidMethod] = useState<'M-Pesa' | 'Card'>('M-Pesa')
  const [paidRef, setPaidRef] = useState('')
  const [paidTime, setPaidTime] = useState('')
  const [paidError, setPaidError] = useState('')

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

  const payoutRoles = useMemo(
    () => Array.from(new Set([...basePayoutRoles, ...rules.map((rule) => rule.role)])),
    [rules]
  )

  useEffect(() => {
    saveAdminPayouts(payouts)
  }, [payouts])

  useEffect(() => {
    savePayoutRules(rules)
  }, [rules])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedRole, selectedStatus, pageSize])

  const filteredPayouts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return payouts.filter((payout) => {
      const roleMatch = selectedRole === 'all' || payout.role === selectedRole
      const statusMatch = selectedStatus === 'all' || payout.status === selectedStatus
      if (!query) return roleMatch && statusMatch
      const queryMatch = [payout.id, payout.recipientName, payout.reference, payout.period, payout.taskId ?? '', payout.taskType ?? '']
        .some((value) => value.toLowerCase().includes(query))
      return roleMatch && statusMatch && queryMatch
    })
  }, [payouts, searchTerm, selectedRole, selectedStatus])

  const totalPages = Math.max(1, Math.ceil(filteredPayouts.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const pagedPayouts = filteredPayouts.slice(startIndex, startIndex + pageSize)

  const stats = useMemo(() => {
    const pending = payouts.filter((payout) => payout.status === 'Pending').length
    const paid = payouts.filter((payout) => payout.status === 'Paid').length
    const failed = payouts.filter((payout) => payout.status === 'Failed').length
    const totalAmount = payouts
      .filter((payout) => payout.status === 'Paid')
      .reduce((sum, payout) => sum + payout.amount, 0)
    const pendingAmount = payouts
      .filter((payout) => payout.status === 'Pending')
      .reduce((sum, payout) => sum + payout.amount, 0)
    const failedAmount = payouts
      .filter((payout) => payout.status === 'Failed')
      .reduce((sum, payout) => sum + payout.amount, 0)
    return { pending, paid, failed, totalAmount, pendingAmount, failedAmount }
  }, [payouts])

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/admin')
  }

  const resetRegisterForm = () => {
    setRecipientRole('Doctor')
    setRecipientId('')
    setRecipientName('')
    setPeriod('Feb 2026')
    setAmount('')
    setMethod('Bank Transfer')
    setReference('')
    setStatus('Pending')
    setNotes('')
  }

  const registerRef = useRef<HTMLDivElement | null>(null)

  const openRegisterTab = () => {
    setActiveTab('register')
    resetRegisterForm()
    registerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openPaidModal = (payout: AdminPayout) => {
    setPaidTarget(payout)
    setPaidMethod('M-Pesa')
    setPaidRef('')
    setPaidTime('')
    setPaidError('')
    setShowPaidModal(true)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedRole('all')
    setSelectedStatus('all')
  }

  const tableRef = useRef<HTMLDivElement | null>(null)

  const handleReviewPending = () => {
    setActiveTab('payouts')
    setSearchTerm('')
    setSelectedRole('all')
    setSelectedStatus('Pending')
    setCurrentPage(1)
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleAddRule = () => {
    const role = newRuleRole.trim()
    const amountValue = Number(newRuleAmount)
    if (!role) {
      setNewRuleError('Role name is required.')
      return
    }
    if (!Number.isFinite(amountValue) || amountValue < 0) {
      setNewRuleError('Enter a valid amount.')
      return
    }
    setRules((prev) => {
      const existing = prev.find((rule) => rule.role.toLowerCase() === role.toLowerCase())
      if (existing) {
        return prev.map((rule) =>
          rule.role.toLowerCase() === role.toLowerCase()
            ? { ...rule, amount: amountValue, active: newRuleActive }
            : rule
        )
      }
      return [...prev, { role: role as PayoutRule['role'], amount: amountValue, currency: 'KSh', active: newRuleActive }]
    })
    setNewRuleRole('')
    setNewRuleAmount('')
    setNewRuleActive(true)
    setNewRuleError('')
  }

  const escapeCsvValue = (value: string | number | undefined) => {
    const text = value === undefined ? '' : String(value)
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const downloadCsv = (rows: Array<Array<string | number | undefined>>, filename: string) => {
    if (typeof window === 'undefined') return
    const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleExportCsv = () => {
    const rows: Array<Array<string | number | undefined>> = [
      ['Payout ID', 'Recipient', 'Role', 'Source', 'Task Type', 'Task ID', 'Period', 'Amount', 'Method', 'Reference', 'Status', 'Requested At', 'Paid At', 'Notes'],
      ...filteredPayouts.map((payout) => [
        payout.id,
        payout.recipientName,
        payout.role,
        payout.source ?? 'Manual',
        payout.taskType ?? '',
        payout.taskId ?? '',
        payout.period,
        payout.amount,
        payout.method,
        payout.reference,
        payout.status,
        payout.requestedAt,
        payout.paidAt ?? '',
        payout.notes ?? '',
      ]),
    ]
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(rows, `payouts-${stamp}.csv`)
  }

  const handleDownloadSummary = () => {
    const rows: Array<Array<string | number>> = [
      ['Metric', 'Value'],
      ['Total payouts', payouts.length],
      ['Pending payouts', stats.pending],
      ['Pending amount', stats.pendingAmount],
      ['Paid payouts', stats.paid],
      ['Paid amount', stats.totalAmount],
      ['Failed payouts', stats.failed],
      ['Failed amount', stats.failedAmount],
    ]
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(rows, `payout-summary-${stamp}.csv`)
  }

  const handleSyncEarnings = useCallback(() => {
    setPayouts(loadAdminPayouts())
    setLastSyncAt(new Date().toISOString())
  }, [])

  useEffect(() => {
    handleSyncEarnings()
    const interval = window.setInterval(() => {
      handleSyncEarnings()
    }, 5 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [handleSyncEarnings])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    handleSyncEarnings()
  }, [rules, handleSyncEarnings])

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

  const confirmMarkPaid = () => {
    if (!paidTarget) return
    if (!paidRef.trim() || !paidTime.trim()) {
      setPaidError('Payment reference and time are required.')
      return
    }
    setPayouts((prev) =>
      prev.map((payout) =>
        payout.id === paidTarget.id
          ? {
            ...payout,
            status: 'Paid',
            method: paidMethod,
            reference: paidRef.trim(),
            paidAt: paidTime,
          }
          : payout
      )
    )
    logAdminAction({
      action: 'Mark payout as paid',
      entity: 'Payout',
      entityId: paidTarget.id,
      detail: `Paid via ${paidMethod} · Ref ${paidRef.trim()} · ${paidTime}`,
    })
    setShowPaidModal(false)
    setPaidTarget(null)
    setPaidRef('')
    setPaidTime('')
    setPaidError('')
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
      source: 'Manual',
    }

    setPayouts((prev) => [payout, ...prev])
    logAdminAction({
      action: 'Register payout',
      entity: 'Payout',
      entityId: generatedId,
      detail: `${resolvedRecipientName} · KSh ${normalizedAmount.toLocaleString()} · ${status}`,
    })
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <button className="pm-back-btn" type="button" onClick={handleBack}>← Back</button>
          <div className="pm-title-row">
            <h1>Payouts</h1>
            <span className="pm-auto-pill">Auto payouts enabled</span>
          </div>
          <p className="pm-subtitle">Payouts are generated automatically per completed task. Register manual payouts only for adjustments or edge cases.</p>
        </div>
        <div className="pm-header-actions">
          <button className="btn btn--outline btn--sm" type="button" onClick={handleSyncEarnings}>
            Sync tasks
          </button>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleExportCsv}>
            Export CSV
          </button>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleDownloadSummary}>
            Download summary
          </button>
          <button className="btn btn--primary btn--sm" type="button" onClick={openRegisterTab}>
            Register manual payout
          </button>
        </div>
      </div>

      {lastSyncAt && (
        <div className="pm-sync-banner">
          <span>Last synced {lastSyncAt.slice(0, 10)} at {lastSyncAt.slice(11, 16)}</span>
          <span className="pm-sync-banner__note">Auto-sync runs every 5 minutes.</span>
        </div>
      )}

      <div className="pm-tabs">
        <button
          className={`pm-tab ${activeTab === 'payouts' ? 'pm-tab--active' : ''}`}
          type="button"
          onClick={() => setActiveTab('payouts')}
        >
          Payouts
          <span className="pm-tab__count">{filteredPayouts.length}</span>
        </button>
        <button
          className={`pm-tab ${activeTab === 'rules' ? 'pm-tab--active' : ''}`}
          type="button"
          onClick={() => setActiveTab('rules')}
        >
          Payout rules
        </button>
        <button
          className={`pm-tab ${activeTab === 'register' ? 'pm-tab--active' : ''}`}
          type="button"
          onClick={() => setActiveTab('register')}
        >
          Register payout
        </button>
      </div>

      {activeTab === 'payouts' && (
        <>
          <div className="pm-stats">
        <button
          className={`pm-stat pm-stat--pending ${selectedStatus === 'Pending' ? 'pm-stat--active' : ''}`}
          type="button"
          onClick={handleReviewPending}
          aria-pressed={selectedStatus === 'Pending'}
        >
          <span className="pm-stat__value">{stats.pending}</span>
          <span className="pm-stat__label">Pending</span>
          <span className="pm-stat__meta">KSh {stats.pendingAmount.toLocaleString()} awaiting</span>
        </button>
        <button
          className={`pm-stat pm-stat--paid ${selectedStatus === 'Paid' ? 'pm-stat--active' : ''}`}
          type="button"
          onClick={() => setSelectedStatus('Paid')}
          aria-pressed={selectedStatus === 'Paid'}
        >
          <span className="pm-stat__value">{stats.paid}</span>
          <span className="pm-stat__label">Paid</span>
          <span className="pm-stat__meta">KSh {stats.totalAmount.toLocaleString()} disbursed</span>
        </button>
        <button
          className={`pm-stat pm-stat--failed ${selectedStatus === 'Failed' ? 'pm-stat--active' : ''}`}
          type="button"
          onClick={() => setSelectedStatus('Failed')}
          aria-pressed={selectedStatus === 'Failed'}
        >
          <span className="pm-stat__value">{stats.failed}</span>
          <span className="pm-stat__label">Failed</span>
          <span className="pm-stat__meta">KSh {stats.failedAmount.toLocaleString()} to retry</span>
        </button>
        <div className="pm-stat pm-stat--total" aria-hidden="true">
          <span className="pm-stat__value">KSh {stats.totalAmount.toLocaleString()}</span>
          <span className="pm-stat__label">Total Paid</span>
          <span className="pm-stat__meta">Across all disbursements</span>
        </div>
      </div>

      {stats.pending > 0 && (
        <div className="pm-pending-banner">
          <span>⏳ <strong>{stats.pending}</strong> payout{stats.pending > 1 ? 's' : ''} awaiting settlement</span>
          <button className="pm-pending-banner__btn" type="button" onClick={handleReviewPending}>
            Review pending →
          </button>
        </div>
      )}

      <div className="admin-page__filters">
        <input
          type="text"
          placeholder="Search by payout ID, recipient, task ID, period, reference"
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
        {hasFilters && (
          <button className="pm-clear-filter" type="button" onClick={clearFilters}>✕ Clear filters</button>
        )}
      </div>

      <div className="admin-page__table" ref={tableRef}>
        <table>
          <thead>
            <tr>
              <th>Payout</th>
              <th>Recipient</th>
              <th>Task</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pagedPayouts.map((payout) => (
              <tr key={payout.id} className={payout.status === 'Pending' ? 'pm-row--pending' : ''}>
                <td>
                  <span className="pm-id">{payout.id}</span>
                  <span className="pm-meta">Requested {payout.requestedAt}</span>
                  {payout.completedAt && <span className="pm-meta">Completed {payout.completedAt}</span>}
                  <span className={`pm-source ${payout.source === 'Automatic' ? 'pm-source--auto' : 'pm-source--manual'}`}>
                    {payout.source === 'Automatic' ? 'Auto' : 'Manual'}
                  </span>
                </td>
                <td>
                  <div className="pm-recipient">
                    <span className="pm-recipient__name">{payout.recipientName}</span>
                    <span className={`pm-role-badge pm-role-badge--${payout.role.replace(/\s+/g, '-').toLowerCase()}`}>
                      {payout.role}
                    </span>
                  </div>
                </td>
                <td>
                  <span className="pm-period">{payout.taskType ?? 'Manual payout'}</span>
                  <span className="pm-meta">
                    {payout.taskId ? `Task ${payout.taskId}` : payout.period || '—'}
                  </span>
                  <span className="pm-meta">{payout.paidAt ? `Paid ${payout.paidAt}` : 'Awaiting payment'}</span>
                </td>
                <td>
                  <span className="pm-amount">KSh {payout.amount.toLocaleString()}</span>
                  {payout.notes && <span className="pm-meta">Note: {payout.notes}</span>}
                </td>
                <td>
                  <span className="pm-method">{payout.method}</span>
                  <span className="pm-meta">Ref {payout.reference}</span>
                </td>
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
                        onClick={() => openPaidModal(payout)}
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
                <td colSpan={7} className="payout-empty">No payouts match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredPayouts.length > 0 && (
        <div className="pm-pagination">
          <div className="pm-pagination__left">
            <span className="pm-pagination__info">
              Showing {filteredPayouts.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, filteredPayouts.length)} of {filteredPayouts.length} payouts
            </span>
            <label className="pm-pagination__size">
              Rows
              <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="pm-pagination__btns">
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
        </div>
      )}
        </>
      )}

      {activeTab === 'rules' && (
        <div className="pm-rules-page">
          <div className="pm-rules-card">
            <div className="pm-rules__header">
              <div>
                <h3>Payout rules</h3>
                <p>Define the rate per completed task. Changes update auto payouts immediately.</p>
              </div>
            </div>
            <div className="pm-rules__table">
              <div className="pm-rules__row pm-rules__row--head">
                <span>Role</span>
                <span>Rate per task</span>
                <span>Status</span>
              </div>
              {rules.map((rule) => (
                <div key={rule.role} className="pm-rules__row">
                  <span>{rule.role}</span>
                  <input
                    className="pm-rules__input"
                    type="number"
                    min={0}
                    value={rule.amount}
                    onChange={(event) =>
                      setRules((prev) =>
                        prev.map((item) =>
                          item.role === rule.role ? { ...item, amount: Number(event.target.value) } : item
                        )
                      )
                    }
                  />
                  <label className="pm-rules__toggle">
                    <input
                      type="checkbox"
                      checked={rule.active}
                      onChange={(event) =>
                        setRules((prev) =>
                          prev.map((item) =>
                            item.role === rule.role ? { ...item, active: event.target.checked } : item
                          )
                        )
                      }
                    />
                    <span className={`pm-rule-pill ${rule.active ? 'pm-rule-pill--active' : 'pm-rule-pill--paused'}`}>
                      {rule.active ? 'Active' : 'Paused'}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="pm-rules-card pm-rules-card--add">
            <div className="pm-rules__header">
              <div>
                <h3>Add payout rule</h3>
                <p>Create a new role or override an existing rate.</p>
              </div>
            </div>
            <div className="pm-rules-add">
              <div className="form-group">
                <label>Role name</label>
                <input
                  type="text"
                  value={newRuleRole}
                  onChange={(event) => { setNewRuleRole(event.target.value); setNewRuleError('') }}
                  placeholder="e.g. Lab Radiologist"
                />
              </div>
              <div className="form-group">
                <label>Rate per task (KSh)</label>
                <input
                  type="number"
                  min={0}
                  value={newRuleAmount}
                  onChange={(event) => { setNewRuleAmount(event.target.value); setNewRuleError('') }}
                />
              </div>
              <label className="pm-rules__toggle">
                <input
                  type="checkbox"
                  checked={newRuleActive}
                  onChange={(event) => setNewRuleActive(event.target.checked)}
                />
                <span className={`pm-rule-pill ${newRuleActive ? 'pm-rule-pill--active' : 'pm-rule-pill--paused'}`}>
                  {newRuleActive ? 'Active' : 'Paused'}
                </span>
              </label>
              {newRuleError && <p className="pm-rules__error">{newRuleError}</p>}
              <button className="btn btn--primary btn--sm" type="button" onClick={handleAddRule}>
                Add rule
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'register' && (
        <div className="pm-register" ref={registerRef}>
          <div className="pm-register-card">
            <div className="pm-modal__header">
              <div>
                <h2>Register payout</h2>
                <p className="pm-modal__subtitle">Capture payout details and generate a finance-ready record.</p>
              </div>
              <button className="btn btn--outline btn--sm" type="button" onClick={resetRegisterForm}>
                Reset form
              </button>
            </div>
            <div className="pm-modal__body">
              <div className="pm-modal__left">
                <div className="pm-modal__section">
                  <p className="pm-section-label">Recipient</p>
                  <div className="pm-modal__grid">
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

                    {(recipientRole === 'Doctor' || recipientRole === 'Pediatrician') ? (
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
                  </div>
                </div>

                <div className="pm-modal__section">
                  <p className="pm-section-label">Payout details</p>
                  <div className="pm-modal__grid">
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
                </div>

                <div className="pm-modal__section">
                  <p className="pm-section-label">Status & notes</p>
                  <div className="pm-modal__grid pm-modal__grid--single">
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
                </div>
              </div>

              <div className="pm-modal__right">
                <p className="pm-section-label">Summary</p>
                <div className="pm-summary-card">
                  <div className="pm-summary-row">
                    <span>Recipient</span>
                    <strong>
                      {recipientId
                        ? recipientOptions.find((profile) => profile.id === recipientId)?.name ?? '—'
                        : recipientName.trim() || '—'}
                    </strong>
                  </div>
                  <div className="pm-summary-row">
                    <span>Role</span>
                    <strong>{recipientRole}</strong>
                  </div>
                  <div className="pm-summary-row">
                    <span>Period</span>
                    <strong>{period.trim() || '—'}</strong>
                  </div>
                  <div className="pm-summary-row pm-summary-row--amount">
                    <span>Amount</span>
                    <strong>
                      {Number.isFinite(Number.parseFloat(amount)) && Number.parseFloat(amount) > 0
                        ? formatCurrency(Number.parseFloat(amount))
                        : '—'}
                    </strong>
                  </div>
                  <div className="pm-summary-row">
                    <span>Method</span>
                    <strong>{method}</strong>
                  </div>
                  <div className="pm-summary-row">
                    <span>Status</span>
                    <strong>{status}</strong>
                  </div>
                  <div className="pm-summary-row">
                    <span>Reference</span>
                    <strong>{reference.trim() || 'Auto-generated'}</strong>
                  </div>
                  <div className="pm-summary-row">
                    <span>Source</span>
                    <strong>Manual entry</strong>
                  </div>
                  {notes.trim() && (
                    <div className="pm-summary-note">
                      <span>Notes</span>
                      <p>{notes.trim()}</p>
                    </div>
                  )}
                </div>
                <p className="pm-summary-hint">Review details before saving. Records are stored locally for finance review.</p>
              </div>
            </div>
            <div className="pm-modal__footer">
              <button className="btn btn--outline btn--sm" onClick={resetRegisterForm}>
                Reset
              </button>
              <button className="btn btn--primary btn--sm" onClick={() => { handleSavePayout(); resetRegisterForm() }}>
                Save payout
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaidModal && paidTarget && (
        <div className="modal-overlay" onClick={() => setShowPaidModal(false)}>
          <div className="modal pm-paid-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Mark payout as paid</h2>
              <button className="modal__close" onClick={() => setShowPaidModal(false)}>×</button>
            </div>
            <div className="modal__content">
              <p className="pm-paid-modal__summary">
                Confirm payment for <strong>{paidTarget.recipientName}</strong> — <strong>{formatCurrency(paidTarget.amount)}</strong>.
              </p>
              <div className="form-group">
                <label>Payment method</label>
                <select value={paidMethod} onChange={(event) => setPaidMethod(event.target.value as 'M-Pesa' | 'Card')}>
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="Card">Card</option>
                </select>
              </div>
              <div className="form-group">
                <label>Reference number</label>
                <input
                  type="text"
                  value={paidRef}
                  onChange={(event) => { setPaidRef(event.target.value); setPaidError('') }}
                  placeholder="e.g. MPESA-TRX-884231"
                />
              </div>
              <div className="form-group">
                <label>Time of payment</label>
                <input
                  type="datetime-local"
                  value={paidTime}
                  onChange={(event) => { setPaidTime(event.target.value); setPaidError('') }}
                />
              </div>
              {paidError && <p className="pm-paid-modal__error">{paidError}</p>}
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowPaidModal(false)}>
                Cancel
              </button>
              <button className="btn btn--primary btn--sm" onClick={confirmMarkPaid}>
                Confirm payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PayoutManagement
