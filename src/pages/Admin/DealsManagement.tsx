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
      if (!query) {
        return matchesStatus && matchesScope
      }
      const matchesQuery = [promotion.title, promotion.targets.join(', ')]
        .some((value) => value.toLowerCase().includes(query))
      return matchesStatus && matchesScope && matchesQuery
    })
  }, [promotions, searchTerm, selectedScope, selectedStatus])

  const totalPages = Math.max(1, Math.ceil(filteredPromotions.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedPromotions = filteredPromotions.slice(startIndex, startIndex + PAGE_SIZE)

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/admin')
  }

  const openCreate = () => {
    setDraft(createBlankPromotion())
    setEditingId(null)
    setIsModalOpen(true)
  }

  const openEdit = (promotion: Promotion) => {
    setDraft({ ...promotion })
    setEditingId(promotion.id)
    setIsModalOpen(true)
  }

  const handleSave = () => {
    const trimmedTitle = draft.title.trim()
    if (!trimmedTitle) {
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
      logAdminAction({
        action: 'Edit deal',
        entity: 'Deal',
        entityId: editingId,
        detail: normalized.title,
      })
    } else {
      const newPromotion = { ...normalized, id: `promo-${Date.now()}` }
      setPromotions((prev) => [newPromotion, ...prev])
      logAdminAction({
        action: 'Create deal',
        entity: 'Deal',
        entityId: newPromotion.id,
        detail: newPromotion.title,
      })
    }

    setIsModalOpen(false)
  }

  const handleDelete = (id: string) => {
    setPromotions((prev) => prev.filter((promo) => promo.id !== id))
    logAdminAction({
      action: 'Delete deal',
      entity: 'Deal',
      entityId: id,
    })
  }

  const toggleStatus = (promotion: Promotion) => {
    const nextStatus: PromotionStatus = promotion.status === 'active' ? 'draft' : 'active'
    setPromotions((prev) =>
      prev.map((promo) =>
        promo.id === promotion.id ? { ...promo, status: nextStatus } : promo
      )
    )
    logAdminAction({
      action: 'Toggle deal status',
      entity: 'Deal',
      entityId: promotion.id,
      detail: `Set to ${nextStatus}`,
    })
  }

  const targetOptions = Array.from(
    new Set([...getTargetOptions(draft.scope), ...draft.targets])
  )

  return (
    <div className="admin-page deals-management">
      <div className="admin-page__header">
        <div>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
            Back
          </button>
          <h1>Deals & Discounts</h1>
          <p className="deals__subtitle">Create promotions that apply to products, brands, or categories.</p>
        </div>
        <button className="btn btn--primary btn--sm" type="button" onClick={openCreate}>
          Create deal
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
                    <div className="deal-subtitle">{promotion.scope === 'all' ? 'All products' : promotion.targets.join(', ')}</div>
                  </td>
                  <td className="deal-scope">{promotion.scope}</td>
                  <td>{badge}</td>
                  <td>
                    {promotion.startDate} → {promotion.endDate}
                  </td>
                  <td>
                    <span className={`deal-status deal-status--${status}`}>{status}</span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-sm btn--outline" type="button" onClick={() => openEdit(promotion)}>
                        Edit
                      </button>
                      <button className="btn-sm btn--outline" type="button" onClick={() => toggleStatus(promotion)}>
                        {promotion.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="btn-sm btn--danger" type="button" onClick={() => handleDelete(promotion.id)}>
                        Delete
                      </button>
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
          <button
            className="pagination__button"
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>{editingId ? 'Edit deal' : 'Create deal'}</h2>
              <button className="modal__close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Weekend pharmacy special"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Discount type</label>
                  <select
                    value={draft.type}
                    onChange={(event) => setDraft((prev) => ({ ...prev, type: event.target.value as PromotionType }))}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="amount">Amount (KSh)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Value</label>
                  <input
                    type="number"
                    min={1}
                    value={draft.value}
                    onChange={(event) => setDraft((prev) => ({ ...prev, value: Number(event.target.value) }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Scope</label>
                  <select
                    value={draft.scope}
                    onChange={(event) => {
                      const scope = event.target.value as PromotionScope
                      setDraft((prev) => ({ ...prev, scope, targets: scope === 'all' ? [] : prev.targets }))
                    }}
                  >
                    <option value="all">All products</option>
                    <option value="category">Category</option>
                    <option value="brand">Brand</option>
                    <option value="product">Product</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={draft.status}
                    onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value as PromotionStatus }))}
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
              {draft.scope !== 'all' && (
                <div className="form-group">
                  <label>Targets</label>
                  <select
                    multiple
                    value={draft.targets}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        targets: Array.from(event.target.selectedOptions).map((option) => option.value),
                      }))
                    }
                  >
                    {targetOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <p className="form-helper">Hold Ctrl/Cmd to select multiple.</p>
                </div>
              )}
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
                    onChange={(event) => setDraft((prev) => ({ ...prev, endDate: event.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Badge text (optional)</label>
                <input
                  type="text"
                  value={draft.badge ?? ''}
                  onChange={(event) => setDraft((prev) => ({ ...prev, badge: event.target.value }))}
                  placeholder="20% Off"
                />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn--primary btn--sm" onClick={handleSave}>
                Save deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DealsManagement
