import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  adminProductService,
  ApiProductCategory,
  ApiProductSubcategory,
} from '../../services/adminProductService'
import './CategoryManagement.css'

function formatDate(value?: string): string {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

type ViewMode = 'categories' | 'subcategories'
type ModalMode = 'create-category' | 'create-subcategory' | 'edit-category' | 'edit-subcategory'

interface DeleteTarget {
  type: 'category' | 'subcategory'
  id: number
  name: string
}

function CategoryManagement() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<ApiProductCategory[]>([])
  const [subcategories, setSubcategories] = useState<ApiProductSubcategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('categories')
  const [searchTerm, setSearchTerm] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('create-category')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formParentId, setFormParentId] = useState<number | ''>('')
  const [formImageFile, setFormImageFile] = useState<File | null>(null)
  const [formImagePreview, setFormImagePreview] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  const loadAll = async () => {
    setLoading(true)
    setError('')
    try {
      const [cats, subs] = await Promise.all([
        adminProductService.listProductCategories(),
        adminProductService.listProductSubcategories(),
      ])
      setCategories(cats)
      setSubcategories(subs)
    } catch {
      setError('Unable to load categories. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadAll() }, [])

  const handleBack = () => {
    if (window.history.length > 1) { navigate(-1); return }
    navigate('/admin')
  }

  const openCreateModal = (type: 'category' | 'subcategory') => {
    setModalMode(type === 'category' ? 'create-category' : 'create-subcategory')
    setEditingId(null)
    setFormName('')
    setFormDescription('')
    setFormParentId(type === 'subcategory' && categories.length > 0 ? categories[0].id : '')
    setFormImageFile(null)
    setFormImagePreview('')
    setFormError('')
    setShowModal(true)
  }

  const openEditModal = (item: ApiProductCategory | ApiProductSubcategory, type: 'category' | 'subcategory') => {
    setModalMode(type === 'category' ? 'edit-category' : 'edit-subcategory')
    setEditingId(item.id)
    setFormName(item.name)
    setFormDescription(item.description || '')
    if (type === 'subcategory') setFormParentId((item as ApiProductSubcategory).category)
    else setFormParentId('')
    if (type === 'category') {
      setFormImageFile(null)
      setFormImagePreview((item as ApiProductCategory).image || '')
    } else {
      setFormImageFile(null)
      setFormImagePreview('')
    }
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => { if (!formSaving) setShowModal(false) }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) { setFormError('Name is required.'); return }
    const isSubcategoryModal = modalMode === 'create-subcategory' || modalMode === 'edit-subcategory'
    if (isSubcategoryModal && formParentId === '') { setFormError('Select a parent category.'); return }
    const isCategoryModal = modalMode === 'create-category' || modalMode === 'edit-category'
    if (isCategoryModal && !formDescription.trim()) { setFormError('Category description is required.'); return }
    if (isCategoryModal && modalMode === 'create-category' && !formImageFile) { setFormError('Category image is required.'); return }

    setFormSaving(true)
    setFormError('')
    try {
      if (modalMode === 'create-category') {
        const payload = new FormData()
        payload.append('name', formName.trim())
        if (formDescription.trim()) payload.append('description', formDescription.trim())
        if (formImageFile) payload.append('image', formImageFile)
        const created = await adminProductService.createProductCategory(payload)
        setCategories((prev) => [...prev, { ...created, subcategories: [] }].sort((a, b) => a.name.localeCompare(b.name)))
      } else if (modalMode === 'create-subcategory') {
        const created = await adminProductService.createProductSubcategory({
          name: formName.trim(),
          category: Number(formParentId),
          description: formDescription.trim() || undefined,
        })
        setSubcategories((prev) =>
          [...prev, created].sort((a, b) => a.category_name.localeCompare(b.category_name) || a.name.localeCompare(b.name))
        )
        setCategories((prev) =>
          prev.map((c) =>
            c.id === created.category ? { ...c, subcategories: [...c.subcategories, created] } : c
          )
        )
      } else if (modalMode === 'edit-category' && editingId !== null) {
        const payload = new FormData()
        payload.append('name', formName.trim())
        payload.append('description', formDescription.trim())
        if (formImageFile) payload.append('image', formImageFile)
        const updated = await adminProductService.updateProductCategory(editingId, payload)
        setCategories((prev) => prev.map((c) => c.id === editingId ? { ...c, ...updated } : c))
      } else if (modalMode === 'edit-subcategory' && editingId !== null) {
        const updated = await adminProductService.updateProductSubcategory(editingId, {
          name: formName.trim(),
          category: Number(formParentId),
          description: formDescription.trim(),
        })
        setSubcategories((prev) => prev.map((s) => s.id === editingId ? { ...s, ...updated } : s))
        setCategories((prev) =>
          prev.map((c) => ({
            ...c,
            subcategories: c.subcategories.map((s) => s.id === editingId ? { ...s, ...updated } : s),
          }))
        )
      }
      setShowModal(false)
      window.dispatchEvent(new Event('ava:catalog-updated'))
    } catch (err: unknown) {
      type ApiErr = { response?: { data?: { error?: { message?: string } } } }
      setFormError((err as ApiErr)?.response?.data?.error?.message ?? 'Failed to save. Please try again.')
    } finally {
      setFormSaving(false)
    }
  }

  const handleToggleActive = async (item: ApiProductCategory | ApiProductSubcategory, type: 'category' | 'subcategory') => {
    const key = `${type}-${item.id}`
    setTogglingIds((prev) => new Set(prev).add(key))
    try {
      if (type === 'category') {
        const updated = await adminProductService.updateProductCategory(item.id, { is_active: !item.is_active })
        setCategories((prev) => prev.map((c) => c.id === item.id ? { ...c, ...updated } : c))
      } else {
        const updated = await adminProductService.updateProductSubcategory(item.id, { is_active: !item.is_active })
        setSubcategories((prev) => prev.map((s) => s.id === item.id ? { ...s, ...updated } : s))
        setCategories((prev) =>
          prev.map((c) => ({
            ...c,
            subcategories: c.subcategories.map((s) => s.id === item.id ? { ...s, ...updated } : s),
          }))
        )
      }
      window.dispatchEvent(new Event('ava:catalog-updated'))
    } catch {
      // ignore
    } finally {
      setTogglingIds((prev) => { const s = new Set(prev); s.delete(key); return s })
    }
  }

  const confirmDelete = (item: ApiProductCategory | ApiProductSubcategory, type: 'category' | 'subcategory') => {
    setDeleteTarget({ type, id: item.id, name: item.name })
    setDeleteError('')
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      if (deleteTarget.type === 'category') {
        await adminProductService.deleteProductCategory(deleteTarget.id)
        setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id))
        setSubcategories((prev) => prev.filter((s) => s.category !== deleteTarget.id))
      } else {
        await adminProductService.deleteProductSubcategory(deleteTarget.id)
        setSubcategories((prev) => prev.filter((s) => s.id !== deleteTarget.id))
        setCategories((prev) =>
          prev.map((c) => ({ ...c, subcategories: c.subcategories.filter((s) => s.id !== deleteTarget.id) }))
        )
      }
      setDeleteTarget(null)
      window.dispatchEvent(new Event('ava:catalog-updated'))
    } catch (err: unknown) {
      type ApiErr = { response?: { data?: { error?: { message?: string } } } }
      setDeleteError((err as ApiErr)?.response?.data?.error?.message ?? 'Failed to delete. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const filteredCategories = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return categories
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.subcategories.some((s) => s.name.toLowerCase().includes(q))
    )
  }, [categories, searchTerm])

  const filteredSubcategories = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return subcategories
    return subcategories.filter(
      (s) => s.name.toLowerCase().includes(q) || s.category_name.toLowerCase().includes(q)
    )
  }, [subcategories, searchTerm])

  const activeCategories = categories.filter((c) => c.is_active).length
  const activeSubcategories = subcategories.filter((s) => s.is_active).length
  const visibleCount = viewMode === 'categories' ? filteredCategories.length : filteredSubcategories.length

  const isCreateMode = modalMode === 'create-category' || modalMode === 'create-subcategory'
  const isSubcategoryModal = modalMode === 'create-subcategory' || modalMode === 'edit-subcategory'

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
            <h1>Category Management</h1>
            <p className="cm-title-sub">Organize your product catalog with categories and subcategories</p>
          </div>
        </div>
        <div className="category-management__actions">
          <button className="btn btn--primary btn--sm" type="button" onClick={() => openCreateModal('category')}>
            + Category
          </button>
          <button
            className="btn btn--secondary btn--sm"
            type="button"
            onClick={() => openCreateModal('subcategory')}
            disabled={categories.length === 0}
          >
            + Subcategory
          </button>
     
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="cm-kpi-grid">
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18">
              <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" />
            </svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Total Categories</span>
            <strong className="cm-kpi-card__value">{loading ? '—' : categories.length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            </svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Total Subcategories</span>
            <strong className="cm-kpi-card__value">{loading ? '—' : subcategories.length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Active Categories</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--green">{loading ? '—' : activeCategories}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--teal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18">
              <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Active Subcategories</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--green">{loading ? '—' : activeSubcategories}</strong>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="cm-toolbar">
        <div className="cm-tabs" role="tablist">
          <button
            type="button"
            className={`cm-tab${viewMode === 'categories' ? ' cm-tab--active' : ''}`}
            onClick={() => { setViewMode('categories'); setSearchTerm('') }}
          >
            Categories
            <span className="cm-tab__count">{categories.length}</span>
          </button>
          <button
            type="button"
            className={`cm-tab${viewMode === 'subcategories' ? ' cm-tab--active' : ''}`}
            onClick={() => { setViewMode('subcategories'); setSearchTerm('') }}
          >
            Subcategories
            <span className="cm-tab__count">{subcategories.length}</span>
          </button>
        </div>

        <div className="cm-toolbar__right">
          <div className="cm-search-box">
            <svg className="cm-search-box__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <circle cx="9" cy="9" r="5.75" /><path d="M13.5 13.5L17 17" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder={viewMode === 'categories' ? 'Search categories…' : 'Search subcategories…'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="cm-search-box__clear" type="button" onClick={() => setSearchTerm('')} aria-label="Clear search">
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>
          {!loading && (
            <span className="cm-result-count">{visibleCount} result{visibleCount !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* ── Main Panel ── */}
      <div className="cm-panel">

        {error && (
          <div className="cm-error-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
            <button className="cm-error-banner__retry" type="button" onClick={() => void loadAll()}>Retry</button>
          </div>
        )}

        {loading && (
          <div className="cm-skeletons">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="cm-skeleton-row">
                <div className="cm-skeleton" style={{ width: '30%' }} />
                <div className="cm-skeleton" style={{ width: '18%' }} />
                <div className="cm-skeleton" style={{ width: '10%', borderRadius: '999px' }} />
                <div className="cm-skeleton" style={{ width: '28%' }} />
              </div>
            ))}
          </div>
        )}

        {/* ── Categories Table ── */}
        {!loading && !error && viewMode === 'categories' && (
          filteredCategories.length === 0 ? (
            <div className="cm-empty-state">
              <div className="cm-empty-state__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
                  <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" />
                </svg>
              </div>
              <p className="cm-empty-state__title">
                {searchTerm ? `No categories matching "${searchTerm}"` : 'No categories yet'}
              </p>
              <p className="cm-empty-state__sub">
                {searchTerm ? 'Try a different keyword.' : 'Create your first category to start organizing products.'}
              </p>
              {!searchTerm && (
                <button className="btn btn--primary btn--sm" type="button" onClick={() => openCreateModal('category')}>
                  + Add Category
                </button>
              )}
            </div>
          ) : (
            <div className="cm-table-wrap">
              <table className="cm-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Image</th>
                    <th>Status</th>
                    <th>Subcategories</th>
                    <th>Created At</th>
                    <th>Created By</th>
                    <th>Updated By</th>
                    <th className="cm-th-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((cat) => {
                    const preview = cat.subcategories.slice(0, 3)
                    const overflow = cat.subcategories.length - preview.length
                    const toggleKey = `category-${cat.id}`
                    return (
                      <tr key={cat.id}>
                        <td>
                          <div className="cm-name-cell">
                            <span className="cm-name-cell__name">{cat.name}</span>
                            {cat.description && (
                              <span className="cm-name-cell__desc">{cat.description}</span>
                            )}
                            <span className="cm-name-cell__id">#{cat.id}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ color: '#4b5563', fontSize: '0.875rem', lineHeight: 1.5 }}>
                            {cat.description || '—'}
                          </span>
                        </td>
                        <td>
                          {cat.image ? (
                            <a
                              href={cat.image}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#2563eb', fontSize: '0.875rem', textDecoration: 'underline' }}
                            >
                              View image
                            </a>
                          ) : (
                            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>—</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`cm-toggle${cat.is_active ? ' cm-toggle--on' : ''}`}
                            onClick={() => void handleToggleActive(cat, 'category')}
                            disabled={togglingIds.has(toggleKey)}
                            title={cat.is_active ? 'Click to deactivate' : 'Click to activate'}
                          >
                            <span className="cm-toggle__knob" />
                          </button>
                        </td>
                        <td>
                          <div className="cm-chips">
                            {cat.subcategories.length === 0 ? (
                              <span className="cm-chips__empty">None yet</span>
                            ) : (
                              <>
                                {preview.map((s) => (
                                  <span key={s.id} className={`cm-chip${s.is_active ? '' : ' cm-chip--muted'}`}>
                                    {s.name}
                                  </span>
                                ))}
                                {overflow > 0 && (
                                  <span className="cm-chip cm-chip--more">+{overflow} more</span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDate(cat.created_at)}</td>
                        <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>—</td>
                        <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>—</td>
                        <td>
                          <div className="cm-row-actions">
                            <button
                              type="button"
                              className="cm-row-btn cm-row-btn--edit"
                              onClick={() => openEditModal(cat, 'category')}
                              title="Edit category"
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
                              onClick={() => confirmDelete(cat, 'category')}
                              title="Delete category"
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── Subcategories Table ── */}
        {!loading && !error && viewMode === 'subcategories' && (
          filteredSubcategories.length === 0 ? (
            <div className="cm-empty-state">
              <div className="cm-empty-state__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                </svg>
              </div>
              <p className="cm-empty-state__title">
                {searchTerm ? `No subcategories matching "${searchTerm}"` : 'No subcategories yet'}
              </p>
              <p className="cm-empty-state__sub">
                {searchTerm ? 'Try a different keyword.' : 'Add subcategories to further organize your catalog.'}
              </p>
              {!searchTerm && (
                <button
                  className="btn btn--primary btn--sm"
                  type="button"
                  onClick={() => openCreateModal('subcategory')}
                  disabled={categories.length === 0}
                >
                  + Add Subcategory
                </button>
              )}
            </div>
          ) : (
            <div className="cm-table-wrap">
              <table className="cm-table">
                <thead>
                  <tr>
                    <th>Subcategory</th>
                    <th>Parent Category</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Created By</th>
                    <th>Updated By</th>
                    <th className="cm-th-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubcategories.map((sub) => {
                    const toggleKey = `subcategory-${sub.id}`
                    return (
                      <tr key={sub.id}>
                        <td>
                          <div className="cm-name-cell">
                            <span className="cm-name-cell__name">{sub.name}</span>
                            {sub.description && (
                              <span className="cm-name-cell__desc">{sub.description}</span>
                            )}
                            <span className="cm-name-cell__id">#{sub.id}</span>
                          </div>
                        </td>
                        <td>
                          <span className="cm-parent-badge">{sub.category_name}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`cm-toggle${sub.is_active ? ' cm-toggle--on' : ''}`}
                            onClick={() => void handleToggleActive(sub, 'subcategory')}
                            disabled={togglingIds.has(toggleKey)}
                            title={sub.is_active ? 'Click to deactivate' : 'Click to activate'}
                          >
                            <span className="cm-toggle__knob" />
                          </button>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDate(sub.created_at)}</td>
                        <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>—</td>
                        <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>—</td>
                        <td>
                          <div className="cm-row-actions">
                            <button
                              type="button"
                              className="cm-row-btn cm-row-btn--edit"
                              onClick={() => openEditModal(sub, 'subcategory')}
                              title="Edit subcategory"
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
                              onClick={() => confirmDelete(sub, 'subcategory')}
                              title="Delete subcategory"
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
                    )
                  })}
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
                <h2>
                  {isCreateMode
                    ? (isSubcategoryModal ? 'New Subcategory' : 'New Category')
                    : (isSubcategoryModal ? 'Edit Subcategory' : 'Edit Category')}
                </h2>
                <p>
                  {isSubcategoryModal
                    ? 'A subcategory belongs to a parent category.'
                    : 'Top-level grouping for your product catalog.'}
                </p>
              </div>
              <button type="button" className="cm-modal__close" onClick={closeModal} disabled={formSaving} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form className="cm-form" onSubmit={handleSubmit}>
              {isSubcategoryModal && (
                <label className="cm-field">
                  <span>Parent Category</span>
                  <select
                    value={formParentId}
                    onChange={(e) => setFormParentId(e.target.value ? Number(e.target.value) : '')}
                    disabled={formSaving}
                  >
                    {categories.length === 0 ? (
                      <option value="">No categories available — add one first</option>
                    ) : (
                      categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))
                    )}
                  </select>
                </label>
              )}

              <label className="cm-field">
                <span>Name</span>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => { setFormName(e.target.value); setFormError('') }}
                  placeholder={isSubcategoryModal ? 'e.g. Pain Relief' : 'e.g. Medicines'}
                  disabled={formSaving}
                  autoFocus
                  required
                />
              </label>

              <label className="cm-field">
                <span>Description</span>
                <textarea
                  value={formDescription}
                  onChange={(e) => { setFormDescription(e.target.value); setFormError('') }}
                  placeholder="Brief description visible to shoppers"
                  disabled={formSaving}
                  rows={2}
                  required={!isSubcategoryModal}
                />
              </label>

              {!isSubcategoryModal && (
                <label className="cm-field">
                  <span>Category Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      setFormImageFile(file)
                      setFormImagePreview(file ? URL.createObjectURL(file) : (modalMode === 'edit-category'
                        ? categories.find((category) => category.id === editingId)?.image || ''
                        : ''))
                      setFormError('')
                    }}
                    disabled={formSaving}
                    required={modalMode === 'create-category'}
                  />
                  {formImagePreview && (
                    <img
                      src={formImagePreview}
                      alt="Category preview"
                      style={{ width: '96px', height: '96px', objectFit: 'cover', borderRadius: '0.75rem', marginTop: '0.75rem', border: '1px solid #e5e7eb' }}
                    />
                  )}
                </label>
              )}

              {formError && (
                <p className="cm-form__error">
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {formError}
                </p>
              )}

              <div className="cm-modal__actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={closeModal} disabled={formSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary btn--sm" disabled={formSaving}>
                  {formSaving
                    ? <><span className="cm-spinner" /> Saving…</>
                    : isCreateMode
                      ? `Create ${isSubcategoryModal ? 'Subcategory' : 'Category'}`
                      : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="cm-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="cm-modal cm-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal__header cm-modal__header--danger">
              <h2>Delete {deleteTarget.type === 'category' ? 'Category' : 'Subcategory'}</h2>
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
              {deleteTarget.type === 'category' && (
                <p className="cm-delete-warning">All subcategories in this category will also be permanently removed.</p>
              )}
              {deleteError && (
                <p className="cm-form__error" style={{ marginTop: '0.75rem' }}>
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

export default CategoryManagement
