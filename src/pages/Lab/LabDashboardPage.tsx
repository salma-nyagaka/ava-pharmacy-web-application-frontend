import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ProfessionalPortalShell from '../../components/ProfessionalPortalShell/ProfessionalPortalShell'
import { labPartnerDashboardService, LabPartnerDashboardData, LabPartnerDashboardError } from '../../services/labPartnerDashboardService'
import { adminLabPartnerService, AdminLabPartnerApi } from '../../services/adminLabPartnerService'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/portals/DoctorDashboardPage.css'
import '../../styles/pages/LabDashboardPage.css'

const blankTech = { name: '', email: '', phone: '', specialty: '' }
type LabDashboardTab = 'overview' | 'team' | 'requests'

const statusToneClass = (status: string) => {
  const normalized = status.toLowerCase()
  if (normalized === 'active' || normalized === 'completed') return 'status-pill status-pill--success'
  if (normalized === 'suspended' || normalized === 'cancelled') return 'status-pill status-pill--danger'
  return 'status-pill status-pill--warning'
}

const mapAdminPartnerPreview = (partner?: AdminLabPartnerApi): LabPartnerDashboardData => {
  const techs = Array.isArray(partner?.technicians) ? partner.technicians : []
  return {
    partner: {
      id: Number(partner?.id ?? 0),
      name: partner?.name || 'Lab Partner Preview',
      reference: partner?.reference || 'PREVIEW',
      contactName: partner?.contact_name || '',
      email: partner?.email || partner?.user_email || '',
      phone: partner?.phone || '',
      location: partner?.location || '',
      accreditation: partner?.accreditation || '',
      licenseNumber: partner?.license_number || '',
      payoutMethod: partner?.payout_method === 'bank_transfer' ? 'Bank Transfer' : 'M-Pesa',
      payoutAccount: partner?.payout_account || '',
      status: partner?.status || 'pending',
      statusNote: partner?.status_note || '',
      rejectionNote: partner?.rejection_note || '',
      documents: Array.isArray(partner?.documents) ? partner.documents.map((doc) => doc.name || 'Document') : [],
    },
    stats: {
      techniciansTotal: techs.length,
      techniciansActive: techs.filter((tech) => (tech.status || '').toLowerCase() === 'active').length,
      techniciansPending: techs.filter((tech) => !tech.status || (tech.status || '').toLowerCase() === 'pending').length,
      requestsTotal: 0,
      requestsPending: 0,
      requestsCompleted: 0,
    },
    technicians: techs.map((tech) => ({
      id: Number(tech.id ?? 0),
      name: tech.name || tech.user_name || 'Unnamed technician',
      email: tech.email || tech.user_email || '',
      phone: tech.phone || tech.user_phone || '',
      specialty: tech.specialty || '',
      status: (tech.status || '').toLowerCase() === 'active' ? 'Active' : (tech.status || '').toLowerCase() === 'suspended' ? 'Suspended' : 'Pending',
      accountProvisioned: Boolean(tech.user || tech.user_email),
      note: tech.status_note || tech.rejection_note || '',
    })),
    recentRequests: [],
  }
}

function LabDashboardPage() {
  const { user, logout } = useAuth()
  const [dashboard, setDashboard] = useState<LabPartnerDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [showAddTech, setShowAddTech] = useState(false)
  const [techDraft, setTechDraft] = useState(blankTech)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [rowLoadingId, setRowLoadingId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<LabDashboardTab>('overview')

  const isAdminPreview = user?.role === 'admin'
  const isPartner = user?.role === 'lab_partner'

  const loadDashboard = async () => {
    setLoading(true)
    setError('')
    try {
      if (isAdminPreview) {
        const partners = await adminLabPartnerService.listPartners()
        setDashboard(mapAdminPartnerPreview(partners[0]))
      } else {
        const payload = await labPartnerDashboardService.getDashboard()
        setDashboard(payload)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load lab partner dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isPartner || isAdminPreview) {
      void loadDashboard()
    } else {
      setLoading(false)
    }
  }, [isPartner, isAdminPreview])

  const handleApiError = (err: unknown, fallback: string) => {
    if (err instanceof LabPartnerDashboardError) {
      setFieldErrors(err.fieldErrors)
      setError(err.message || fallback)
      return
    }
    setError(err instanceof Error ? err.message : fallback)
  }

  const handleAddTechnician = async () => {
    setSubmitting(true)
    setFieldErrors({})
    setError('')
    try {
      await labPartnerDashboardService.addTechnician({
        name: techDraft.name.trim(),
        email: techDraft.email.trim(),
        phone: techDraft.phone.trim(),
        specialty: techDraft.specialty.trim(),
      })
      setShowAddTech(false)
      setTechDraft(blankTech)
      setFeedback('Lab technician added.')
      await loadDashboard()
    } catch (err) {
      handleApiError(err, 'Unable to add lab technician.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleProvision = async (id: number) => {
    setRowLoadingId(id)
    setError('')
    try {
      const response = await labPartnerDashboardService.provisionTechnician(id)
      setFeedback(response.activation_email?.sent_to ? `Activation email sent to ${response.activation_email.sent_to}.` : response.detail)
      await loadDashboard()
    } catch (err) {
      handleApiError(err, 'Unable to provision technician account.')
    } finally {
      setRowLoadingId(null)
    }
  }

  const handleStatus = async (id: number, action: 'activate' | 'suspend') => {
    setRowLoadingId(id)
    setError('')
    try {
      await labPartnerDashboardService.setTechnicianStatus(id, action)
      setFeedback(action === 'activate' ? 'Technician activated.' : 'Technician suspended.')
      await loadDashboard()
    } catch (err) {
      handleApiError(err, 'Unable to update technician status.')
    } finally {
      setRowLoadingId(null)
    }
  }

  const stats = useMemo(() => dashboard?.stats ?? {
    techniciansTotal: 0,
    techniciansActive: 0,
    techniciansPending: 0,
    requestsTotal: 0,
    requestsPending: 0,
    requestsCompleted: 0,
  }, [dashboard])

  const actorName = dashboard?.partner.contactName || dashboard?.partner.name || user?.name || 'Lab Partner'
  const actorMeta = dashboard?.partner.location || dashboard?.partner.reference || 'Laboratory Operations'

  const navigationItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      id: 'team',
      label: 'Team',
      badge: stats.techniciansPending,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: 'requests',
      label: 'Requests',
      badge: stats.requestsPending,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
  ] as const

  if (!loading && !isPartner && !isAdminPreview) {
    return <Navigate to="/" replace />
  }

  return (
    <ProfessionalPortalShell
      accentColor="#4f46e5"
      activeItemId={activeTab}
      navItems={navigationItems}
      onNavChange={(itemId) => setActiveTab(itemId as LabDashboardTab)}
      onLogout={() => { void logout() }}
      roleLabel={isAdminPreview ? 'Admin Preview' : 'Lab Partner'}
      sidebarHeaderContent={(
        <div className="portal-shell__meta-card">
          <span className="portal-shell__meta-label">Lab partner</span>
          <p className="portal-shell__meta-value">{dashboard?.partner.name || 'Loading...'}</p>
          <p className="portal-shell__meta-value">{dashboard?.partner.reference || '—'}</p>
        </div>
      )}
      userInitials={actorName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'LP'}
      userMeta={actorMeta}
      userName={actorName}
    >
      <div className="dd-content lpd-content">
        <div className="dd-welcome lpd-welcome">
          <div>
            <h1 className="dd-welcome__title lpd-welcome__title">{isAdminPreview ? 'Lab partner dashboard preview' : `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${actorName.split(' ')[0]}.`}</h1>
            <p className="dd-welcome__sub lpd-welcome__sub">{isAdminPreview ? 'This is the same lab partner workspace, shown in read-only mode for admin review.' : 'Manage your laboratory profile, technicians, and request activity from one place.'}</p>
          </div>
          <p className="dd-welcome__sub lpd-welcome__date">{new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        {isAdminPreview && <div className="cm-inline-success">Admin preview mode. Partner-only actions are disabled here.</div>}
        {error && <div className="cm-inline-error">{error}</div>}
        {feedback && <div className="cm-inline-success">{feedback}</div>}

        <div className="cm-kpi-grid">
          <div className="cm-kpi-card">
            <div className="cm-kpi-card__icon cm-kpi-card__icon--teal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </div>
            <div className="cm-kpi-card__body">
              <span className="cm-kpi-card__label">Technicians</span>
              <strong className="cm-kpi-card__value">{stats.techniciansTotal}</strong>
            </div>
          </div>
          <div className="cm-kpi-card">
            <div className="cm-kpi-card__icon cm-kpi-card__icon--green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
            </div>
            <div className="cm-kpi-card__body">
              <span className="cm-kpi-card__label">Active team</span>
              <strong className="cm-kpi-card__value cm-kpi-card__value--green">{stats.techniciansActive}</strong>
            </div>
          </div>
          <div className="cm-kpi-card">
            <div className="cm-kpi-card__icon cm-kpi-card__icon--amber">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
            </div>
            <div className="cm-kpi-card__body">
              <span className="cm-kpi-card__label">Pending requests</span>
              <strong className="cm-kpi-card__value cm-kpi-card__value--amber">{stats.requestsPending}</strong>
            </div>
          </div>
          <div className="cm-kpi-card">
            <div className="cm-kpi-card__icon cm-kpi-card__icon--blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
            </div>
            <div className="cm-kpi-card__body">
              <span className="cm-kpi-card__label">Completed requests</span>
              <strong className="cm-kpi-card__value">{stats.requestsCompleted}</strong>
            </div>
          </div>
        </div>

        {loading && <div className="cm-empty-state">Loading dashboard…</div>}

        {!loading && dashboard && activeTab === 'overview' && (
          <div className="doc-split-layout lpd-grid">
            <section className="dd-table-card lpd-panel">
              <div className="dd-toolbar lpd-toolbar">
                <div>
                  <h2 className="dd-toolbar__title">Partner profile</h2>
                  <p className="dd-count">Registration, accreditation, and payout configuration.</p>
                </div>
                {!isAdminPreview && (
                  <button className="btn btn--primary btn--sm" type="button" onClick={() => { setShowAddTech(true); setFeedback(''); setFieldErrors({}) }}>
                    Add technician
                  </button>
                )}
              </div>
              <div className="lpd-profile">
                <div className="lpd-profile__meta">
                  <span className={statusToneClass(dashboard.partner.status)}>{dashboard.partner.status || 'Pending'}</span>
                  <span className="lpd-profile__reference">{dashboard.partner.reference}</span>
                </div>
                <div className="lpd-detail-grid">
                  <div><span className="lpd-detail-grid__label">Contact</span><strong>{dashboard.partner.contactName || '—'}</strong><span>{dashboard.partner.email || '—'}</span></div>
                  <div><span className="lpd-detail-grid__label">Phone</span><strong>{dashboard.partner.phone || '—'}</strong><span>{dashboard.partner.location || '—'}</span></div>
                  <div><span className="lpd-detail-grid__label">Accreditation</span><strong>{dashboard.partner.accreditation || '—'}</strong><span>{dashboard.partner.licenseNumber || '—'}</span></div>
                  <div><span className="lpd-detail-grid__label">Payout</span><strong>{dashboard.partner.payoutMethod}</strong><span>{dashboard.partner.payoutAccount || '—'}</span></div>
                </div>
                {dashboard.partner.documents.length > 0 && (
                  <div className="lpd-chip-row">
                    {dashboard.partner.documents.map((doc) => <span key={doc} className="status-pill status-pill--info">{doc}</span>)}
                  </div>
                )}
              </div>
            </section>

            <section className="dd-workspace-card lpd-panel">
              <div className="dd-toolbar lpd-toolbar">
                <div>
                  <h2 className="dd-toolbar__title">Operations summary</h2>
                  <p className="dd-count">Team readiness and request pipeline at a glance.</p>
                </div>
              </div>
              <div className="lpd-summary-list">
                <div className="lpd-summary-list__item"><span>Technicians awaiting setup</span><strong>{stats.techniciansPending}</strong></div>
                <div className="lpd-summary-list__item"><span>Total requests</span><strong>{stats.requestsTotal}</strong></div>
                <div className="lpd-summary-list__item"><span>Requests awaiting action</span><strong>{stats.requestsPending}</strong></div>
                <div className="lpd-summary-list__item"><span>Completed requests</span><strong>{stats.requestsCompleted}</strong></div>
              </div>
            </section>
          </div>
        )}

        {!loading && dashboard && activeTab === 'team' && (
          <section className="dd-table-card lpd-panel">
            <div className="dd-toolbar lpd-toolbar">
              <div>
                <h2 className="dd-toolbar__title">Lab technicians</h2>
                <p className="dd-count">Manage your team and account activation state.</p>
              </div>
              {!isAdminPreview && <button className="btn btn--primary btn--sm" type="button" onClick={() => setShowAddTech(true)}>Add technician</button>}
            </div>
            <div className="cm-panel cm-table-wrap dd-table-wrap">
              <table className="cm-table dd-table">
                <thead>
                  <tr><th>Technician</th><th>Contact</th><th>Specialty</th><th>Status</th><th>Account</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {dashboard.technicians.map((tech) => (
                    <tr key={tech.id}>
                      <td>
                        <div className="lpd-person-cell">
                          <div className="lpd-person-cell__avatar">{tech.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div>
                          <div><strong>{tech.name}</strong>{tech.note && <p>{tech.note}</p>}</div>
                        </div>
                      </td>
                      <td>{tech.email}<br />{tech.phone || '—'}</td>
                      <td>{tech.specialty || '—'}</td>
                      <td><span className={statusToneClass(tech.status)}>{tech.status}</span></td>
                      <td>{tech.accountProvisioned ? 'Provisioned' : 'Pending setup'}</td>
                      <td className="portal-table__actions">
                        {!isAdminPreview && !tech.accountProvisioned && tech.status === 'Active' && (
                          <button className="btn btn--outline btn--sm" type="button" onClick={() => handleProvision(tech.id)} disabled={rowLoadingId === tech.id}>
                            {rowLoadingId === tech.id ? 'Provisioning…' : 'Send activation'}
                          </button>
                        )}
                        {!isAdminPreview && (tech.status !== 'Suspended' ? (
                          <button className="btn btn--outline btn--sm" type="button" onClick={() => handleStatus(tech.id, 'suspend')} disabled={rowLoadingId === tech.id}>Suspend</button>
                        ) : (
                          <button className="btn btn--outline btn--sm" type="button" onClick={() => handleStatus(tech.id, 'activate')} disabled={rowLoadingId === tech.id}>Activate</button>
                        ))}
                      </td>
                    </tr>
                  ))}
                  {dashboard.technicians.length === 0 && <tr><td colSpan={6} className="cm-empty-state">No technicians added yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!loading && dashboard && activeTab === 'requests' && (
          <section className="dd-table-card lpd-panel">
            <div className="dd-toolbar lpd-toolbar">
              <div>
                <h2 className="dd-toolbar__title">Recent requests</h2>
                <p className="dd-count">Latest request activity assigned to your technicians.</p>
              </div>
            </div>
            <div className="cm-panel cm-table-wrap dd-table-wrap">
              <table className="cm-table dd-table">
                <thead>
                  <tr><th>Request</th><th>Patient</th><th>Test</th><th>Technician</th><th>Status</th><th>Requested</th></tr>
                </thead>
                <tbody>
                  {dashboard.recentRequests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.reference}</td>
                      <td>{request.patientName}</td>
                      <td>{request.testName}</td>
                      <td>{request.technicianName}</td>
                      <td><span className={statusToneClass(request.status)}>{request.status}</span></td>
                      <td>{request.requestedAt}</td>
                    </tr>
                  ))}
                  {dashboard.recentRequests.length === 0 && <tr><td colSpan={6} className="cm-empty-state">No recent requests assigned to your team yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {!isAdminPreview && showAddTech && (
        <div className="modal-overlay" onClick={() => setShowAddTech(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Add lab technician</h2>
              <button className="modal__close" onClick={() => setShowAddTech(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="form-group">
                <label>Name</label>
                <input value={techDraft.name} onChange={(event) => setTechDraft((prev) => ({ ...prev, name: event.target.value }))} />
                {fieldErrors.name && <p className="pr-field__err">{fieldErrors.name}</p>}
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={techDraft.email} onChange={(event) => setTechDraft((prev) => ({ ...prev, email: event.target.value }))} />
                {fieldErrors.email && <p className="pr-field__err">{fieldErrors.email}</p>}
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={techDraft.phone} onChange={(event) => setTechDraft((prev) => ({ ...prev, phone: event.target.value }))} />
                {fieldErrors.phone && <p className="pr-field__err">{fieldErrors.phone}</p>}
              </div>
              <div className="form-group">
                <label>Specialty</label>
                <input value={techDraft.specialty} onChange={(event) => setTechDraft((prev) => ({ ...prev, specialty: event.target.value }))} />
                {fieldErrors.specialty && <p className="pr-field__err">{fieldErrors.specialty}</p>}
              </div>
              <div className="modal__actions">
                <button className="btn btn--ghost" type="button" onClick={() => setShowAddTech(false)}>Cancel</button>
                <button className="btn btn--primary" type="button" onClick={() => { void handleAddTechnician() }} disabled={submitting}>
                  {submitting ? 'Adding…' : 'Add technician'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ProfessionalPortalShell>
  )
}

export default LabDashboardPage
