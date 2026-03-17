import { useEffect, useMemo, useState } from 'react'
import {
  adminProductService,
  type ApiBrand,
  type ApiProduct,
  type ApiProductCategory,
  type ApiPromotion,
  type PromotionScope,
  type PromotionStatus,
  type PromotionType,
} from '../../services/adminProductService'
import './AdminShared.css'
import './DealsManagement.css'
import '../../styles/admin/shared/AdminEntityManagement.css'

const PAGE_SIZE = 6

const SCOPE_LABELS: Record<PromotionScope, string> = {
  all: 'All products',
  category: 'Category',
  brand: 'Brand',
  product: 'Product',
}

type PromotionDerivedStatus = 'active' | 'scheduled' | 'expired' | 'draft'

interface PromotionDraft {
  title: string
  type: PromotionType
  value: string
  scope: PromotionScope
  targets: string[]
  startDate: string
  endDate: string
  status: PromotionStatus
  description: string
  code: string
  minimumOrderAmount: string
}

interface TargetOption {
  value: string
  label: string
}

const formatDateInput = (value: Date) => value.toISOString().slice(0, 10)

const createBlankDraft = (): PromotionDraft => {
  const today = new Date()
  const nextWeek = new Date()
  nextWeek.setDate(today.getDate() + 7)

  return {
    title: '',
    type: 'percentage',
    value: '10',
    scope: 'all',
    targets: [],
    startDate: formatDateInput(today),
    endDate: formatDateInput(nextWeek),
    status: 'active',
    description: '',
    code: '',
    minimumOrderAmount: '0',
  }
}

function formatDisplayDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getPromotionStatus(promotion: Pick<ApiPromotion, 'status' | 'start_date' | 'end_date'>, now = new Date()): PromotionDerivedStatus {
  if (promotion.status === 'draft') return 'draft'
  const current = new Date(now.toISOString().slice(0, 10))
  const start = new Date(promotion.start_date)
  const end = new Date(promotion.end_date)
  if (!Number.isNaN(start.getTime()) && start > current) return 'scheduled'
  if (!Number.isNaN(end.getTime()) && end < current) return 'expired'
  return 'active'
}

function getPromotionBadge(promotion: Pick<ApiPromotion, 'badge' | 'type' | 'value'>): string {
  if (promotion.badge?.trim()) return promotion.badge.trim()
  const value = Number(promotion.value)
  return promotion.type === 'percentage' ? `${value}% Off` : `KSh ${value.toLocaleString()} Off`
}

function getDiscountPreview(type: PromotionType, rawValue: string) {
  const value = Number(rawValue)
  if (!value || value <= 0) return null
  return type === 'percentage' ? `${value}% off` : `KSh ${value.toLocaleString()} off`
}

function toDraft(promotion: ApiPromotion): PromotionDraft {
  return {
    title: promotion.title,
    type: promotion.type,
    value: String(Number(promotion.value)),
    scope: promotion.scope,
    targets: promotion.targets ?? [],
    startDate: promotion.start_date,
    endDate: promotion.end_date,
    status: promotion.status,
    description: promotion.description ?? '',
    code: promotion.code ?? '',
    minimumOrderAmount: String(Number(promotion.minimum_order_amount ?? 0)),
  }
}

function DealsManagement() {
  const [promotions, setPromotions] = useState<ApiPromotion[]>([])
  const [categories, setCategories] = useState<ApiProductCategory[]>([])
  const [brands, setBrands] = useState<ApiBrand[]>([])
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedScope, setSelectedScope] = useState<'all' | 'all-products' | PromotionScope>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | PromotionDerivedStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [draft, setDraft] = useState<PromotionDraft>(createBlankDraft())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [titleError, setTitleError] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const loadAll = async () => {
    setLoading(true)
    setError('')
    try {
      const [promotionRows, categoryRows, brandRows, productRows] = await Promise.all([
        adminProductService.listPromotions(),
        adminProductService.listProductCategories(),
        adminProductService.listBrands(),
        adminProductService.listProducts({ page_size: '250', ordering: '-created_at' }),
      ])
      setPromotions(promotionRows)
      setCategories(categoryRows)
      setBrands(brandRows)
      setProducts(productRows)
    } catch {
      setError('Unable to load deals. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedScope, selectedStatus])

  const categoryOptions = useMemo<TargetOption[]>(
    () => categories.map((category) => ({ value: category.slug, label: category.name })),
    [categories],
  )
  const brandOptions = useMemo<TargetOption[]>(
    () => brands.map((brand) => ({ value: brand.slug, label: brand.name })),
    [brands],
  )
  const productOptions = useMemo<TargetOption[]>(
    () => products.map((product) => ({
      value: product.sku || product.slug || String(product.id),
      label: product.sku ? `${product.name} (${product.sku})` : product.name,
    })),
    [products],
  )

  const lookupTargetLabel = (scope: PromotionScope, target: string) => {
    if (scope === 'category') return categoryOptions.find((option) => option.value === target)?.label ?? target
    if (scope === 'brand') return brandOptions.find((option) => option.value === target)?.label ?? target
    if (scope === 'product') return productOptions.find((option) => option.value === target)?.label ?? target
    return target
  }

  const targetOptions = useMemo(() => {
    let options: TargetOption[] = []
    if (draft.scope === 'category') options = categoryOptions
    if (draft.scope === 'brand') options = brandOptions
    if (draft.scope === 'product') options = productOptions
    const optionMap = new Map(options.map((option) => [option.value, option]))
    draft.targets.forEach((target) => {
      if (!optionMap.has(target)) optionMap.set(target, { value: target, label: target })
    })
    return Array.from(optionMap.values())
  }, [categoryOptions, brandOptions, productOptions, draft.scope, draft.targets])

  const filteredPromotions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return promotions.filter((promotion) => {
      const status = getPromotionStatus(promotion)
      const matchesStatus = selectedStatus === 'all' || status === selectedStatus
      const matchesScope =
        selectedScope === 'all' ||
        (selectedScope === 'all-products' ? promotion.scope === 'all' : promotion.scope === selectedScope)
      if (!matchesStatus || !matchesScope) return false
      if (!query) return true
      const targets = promotion.targets.map((target) => lookupTargetLabel(promotion.scope, target)).join(', ').toLowerCase()
      return `${promotion.title} ${targets}`.toLowerCase().includes(query)
    })
  }, [promotions, searchTerm, selectedScope, selectedStatus, categoryOptions, brandOptions, productOptions])

  const totalPages = Math.max(1, Math.ceil(filteredPromotions.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedPromotions = filteredPromotions.slice(startIndex, startIndex + PAGE_SIZE)
  const discountPreview = getDiscountPreview(draft.type, draft.value)

  const openCreate = () => {
    setDraft(createBlankDraft())
    setEditingId(null)
    setTitleError(false)
    setFormError('')
    setIsModalOpen(true)
  }

  const openEdit = (promotion: ApiPromotion) => {
    setDraft(toDraft(promotion))
    setEditingId(promotion.id)
    setTitleError(false)
    setFormError('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setIsModalOpen(false)
    setFormError('')
    setTitleError(false)
  }

  const toggleTarget = (target: string) => {
    setDraft((prev) => ({
      ...prev,
      targets: prev.targets.includes(target)
        ? prev.targets.filter((item) => item !== target)
        : [...prev.targets, target],
    }))
  }

  const handleSave = async () => {
    const trimmedTitle = draft.title.trim()
    if (!trimmedTitle) {
      setTitleError(true)
      return
    }
    if (draft.scope !== 'all' && draft.targets.length === 0) {
      setFormError(`Select at least one ${SCOPE_LABELS[draft.scope].toLowerCase()} target.`)
      return
    }
    if (!draft.startDate || !draft.endDate) {
      setFormError('Start date and end date are required.')
      return
    }
    if (draft.endDate < draft.startDate) {
      setFormError('End date cannot be earlier than the start date.')
      return
    }
    const value = Number(draft.value)
    if (!value || value <= 0) {
      setFormError('Discount value must be greater than 0.')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      const payload = {
        title: trimmedTitle,
        type: draft.type,
        value,
        scope: draft.scope,
        targets: draft.scope === 'all' ? [] : draft.targets,
        start_date: draft.startDate,
        end_date: draft.endDate,
        status: draft.status,
        code: draft.code.trim() || undefined,
        description: draft.description.trim() || undefined,
        minimum_order_amount: Math.max(0, Number(draft.minimumOrderAmount) || 0),
      }

      if (editingId !== null) {
        const updated = await adminProductService.updatePromotion(editingId, payload)
        setPromotions((prev) => prev.map((promotion) => (promotion.id === editingId ? updated : promotion)))
      } else {
        const created = await adminProductService.createPromotion(payload)
        setPromotions((prev) => [created, ...prev])
      }

      setIsModalOpen(false)
    } catch (err: unknown) {
      type ApiErr = { response?: { data?: { error?: { message?: string } } } }
      setFormError((err as ApiErr)?.response?.data?.error?.message ?? 'Failed to save the deal. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (confirmDeleteId === null) return
    try {
      await adminProductService.deletePromotion(confirmDeleteId)
      setPromotions((prev) => prev.filter((promotion) => promotion.id !== confirmDeleteId))
      setConfirmDeleteId(null)
    } catch {
      setFormError('Failed to delete the deal. Please try again.')
    }
  }

  const toggleStatus = async (promotion: ApiPromotion) => {
    const nextStatus: PromotionStatus = promotion.status === 'active' ? 'draft' : 'active'
    try {
      const updated = await adminProductService.updatePromotion(promotion.id, { status: nextStatus })
      setPromotions((prev) => prev.map((item) => (item.id === promotion.id ? updated : item)))
    } catch {
      setError('Failed to update deal status. Please try again.')
    }
  }

  return (
    <div className="category-management admin-page deals-management">
      <div className="category-management__header">
        <div className="cm-title-group">
          <h1>Deals & Discounts</h1>
          <p className="cm-title-sub">Create promotions that apply to products, brands, or categories.</p>
        </div>
        <div className="category-management__actions">
          <button className="btn btn--primary btn--sm" type="button" onClick={openCreate}>
            + Create deal
          </button>
        </div>
      </div>

      {error && (
        <div className="cm-error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button className="cm-error-banner__retry" type="button" onClick={() => void loadAll()}>Retry</button>
        </div>
      )}

      <div className="cm-kpi-grid">
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="m21 12-9 9-9-9V3h9l9 9Z"/><circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Total Deals</span>
            <strong className="cm-kpi-card__value">{promotions.length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Active</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--green">{promotions.filter(p => getPromotionStatus(p) === 'active').length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Scheduled</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--purple">{promotions.filter(p => getPromotionStatus(p) === 'scheduled').length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Expired</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--amber">{promotions.filter(p => getPromotionStatus(p) === 'expired').length}</strong>
          </div>
        </div>
      </div>

      <div className="cm-toolbar">
        <div className="cm-search-box">
          <svg className="cm-search-box__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <circle cx="9" cy="9" r="5.75" /><path d="M13.5 13.5L17 17" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Search deals…"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {searchTerm && (
            <button className="cm-search-box__clear" type="button" onClick={() => setSearchTerm('')} aria-label="Clear search">
              <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          )}
        </div>
        <div className="cm-toolbar__right">
          <select className="cm-filter-select" value={selectedScope} onChange={(event) => setSelectedScope(event.target.value as PromotionScope | 'all' | 'all-products')}>
            <option value="all">All scopes</option>
            <option value="all-products">All products</option>
            <option value="category">Category</option>
            <option value="brand">Brand</option>
            <option value="product">Product</option>
          </select>
          <select className="cm-filter-select" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as typeof selectedStatus)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      <div className="cm-panel">
        {loading && (
          <div className="cm-skeletons">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="cm-skeleton-row">
                <div className="cm-skeleton" style={{ width: '28%' }} />
                <div className="cm-skeleton" style={{ width: '12%', borderRadius: '999px' }} />
                <div className="cm-skeleton" style={{ width: '18%' }} />
                <div className="cm-skeleton" style={{ width: '22%' }} />
              </div>
            ))}
          </div>
        )}
        {!loading && filteredPromotions.length === 0 && (
          <div className="cm-empty-state">
            <div className="cm-empty-state__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
                <path d="m21 12-9 9-9-9V3h9l9 9Z" /><circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <p className="cm-empty-state__title">No deals match your filters.</p>
            <p className="cm-empty-state__sub">Try adjusting your search or create a new deal.</p>
          </div>
        )}
        {!loading && filteredPromotions.length > 0 && (
          <div className="cm-table-wrap">
            <table className="cm-table">
              <thead>
                <tr>
                  <th>Deal</th>
                  <th>Scope</th>
                  <th>Discount</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Created By</th>
                  <th>Updated By</th>
                  <th className="cm-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedPromotions.map((promotion) => {
                  const status = getPromotionStatus(promotion)
                  const badge = getPromotionBadge(promotion)
                  const targetLabels = promotion.targets.map((target) => lookupTargetLabel(promotion.scope, target))
                  return (
                    <tr key={promotion.id}>
                      <td>
                        <div className="cm-name-cell">
                          <span className="cm-name-cell__name">{promotion.title}</span>
                          {promotion.code && <span className="cm-name-cell__id">Code: {promotion.code}</span>}
                          {targetLabels.length > 0 && (
                            <span className="cm-name-cell__id">
                              {targetLabels.length <= 2
                                ? targetLabels.join(', ')
                                : `${targetLabels.slice(0, 2).join(', ')} +${targetLabels.length - 2} more`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="cm-chip">{SCOPE_LABELS[promotion.scope] ?? promotion.scope}</span>
                      </td>
                      <td>{badge}</td>
                      <td>
                        <div className="cm-name-cell">
                          <span className="cm-name-cell__name">{formatDisplayDate(promotion.start_date)}</span>
                          <span className="cm-name-cell__id">to {formatDisplayDate(promotion.end_date)}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`cm-status ${status === 'active' ? 'cm-status--active' : status === 'scheduled' ? 'cm-status--scheduled' : 'cm-status--inactive'}`}>
                          {status}
                        </span>
                      </td>
                      <td style={{ color: '#6b7280' }}>{formatDisplayDate(promotion.created_at)}</td>
                      <td style={{ color: '#6b7280' }}>—</td>
                      <td style={{ color: '#6b7280' }}>—</td>
                      <td>
                        <div className="cm-row-actions">
                          <button type="button" className="cm-row-btn cm-row-btn--edit" onClick={() => openEdit(promotion)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit
                          </button>
                          <button type="button" className="cm-row-btn" onClick={() => void toggleStatus(promotion)}>
                            {promotion.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button type="button" className="cm-row-btn cm-row-btn--delete" onClick={() => setConfirmDeleteId(promotion.id)}>
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
        )}

        {filteredPromotions.length > PAGE_SIZE && (
          <div className="cm-pagination">
            <span className="cm-pagination__info">
              Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredPromotions.length)} of {filteredPromotions.length}
            </span>
            <div className="cm-pagination__controls">
              <button className="pagination__button" type="button" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>Prev</button>
              <div className="pagination__pages">
                {Array.from({ length: totalPages }, (_, index) => {
                  const page = index + 1
                  return (
                    <button key={page} className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`} type="button" onClick={() => setCurrentPage(page)}>
                      {page}
                    </button>
                  )
                })}
              </div>
              <button className="pagination__button" type="button" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>Next</button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="dm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>{editingId ? 'Edit deal' : 'Create deal'}</h2>
              <button className="modal__close" type="button" onClick={closeModal}>×</button>
            </div>
            <div className="modal__content">
              <div className="form-group">
                <label>Title <span className="dm-required">Required</span></label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) => { setDraft((prev) => ({ ...prev, title: event.target.value })); setTitleError(false); setFormError('') }}
                  placeholder="e.g. Weekend pharmacy special"
                  style={{ borderColor: titleError ? '#dc2626' : undefined }}
                />
                {titleError && <p className="dm-field-error">Title is required.</p>}
              </div>

              <div className="dm-section-label">Discount</div>
              <div className="dm-discount-row">
                <div className="form-group">
                  <label>Type</label>
                  <select value={draft.type} onChange={(event) => setDraft((prev) => ({ ...prev, type: event.target.value as PromotionType }))}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="amount">Fixed amount (KSh)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Value</label>
                  <div className="dm-value-wrap">
                    <input type="number" min={1} value={draft.value} onChange={(event) => setDraft((prev) => ({ ...prev, value: event.target.value }))} />
                    <span className="dm-value-unit">{draft.type === 'percentage' ? '%' : 'KSh'}</span>
                  </div>
                </div>
                {discountPreview && <div className="dm-preview-pill">Badge: {discountPreview}</div>}
              </div>

              <div className="dm-section-label">Applies to</div>
              <div className="dm-scope-pills">
                {(['all', 'category', 'brand', 'product'] as PromotionScope[]).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    className={`dm-scope-pill ${draft.scope === scope ? 'dm-scope-pill--active' : ''}`}
                    onClick={() => setDraft((prev) => ({ ...prev, scope, targets: scope === 'all' ? [] : prev.targets }))}
                  >
                    {SCOPE_LABELS[scope]}
                  </button>
                ))}
              </div>

              {draft.scope !== 'all' && (
                <div className="form-group">
                  <label>{SCOPE_LABELS[draft.scope]}s <span className="dm-hint">- select one or more</span></label>
                  <div className="dm-target-pills">
                    {targetOptions.map((target) => (
                      <button
                        key={target.value}
                        type="button"
                        className={`dm-target-pill ${draft.targets.includes(target.value) ? 'dm-target-pill--active' : ''}`}
                        onClick={() => toggleTarget(target.value)}
                      >
                        {draft.targets.includes(target.value) ? '✓ ' : ''}{target.label}
                      </button>
                    ))}
                  </div>
                  {draft.targets.length > 0 && <p className="dm-selected-hint">{draft.targets.length} selected</p>}
                </div>
              )}

              <div className="dm-section-label">Schedule</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start date</label>
                  <input type="date" value={draft.startDate} onChange={(event) => setDraft((prev) => ({ ...prev, startDate: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>End date</label>
                  <input type="date" value={draft.endDate} min={draft.startDate} onChange={(event) => setDraft((prev) => ({ ...prev, endDate: event.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label>Description <span className="dm-hint">Optional</span></label>
                <textarea value={draft.description} onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))} placeholder="Internal notes or customer-facing deal summary" rows={3} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Code <span className="dm-hint">Optional</span></label>
                  <input type="text" value={draft.code} onChange={(event) => setDraft((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))} placeholder="e.g. WEEKEND15" />
                </div>
                <div className="form-group">
                  <label>Minimum order amount</label>
                  <input type="number" min={0} value={draft.minimumOrderAmount} onChange={(event) => setDraft((prev) => ({ ...prev, minimumOrderAmount: event.target.value }))} />
                </div>
              </div>

              {!editingId && (
                <div className="form-group">
                  <label>Publish as</label>
                  <div className="dm-status-toggle">
                    <button type="button" className={`dm-status-btn ${draft.status === 'active' ? 'dm-status-btn--active' : ''}`} onClick={() => setDraft((prev) => ({ ...prev, status: 'active' }))}>
                      Active
                    </button>
                    <button type="button" className={`dm-status-btn ${draft.status === 'draft' ? 'dm-status-btn--draft' : ''}`} onClick={() => setDraft((prev) => ({ ...prev, status: 'draft' }))}>
                      Save as draft
                    </button>
                  </div>
                </div>
              )}

              {formError && <p className="dm-field-error">{formError}</p>}
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={closeModal}>Cancel</button>
              <button className="btn btn--primary btn--sm" type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : draft.status === 'draft' ? 'Save draft' : 'Publish deal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId !== null && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Delete deal</h2>
              <button className="modal__close" type="button" onClick={() => setConfirmDeleteId(null)}>×</button>
            </div>
            <div className="modal__content">
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
                This will permanently delete <strong>{promotions.find((promotion) => promotion.id === confirmDeleteId)?.title ?? 'this deal'}</strong>. This cannot be undone.
              </p>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setConfirmDeleteId(null)}>Keep deal</button>
              <button className="btn btn--sm dm-btn--delete" type="button" onClick={() => void confirmDelete()}>Delete deal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DealsManagement
