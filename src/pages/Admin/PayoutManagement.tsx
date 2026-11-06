import { useAdminRecordStats } from '../../hooks/useAdminRecordStats'
import { preferredScrollBehavior } from '../../utils/motion'
import { formatStatus } from '../../utils/formatStatus'
import Dialog from '../../components/Dialog/Dialog'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/admin/PayoutManagement.css'
import { logAdminAction } from '../../data/adminAudit'
import {
  AdminPayout,
  PayoutMethod,
  PayoutRole,
  PayoutStatus,
} from '../../data/payouts'
import { PayoutRule } from '../../data/payoutRules'
import { payoutService } from '../../services/payoutService'

const payoutMethods: PayoutMethod[] = ['Bank Transfer', 'M-Pesa', 'Cheque', 'Cash']
const basePayoutRoles: PayoutRole[] = ['Doctor', 'Pediatrician', 'Lab Technician', 'Lab Partner', 'Pharmacist']
const payoutStatuses: PayoutStatus[] = ['Draft', 'Pending', 'Approved', 'Processing', 'On hold', 'Paid', 'Failed', 'Reversed', 'Cancelled']
const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`

const apiErrorMessage = (error: unknown) => {
  const candidate = error as { response?: { data?: { detail?: string; reason?: string; payment_reference?: string } }; message?: string }
  const response = candidate.response?.data as { error?: { message?: string }; detail?: string; reason?: string; payment_reference?: string } | undefined
  const data = response
  if (response?.error?.message) return response.error.message
  return data?.detail ?? data?.reason ?? data?.payment_reference ?? candidate.message ?? 'The finance request could not be completed.'
}

function PayoutManagement({ embedded = false }: { embedded?: boolean }) {
  const [payouts, setPayouts] = useState<AdminPayout[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<'all' | PayoutRole>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | PayoutStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [activeTab, setActiveTab] = useState<'payouts' | 'rules' | 'register'>('payouts')
  const [showPaidModal, setShowPaidModal] = useState(false)
  const [rules, setRules] = useState<PayoutRule[]>([])
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
  const [status] = useState<PayoutStatus>('Draft')
  const [notes, setNotes] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [financeError, setFinanceError] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const hasFilters = searchTerm.trim().length > 0 || selectedRole !== 'all' || selectedStatus !== 'all'
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [paidTarget, setPaidTarget] = useState<AdminPayout | null>(null)
  const [paidMethod, setPaidMethod] = useState<'M-Pesa' | 'Bank Transfer'>('M-Pesa')
  const [paidRef, setPaidRef] = useState('')
  const [paidTime, setPaidTime] = useState('')
  const [paidError, setPaidError] = useState('')

  const [professionals, setProfessionals] = useState<Array<{ id: string; name: string; role: PayoutRole }>>([])
  const recipientOptions = useMemo(() => professionals.filter(profile => profile.role === recipientRole), [professionals, recipientRole])
  const [sourceType, setSourceType] = useState('manual_adjustment')
  const [reasonTarget, setReasonTarget] = useState<{ payout: AdminPayout; action: 'hold' | 'cancel' | 'reverse' } | null>(null)
  const [reasonValue, setReasonValue] = useState('')
  const [commission, setCommission] = useState('0')
  const [withholding, setWithholding] = useState('0')
  const [deduction, setDeduction] = useState('0')
  const payoutRoles = useMemo(
    () => Array.from(new Set([...basePayoutRoles, ...rules.map((rule) => rule.role)])),
    [rules]
  )

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

  const { count: databaseCount, counts: databaseCounts } = useAdminRecordStats('payouts', 'all', payouts)
  const stats = { pending: databaseCounts?.pending ?? 0, paid: databaseCounts?.paid ?? 0, failed: databaseCounts?.failed ?? 0, totalAmount: databaseCounts?.totalAmount ?? 0, pendingAmount: databaseCounts?.pendingAmount ?? 0, failedAmount: databaseCounts?.failedAmount ?? 0 }


  const resetRegisterForm = () => {
    setRecipientRole('Doctor')
    setRecipientId('')
    setRecipientName('')
    setPeriod('Feb 2026')
    setAmount('')
    setSourceType('manual_adjustment'); setCommission('0'); setWithholding('0'); setDeduction('0')
    setMethod('Bank Transfer')
    setReference('')
    setNotes('')
  }

  const registerRef = useRef<HTMLDivElement | null>(null)

  const openRegisterTab = () => {
    setActiveTab('register')
    resetRegisterForm()
    registerRef.current?.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' })
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
    tableRef.current?.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' })
  }

  const handleAddRule = async () => {
    const role = newRuleRole.trim()
    const amountValue = Number(newRuleAmount)
    if (!role) {
      setNewRuleError('Role name is required.')
      return
    }
    const supportedRole = basePayoutRoles.find((item) => item.toLowerCase() === role.toLowerCase())
    if (!supportedRole) {
      setNewRuleError(`Select one of the supported roles: ${basePayoutRoles.join(', ')}.`)
      return
    }
    if (!Number.isFinite(amountValue) || amountValue < 0) {
      setNewRuleError('Enter a valid amount.')
      return
    }
    try {
      const existing = rules.find((rule) => rule.role === supportedRole)
      const saved = await payoutService.saveRule({ ...existing, role: supportedRole, amount: amountValue, currency: 'KSh', active: newRuleActive })
      setRules((prev) => [saved, ...prev.filter((rule) => rule.role !== saved.role)])
      setNewRuleRole('')
      setNewRuleAmount('')
      setNewRuleActive(true)
      setNewRuleError('')
    } catch (error) {
      setNewRuleError(apiErrorMessage(error))
    }
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

  const handleSyncEarnings = useCallback(async () => {
    setIsSyncing(true)
    try {
      const [nextPayouts, nextRules, nextProfessionals] = await Promise.all([payoutService.list(), payoutService.listRules(), payoutService.recipients()])
      setProfessionals(nextProfessionals)
      setPayouts(nextPayouts)
      setRules(nextRules)
      setLastSyncAt(new Date().toISOString())
      setFinanceError('')
    } catch (error) {
      setFinanceError(apiErrorMessage(error))
    } finally {
      setIsSyncing(false)
    }
  }, [])

  useEffect(() => {
    void handleSyncEarnings()
    const interval = window.setInterval(() => {
      void handleSyncEarnings()
    }, 5 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [handleSyncEarnings])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const runPayoutAction = async (payout: AdminPayout, action: string, extras: Record<string, unknown> = {}) => {
    if (!payout.backendId) return
    setActionBusy(true)
    try {
      const updated = await payoutService.action(payout.backendId, action, extras)
      setPayouts((prev) => prev.map((item) => item.backendId === updated.backendId ? updated : item))
      setFinanceError('')
      logAdminAction({ action: `Payout ${action.replace(/_/g, ' ')}`, entity: 'Payout', entityId: payout.id, detail: `${payout.recipientName} · ${updated.status}` })
    } catch (error) {
      setFinanceError(apiErrorMessage(error))
    } finally { setActionBusy(false) }
  }

  const requestReasonAndRun = (payout: AdminPayout, action: 'hold' | 'cancel' | 'reverse') => {
    setReasonTarget({ payout, action }); setReasonValue('')
  }

  const confirmMarkPaid = async () => {
    if (!paidTarget) return
    if (!paidRef.trim() || !paidTime.trim()) {
      setPaidError('Payment reference and time are required.')
      return
    }
    if (!paidTarget.backendId) return
    try {
      const updated = await payoutService.action(paidTarget.backendId, 'mark_paid', {
        payment_reference: paidRef.trim(), provider_transaction_id: paidRef.trim(),
        method: paidMethod === 'M-Pesa' ? 'mpesa' : 'bank_transfer', paid_at: new Date(paidTime).toISOString(),
      })
      setPayouts((prev) => prev.map((item) => item.backendId === updated.backendId ? updated : item))
      logAdminAction({ action: 'Mark payout as paid', entity: 'Payout', entityId: paidTarget.id, detail: `Paid via ${paidMethod} · Ref ${paidRef.trim()} · ${paidTime}` })
      setShowPaidModal(false)
      setPaidTarget(null)
      setPaidRef('')
      setPaidTime('')
      setPaidError('')
    } catch (error) {
      setPaidError(apiErrorMessage(error))
    }
  }

  const handleSavePayout = async () => {
    const normalizedAmount = Number.parseFloat(amount)
    const resolvedRecipientName = recipientId
      ? recipientOptions.find((profile) => profile.id === recipientId)?.name ?? ''
      : recipientName.trim()

    if (!recipientId || !reference.trim() || !resolvedRecipientName || !period.trim() || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0 || [commission, withholding, deduction].some(value => !Number.isFinite(Number(value)) || Number(value) < 0) || Number(commission) + Number(withholding) + Number(deduction) > normalizedAmount) {
      setFinanceError('Choose a recipient, enter a source reference and period, and check the gross amount and non-negative deductions.')
      return
    }

    try {
      const payout = await payoutService.create({
        recipient: Number(recipientId), recipientName: resolvedRecipientName, role: recipientRole, period: period.trim(), amount: normalizedAmount,
        commission: Number(commission), withholding: Number(withholding), deduction: Number(deduction),
        sourceType, method, notes: notes.trim() || undefined, sourceReference: reference.trim() || undefined,
      })
      setPayouts((prev) => [payout, ...prev])
      setFinanceError('')
      logAdminAction({ action: 'Register payout', entity: 'Payout', entityId: payout.id, detail: `${resolvedRecipientName} · KSh ${normalizedAmount.toLocaleString()} · Draft` })
      resetRegisterForm()
      setActiveTab('payouts')
    } catch (error) {
      setFinanceError(apiErrorMessage(error))
    }
  }

  const persistRule = async (rule: PayoutRule) => {
    try {
      const saved = await payoutService.saveRule(rule)
      setRules((prev) => prev.map((item) => item.role === saved.role ? saved : item))
      setFinanceError('')
    } catch (error) {
      setFinanceError(apiErrorMessage(error))
    }
  }

  return (
    <div className={embedded ? 'category-management' : 'category-management admin-page'}>
      {embedded && (
        <div className="pm-header-actions" style={{ justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button className="btn btn--outline btn--sm" type="button" onClick={() => void handleSyncEarnings()} disabled={isSyncing}>{isSyncing ? 'Syncing…' : 'Sync ledger'}</button>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleExportCsv}>Export CSV</button>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleDownloadSummary}>Download summary</button>
          <button className="btn btn--primary btn--sm" type="button" onClick={openRegisterTab}>Register manual payout</button>
        </div>
      )}
      {!embedded && <div className="category-management__header">
        <div>
          <div className="pm-title-row">
            <h1>Payments & reports</h1>
            <span className="pm-auto-pill">Administrative ledger</span>
          </div>
          <p className="pm-subtitle">Create, report on, and manage provider payments across doctors, pediatricians, lab technicians, labs, and pharmacists.</p>
        </div>
        <div className="pm-header-actions">
          <button className="btn btn--outline btn--sm" type="button" onClick={() => void handleSyncEarnings()} disabled={isSyncing}>
            {isSyncing ? 'Syncing…' : 'Sync ledger'}
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
      </div>}

      <p className="pm-sync-banner">This ledger records approvals and externally verified payments. Process and Record paid do not send money to a bank or M-Pesa.</p>
      {lastSyncAt && (
        <div className="pm-sync-banner">
          <span>Last synced {lastSyncAt.slice(0, 10)} at {lastSyncAt.slice(11, 16)}</span>
          <span className="pm-sync-banner__note">Auto-sync runs every 5 minutes.</span>
        </div>
      )}

      {actionBusy && <p role="status">Updating payout ledger…</p>}
      {financeError && (
        <div className="pm-pending-banner" role="alert">
          <span><strong>Finance action needs attention:</strong> {financeError}</span>
          <button className="pm-pending-banner__btn" type="button" onClick={() => setFinanceError('')}>Dismiss</button>
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
          <span className="pm-stat__value">{databaseCount('pending')}</span>
          <span className="pm-stat__label">Pending</span>
          <span className="pm-stat__meta">KSh {databaseCount('pendingAmount').toLocaleString()} awaiting</span>
        </button>
        <button
          className={`pm-stat pm-stat--paid ${selectedStatus === 'Paid' ? 'pm-stat--active' : ''}`}
          type="button"
          onClick={() => setSelectedStatus('Paid')}
          aria-pressed={selectedStatus === 'Paid'}
        >
          <span className="pm-stat__value">{databaseCount('paid')}</span>
          <span className="pm-stat__label">Paid</span>
          <span className="pm-stat__meta">KSh {databaseCount('totalAmount').toLocaleString()} recorded</span>
        </button>
        <button
          className={`pm-stat pm-stat--failed ${selectedStatus === 'Failed' ? 'pm-stat--active' : ''}`}
          type="button"
          onClick={() => setSelectedStatus('Failed')}
          aria-pressed={selectedStatus === 'Failed'}
        >
          <span className="pm-stat__value">{databaseCount('failed')}</span>
          <span className="pm-stat__label">Failed</span>
          <span className="pm-stat__meta">KSh {databaseCount('failedAmount').toLocaleString()} to retry</span>
        </button>
        <div className="pm-stat pm-stat--total" aria-hidden="true">
          <span className="pm-stat__value">KSh {databaseCount('totalAmount').toLocaleString()}</span>
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

      <div className="cm-toolbar">
        <div className="cm-toolbar__right" style={{ marginLeft: 'auto' }}>
          <div className="cm-search-box">
            <svg className="cm-search-box__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="9" cy="9" r="5.75" /><path d="M13.5 13.5L17 17" strokeLinecap="round" /></svg>
            <input aria-label="Search by payout ID, recipient, task ID, period, reference" type="search" placeholder="Search by payout ID, recipient, task ID, period, reference" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </div>
          <select aria-label="Filter by recipient role" className="cm-filter-select" value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as 'all' | PayoutRole)}>
            <option value="all">All roles</option>
            {payoutRoles.map((roleOption) => (
              <option key={roleOption} value={roleOption}>{roleOption}</option>
            ))}
          </select>
          <select aria-label="Filter by status" className="cm-filter-select" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as 'all' | PayoutStatus)}>
            <option value="all">All statuses</option>
            {payoutStatuses.map((statusOption) => <option key={statusOption} value={statusOption}>{statusOption}</option>)}
          </select>
          {hasFilters && (
            <button className="cm-clear-filter" type="button" onClick={clearFilters}>Clear filters</button>
          )}
        </div>
      </div>

      <div className="cm-panel" ref={tableRef}>
        <div className="cm-table-wrap">
        <table className="cm-table">
          <thead>
            <tr>
              <th>Payout</th>
              <th>Recipient</th>
              <th>Task</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th className="cm-th-actions">Actions</th>
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
                    {payout.taskId ? `Task ${payout.taskId}` : payout.period || '-'}
                  </span>
                  <span className="pm-meta">{payout.paidAt ? `Paid ${payout.paidAt}` : 'Awaiting payment'}</span>
                </td>
                <td>
                  <span className="pm-amount">KSh {payout.amount.toLocaleString()}</span>
                  <details><summary>Details &amp; audit</summary><p>Gross {formatCurrency(payout.grossAmount || 0)} · Commission {formatCurrency(payout.commissionAmount || 0)} · Withholding {formatCurrency(payout.withholdingAmount || 0)} · Other deductions {formatCurrency(payout.deductionAmount || 0)}</p><p>Administrative record; no transfer is executed here.</p>{payout.auditLogs?.map(log => <p key={log.id}>{log.action} · {log.actor_name || 'System'} · {new Date(log.created_at).toLocaleString('en-KE')}{log.reason ? ` · ${log.reason}` : ''}</p>)}</details>
                  {payout.notes && <span className="pm-meta">Note: {payout.notes}</span>}
                </td>
                <td>
                  <span className="pm-method">{payout.method}</span>
                  <span className="pm-meta">Ref {payout.reference}</span>
                </td>
                <td>
                  <span className={`admin-status ${payout.status === 'Paid' ? 'admin-status--success' : ['Draft', 'Pending', 'Approved', 'Processing', 'On hold'].includes(payout.status) ? 'admin-status--warning' : 'admin-status--danger'}`}>
                    {formatStatus(payout.status)}
                  </span>
                  {payout.reconciliationStatus && <span className="pm-meta">{payout.reconciliationStatus}</span>}
                </td>
                <td>
                  <div className="cm-row-actions">
                    {payout.status === 'Draft' && (
                      <button disabled={actionBusy} className="cm-row-btn cm-row-btn--edit" type="button" onClick={() => void runPayoutAction(payout, 'submit')}>Submit</button>
                    )}
                    {payout.status === 'Pending' && (
                      <button disabled={actionBusy} className="cm-row-btn cm-row-btn--edit" type="button" onClick={() => void runPayoutAction(payout, 'approve')}>Approve</button>
                    )}
                    {payout.status === 'Approved' && (
                      <button disabled={actionBusy} className="cm-row-btn cm-row-btn--edit" type="button" onClick={() => void runPayoutAction(payout, 'process')}>Process</button>
                    )}
                    {(payout.status === 'Approved' || payout.status === 'Processing') && (
                      <button disabled={actionBusy}
                        className="cm-row-btn cm-row-btn--edit"
                        type="button"
                        onClick={() => openPaidModal(payout)}
                      >
                        Record paid
                      </button>
                    )}
                    {(payout.status === 'Approved' || payout.status === 'Processing') && (
                      <button disabled={actionBusy}
                        className="cm-row-btn cm-row-btn--delete"
                        type="button"
                        onClick={() => void runPayoutAction(payout, 'mark_failed', { failure_message: 'Marked failed by finance admin' })}
                      >
                        Mark failed
                      </button>
                    )}
                    {payout.status === 'Failed' && (
                      <button disabled={actionBusy} className="cm-row-btn cm-row-btn--edit" type="button" onClick={() => void runPayoutAction(payout, 'retry')}>Retry</button>
                    )}
                    {['Pending', 'Approved', 'Processing'].includes(payout.status) && (
                      <button disabled={actionBusy} className="cm-row-btn cm-row-btn--delete" type="button" onClick={() => requestReasonAndRun(payout, 'hold')}>Hold</button>
                    )}
                    {payout.status === 'On hold' && (
                      <button disabled={actionBusy} className="cm-row-btn cm-row-btn--edit" type="button" onClick={() => void runPayoutAction(payout, 'release')}>Release</button>
                    )}
                    {payout.status === 'Paid' && payout.reconciliationStatus !== 'Matched' && (
                      <button disabled={actionBusy} className="cm-row-btn cm-row-btn--edit" type="button" onClick={() => void runPayoutAction(payout, 'reconcile')}>Reconcile</button>
                    )}
                    {payout.status === 'Paid' && (
                      <button disabled={actionBusy} className="cm-row-btn cm-row-btn--delete" type="button" onClick={() => requestReasonAndRun(payout, 'reverse')}>Reverse</button>
                    )}
                    {['Draft', 'Pending', 'Approved', 'Failed', 'On hold'].includes(payout.status) && (
                      <button disabled={actionBusy} className="cm-row-btn cm-row-btn--delete" type="button" onClick={() => requestReasonAndRun(payout, 'cancel')}>Cancel</button>
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
                <p>Reference rates for manual task payouts. Saving a rule does not create a payout or transfer money. Consultation payouts use their recorded earnings.</p>
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
                  <input aria-label="Rule amount"
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
                    onBlur={() => void persistRule(rule)}
                  />
                  <label className="pm-rules__toggle">
                    <input
                      type="checkbox"
                      checked={rule.active}
                      onChange={(event) =>
                        void persistRule({ ...rule, active: event.target.checked })
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
                <label htmlFor="field-payoutmanagement-731-33889">Role name</label>
                <input id="field-payoutmanagement-731-33889"
                  type="text"
                  value={newRuleRole}
                  onChange={(event) => { setNewRuleRole(event.target.value); setNewRuleError('') }}
                  placeholder="e.g. Lab Radiologist"
                />
              </div>
              <div className="form-group">
                <label htmlFor="field-payoutmanagement-740-34326">Rate per task (KSh)</label>
                <input id="field-payoutmanagement-740-34326"
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
                      <label htmlFor="field-payoutmanagement-785-36334">Recipient role</label>
                      <select id="field-payoutmanagement-785-36334"
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

                    
                      <div className="form-group">
                        <label htmlFor="field-payoutmanagement-802-37111">Recipient</label>
                        <select id="field-payoutmanagement-802-37111"
                          value={recipientId}
                          onChange={(event) => { setRecipientId(event.target.value); const rule = rules.find(item => item.role === recipientRole && item.active); if (!amount && rule) setAmount(String(rule.amount)) }}
                        >
                          <option value="">Select recipient</option>
                          {recipientOptions.map((profile) => (
                            <option key={profile.id} value={profile.id}>{profile.name}</option>
                          ))}
                        </select>
                      </div>

                  </div>
                </div>

                <div className="pm-modal__section">
                  <p className="pm-section-label">Payout details</p>
                  <div className="pm-modal__grid">
                    <div className="form-group">
                      <label htmlFor="field-payoutmanagement-821-38140">Period</label>
                      <input id="field-payoutmanagement-821-38140"
                        type="text"
                        value={period}
                        onChange={(event) => setPeriod(event.target.value)}
                        placeholder="Feb 2026"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="field-payoutmanagement-830-38581">Gross amount (KSh)</label>
                      <input id="field-payoutmanagement-830-38581"
                        type="number"
                        min={1}
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="field-payoutmanagement-840-39061">Method</label>
                      <select id="field-payoutmanagement-840-39061" value={method} onChange={(event) => setMethod(event.target.value as PayoutMethod)}>
                        {payoutMethods.map((methodOption) => (
                          <option key={methodOption} value={methodOption}>{methodOption}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="field-payoutmanagement-848-39585">Reference</label>
                      <input id="field-payoutmanagement-848-39585"
                        type="text"
                        value={reference}
                        onChange={(event) => setReference(event.target.value)}
                        placeholder="Unique source reference (required)"
                      />
                    </div>
                  </div>
                </div>

                <label>Source type<select aria-label="Payout source type" value={sourceType} onChange={event => setSourceType(event.target.value)}><option value="manual_adjustment">Manual adjustment</option><option value="consultation">Completed paid consultation</option></select></label><p>For a consultation, use its CONS reference and recorded gross fee/commission. An earning is paid only once.</p>
                <div className="pm-modal__section"><p className="pm-section-label">Deductions</p><div className="pm-modal__grid">
                  <label>Commission<input aria-label="Commission amount" type="number" min="0" step="0.01" value={commission} onChange={event => setCommission(event.target.value)} /></label>
                  <label>Withholding<input aria-label="Withholding amount" type="number" min="0" step="0.01" value={withholding} onChange={event => setWithholding(event.target.value)} /></label>
                  <label>Other deductions<input aria-label="Other deductions" type="number" min="0" step="0.01" value={deduction} onChange={event => setDeduction(event.target.value)} /></label>
                </div><p>Net amount: {formatCurrency(Number(amount || 0) - Number(commission) - Number(withholding) - Number(deduction))}</p></div>
                <div className="pm-modal__section">
                  <p className="pm-section-label">Status & notes</p>
                  <div className="pm-modal__grid pm-modal__grid--single">
                    <div className="form-group">
                      <label htmlFor="field-payoutmanagement-869-41567">Status</label>
                      <input id="field-payoutmanagement-869-41567" value={status} readOnly />
                    </div>
                    <div className="form-group">
                      <label htmlFor="field-payoutmanagement-873-41812">Notes (optional)</label>
                      <input id="field-payoutmanagement-873-41812"
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
                        ? recipientOptions.find((profile) => profile.id === recipientId)?.name ?? '-'
                        : recipientName.trim() || '-'}
                    </strong>
                  </div>
                  <div className="pm-summary-row">
                    <span>Role</span>
                    <strong>{recipientRole}</strong>
                  </div>
                  <div className="pm-summary-row">
                    <span>Period</span>
                    <strong>{period.trim() || '-'}</strong>
                  </div>
                  <div className="pm-summary-row pm-summary-row--amount">
                    <span>Amount</span>
                    <strong>
                      {Number.isFinite(Number.parseFloat(amount)) && Number.parseFloat(amount) > 0
                        ? formatCurrency(Number.parseFloat(amount) - Number(commission) - Number(withholding) - Number(deduction))
                        : '-'}
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
                    <strong>{reference.trim() || 'Required'}</strong>
                  </div>
                  <div className="pm-summary-row">
                    <span>Source</span>
                    <strong>{sourceType === 'consultation' ? 'Recorded consultation earning' : 'Manual adjustment'}</strong>
                  </div>
                  {notes.trim() && (
                    <div className="pm-summary-note">
                      <span>Notes</span>
                      <p>{notes.trim()}</p>
                    </div>
                  )}
                </div>
                <p className="pm-summary-hint">Review details before saving. Records enter the auditable finance ledger as drafts, then follow submission and approval controls.</p>
              </div>
            </div>
            <div className="pm-modal__footer">
              <button className="btn btn--outline btn--sm" onClick={resetRegisterForm}>
                Reset
              </button>
              <button className="btn btn--primary btn--sm" onClick={() => void handleSavePayout()}>
                Save payout
              </button>
            </div>
          </div>
        </div>
      )}

      {reasonTarget && <Dialog onClose={() => setReasonTarget(null)} className="pm-modal" role="dialog" aria-label="Payout action reason"><div className="pm-modal__content"><h2>{reasonTarget.action} payout {reasonTarget.payout.id}</h2><label>Reason<input aria-label="Payout action reason" value={reasonValue} onChange={event => setReasonValue(event.target.value)} /></label><button type="button" onClick={() => setReasonTarget(null)}>Keep payout</button><button type="button" disabled={!reasonValue.trim()} onClick={() => { void runPayoutAction(reasonTarget.payout, reasonTarget.action, { reason: reasonValue.trim() }); setReasonTarget(null) }}>Confirm action</button></div></Dialog>}
      {showPaidModal && paidTarget && (
        <div className="modal-overlay" onClick={() => setShowPaidModal(false)}>
          <Dialog onClose={() => setShowPaidModal(false)} className="modal pm-paid-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Mark payout as paid</h2>
              <button aria-label="Close dialog" type="button" className="modal__close" onClick={() => setShowPaidModal(false)}>×</button>
            </div>
            <div className="modal__content">
              <p className="pm-paid-modal__summary">
                Record an externally verified payment for <strong>{paidTarget.recipientName}</strong> - <strong>{formatCurrency(paidTarget.amount)}</strong>.
              </p>
              <div className="form-group">
                <label htmlFor="field-payoutmanagement-963-46701">Payment method</label>
                <select id="field-payoutmanagement-963-46701" value={paidMethod} onChange={(event) => setPaidMethod(event.target.value as 'M-Pesa' | 'Bank Transfer')}>
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="field-payoutmanagement-970-47164">Reference number</label>
                <input id="field-payoutmanagement-970-47164"
                  type="text"
                  value={paidRef}
                  onChange={(event) => { setPaidRef(event.target.value); setPaidError('') }}
                  placeholder="e.g. MPESA-TRX-884231"
                />
              </div>
              <div className="form-group">
                <label htmlFor="field-payoutmanagement-979-47598">Time of payment</label>
                <input id="field-payoutmanagement-979-47598"
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
          </Dialog>
        </div>
      )}
    </div>
  )
}

export default PayoutManagement
