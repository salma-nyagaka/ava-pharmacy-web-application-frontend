import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import { PrescriptionRecord } from '../../data/prescriptions'
import { prescriptionService } from '../../services/prescriptionService'

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
    setFeedback(`Approved ${batch.length} prescription(s): ${batch.map((item) => item.id).join(', ')}`)
  }

  const handleExportAuditLog = () => {
    const rows = [
      'Prescription ID,Patient,Status,Dispatch,Last Audit Action',
      ...records.map((item) => {
        const latestAudit = item.audit?.[0]?.action ?? 'No audit'
        return [
          item.id,
          item.patient,
          item.status,
          item.dispatchStatus,
          `"${latestAudit.replace(/"/g, '""')}"`,
        ].join(',')
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
    setFeedback('Audit log exported.')
  }

  return (
    <div>
      <PageHeader
        title="Pharmacist dashboard"
        subtitle="Review prescriptions, validate safety checks, and approve fulfillment."
        badge="Pharmacy"
      />
      <section className="page">
        <div className="container">
          <div className="portal-stats">
            <div className="portal-stat">
              <p className="portal-stat__label">Pending reviews</p>
              <p className="portal-stat__value">{pendingReviews}</p>
            </div>
            <div className="portal-stat">
              <p className="portal-stat__label">Flagged safety checks</p>
              <p className="portal-stat__value">{flaggedChecks}</p>
            </div>
            <div className="portal-stat">
              <p className="portal-stat__label">Average review time</p>
              <p className="portal-stat__value">6 min</p>
            </div>
          </div>

          <div className="portal-layout">
            <div>
              <div className="card">
                <h2 className="card__title">Prescription queue</h2>
                <div className="queue-list">
                  {queue.map((item) => (
                    <div key={item.id} className="queue-item">
                      <div>
                        <strong>{item.id}</strong>
                        <p className="queue-item__meta">Patient: {item.patient}</p>
                        <p className="queue-item__meta">Submitted: {item.submitted}</p>
                        <p className="queue-item__meta">Status: {item.status}</p>
                        <p className="queue-item__meta">Dispatch: {item.dispatchStatus}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`status-pill ${item.priority === 'High' ? 'status-pill--danger' : 'status-pill--info'}`}>
                          {item.priority}
                        </span>
                        <div style={{ marginTop: '0.5rem' }}>
                          <Link to={`/pharmacist/review/${item.id}`} className="btn btn--outline btn--sm">Review</Link>
                        </div>
                      </div>
                    </div>
                  ))}
                  {queue.length === 0 && (
                    <p className="queue-item__meta">No prescriptions available for review.</p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <div className="card card--soft">
                <h3 className="card__title">Safety alerts</h3>
                <ul className="card__list">
                  <li>Prescriptions in clarification state appear as high priority.</li>
                  <li>Review uploaded files and notes before changing status.</li>
                </ul>
              </div>
              <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3 className="card__title">Quick actions</h3>
                <div className="inline-list">
                  <button className="btn btn--primary btn--sm" type="button" onClick={() => void handleApproveBatch()}>
                    Approve batch
                  </button>
                  <button className="btn btn--outline btn--sm" type="button" onClick={handleExportAuditLog}>
                    Export audit log
                  </button>
                </div>
                {feedback && <p className="card__meta" style={{ marginTop: '0.65rem' }}>{feedback}</p>}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PharmacistDashboardPage
