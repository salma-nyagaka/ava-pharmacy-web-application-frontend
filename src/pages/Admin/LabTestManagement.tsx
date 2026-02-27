import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LabCategoryDef,
  LabTest,
  loadLabCategoryDefs,
  loadLabTests,
  loadSampleTypes,
  saveLabCategoryDefs,
  saveLabTests,
  saveSampleTypes,
} from '../../data/labs'
import { logAdminAction } from '../../data/adminAudit'
import './AdminShared.css'
import './LabTestManagement.css'

const PAGE_SIZE = 8

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#dc2626', '#ea580c', '#d97706', '#65a30d', '#16a34a', '#059669', '#0d9488',
  '#0891b2', '#0284c7', '#2563eb', '#4f46e5', '#7c3aed', '#9333ea',
]

type TestDraft = {
  name: string
  category: string
  price: string
  turnaround: string
  sampleType: string
  description: string
}

const blankDraft = (test?: LabTest): TestDraft => ({
  name: test?.name ?? '',
  category: test?.category ?? '',
  price: test ? String(test.price) : '',
  turnaround: test?.turnaround ?? '',
  sampleType: test?.sampleType ?? '',
  description: test?.description ?? '',
})

const nextId = (tests: LabTest[]) => {
  const max = tests.reduce((m, t) => {
    const n = Number.parseInt(t.id.replace('LAB-T-', ''), 10)
    return Number.isFinite(n) ? Math.max(m, n) : m
  }, 0)
  return `LAB-T-${String(max + 1).padStart(3, '0')}`
}

function LabTestManagement() {
  const navigate = useNavigate()
  const [tests, setTests] = useState<LabTest[]>(() => loadLabTests())
  const [categories, setCategories] = useState<LabCategoryDef[]>(() => loadLabCategoryDefs())
  const [sampleTypes, setSampleTypes] = useState<string[]>(() => loadSampleTypes())

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TestDraft>(blankDraft)
  const [formErr, setFormErr] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<LabTest | null>(null)

  // Catalogue management modal
  const [catMgrOpen, setCatMgrOpen] = useState(false)
  const [catMgrTab, setCatMgrTab] = useState<'categories' | 'samples'>('categories')
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0])
  const [newSample, setNewSample] = useState('')

  useEffect(() => { saveLabTests(tests) }, [tests])
  useEffect(() => { saveLabCategoryDefs(categories) }, [categories])
  useEffect(() => { saveSampleTypes(sampleTypes) }, [sampleTypes])
  useEffect(() => { setPage(1) }, [search, catFilter])

  const categoryMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const c of categories) m[c.name] = c.color
    return m
  }, [categories])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tests.filter((t) => {
      if (catFilter !== 'all' && t.category !== catFilter) return false
      if (!q) return true
      return [t.id, t.name, t.description, t.sampleType].some((v) => v.toLowerCase().includes(q))
    })
  }, [tests, search, catFilter])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tests.length }
    for (const c of categories) counts[c.name] = tests.filter((t) => t.category === c.name).length
    return counts
  }, [tests, categories])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const paged = filtered.slice(start, start + PAGE_SIZE)

  const openCreate = () => {
    setEditId(null)
    setDraft({ ...blankDraft(), category: categories[0]?.name ?? '', sampleType: sampleTypes[0] ?? '' })
    setFormErr('')
    setModalOpen(true)
  }
  const openEdit = (t: LabTest) => {
    setEditId(t.id); setDraft(blankDraft(t)); setFormErr(''); setModalOpen(true)
  }

  const handleSave = () => {
    const name = draft.name.trim()
    const turnaround = draft.turnaround.trim()
    const sampleType = draft.sampleType.trim()
    const description = draft.description.trim()
    const category = draft.category.trim()
    const price = Number.parseFloat(draft.price)
    if (!name || !turnaround || !sampleType || !description || !category || !Number.isFinite(price) || price <= 0) {
      setFormErr('All fields are required. Price must be greater than 0.')
      return
    }
    const payload: LabTest = { id: editId ?? nextId(tests), name, category, price, turnaround, sampleType, description }
    if (editId) {
      setTests((p) => p.map((t) => (t.id === editId ? payload : t)))
      logAdminAction({ action: 'Edit lab test', entity: 'Lab Test', entityId: editId, detail: `${name} (${category})` })
    } else {
      setTests((p) => [payload, ...p])
      logAdminAction({ action: 'Create lab test', entity: 'Lab Test', entityId: payload.id, detail: `${name} (${category})` })
    }
    setModalOpen(false)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    setTests((p) => p.filter((t) => t.id !== deleteTarget.id))
    logAdminAction({ action: 'Delete lab test', entity: 'Lab Test', entityId: deleteTarget.id, detail: deleteTarget.name })
    setDeleteTarget(null)
  }

  const addCategory = () => {
    const name = newCatName.trim()
    if (!name || categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) return
    setCategories((p) => [...p, { name, color: newCatColor }])
    setNewCatName('')
    setNewCatColor(PRESET_COLORS[0])
  }

  const deleteCategory = (name: string) => {
    if (tests.some((t) => t.category === name)) return
    setCategories((p) => p.filter((c) => c.name !== name))
    if (catFilter === name) setCatFilter('all')
  }

  const addSampleType = () => {
    const val = newSample.trim()
    if (!val || sampleTypes.some((s) => s.toLowerCase() === val.toLowerCase())) return
    setSampleTypes((p) => [...p, val])
    setNewSample('')
  }

  const deleteSampleType = (val: string) => {
    if (tests.some((t) => t.sampleType === val)) return
    setSampleTypes((p) => p.filter((s) => s !== val))
  }

  const d = (k: keyof TestDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setDraft((p) => ({ ...p, [k]: e.target.value }))

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page__header">
        <div>
          <button className="pm-back-btn" type="button" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/admin')}>
            ← Back
          </button>
          <h1>Lab Tests</h1>
          <p className="lt-subtitle">Manage the catalogue of available diagnostic tests.</p>
        </div>
        <div className="lt-header-actions">
          <Link className="btn btn--outline btn--sm" to="/admin/lab-requests">Patient requests</Link>
          <button className="lt-icon-btn" type="button" onClick={() => setCatMgrOpen(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Categories & sample types
          </button>
          <button className="btn btn--primary" type="button" onClick={openCreate}>
            + Add lab test
          </button>
        </div>
      </div>

      {/* Category pills */}
      <div className="lt-pills">
        <button
          type="button"
          className={`lt-pill ${catFilter === 'all' ? 'lt-pill--active lt-pill--all' : ''}`}
          onClick={() => setCatFilter('all')}
        >
          <span className="lt-pill__count">{categoryCounts.all}</span>
          <span className="lt-pill__label">All</span>
        </button>
        {categories.map((cat) => (
          <button
            key={cat.name}
            type="button"
            className={`lt-pill ${catFilter === cat.name ? 'lt-pill--active' : ''}`}
            style={{ '--cat': cat.color } as React.CSSProperties}
            onClick={() => setCatFilter(cat.name)}
          >
            <span className="lt-pill__dot" />
            <span className="lt-pill__count">{categoryCounts[cat.name] ?? 0}</span>
            <span className="lt-pill__label">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Search + count */}
      <div className="lt-toolbar">
        <div className="lt-search">
          <svg className="lt-search__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="lt-search__input"
            type="text"
            placeholder="Search by name, ID, or sample type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="lt-search__clear" type="button" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        {filtered.length > 0 && (
          <span className="lt-count">
            {filtered.length === tests.length
              ? `${tests.length} test${tests.length !== 1 ? 's' : ''}`
              : `${filtered.length} of ${tests.length} tests`}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="admin-page__table">
        <table>
          <thead>
            <tr>
              <th>Test</th>
              <th>Category</th>
              <th>Sample</th>
              <th>Turnaround</th>
              <th>Price</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((t) => (
              <tr key={t.id}>
                <td className="lt-name-cell">
                  <p className="lt-name">{t.name}</p>
                  <p className="lt-id">{t.id}</p>
                  <p className="lt-desc">{t.description}</p>
                </td>
                <td>
                  <span className="lt-cat-badge" style={{ '--cat': categoryMap[t.category] ?? '#6b7280' } as React.CSSProperties}>
                    {t.category}
                  </span>
                </td>
                <td><span className="lt-sample">{t.sampleType}</span></td>
                <td>
                  <span className="lt-eta">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {t.turnaround}
                  </span>
                </td>
                <td><span className="lt-price">KSh {t.price.toLocaleString()}</span></td>
                <td>
                  <div className="lt-actions">
                    <button className="btn btn--outline btn--sm" type="button" onClick={() => openEdit(t)}>Edit</button>
                    <button className="lt-del-btn" type="button" onClick={() => setDeleteTarget(t)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="lt-empty">
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/></svg>
                    <p>No lab tests match your filters.</p>
                    {(search || catFilter !== 'all') && (
                      <button className="btn btn--outline btn--sm" type="button" onClick={() => { setSearch(''); setCatFilter('all') }}>
                        Clear filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="lt-pagination">
          <span className="lt-pagination__info">Showing {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="lt-pagination__btns">
            <button className="pagination__button" type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>Prev</button>
            <div className="pagination__pages">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} className={`pagination__page ${n === safePage ? 'pagination__page--active' : ''}`} type="button" onClick={() => setPage(n)}>{n}</button>
              ))}
            </div>
            <button className="pagination__button" type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>Next</button>
          </div>
        </div>
      )}

      {/* ── Catalogue management modal ── */}
      {catMgrOpen && (
        <div className="lt-overlay" onClick={() => setCatMgrOpen(false)}>
          <div className="lt-modal lt-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="lt-modal__header">
              <div>
                <h2>Manage catalogue</h2>
                <p className="lt-modal__sub">Add or remove categories and sample types used across lab tests.</p>
              </div>
              <button className="modal__close" type="button" onClick={() => setCatMgrOpen(false)}>×</button>
            </div>

            {/* Tabs */}
            <div className="lt-tabs">
              <button
                type="button"
                className={`lt-tab ${catMgrTab === 'categories' ? 'lt-tab--active' : ''}`}
                onClick={() => setCatMgrTab('categories')}
              >
                Categories
              </button>
              <button
                type="button"
                className={`lt-tab ${catMgrTab === 'samples' ? 'lt-tab--active' : ''}`}
                onClick={() => setCatMgrTab('samples')}
              >
                Sample types
              </button>
            </div>

            <div className="lt-modal__body">
              {catMgrTab === 'categories' && (
                <>
                  {/* Add category */}
                  <div className="lt-mgt-add-row">
                    <input
                      type="text"
                      className="lt-mgt-input"
                      placeholder="New category name…"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                    />
                    <div className="lt-color-swatches">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`lt-swatch ${newCatColor === c ? 'lt-swatch--selected' : ''}`}
                          style={{ background: c }}
                          onClick={() => setNewCatColor(c)}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={addCategory}
                      disabled={!newCatName.trim()}
                    >
                      Add
                    </button>
                  </div>

                  {/* Categories list */}
                  <div className="lt-mgt-list">
                    {categories.map((cat) => {
                      const inUse = tests.some((t) => t.category === cat.name)
                      return (
                        <div key={cat.name} className="lt-mgt-item">
                          <div className="lt-mgt-item__left">
                            <span className="lt-mgt-dot" style={{ background: cat.color }} />
                            <span className="lt-mgt-item__name">{cat.name}</span>
                            {inUse && <span className="lt-mgt-badge">{categoryCounts[cat.name]} test{categoryCounts[cat.name] !== 1 ? 's' : ''}</span>}
                          </div>
                          <button
                            type="button"
                            className="lt-mgt-del"
                            onClick={() => deleteCategory(cat.name)}
                            disabled={inUse}
                            title={inUse ? 'Remove all tests in this category first' : 'Delete category'}
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })}
                    {categories.length === 0 && (
                      <p className="lt-mgt-empty">No categories yet. Add one above.</p>
                    )}
                  </div>
                </>
              )}

              {catMgrTab === 'samples' && (
                <>
                  {/* Add sample type */}
                  <div className="lt-mgt-add-row">
                    <input
                      type="text"
                      className="lt-mgt-input"
                      placeholder="New sample type…"
                      value={newSample}
                      onChange={(e) => setNewSample(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSampleType()}
                    />
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={addSampleType}
                      disabled={!newSample.trim()}
                    >
                      Add
                    </button>
                  </div>

                  {/* Sample types list */}
                  <div className="lt-mgt-list">
                    {sampleTypes.map((s) => {
                      const inUse = tests.some((t) => t.sampleType === s)
                      return (
                        <div key={s} className="lt-mgt-item">
                          <div className="lt-mgt-item__left">
                            <span className="lt-mgt-item__name">{s}</span>
                            {inUse && <span className="lt-mgt-badge lt-mgt-badge--blue">{tests.filter((t) => t.sampleType === s).length} test{tests.filter((t) => t.sampleType === s).length !== 1 ? 's' : ''}</span>}
                          </div>
                          <button
                            type="button"
                            className="lt-mgt-del"
                            onClick={() => deleteSampleType(s)}
                            disabled={inUse}
                            title={inUse ? 'Remove all tests using this sample type first' : 'Delete'}
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })}
                    {sampleTypes.length === 0 && (
                      <p className="lt-mgt-empty">No sample types yet. Add one above.</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="lt-modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setCatMgrOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="lt-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="lt-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lt-confirm-modal__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </div>
            <h3>Delete this test?</h3>
            <p><strong>{deleteTarget.name}</strong> ({deleteTarget.id}) will be permanently removed.</p>
            <div className="lt-confirm-modal__actions">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="lt-confirm-del" type="button" onClick={confirmDelete}>Yes, delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {modalOpen && (
        <div className="lt-overlay" onClick={() => setModalOpen(false)}>
          <div className="lt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lt-modal__header">
              <div>
                <h2>{editId ? 'Edit lab test' : 'Add new lab test'}</h2>
                <p className="lt-modal__sub">
                  {editId ? `Editing ${editId}` : 'New test will appear in the catalogue immediately.'}
                </p>
              </div>
              <button className="modal__close" type="button" onClick={() => setModalOpen(false)}>×</button>
            </div>

            <div className="lt-modal__body">
              <div className="lt-form-row">
                <div className="lt-fg lt-fg--grow">
                  <label htmlFor="lt-name">Test name</label>
                  <input id="lt-name" type="text" value={draft.name} onChange={d('name')} placeholder="e.g. Complete Blood Count (CBC)" />
                </div>
                <div className="lt-fg">
                  <label htmlFor="lt-cat">Category</label>
                  <select id="lt-cat" value={draft.category} onChange={d('category')}>
                    {categories.length === 0 && <option value="">No categories — add via Manage catalogue</option>}
                    {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="lt-form-row">
                <div className="lt-fg">
                  <label htmlFor="lt-price">Price (KSh)</label>
                  <input id="lt-price" type="number" min="1" step="1" value={draft.price} onChange={d('price')} placeholder="e.g. 1500" />
                </div>
                <div className="lt-fg">
                  <label htmlFor="lt-eta">Turnaround time</label>
                  <input id="lt-eta" type="text" value={draft.turnaround} onChange={d('turnaround')} placeholder="e.g. 24 hrs" />
                </div>
                <div className="lt-fg">
                  <label htmlFor="lt-sample">Sample type</label>
                  <select id="lt-sample" value={draft.sampleType} onChange={d('sampleType')}>
                    {sampleTypes.length === 0 && <option value="">No sample types — add via Manage catalogue</option>}
                    {sampleTypes.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="lt-fg">
                <label htmlFor="lt-desc">Description</label>
                <textarea id="lt-desc" rows={3} value={draft.description} onChange={d('description')} placeholder="Short summary shown to patients and lab staff." />
              </div>

              {formErr && (
                <div className="lt-form-err">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {formErr}
                </div>
              )}
            </div>

            <div className="lt-modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn--primary btn--sm" type="button" onClick={handleSave}>
                {editId ? 'Save changes' : 'Add test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LabTestManagement
