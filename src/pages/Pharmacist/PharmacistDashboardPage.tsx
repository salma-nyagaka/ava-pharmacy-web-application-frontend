import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PrescriptionRecord } from '../../data/prescriptions'
import { prescriptionService } from '../../services/prescriptionService'
import './PharmacistDashboardPage.css'

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function PharmacistDashboardPage() {
  const [records, setRecords] = useState<PrescriptionRecord[]>([])
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    void prescriptionService.list().then((response) => setRecords(response.data))
  }, [])

  const queue = useMemo(() => {
    return records
      .filter((item) => item.status !== 'Rejected')
      .sort((a, b) => {
        const aRank = a.status === 'Clarification' ? 0 : a.status === 'Pending' ? 1 : 2
        const bRank = b.status === 'Clarification' ? 0 : b.status === 'Pending' ? 1 : 2
        if (aRank !== bRank) return aRank - bRank
        return b.id.localeCompare(a.id)
      })
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        patient: item.patient,
        submitted: item.submitted,
        priority: item.status === 'Clarification' ? 'High' : item.status === 'Pending' ? 'Normal' : 'Low',
        status: item.status,
        dispatchStatus: item.dispatchStatus,
      }))
  }, [records])

  const pendingReviews = records.filter((item) => item.status === 'Pending' || item.status === 'Clarification').length
  const flaggedChecks = records.filter((item) => item.status === 'Clarification').length

  const handleApproveBatch = async () => {
    const candidates = records.filter((item) => item.status === 'Pending' || item.status === 'Clarification')
    const batch = candidates.slice(0, 3)
    if (batch.length === 0) {
      setFeedback('No pending prescriptions available for batch approval.')
      return
    }
    const approvedIds = new Set(batch.map((item) => item.id))
    const updated = records.map((item) =>
      approvedIds.has(item.id)
        ? { ...item, status: 'Approved' as const, dispatchStatus: item.dispatchStatus === 'Not started' ? 'Queued' as const : item.dispatchStatus }
        : item
    )
    let response = await prescriptionService.saveAll(updated)
    for (const item of batch) {
      response = await prescriptionService.appendAudit(item.id, 'Batch approved from pharmacist dashboard')
    }
    setRecords(response.data)
    setFeedback(`✓ Approved ${batch.length} prescription(s): ${batch.map((item) => item.id).join(', ')}`)
  }

  const handleExportAuditLog = () => {
    const rows = [
      'Prescription ID,Patient,Status,Dispatch,Last Audit Action',
      ...records.map((item) => {
        const latestAudit = item.audit?.[0]?.action ?? 'No audit'
        return [item.id, item.patient, item.status, item.dispatchStatus, `"${latestAudit.replace(/"/g, '""')}"`].join(',')
      }),
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'pharmacist-audit-log.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setFeedback('✓ Audit log downloaded to your computer.')
  }

  const statusBadgeClass = (status: string) => {
    if (status === 'Clarification') return 'ph-badge ph-badge--clarify'
    if (status === 'Pending') return 'ph-badge ph-badge--pending'
    if (status === 'Approved') return 'ph-badge ph-badge--approved'
    return 'ph-badge ph-badge--low'
  }

  return (
    <div className="ph-page">
      {/* ── Hero ── */}
      <div className="ph-hero">
        <div className="ph-hero__inner">
          <div className="ph-hero__left">
            <div className="ph-hero__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="26" height="26">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="2"/>
                <path d="M9 12h6M9 16h4"/>
              </svg>
            </div>
            <div>
              <h1 className="ph-hero__title">Pharmacist Dashboard</h1>
              <p className="ph-hero__sub">Review prescriptions, check safety, and approve dispensing</p>
            </div>
          </div>
          <span className="ph-hero__badge">Pharmacy Portal</span>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="ph-stats">
        <div className="ph-stat">
          <div className="ph-stat__icon ph-stat__icon--warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div>
            <p className="ph-stat__value">{pendingReviews}</p>
            <p className="ph-stat__label">Awaiting your review</p>
          </div>
        </div>
        <div className="ph-stat">
          <div className="ph-stat__icon ph-stat__icon--danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <p className="ph-stat__value">{flaggedChecks}</p>
            <p className="ph-stat__label">Need clarification</p>
          </div>
        </div>
        <div className="ph-stat">
          <div className="ph-stat__icon ph-stat__icon--success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <p className="ph-stat__value">~6 min</p>
            <p className="ph-stat__label">Average review time</p>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="ph-body">
        {/* Queue */}
        <div>
          <div className="ph-queue-card">
            <div className="ph-queue-card__header">
              <h2 className="ph-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                Prescription Queue
                {queue.length > 0 && <span className="ph-section-title__count">{queue.length}</span>}
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                Red bar = urgent · Yellow = pending · Green = approved
              </p>
            </div>
            <div className="ph-queue-card__body">
              {queue.length === 0 ? (
                <div className="ph-empty">
                  <div className="ph-empty__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" width="24" height="24">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <p className="ph-empty__title">All caught up!</p>
                  <p className="ph-empty__sub">No prescriptions need review right now.</p>
                </div>
              ) : (
                queue.map((item) => (
                  <div key={item.id} className="ph-queue-item">
                    <div className={`ph-queue-item__priority-bar ph-queue-item__priority-bar--${item.priority.toLowerCase()}`} />
                    <div className="ph-queue-item__avatar">{getInitials(item.patient)}</div>
                    <div className="ph-queue-item__info">
                      <p className="ph-queue-item__id">{item.id}</p>
                      <p className="ph-queue-item__name">{item.patient}</p>
                      <p className="ph-queue-item__meta">Submitted: {item.submitted} · Dispatch: {item.dispatchStatus}</p>
                    </div>
                    <div className="ph-queue-item__right">
                      <span className={statusBadgeClass(item.status)}>
                        <span className="ph-badge__dot" />
                        {item.status}
                      </span>
                      <Link to={`/pharmacist/review/${item.id}`} className="ph-btn-review">
                        Review
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                        </svg>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="ph-sidebar">
          {/* How to use guide */}
          <div className="ph-card">
            <h3 className="ph-section-title" style={{ marginBottom: '0.85rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              How to review
            </h3>
            <div className="ph-guide-list">
              {[
                'Find a prescription in the queue above',
                'Click "Review" to open it',
                'Check the uploaded file and patient notes',
                'Approve, request clarification, or reject',
              ].map((step, i) => (
                <div key={i} className="ph-guide-step">
                  <span className="ph-guide-step__num">{i + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Safety alerts */}
          <div className="ph-card">
            <h3 className="ph-section-title" style={{ marginBottom: '0.85rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" width="16" height="16">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Safety reminders
            </h3>
            <div className="ph-alert-list">
              <div className="ph-alert-item">
                <span className="ph-alert-item__icon">⚠️</span>
                <span>Red / "High priority" prescriptions need immediate attention — check those first.</span>
              </div>
              <div className="ph-alert-item">
                <span className="ph-alert-item__icon">📋</span>
                <span>Always review the uploaded file and patient notes before approving.</span>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="ph-card">
            <h3 className="ph-section-title" style={{ marginBottom: '0.85rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Quick actions
            </h3>
            <div className="ph-actions">
              <button className="ph-action-btn ph-action-btn--primary" type="button" onClick={() => void handleApproveBatch()}>
                <span className="ph-action-btn__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
                <span className="ph-action-btn__text">
                  <span className="ph-action-btn__label">Approve next 3</span>
                  <span className="ph-action-btn__desc">Batch approve pending prescriptions</span>
                </span>
              </button>
              <button className="ph-action-btn ph-action-btn--outline" type="button" onClick={handleExportAuditLog}>
                <span className="ph-action-btn__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" width="16" height="16">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </span>
                <span className="ph-action-btn__text">
                  <span className="ph-action-btn__label">Download audit log</span>
                  <span className="ph-action-btn__desc">Save a CSV of all prescription activity</span>
                </span>
              </button>
            </div>
            {feedback && (
              <div className="ph-feedback">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {feedback}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default PharmacistDashboardPage
