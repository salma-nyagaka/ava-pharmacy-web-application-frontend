import { FormEvent, useEffect, useMemo, useState } from 'react'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import { saveBanners as saveLocalBanners, type Banner } from '../../data/banners'
import { adminProductService, type ApiBanner, type ApiProductCategory } from '../../services/adminProductService'
import { getImageUploadHint, validateImageFile } from '../../utils/imageUploadSpecs'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/shared/AdminButtonUtilities.css'
import '../../styles/admin/shared/AdminEntityManagement.css'

type SortField = 'title' | 'status' | 'sort_order' | 'created_at'
type SortDirection = 'asc' | 'desc'

const PAGE_SIZE = 8

function formatDate(value?: string): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getStatusClass(status: ApiBanner['status']): string {
  return status === 'active' ? 'cm-status cm-status--active' : 'cm-status cm-status--inactive'
}

function getCategoryTarget(categorySlug?: string | null): string | undefined {
  return categorySlug ? `/products?category=${encodeURIComponent(categorySlug)}` : undefined
}

function toStoredBanner(banner: ApiBanner): Banner {
  return {
    id: String(banner.id),
    title: banner.title || '',
    message: banner.message,
    link: banner.link || undefined,
    image: banner.image || null,
    category: banner.category,
    category_slug: banner.category_slug,
    category_name: banner.category_name,
    target_url: getCategoryTarget(banner.category_slug) || banner.target_url || banner.link || undefined,
    placement: banner.placement || 'home_hero',
    sort_order: banner.sort_order ?? 0,
    status: banner.status,
  }
}

function syncStorefrontBanners(items: ApiBanner[]) {
  saveLocalBanners(items.map(toStoredBanner))
  window.dispatchEvent(new Event('ava:catalog-updated'))
}

function BannerManagement() {
  const [banners, setBanners] = useState<ApiBanner[]>([])
  const [categories, setCategories] = useState<ApiProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortField, setSortField] = useState<SortField>('sort_order')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ApiBanner | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [formLink, setFormLink] = useState('')
  const [formCategoryId, setFormCategoryId] = useState<number | ''>('')
  const [formPlacement, setFormPlacement] = useState('home_hero')
  const [formSortOrder, setFormSortOrder] = useState('0')
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active')
  const [formImageFile, setFormImageFile] = useState<File | null>(null)
  const [formImagePreview, setFormImagePreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [loadedBanners, loadedCategories] = await Promise.all([
        adminProductService.listBanners(),
        adminProductService.listProductCategories(),
      ])
      setBanners(loadedBanners)
      setCategories(loadedCategories)
      syncStorefrontBanners(loadedBanners)
    } catch {
      setError('Unable to load banners. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const resetForm = () => {
    setEditing(null)
    setFormTitle('')
    setFormMessage('')
    setFormLink('')
    setFormCategoryId('')
    setFormPlacement('home_hero')
    setFormSortOrder('0')
    setFormStatus('active')
    setFormImageFile(null)
    setFormImagePreview('')
    setFormError('')
  }

  const openCreate = () => { resetForm(); setShowModal(true) }
  const openEdit = (banner: ApiBanner) => {
    setEditing(banner)
    setFormTitle(banner.title || '')
    setFormMessage(banner.message)
    setFormLink(banner.link || '')
    setFormCategoryId(banner.category || '')
    setFormPlacement(banner.placement || 'home_hero')
    setFormSortOrder(String(banner.sort_order ?? 0))
    setFormStatus(banner.status)
    setFormImagePreview(banner.image || '')
    setFormImageFile(null)
    setShowModal(true)
  }
  const closeModal = () => { if (!saving) { resetForm(); setShowModal(false) } }

  const handleImageChange = async (file: File | null) => {
    if (!file) { setFormImageFile(null); setFormImagePreview(editing?.image || ''); return }
    const validationError = await validateImageFile(file, 'banner')
    if (validationError) { setFormError(validationError); return }
    setFormImageFile(file)
    setFormImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formMessage.trim()) { setFormError('Message is required.'); return }
    if (!editing && !formImageFile) { setFormError('Banner image is required.'); return }

    setSaving(true)
    setFormError('')
    try {
      const payload = new FormData()
      if (formTitle.trim()) payload.append('title', formTitle.trim())
      payload.append('message', formMessage.trim())
      if (formLink.trim()) payload.append('link', formLink.trim())
      payload.append('category', formCategoryId === '' ? '' : String(formCategoryId))
      payload.append('placement', formPlacement.trim() || 'home_hero')
      payload.append('sort_order', String(Number(formSortOrder || 0)))
      payload.append('status', formStatus)
      if (formImageFile) payload.append('image', formImageFile)

      const saved = editing
        ? await adminProductService.updateBanner(editing.id, payload)
        : await adminProductService.createBanner(payload)

      const nextBanners = editing ? banners.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...banners]
      setBanners(nextBanners)
      syncStorefrontBanners(nextBanners)
      closeModal()
    } catch (err: unknown) {
      type ApiErr = { response?: { data?: { error?: { message?: string } } } }
      setFormError((err as ApiErr)?.response?.data?.error?.message ?? 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (banner: ApiBanner) => {
    if (!window.confirm(`Delete banner "${banner.title || banner.message.slice(0, 40)}"?`)) return
    await adminProductService.deleteBanner(banner.id)
    const nextBanners = banners.filter((item) => item.id !== banner.id)
    setBanners(nextBanners)
    syncStorefrontBanners(nextBanners)
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return banners.filter((banner) => {
      const matchesStatus = selectedStatus === 'all' || banner.status === selectedStatus
      if (!matchesStatus) return false
      if (!query) return true
      return [banner.title, banner.message, banner.link, banner.category_name, banner.placement].join(' ').toLowerCase().includes(query)
    })
  }, [banners, search, selectedStatus])

  const sorted = useMemo(() => {
    const items = [...filtered]
    items.sort((a, b) => {
      let comparison = 0
      if (sortField === 'title') comparison = a.title.localeCompare(b.title)
      else if (sortField === 'status') comparison = a.status.localeCompare(b.status)
      else if (sortField === 'sort_order') comparison = a.sort_order - b.sort_order
      else comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sortDirection === 'asc' ? comparison : -comparison
    })
    return items
  }, [filtered, sortField, sortDirection])

  useEffect(() => { setCurrentPage(1) }, [search, selectedStatus, sortField, sortDirection])
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div className="admin-page__title">
          <h1>Banners</h1>
          <p>Manage the hero banners shown on the storefront.</p>
        </div>
        <div className="admin-page__actions">
          <button className="btn btn--primary" type="button" onClick={openCreate}>Add Banner</button>
        </div>
      </div>

      {error && <div className="cm-error-banner">{error}</div>}

      <div className="admin-page__filters">
        <input className="admin-input" placeholder="Search banners..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="admin-select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select className="admin-select" value={sortField} onChange={(e) => setSortField(e.target.value as SortField)}>
          <option value="sort_order">Sort order</option>
          <option value="title">Title</option>
          <option value="status">Status</option>
          <option value="created_at">Created date</option>
        </select>
        <select className="admin-select" value={sortDirection} onChange={(e) => setSortDirection(e.target.value as SortDirection)}>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      <div className="cm-panel">
        {loading ? (
          <div className="cm-empty-state">
            <h2 className="cm-empty-state__title">Loading banners...</h2>
          </div>
        ) : pageItems.length === 0 ? (
          <div className="cm-empty-state">
            <h2 className="cm-empty-state__title">No banners found</h2>
            <p className="cm-empty-state__sub">Try adjusting your search or filters, or add a new banner.</p>
          </div>
        ) : (
          <div className="cm-table-wrap banners-table-wrap">
            <table className="cm-table banners-table">
              <thead>
                <tr>
                  <th className="banners-table__banner-col">Banner</th>
                  <th>Placement</th>
                  <th>Sort</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th className="cm-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((banner) => (
                  <tr key={banner.id}>
                    <td className="banners-table__banner-col">
                      <div className="banners-row-banner">
                        <ImageWithFallback src={banner.image || ''} alt={banner.title || banner.message} className="banners-row-banner__img" />
                        <div className="cm-name-cell banners-row-banner__copy">
                          <div className="cm-name-cell__name">{banner.title || 'Untitled banner'}</div>
                          <div className="cm-name-cell__desc banners-row-banner__message">{banner.message}</div>
                          <div className="cm-name-cell__id banners-row-banner__meta">
                            {banner.category_name ? `Category: ${banner.category_name}` : banner.target_url || banner.link || 'No link'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="cm-slug">{banner.placement}</span>
                    </td>
                    <td>{banner.sort_order}</td>
                    <td><span className={getStatusClass(banner.status)}>{banner.status}</span></td>
                    <td>{formatDate(banner.updated_at)}</td>
                    <td>
                      <div className="cm-row-actions banners-row-actions">
                        <button className="cm-row-btn btn--sm" type="button" onClick={() => openEdit(banner)}>Edit</button>
                        <button className="cm-row-btn cm-row-btn--delete btn--sm" type="button" onClick={() => void handleDelete(banner)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="cm-pagination banners-pagination">
        <button className="btn btn--outline btn--sm" type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Prev</button>
        <span>Page {currentPage} of {totalPages}</span>
        <button className="btn btn--outline btn--sm" type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>Next</button>
      </div>

      {showModal && (
        <div className="cm-overlay" onClick={closeModal}>
          <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal__header">
              <div>
                <h2>{editing ? 'Edit Banner' : 'Add Banner'}</h2>
                <p>Keep storefront banners sharp, readable, and consistent with the rest of the admin catalog.</p>
              </div>
              <button className="cm-modal__close" type="button" onClick={closeModal} disabled={saving} aria-label="Close">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="cm-form">
              <div className="cm-form-grid">
                <label className="cm-field">
                  <span>Title <em className="cm-field__optional">optional</em></span>
                  <input className="admin-input" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Seasonal offer" disabled={saving} autoFocus />
                </label>
                <label className="cm-field">
                  <span>Status</span>
                  <select className="admin-select" value={formStatus} onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')} disabled={saving}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <label className="cm-field">
                <span>Message</span>
                <textarea className="admin-textarea" rows={4} value={formMessage} onChange={(e) => setFormMessage(e.target.value)} placeholder="Short, clear message shown on the banner" disabled={saving} />
              </label>

              <div className="cm-form-grid">
                <label className="cm-field">
                  <span>Link <em className="cm-field__optional">optional</em></span>
                  <input className="admin-input" value={formLink} onChange={(e) => setFormLink(e.target.value)} placeholder="https://example.com/..." disabled={saving} />
                </label>
                <label className="cm-field">
                  <span>Product category <em className="cm-field__optional">optional</em></span>
                  <select
                    className="admin-select"
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value ? Number(e.target.value) : '')}
                    disabled={saving}
                  >
                    <option value="">Use custom link</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  <p className="cm-upload-note">
                    Selecting a category makes the banner image open that product category page.
                  </p>
                </label>
              </div>

              <div className="cm-form-grid">
                <label className="cm-field">
                  <span>Placement</span>
                  <input className="admin-input" value={formPlacement} onChange={(e) => setFormPlacement(e.target.value)} placeholder="home_hero" disabled={saving} />
                </label>
                <label className="cm-field">
                  <span>Sort order</span>
                  <input className="admin-input" type="number" min="0" value={formSortOrder} onChange={(e) => setFormSortOrder(e.target.value)} disabled={saving} />
                </label>
              </div>

              <div className="cm-form-grid">
                <div className="cm-field">
                  <span>Image</span>
                  <input
                    id="banner-image-input"
                    className="cm-file-input__native"
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleImageChange(e.currentTarget.files?.[0] ?? null)}
                    disabled={saving}
                  />
                  <label htmlFor="banner-image-input" className={`cm-file-input${saving ? ' cm-file-input--disabled' : ''}`}>
                    <span className="cm-file-input__button">
                      {editing ? 'Replace image' : 'Choose image'}
                    </span>
                    <span className="cm-file-input__text">
                      {formImageFile?.name ?? (editing ? 'Keep current image' : 'No file selected')}
                    </span>
                  </label>
                  <p className="cm-upload-note">
                    {getImageUploadHint('banner')}
                  </p>
                </div>
              </div>

              {formImagePreview && (
                <div className="cm-brand-preview">
                  <ImageWithFallback src={formImagePreview} alt="Banner preview" className="cm-brand-preview__img" />
                  <div className="cm-brand-preview__meta">
                    <span className="cm-brand-preview__label">{formImageFile ? 'Selected file' : 'Current image'}</span>
                    <span className="cm-brand-preview__name">
                      {formImageFile?.name ?? editing?.title?.trim() ?? 'Banner image'}
                    </span>
                  </div>
                </div>
              )}

              {formError && (
                <p className="cm-form__error">
                  {formError}
                </p>
              )}

              <div className="cm-modal__actions">
                <button className="btn btn--ghost btn--sm" type="button" onClick={closeModal} disabled={saving}>Cancel</button>
                <button className="btn btn--primary btn--sm" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Banner'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default BannerManagement
