import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Promotion,
  PromotionScope,
  PromotionStatus,
  PromotionType,
  getPromotionBadge,
  getPromotionStatus,
  loadPromotions,
  savePromotions,
} from '../../data/promotions'
import { logAdminAction } from '../../data/adminAudit'
import './AdminShared.css'
import './DealsManagement.css'

const categoryOptions = [
  'Health & Wellness',
  'Beauty & Skincare',
  'Mother & Baby Care',
  'Self-Care & Lifestyle',
]

const brandOptions = [
  'HealthPlus',
  'MedTech',
  'SkinGlow',
  'NutraLife',
  'CleanGuard',
  'VitaMax',
  'BabyCare',
  'MediRelief',
]

const productOptions = [
  'Vitamin C 1000mg Tablets',
  'Digital Blood Pressure Monitor',
  'Moisturizing Face Cream 50ml',
  'Omega-3 Fish Oil Capsules',
  'Hand Sanitizer 500ml',
  'Multivitamin Complex Tablets',
  'Infrared Thermometer',
  'Baby Diapers Pack of 60',
  'Pain Relief Gel 100g',
]

const PAGE_SIZE = 6

const SCOPE_LABELS: Record<string, string> = {
  all: 'All products',
  category: 'Category',
  brand: 'Brand',
  product: 'Product',
}

const getTargetOptions = (scope: PromotionScope) => {
  if (scope === 'category') return categoryOptions
  if (scope === 'brand') return brandOptions
  if (scope === 'product') return productOptions
  return []
}

const createBlankPromotion = (): Promotion => {
  const today = new Date()
  const nextWeek = new Date()
  nextWeek.setDate(today.getDate() + 7)
  const formatDate = (value: Date) => value.toISOString().slice(0, 10)
  return {
    id: '',
    title: '',
    type: 'percentage',
    value: 10,
    scope: 'all',
    targets: [],
    startDate: formatDate(today),
    endDate: formatDate(nextWeek),
    status: 'active',
  }
}

function getDiscountPreview(type: PromotionType, value: number) {
  if (!value || value <= 0) return null
  return type === 'percentage' ? `${value}% off` : `KSh ${value.toLocaleString()} off`
}

function DealsManagement() {
  const navigate = useNavigate()
  const [promotions, setPromotions] = useState<Promotion[]>(() => loadPromotions())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedScope, setSelectedScope] = useState<'all' | 'all-products' | PromotionScope>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'draft' | 'scheduled' | 'expired'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [draft, setDraft] = useState<Promotion>(createBlankPromotion())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [titleError, setTitleError] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    savePromotions(promotions)
  }, [promotions])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedScope, selectedStatus])

  const filteredPromotions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return promotions.filter((promotion) => {
      const status = getPromotionStatus(promotion)
      const matchesStatus = selectedStatus === 'all' || status === selectedStatus
      const matchesScope =
        selectedScope === 'all' ||
        (selectedScope === 'all-products' ? promotion.scope === 'all' : promotion.scope === selectedScope)
      if (!query) return matchesStatus && matchesScope
      const matchesQuery = [promotion.title, promotion.targets.join(', ')]
        .some((value) => value.toLowerCase().includes(query))
      return matchesStatus && matchesScope && matchesQuery
    })
  }, [promotions, searchTerm, selectedScope, selectedStatus])

  const totalPages = Math.max(1, Math.ceil(filteredPromotions.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedPromotions = filteredPromotions.slice(startIndex, startIndex + PAGE_SIZE)

  const handleBack = () => {
    if (window.history.length > 1) { navigate(-1); return }
    navigate('/admin')
  }

  const openCreate = () => {
    setDraft(createBlankPromotion())
    setEditingId(null)
    setTitleError(false)
    setIsModalOpen(true)
  }

  const openEdit = (promotion: Promotion) => {
    setDraft({ ...promotion })
    setEditingId(promotion.id)
    setTitleError(false)
    setIsModalOpen(true)
  }

  const handleSave = () => {
    const trimmedTitle = draft.title.trim()
    if (!trimmedTitle) {
      setTitleError(true)
      return
    }
    const normalized: Promotion = {
      ...draft,
      title: trimmedTitle,
      targets: draft.scope === 'all' ? [] : draft.targets.filter(Boolean),
      badge: draft.badge?.trim() || undefined,
    }
    if (editingId) {
      setPromotions((prev) => prev.map((promo) => (promo.id === editingId ? normalized : promo)))
      logAdminAction({ action: 'Edit deal', entity: 'Deal', entityId: editingId, detail: normalized.title })
    } else {
      const newPromotion = { ...normalized, id: `promo-${Date.now()}` }
      setPromotions((prev) => [newPromotion, ...prev])
      logAdminAction({ action: 'Create deal', entity: 'Deal', entityId: newPromotion.id, detail: newPromotion.title })
    }
    setIsModalOpen(false)
  }

  const confirmDelete = () => {
    if (!confirmDeleteId) return
    setPromotions((prev) => prev.filter((promo) => promo.id !== confirmDeleteId))
    logAdminAction({ action: 'Delete deal', entity: 'Deal', entityId: confirmDeleteId })
    setConfirmDeleteId(null)
  }

  const toggleStatus = (promotion: Promotion) => {
    const nextStatus: PromotionStatus = promotion.status === 'active' ? 'draft' : 'active'
    setPromotions((prev) =>
      prev.map((promo) => promo.id === promotion.id ? { ...promo, status: nextStatus } : promo)
    )
    logAdminAction({ action: 'Toggle deal status', entity: 'Deal', entityId: promotion.id, detail: `Set to ${nextStatus}` })
  }

  const toggleTarget = (target: string) => {
    setDraft((prev) => ({
      ...prev,
      targets: prev.targets.includes(target)
        ? prev.targets.filter((t) => t !== target)
        : [...prev.targets, target],
    }))
  }

  const targetOptions = Array.from(new Set([...getTargetOptions(draft.scope), ...draft.targets]))
  const discountPreview = getDiscountPreview(draft.type, draft.value)

  return (
    <div className="admin-page deals-management">
      <div className="admin-page__header">
        <div>
          <button className="pm-back-btn" type="button" onClick={handleBack}>← Back</button>
          <h1>Deals & Discounts</h1>
          <p className="deals__subtitle">Create promotions that apply to products, brands, or categories.</p>
        </div>
        <button className="btn btn--primary btn--sm" type="button" onClick={openCreate}>
          + Create deal
        </button>
      </div>

      <div className="admin-page__filters">
        <input
          type="text"
          placeholder="Search deals..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select value={selectedScope} onChange={(event) => setSelectedScope(event.target.value as PromotionScope | 'all' | 'all-products')}>
          <option value="all">All scopes</option>
          <option value="all-products">All products</option>
          <option value="category">Category</option>
          <option value="brand">Brand</option>
          <option value="product">Product</option>
        </select>
        <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as typeof selectedStatus)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="expired">Expired</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="admin-page__table">
        <table>
          <thead>
            <tr>
              <th>Deal</th>
              <th>Scope</th>
              <th>Discount</th>
              <th>Schedule</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedPromotions.map((promotion) => {
              const status = getPromotionStatus(promotion)
              const badge = getPromotionBadge(promotion)
              return (
                <tr key={promotion.id}>
                  <td>
                    <div className="deal-title">{promotion.title}</div>
                    {promotion.targets.length > 0 && (
                      <div className="deal-subtitle">
                        {promotion.targets.length <= 2
                          ? promotion.targets.join(', ')
                          : `${promotion.targets.slice(0, 2).join(', ')} +${promotion.targets.length - 2} more`}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="deal-scope-tag">{SCOPE_LABELS[promotion.scope] ?? promotion.scope}</span>
                  </td>
                  <td>
                    <span className="deal-discount-badge">{badge}</span>
                  </td>
                  <td className="deal-schedule">
                    <span>{promotion.startDate}</span>
                    <span className="deal-schedule__arrow">→</span>
                    <span>{promotion.endDate}</span>
                  </td>
                  <td>
                    <span className={`deal-status deal-status--${status}`}>{status}</span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-sm btn--outline" type="button" onClick={() => openEdit(promotion)}>Edit</button>
                      <button className="btn-sm btn--outline" type="button" onClick={() => toggleStatus(promotion)}>
                        {promotion.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="btn-sm btn--danger-soft" type="button" onClick={() => setConfirmDeleteId(promotion.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredPromotions.length === 0 && (
              <tr>
                <td colSpan={6} className="deals-empty">No deals match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredPromotions.length > 0 && (
        <div className="deals-pagination">
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
      )}

      {/* Create / Edit modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="dm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>{editingId ? 'Edit deal' : 'Create deal'}</h2>
              <button className="modal__close" type="button" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <div className="modal__content">

              {/* Title */}
              <div className="form-group">
                <label>Title <span className="dm-required">Required</span></label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) => { setDraft((prev) => ({ ...prev, title: event.target.value })); setTitleError(false) }}
                  placeholder="e.g. Weekend pharmacy special"
                  style={{ borderColor: titleError ? '#dc2626' : undefined }}
                />
                {titleError && <p className="dm-field-error">Title is required.</p>}
              </div>

              {/* Discount type + value */}
              <div className="dm-section-label">Discount</div>
              <div className="dm-discount-row">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={draft.type}
                    onChange={(event) => setDraft((prev) => ({ ...prev, type: event.target.value as PromotionType }))}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="amount">Fixed amount (KSh)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Value</label>
                  <div className="dm-value-wrap">
                    <input
                      type="number"
                      min={1}
                      value={draft.value}
                      onChange={(event) => setDraft((prev) => ({ ...prev, value: Number(event.target.value) }))}
                    />
                    <span className="dm-value-unit">{draft.type === 'percentage' ? '%' : 'KSh'}</span>
                  </div>
                </div>
                {discountPreview && (
                  <div className="dm-preview-pill">{discountPreview}</div>
                )}
              </div>

              {/* Scope */}
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

              {/* Targets */}
              {draft.scope !== 'all' && (
                <div className="form-group">
                  <label>{SCOPE_LABELS[draft.scope]}s <span className="dm-hint">— select one or more</span></label>
                  <div className="dm-target-pills">
                    {targetOptions.map((target) => (
                      <button
                        key={target}
                        type="button"
                        className={`dm-target-pill ${draft.targets.includes(target) ? 'dm-target-pill--active' : ''}`}
                        onClick={() => toggleTarget(target)}
                      >
                        {draft.targets.includes(target) ? '✓ ' : ''}{target}
                      </button>
                    ))}
                  </div>
                  {draft.targets.length > 0 && (
                    <p className="dm-selected-hint">{draft.targets.length} selected</p>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="dm-section-label">Schedule</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start date</label>
                  <input
                    type="date"
                    value={draft.startDate}
                    onChange={(event) => setDraft((prev) => ({ ...prev, startDate: event.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>End date</label>
                  <input
                    type="date"
                    value={draft.endDate}
                    min={draft.startDate}
                    onChange={(event) => setDraft((prev) => ({ ...prev, endDate: event.target.value }))}
                  />
                </div>
              </div>

              {/* Badge */}
              <div className="form-group">
                <label>Badge text <span className="dm-hint">Optional — shown on product cards</span></label>
                <div className="dm-badge-row">
                  <input
                    type="text"
                    value={draft.badge ?? ''}
                    onChange={(event) => setDraft((prev) => ({ ...prev, badge: event.target.value }))}
                    placeholder="e.g. 20% Off"
                  />
                  {draft.badge?.trim() && (
                    <span className="dm-badge-preview">{draft.badge.trim()}</span>
                  )}
                </div>
              </div>

              {/* Status toggle — only when creating; editing uses table toggle */}
              {!editingId && (
                <div className="form-group">
                  <label>Publish as</label>
                  <div className="dm-status-toggle">
                    <button
                      type="button"
                      className={`dm-status-btn ${draft.status === 'active' ? 'dm-status-btn--active' : ''}`}
                      onClick={() => setDraft((prev) => ({ ...prev, status: 'active' }))}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      className={`dm-status-btn ${draft.status === 'draft' ? 'dm-status-btn--draft' : ''}`}
                      onClick={() => setDraft((prev) => ({ ...prev, status: 'draft' }))}
                    >
                      Save as draft
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn--primary btn--sm" type="button" onClick={handleSave}>
                {editingId ? 'Save changes' : draft.status === 'draft' ? 'Save draft' : 'Publish deal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Delete deal</h2>
              <button className="modal__close" type="button" onClick={() => setConfirmDeleteId(null)}>×</button>
            </div>
            <div className="modal__content">
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
                This will permanently delete <strong>{promotions.find((p) => p.id === confirmDeleteId)?.title ?? 'this deal'}</strong>. This cannot be undone.
              </p>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" type="button" onClick={() => setConfirmDeleteId(null)}>Keep deal</button>
              <button className="btn btn--sm dm-btn--delete" type="button" onClick={confirmDelete}>Delete deal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DealsManagement
