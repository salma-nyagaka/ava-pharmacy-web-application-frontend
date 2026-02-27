import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminShared.css'
import './LabPartnerManagement.css'
import { logAdminAction } from '../../data/adminAudit'
import {
  LabPartner,
  LabPartnerStatus,
  LabTechnician,
  loadLabPartners,
  nextLabPartnerId,
  nextLabTechId,
  saveLabPartners,
} from '../../data/labPartners'

const payoutMethods = ['M-Pesa', 'Bank Transfer'] as const

const blankPartner = (): Omit<LabPartner, 'id' | 'status' | 'submittedAt' | 'techs'> => ({
  name: '',
  email: '',
  phone: '',
  location: '',
  payoutMethod: 'M-Pesa',
  payoutAccount: '',
  notes: '',
})

function LabPartnerManagement() {
  const navigate = useNavigate()
  const [partners, setPartners] = useState<LabPartner[]>(() => loadLabPartners())
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | LabPartnerStatus>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [draft, setDraft] = useState(blankPartner())
  const [managePartner, setManagePartner] = useState<LabPartner | null>(null)
  const [techDraft, setTechDraft] = useState<Omit<LabTechnician, 'id' | 'status'>>({ name: '', email: '', phone: '' })
  const [manageStatus, setManageStatus] = useState<LabPartnerStatus>('Pending')

  useEffect(() => {
    saveLabPartners(partners)
  }, [partners])

  useEffect(() => {
    if (!managePartner) return
    const refreshed = partners.find((p) => p.id === managePartner.id)
    if (refreshed) {
      setManagePartner(refreshed)
    }
  }, [partners]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/admin')
  }

  const stats = useMemo(() => ({
    pending: partners.filter((p) => p.status === 'Pending').length,
    verified: partners.filter((p) => p.status === 'Verified').length,
    suspended: partners.filter((p) => p.status === 'Suspended').length,
  }), [partners])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return partners.filter((partner) => {
      if (statusFilter !== 'all' && partner.status !== statusFilter) return false
      if (!q) return true
      return [partner.name, partner.email, partner.phone, partner.location]
        .some((value) => value.toLowerCase().includes(q))
    })
  }, [partners, searchTerm, statusFilter])

  const openAdd = () => {
    setDraft(blankPartner())
    setShowAdd(true)
  }

  const handleAdd = () => {
    if (!draft.name.trim() || !draft.email.trim() || !draft.phone.trim()) return
    const id = nextLabPartnerId(partners)
    const submittedAt = new Date().toISOString().slice(0, 10)
    const partner: LabPartner = {
      id,
      status: 'Pending',
      submittedAt,
      techs: [],
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      location: draft.location.trim(),
      payoutMethod: draft.payoutMethod,
      payoutAccount: draft.payoutAccount.trim(),
      notes: draft.notes?.trim() || undefined,
    }
    setPartners((prev) => [partner, ...prev])
    logAdminAction({ action: 'Register lab partner', entity: 'Lab Partner', entityId: id, detail: partner.name })
    setShowAdd(false)
  }

  const openManage = (partner: LabPartner) => {
    setManagePartner(partner)
    setManageStatus(partner.status)
    setTechDraft({ name: '', email: '', phone: '' })
    setShowManage(true)
  }

  const handleVerify = (partner: LabPartner) => {
    const verifiedAt = new Date().toISOString().slice(0, 10)
    setPartners((prev) =>
      prev.map((p) => (p.id === partner.id ? { ...p, status: 'Verified', verifiedAt } : p))
    )
    logAdminAction({ action: 'Verify lab partner', entity: 'Lab Partner', entityId: partner.id, detail: partner.name })
  }

  const handleManageSave = () => {
    if (!managePartner) return
    setPartners((prev) =>
      prev.map((p) => (p.id === managePartner.id ? { ...p, status: manageStatus } : p))
    )
    logAdminAction({ action: 'Update lab partner', entity: 'Lab Partner', entityId: managePartner.id, detail: `Status ${manageStatus}` })
    setShowManage(false)
  }

  const handleAddTech = () => {
    if (!managePartner) return
    if (!techDraft.name.trim() || !techDraft.email.trim()) return
    const id = nextLabTechId(partners)
    const tech: LabTechnician = {
      id,
      name: techDraft.name.trim(),
      email: techDraft.email.trim(),
      phone: techDraft.phone.trim(),
      status: 'Active',
    }
    setPartners((prev) =>
      prev.map((p) => (p.id === managePartner.id ? { ...p, techs: [tech, ...p.techs] } : p))
    )
    logAdminAction({ action: 'Add lab technician', entity: 'Lab Partner', entityId: managePartner.id, detail: tech.name })
    setTechDraft({ name: '', email: '', phone: '' })
  }

  return (
    <div className="admin-page lp-page">
      <div className="admin-page__header">
        <div>
          <button className="pm-back-btn" type="button" onClick={handleBack}>← Back</button>
          <h1>Lab Partners</h1>
          <p className="lp-subtitle">Register lab partners, verify onboarding, and manage lab technicians.</p>
        </div>
        <button className="btn btn--primary btn--sm" type="button" onClick={openAdd}>
          Register lab partner
        </button>
      </div>

      <div className="lp-stats">
        <div className="lp-stat lp-stat--pending">
          <span className="lp-stat__value">{stats.pending}</span>
          <span className="lp-stat__label">Pending</span>
        </div>
        <div className="lp-stat lp-stat--verified">
          <span className="lp-stat__value">{stats.verified}</span>
          <span className="lp-stat__label">Verified</span>
        </div>
        <div className="lp-stat lp-stat--suspended">
          <span className="lp-stat__value">{stats.suspended}</span>
          <span className="lp-stat__label">Suspended</span>
        </div>
      </div>

      <div className="admin-page__filters">
        <input
          type="text"
          placeholder="Search by partner name, email, phone, or location"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | LabPartnerStatus)}>
          <option value="all">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Verified">Verified</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

      <div className="admin-page__table">
        <table>
          <thead>
            <tr>
              <th>Partner</th>
              <th>Contact</th>
              <th>Techs</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((partner) => (
              <tr key={partner.id}>
                <td>
                  <p className="lp-name">{partner.name}</p>
                  <p className="lp-meta">{partner.location}</p>
                </td>
                <td>
                  <p className="lp-meta">{partner.email}</p>
                  <p className="lp-meta">{partner.phone}</p>
                </td>
                <td>
                  <span className="lp-tech-count">{partner.techs.length} tech{partner.techs.length === 1 ? '' : 's'}</span>
                </td>
                <td>
                  <span className={`lp-status lp-status--${partner.status.toLowerCase()}`}>
                    {partner.status}
                  </span>
                </td>
                <td>{partner.submittedAt}</td>
                <td>
                  <div className="lp-actions">
                    <button className="btn btn--outline btn--sm" type="button" onClick={() => openManage(partner)}>
                      Manage
                    </button>
                    {partner.status === 'Pending' && (
                      <button className="btn btn--primary btn--sm" type="button" onClick={() => handleVerify(partner)}>
                        Verify
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="lp-empty">No lab partners match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal lp-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Register lab partner</h2>
              <button className="modal__close" onClick={() => setShowAdd(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="form-group">
                <label>Partner name</label>
                <input value={draft.name} onChange={(event) => setDraft((p) => ({ ...p, name: event.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input value={draft.email} onChange={(event) => setDraft((p) => ({ ...p, email: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={draft.phone} onChange={(event) => setDraft((p) => ({ ...p, phone: event.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Location</label>
                <input value={draft.location} onChange={(event) => setDraft((p) => ({ ...p, location: event.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Payout method</label>
                  <select
                    value={draft.payoutMethod}
                    onChange={(event) => setDraft((p) => ({ ...p, payoutMethod: event.target.value as LabPartner['payoutMethod'] }))}
                  >
                    {payoutMethods.map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Payout account</label>
                  <input value={draft.payoutAccount} onChange={(event) => setDraft((p) => ({ ...p, payoutAccount: event.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <input value={draft.notes} onChange={(event) => setDraft((p) => ({ ...p, notes: event.target.value }))} />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn--primary btn--sm" onClick={handleAdd}>Save partner</button>
            </div>
          </div>
        </div>
      )}

      {showManage && managePartner && (
        <div className="modal-overlay" onClick={() => setShowManage(false)}>
          <div className="modal lp-modal lp-modal--wide" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <div>
                <h2>{managePartner.name}</h2>
                <p className="lp-modal__subtitle">{managePartner.email} · {managePartner.phone}</p>
              </div>
              <button className="modal__close" onClick={() => setShowManage(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="lp-manage-grid">
                <div>
                  <p className="lp-section-title">Partner details</p>
                  <div className="lp-detail-card">
                    <div>
                      <span>Location</span>
                      <strong>{managePartner.location}</strong>
                    </div>
                    <div>
                      <span>Payout</span>
                      <strong>{managePartner.payoutMethod} · {managePartner.payoutAccount}</strong>
                    </div>
                    <div>
                      <span>Status</span>
                      <strong>{managePartner.status}</strong>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Update status</label>
                    <select value={manageStatus} onChange={(event) => setManageStatus(event.target.value as LabPartnerStatus)}>
                      <option value="Pending">Pending</option>
                      <option value="Verified">Verified</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>
                <div>
                  <p className="lp-section-title">Lab technicians</p>
                  <div className="lp-tech-list">
                    {managePartner.techs.map((tech) => (
                      <div key={tech.id} className="lp-tech-card">
                        <div>
                          <p>{tech.name}</p>
                          <span>{tech.email}</span>
                        </div>
                        <span className={`lp-tech-status ${tech.status === 'Active' ? 'lp-tech-status--active' : 'lp-tech-status--inactive'}`}>
                          {tech.status}
                        </span>
                      </div>
                    ))}
                    {managePartner.techs.length === 0 && (
                      <div className="lp-empty-state">No technicians added yet.</div>
                    )}
                  </div>
                  <div className="lp-add-tech">
                    <p className="lp-section-title">Add technician</p>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Name</label>
                        <input value={techDraft.name} onChange={(event) => setTechDraft((p) => ({ ...p, name: event.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input value={techDraft.email} onChange={(event) => setTechDraft((p) => ({ ...p, email: event.target.value }))} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Phone</label>
                        <input value={techDraft.phone} onChange={(event) => setTechDraft((p) => ({ ...p, phone: event.target.value }))} />
                      </div>
                      <div className="form-group lp-add-tech__action">
                        <button className="btn btn--outline btn--sm" type="button" onClick={handleAddTech}>
                          Add technician
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowManage(false)}>
                Close
              </button>
              <button className="btn btn--primary btn--sm" onClick={handleManageSave}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LabPartnerManagement
