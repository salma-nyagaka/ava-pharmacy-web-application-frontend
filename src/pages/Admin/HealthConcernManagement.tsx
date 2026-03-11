import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminProductService, ApiHealthConcern } from '../../services/adminProductService'
import '../../styles/pages/Admin/CategoryManagement.css'

function HealthConcernManagement() {
  const navigate = useNavigate()
  const [concerns, setConcerns] = useState<ApiHealthConcern[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ApiHealthConcern | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formIcon, setFormIcon] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<ApiHealthConcern | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set())

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setConcerns(await adminProductService.listHealthConcerns())
    } catch {
      setError('Unable to load health concerns. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleBack = () => {
    if (window.history.length > 1) { navigate(-1); return }
    navigate('/admin')
  }

  const openAddModal = () => {
    setEditing(null)
    setFormName(''); setFormDescription(''); setFormIcon(''); setFormError('')
    setShowModal(true)
  }

  const openEditModal = (c: ApiHealthConcern) => {
    setEditing(c)
    setFormName(c.name); setFormDescription(c.description ?? ''); setFormIcon(c.icon ?? ''); setFormError('')
    setShowModal(true)
  }

  const closeModal = () => { if (!saving) setShowModal(false) }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) { setFormError('Name is required.'); return }
    setSaving(true); setFormError('')
    try {
      if (editing) {
        const updated = await adminProductService.updateHealthConcern(editing.id, {
          name: formName.trim(), description: formDescription.trim(), icon: formIcon.trim(),
        })
        setConcerns((prev) => prev.map((c) => (c.id === editing.id ? updated : c)))
      } else {
        const created = await adminProductService.createHealthConcern({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          icon: formIcon.trim() || undefined,
        })
        setConcerns((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      }
      setShowModal(false)
    } catch (err: unknown) {
      type ApiErr = { response?: { data?: { error?: { message?: string } } } }
      setFormError((err as ApiErr)?.response?.data?.error?.message ?? 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (c: ApiHealthConcern) => {
    setTogglingIds((prev) => new Set(prev).add(c.id))
    try {
      const updated = await adminProductService.updateHealthConcern(c.id, { is_active: !c.is_active })
      setConcerns((prev) => prev.map((x) => (x.id === c.id ? updated : x)))
    } catch { /* silent */ } finally {
      setTogglingIds((prev) => { const s = new Set(prev); s.delete(c.id); return s })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError('')
    try {
      await adminProductService.deleteHealthConcern(deleteTarget.id)
      setConcerns((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: unknown) {
      type ApiErr = { response?: { data?: { error?: { message?: string } } } }
      setDeleteError((err as ApiErr)?.response?.data?.error?.message ?? 'Failed to delete. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return concerns
    return concerns.filter((c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
  }, [concerns, search])

  const activeCount = concerns.filter((c) => c.is_active).length

  return (
    <div className="category-management">

      {/* ── Header ── */}
      <div className="category-management__header">
        <div className="category-management__title">
          <button className="pm-back-btn" type="button" onClick={handleBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
          <div className="cm-title-group">
            <h1>Health Concerns</h1>
            <p className="cm-title-sub">Tag products with health concerns to help customers find what they need</p>
          </div>
        </div>
        <div className="category-management__actions">
          <button className="btn btn--primary btn--sm" type="button" onClick={openAddModal}>
            + Health Concern
          </button>
      
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="cm-stat-strip">
        <div className="cm-stat-item">
          <strong className="cm-stat-item__value">{loading ? '—' : concerns.length}</strong>
          <span className="cm-stat-item__label">Total</span>
        </div>
        <div className="cm-stat-divider" />
        <div className="cm-stat-item">
          <strong className="cm-stat-item__value cm-stat-item__value--green">{loading ? '—' : activeCount}</strong>
          <span className="cm-stat-item__label">Active</span>
        </div>
        <div className="cm-stat-divider" />
        <div className="cm-stat-item">
          <strong className="cm-stat-item__value">{loading ? '—' : concerns.length - activeCount}</strong>
          <span className="cm-stat-item__label">Inactive</span>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="cm-toolbar">
        <div className="cm-toolbar__right" style={{ marginLeft: 'auto' }}>
          <div className="cm-search-box">
            <svg className="cm-search-box__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <circle cx="9" cy="9" r="5.75" /><path d="M13.5 13.5L17 17" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Search health concerns…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="cm-search-box__clear" type="button" onClick={() => setSearch('')} aria-label="Clear">
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>
          {!loading && (
            <span className="cm-result-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* ── Panel ── */}
      <div className="cm-panel">

        {error && (
          <div className="cm-error-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
            <button className="cm-error-banner__retry" type="button" onClick={() => void load()}>Retry</button>
          </div>
        )}

        {loading && (
          <div className="cm-skeletons">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="cm-skeleton-row">
                <div className="cm-skeleton" style={{ width: '28%' }} />
                <div className="cm-skeleton" style={{ width: '8%', borderRadius: '999px' }} />
                <div className="cm-skeleton" style={{ width: '36%' }} />
                <div className="cm-skeleton" style={{ width: '10%', borderRadius: '999px' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && (
          filtered.length === 0 ? (
            <div className="cm-empty-state">
              <div className="cm-empty-state__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <p className="cm-empty-state__title">
                {search ? `No results for "${search}"` : 'No health concerns yet'}
              </p>
              <p className="cm-empty-state__sub">
                {search ? 'Try a different keyword.' : 'Add health concerns to help shoppers filter by condition.'}
              </p>
              {!search && (
                <button className="btn btn--primary btn--sm" type="button" onClick={openAddModal}>
                  + Add Health Concern
                </button>
              )}
            </div>
          ) : (
            <div className="cm-table-wrap">
              <table className="cm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Icon</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th className="cm-th-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="cm-name-cell">
                          <span className="cm-name-cell__name">{c.name}</span>
                          <span className="cm-name-cell__id">#{c.id}</span>
                        </div>
                      </td>
                      <td>
                        {c.icon
                          ? <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{c.icon}</span>
                          : <span className="cm-name-cell__id">—</span>}
                      </td>
                      <td>
                        <span className="cm-name-cell__desc" style={{ maxWidth: 340 }}>
                          {c.description || <span className="cm-name-cell__id">—</span>}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`cm-toggle${c.is_active ? ' cm-toggle--on' : ''}`}
                          onClick={() => void handleToggle(c)}
                          disabled={togglingIds.has(c.id)}
                          title={c.is_active ? 'Click to deactivate' : 'Click to activate'}
                        >
                          <span className="cm-toggle__knob" />
                        </button>
                      </td>
                      <td>
                        <div className="cm-row-actions">
                          <button
                            type="button"
                            className="cm-row-btn cm-row-btn--edit"
                            onClick={() => openEditModal(c)}
                            title="Edit"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="cm-row-btn cm-row-btn--delete"
                            onClick={() => { setDeleteTarget(c); setDeleteError('') }}
                            title="Delete"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="cm-overlay" onClick={closeModal}>
          <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal__header">
              <div>
                <h2>{editing ? 'Edit Health Concern' : 'New Health Concern'}</h2>
                <p>Tag products so shoppers can filter by health condition.</p>
              </div>
              <button type="button" className="cm-modal__close" onClick={closeModal} disabled={saving} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form className="cm-form" onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.9rem' }}>
                <label className="cm-field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => { setFormName(e.target.value); setFormError('') }}
                    placeholder="e.g. Pain Relief"
                    disabled={saving}
                    autoFocus
                  />
                </label>
                <label className="cm-field">
                  <span>Icon <em className="cm-field__optional">optional</em></span>
                  <input
                    type="text"
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    placeholder="💊"
                    disabled={saving}
                    style={{ width: 72, textAlign: 'center', fontSize: '1.25rem' }}
                  />
                </label>
              </div>

              <label className="cm-field">
                <span>Description <em className="cm-field__optional">optional</em></span>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description visible to shoppers"
                  disabled={saving}
                  rows={2}
                />
              </label>

              {formError && (
                <p className="cm-form__error">
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {formError}
                </p>
              )}

              <div className="cm-modal__actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
                  {saving
                    ? <><span className="cm-spinner" /> Saving…</>
                    : editing ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteTarget && (
        <div className="cm-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="cm-modal cm-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal__header cm-modal__header--danger">
              <h2>Delete Health Concern</h2>
              <button
                type="button"
                className="cm-modal__close"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="cm-delete-body">
              <div className="cm-delete-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <p>Delete <strong>"{deleteTarget.name}"</strong>? This action cannot be undone.</p>
              <p className="cm-delete-warning">Products tagged with this concern will have it removed.</p>
              {deleteError && (
                <p className="cm-form__error" style={{ marginTop: '0.75rem', justifyContent: 'center' }}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {deleteError}
                </p>
              )}
            </div>

            <div className="cm-modal__actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? <><span className="cm-spinner cm-spinner--light" /> Deleting…</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HealthConcernManagement
