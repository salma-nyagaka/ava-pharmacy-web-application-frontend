import { FormEvent, useEffect, useMemo, useState } from 'react'
import { adminProductService, ApiHealthConcern } from '../../services/adminProductService'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/shared/AdminButtonUtilities.css'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/admin/HealthConcernManagement.css'

const PAGE_SIZE = 8
type SortDirection = 'asc' | 'desc'
type SortField = 'name' | 'status' | 'created_at'

function formatDate(value?: string): string {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function compareCreatedAt(left?: string, right?: string): number {
  const leftTime = left ? new Date(left).getTime() : Number.NaN
  const rightTime = right ? new Date(right).getTime() : Number.NaN
  const leftValid = Number.isFinite(leftTime)
  const rightValid = Number.isFinite(rightTime)
  if (!leftValid && !rightValid) return 0
  if (!leftValid) return 1
  if (!rightValid) return -1
  return leftTime - rightTime
}

function HealthConcernManagement() {
  const [concerns, setConcerns] = useState<ApiHealthConcern[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ApiHealthConcern | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formImageFile, setFormImageFile] = useState<File | null>(null)
  const [formImagePreview, setFormImagePreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

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

  const openAddModal = () => {
    setEditing(null)
    setFormName(''); setFormDescription('')
    setFormImageFile(null); setFormImagePreview(''); setFormError('')
    setShowModal(true)
  }

  const openEditModal = (c: ApiHealthConcern) => {
    setEditing(c)
    setFormName(c.name); setFormDescription(c.description ?? '')
    setFormImageFile(null); setFormImagePreview(c.image ?? ''); setFormError('')
    setShowModal(true)
  }

  const closeModal = () => { if (!saving) setShowModal(false) }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) { setFormError('Name is required.'); return }
    if (!editing && !formImageFile) { setFormError('Image is required.'); return }
    setSaving(true); setFormError('')
    try {
      const payload = new FormData()
      payload.append('name', formName.trim())
      payload.append('description', formDescription.trim())
      if (formImageFile) payload.append('image', formImageFile)
      if (editing) {
        const updated = await adminProductService.updateHealthConcern(editing.id, payload)
        setConcerns((prev) => prev.map((c) => (c.id === editing.id ? updated : c)))
      } else {
        const created = await adminProductService.createHealthConcern(payload)
        setConcerns((prev) => [created, ...prev])
      }
      setShowModal(false)
      window.dispatchEvent(new Event('ava:catalog-updated'))
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
      window.dispatchEvent(new Event('ava:catalog-updated'))
    } catch { /* silent */ } finally {
      setTogglingIds((prev) => { const s = new Set(prev); s.delete(c.id); return s })
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return concerns.filter((c) => {
      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'active' ? c.is_active : !c.is_active)
      if (!matchesStatus) return false
      if (!q) return true
      return c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
    })
  }, [concerns, search, selectedStatus])

  const sortedConcerns = useMemo(() => {
    const items = [...filtered]
    items.sort((left, right) => {
      let comparison = 0
      if (sortField === 'name') comparison = left.name.localeCompare(right.name)
      else if (sortField === 'status') comparison = Number(left.is_active) - Number(right.is_active)
      else comparison = compareCreatedAt(left.created_at, right.created_at)
      return sortDirection === 'asc' ? comparison : -comparison
    })
    return items
  }, [filtered, sortField, sortDirection])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedStatus, sortField, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sortedConcerns.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedConcerns = sortedConcerns.slice(startIndex, startIndex + PAGE_SIZE)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const activeCount = concerns.filter((c) => c.is_active).length
  const hasFilters = search.trim().length > 0 || selectedStatus !== 'all'

  const clearFilters = () => {
    setSearch('')
    setSelectedStatus('all')
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection(field === 'created_at' ? 'desc' : 'asc')
  }

  const sortIndicator = (field: SortField) => sortField === field ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'
  const renderSortButton = (field: SortField, label: string) => (
    <button type="button" className="cm-th-sort" onClick={() => handleSort(field)}>
      {label} {sortIndicator(field)}
    </button>
  )

  return (
    <div className="category-management hcm-page">

      {/* ── Header ── */}
      <div className="category-management__header">
        <div className="category-management__title">
          <div className="cm-title-group">
            <h1>Health Concerns</h1>
            <p className="cm-title-sub">Tag products with health concerns to help customers find what they need</p>
          </div>
        </div>
        <div className="category-management__actions">
          <button className="btn btn--primary btn--sm" type="button" onClick={openAddModal}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" strokeLinecap="round">
              <line x1="10" y1="3.5" x2="10" y2="16.5" /><line x1="3.5" y1="10" x2="16.5" y2="10" />
            </svg>
            Health Concern
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="cm-kpi-grid">
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Health Concerns</span>
            <strong className="cm-kpi-card__value">{loading ? '—' : concerns.length}</strong>
            <span className="cm-kpi-card__delta">{loading ? '' : `${activeCount} active · ${concerns.length - activeCount} inactive`}</span>
          </div>
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
          <select
            className="cm-filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'active' | 'inactive')}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {hasFilters && (
            <button className="cm-clear-filter" type="button" onClick={clearFilters}>
              Clear filters
            </button>
          )}
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
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" strokeLinecap="round">
                    <line x1="10" y1="3.5" x2="10" y2="16.5" /><line x1="3.5" y1="10" x2="16.5" y2="10" />
                  </svg>
                  Add Health Concern
                </button>
              )}
            </div>
          ) : (
            <div className="cm-table-wrap">
              <table className="cm-table health-concerns-compact-table">
                <thead>
                  <tr>
                    <th>{renderSortButton('name', 'Name')}</th>
                    <th>Image</th>
                    <th>Description</th>
                    <th>{renderSortButton('status', 'Status')}</th>
                    <th>{renderSortButton('created_at', 'Created At')}</th>
                    <th className="cm-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedConcerns.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="cm-name-cell">
                          <span className="cm-name-cell__name">{c.name}</span>
                          <span className="cm-name-cell__id">#{c.id}</span>
                        </div>
                      </td>
                      <td>
                        {c.image
                          ? <a className="cm-cell-link" href={c.image} target="_blank" rel="noreferrer">View image</a>
                          : <span className="cm-cell-muted">—</span>}
                      </td>
                      <td>
                        <span className="cm-cell-desc">
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
                      <td className="cm-cell-date">{formatDate(c.created_at)}</td>
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {!loading && !error && filtered.length > PAGE_SIZE && (
          <div className="cm-pagination">
            <span className="cm-pagination__info">
              Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="cm-pagination__controls">
              <button
                className="pagination__button"
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
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
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
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
                <span>Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null
                    setFormImageFile(file)
                    setFormImagePreview(file ? URL.createObjectURL(file) : (editing?.image ?? ''))
                  }}
                  disabled={saving}
                  required={!editing}
                />
                {formImagePreview && (
                  <img
                    src={formImagePreview}
                    alt="Preview"
                    style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '0.5rem', marginTop: '0.5rem', border: '1px solid #e5e7eb' }}
                  />
                )}
              </label>

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
    </div>
  )
}

export default HealthConcernManagement
