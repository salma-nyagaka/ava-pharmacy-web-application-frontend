import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import { adminProductService, ApiBrand } from '../../services/adminProductService'
import './AdminShared.css'
import '../../styles/admin/shared/AdminButtonUtilities.css'
import '../../styles/admin/shared/AdminEntityManagement.css'
import './BrandManagement.css'

function sortBrands(items: ApiBrand[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name))
}

function BrandManagement() {
  const navigate = useNavigate()
  const [brands, setBrands] = useState<ApiBrand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ApiBrand | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formLogoFile, setFormLogoFile] = useState<File | null>(null)
  const [logoPreviewSrc, setLogoPreviewSrc] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<ApiBrand | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set())

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const results = await adminProductService.listBrands()
      setBrands(sortBrands(results))
    } catch {
      setError('Unable to load brands. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    if (!formLogoFile) {
      setLogoPreviewSrc(editing?.logo ?? null)
      return
    }

    const objectUrl = URL.createObjectURL(formLogoFile)
    setLogoPreviewSrc(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [editing, formLogoFile])

  const handleBack = () => {
    if (window.history.length > 1) { navigate(-1); return }
    navigate('/admin')
  }

  const resetForm = () => {
    setEditing(null)
    setFormName('')
    setFormDescription('')
    setFormLogoFile(null)
    setLogoPreviewSrc(null)
    setFormError('')
  }

  const openAddModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (brand: ApiBrand) => {
    setEditing(brand)
    setFormName(brand.name)
    setFormDescription(brand.description ?? '')
    setFormLogoFile(null)
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return
    resetForm()
    setShowModal(false)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()

    if (!formName.trim()) {
      setFormError('Name is required.')
      return
    }

    if (!editing && !formLogoFile) {
      setFormError('Brand logo is required.')
      return
    }

    setSaving(true)
    setFormError('')

    try {
      const trimmedName = formName.trim()
      const trimmedDescription = formDescription.trim()

      if (editing) {
        const payload =
          formLogoFile
            ? (() => {
                const formData = new FormData()
                formData.append('name', trimmedName)
                formData.append('description', trimmedDescription)
                formData.append('logo', formLogoFile)
                return formData
              })()
            : {
                name: trimmedName,
                description: trimmedDescription,
              }

        const updated = await adminProductService.updateBrand(editing.id, payload)
        setBrands((prev) => sortBrands(prev.map((brand) => (brand.id === editing.id ? updated : brand))))
      } else {
        const payload = new FormData()
        payload.append('name', trimmedName)
        if (trimmedDescription) payload.append('description', trimmedDescription)
        payload.append('logo', formLogoFile!)

        const created = await adminProductService.createBrand(payload)
        setBrands((prev) => sortBrands([...prev, created]))
      }

      resetForm()
      setShowModal(false)
    } catch (err: unknown) {
      type ApiErr = { response?: { data?: { error?: { message?: string } } } }
      setFormError((err as ApiErr)?.response?.data?.error?.message ?? 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (brand: ApiBrand) => {
    setTogglingIds((prev) => new Set(prev).add(brand.id))
    try {
      const updated = await adminProductService.updateBrand(brand.id, { is_active: !brand.is_active })
      setBrands((prev) => sortBrands(prev.map((item) => (item.id === brand.id ? updated : item))))
    } catch {
      // silent
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(brand.id)
        return next
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    setDeleteError('')
    try {
      await adminProductService.deleteBrand(deleteTarget.id)
      setBrands((prev) => prev.filter((brand) => brand.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: unknown) {
      type ApiErr = { response?: { data?: { error?: { message?: string } } } }
      setDeleteError((err as ApiErr)?.response?.data?.error?.message ?? 'Failed to delete. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return brands

    return brands.filter((brand) => (
      brand.name.toLowerCase().includes(query) ||
      brand.slug.toLowerCase().includes(query) ||
      brand.description?.toLowerCase().includes(query)
    ))
  }, [brands, search])

  const activeCount = brands.filter((brand) => brand.is_active).length
  const withLogosCount = brands.filter((brand) => Boolean(brand.logo)).length

  return (
    <div className="category-management">
      <div className="category-management__header">
        <div className="category-management__title">
          <button className="pm-back-btn" type="button" onClick={handleBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
          <div className="cm-title-group">
            <h1>Brand Management</h1>
            <p className="cm-title-sub">Create and manage catalog brands using the same admin workflow as the rest of the store.</p>
          </div>
        </div>
        <div className="category-management__actions">
          <button className="btn btn--primary btn--sm" type="button" onClick={openAddModal}>
            + Brand
          </button>
        </div>
      </div>

      <div className="cm-stat-strip">
        <div className="cm-stat-item">
          <strong className="cm-stat-item__value">{loading ? '-' : brands.length}</strong>
          <span className="cm-stat-item__label">Total</span>
        </div>
        <div className="cm-stat-divider" />
        <div className="cm-stat-item">
          <strong className="cm-stat-item__value cm-stat-item__value--green">{loading ? '-' : activeCount}</strong>
          <span className="cm-stat-item__label">Active</span>
        </div>
        <div className="cm-stat-divider" />
        <div className="cm-stat-item">
          <strong className="cm-stat-item__value">{loading ? '-' : withLogosCount}</strong>
          <span className="cm-stat-item__label">With Logo</span>
        </div>
      </div>

      <div className="cm-toolbar">
        <div className="cm-toolbar__right" style={{ marginLeft: 'auto' }}>
          <div className="cm-search-box">
            <svg className="cm-search-box__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <circle cx="9" cy="9" r="5.75" /><path d="M13.5 13.5L17 17" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Search brands..."
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
                <div className="cm-skeleton" style={{ width: '22%' }} />
                <div className="cm-skeleton" style={{ width: '30%' }} />
                <div className="cm-skeleton" style={{ width: '18%', borderRadius: '999px' }} />
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
                  <path d="M5 7.5A2.5 2.5 0 017.5 5H16a3 3 0 013 3v8.5A2.5 2.5 0 0116.5 19H8l-3 3V7.5z" />
                  <path d="M9 9h6M9 13h4" strokeLinecap="round" />
                </svg>
              </div>
              <p className="cm-empty-state__title">
                {search ? `No results for "${search}"` : 'No brands yet'}
              </p>
              <p className="cm-empty-state__sub">
                {search ? 'Try a different keyword.' : 'Add brands so products can be grouped and merchandised consistently.'}
              </p>
              {!search && (
                <button className="btn btn--primary btn--sm" type="button" onClick={openAddModal}>
                  + Add Brand
                </button>
              )}
            </div>
          ) : (
            <div className="cm-table-wrap">
              <table className="cm-table">
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th className="cm-th-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((brand) => (
                    <tr key={brand.id}>
                      <td>
                        <div className="cm-brand-identity">
                          <div className={`cm-brand-logo${brand.logo ? '' : ' cm-brand-logo--placeholder'}`}>
                            {brand.logo ? (
                              <ImageWithFallback
                                src={brand.logo}
                                alt={`${brand.name} logo`}
                                className="cm-brand-logo__img"
                              />
                            ) : (
                              <span>{brand.name.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="cm-name-cell">
                            <span className="cm-name-cell__name">{brand.name}</span>
                            <span className="cm-name-cell__id">#{brand.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {brand.description ? (
                          <span className="cm-name-cell__desc" style={{ maxWidth: 340 }}>
                            {brand.description}
                          </span>
                        ) : (
                          <span className="cm-name-cell__id">-</span>
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className={`cm-toggle${brand.is_active ? ' cm-toggle--on' : ''}`}
                          onClick={() => void handleToggle(brand)}
                          disabled={togglingIds.has(brand.id)}
                          title={brand.is_active ? 'Click to deactivate' : 'Click to activate'}
                        >
                          <span className="cm-toggle__knob" />
                        </button>
                      </td>
                      <td>
                        <div className="cm-row-actions">
                          <button
                            type="button"
                            className="cm-row-btn cm-row-btn--edit"
                            onClick={() => openEditModal(brand)}
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
                            onClick={() => { setDeleteTarget(brand); setDeleteError('') }}
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

      {showModal && (
        <div className="cm-overlay" onClick={closeModal}>
          <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal__header">
              <div>
                <h2>{editing ? 'Edit Brand' : 'New Brand'}</h2>
                <p>Keep brand names, logos, and descriptions consistent across the catalog.</p>
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
                  placeholder="e.g. Panadol"
                  disabled={saving}
                  autoFocus
                />
              </label>

              <label className="cm-field">
                <span>Description <em className="cm-field__optional">optional</em></span>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Short description visible to shoppers"
                  disabled={saving}
                  rows={3}
                />
              </label>

              <div className="cm-field">
                <span>Brand Logo {editing && <em className="cm-field__optional">optional</em>}</span>
                <input
                  id="brand-logo-input"
                  className="cm-file-input__native"
                  type="file"
                  accept="image/*"
                  onChange={(e) => { setFormLogoFile(e.currentTarget.files?.[0] ?? null); setFormError('') }}
                  disabled={saving}
                  required={!editing}
                />
                <label htmlFor="brand-logo-input" className={`cm-file-input${saving ? ' cm-file-input--disabled' : ''}`}>
                  <span className="cm-file-input__button">
                    {editing ? 'Replace logo' : 'Choose logo'}
                  </span>
                  <span className="cm-file-input__text">
                    {formLogoFile?.name ?? (editing ? 'Keep current logo' : 'No file selected')}
                  </span>
                </label>
                <p className="cm-upload-note">
                  {editing ? 'Upload a new image only if you want to replace the current logo.' : 'Upload the main logo used across the storefront.'}
                </p>
              </div>

              {logoPreviewSrc && (
                <div className="cm-brand-preview">
                  <ImageWithFallback
                    src={logoPreviewSrc}
                    alt={editing ? `${editing.name} logo preview` : 'Brand logo preview'}
                    className="cm-brand-preview__img"
                  />
                  <div className="cm-brand-preview__meta">
                    <span className="cm-brand-preview__label">{formLogoFile ? 'Selected file' : 'Current logo'}</span>
                    <span className="cm-brand-preview__name">
                      {formLogoFile?.name ?? editing?.name ?? 'Brand logo'}
                    </span>
                  </div>
                </div>
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
                <button type="button" className="btn btn--ghost btn--sm" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
                  {saving
                    ? <><span className="cm-spinner" /> Saving...</>
                    : editing ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="cm-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="cm-modal cm-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal__header cm-modal__header--danger">
              <h2>Delete Brand</h2>
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
              <p className="cm-delete-warning">Products linked to this brand may need review after deletion.</p>
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
                {deleting ? <><span className="cm-spinner cm-spinner--light" /> Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BrandManagement
