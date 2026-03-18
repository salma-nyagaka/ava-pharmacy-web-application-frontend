import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminProductService, ApiInventoryProduct } from '../../services/adminProductService'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/InventoryManagement.css'
import '../../styles/admin/shared/AdminEntityManagement.css'

const PAGE_SIZE = 10

type StockStatus = 'In Stock' | 'Low' | 'Backorder' | 'Out'
type SortField = 'created_at' | 'created_by_name' | 'branch_stock' | 'warehouse_stock' | 'total_stock'
type SortDirection = 'asc' | 'desc'

function getInventoryItem(product: ApiInventoryProduct, location: 'branch' | 'warehouse') {
  return product.inventories?.find((inventory) => inventory.location === location)
}

function getInventoryQuantity(product: ApiInventoryProduct, location: 'branch' | 'warehouse') {
  return getInventoryItem(product, location)?.stock_quantity ?? 0
}

function getInventoryThreshold(product: ApiInventoryProduct, location: 'branch' | 'warehouse') {
  return getInventoryItem(product, location)?.low_stock_threshold ?? 0
}

function getInventoryAllowBackorder(product: ApiInventoryProduct, location: 'branch' | 'warehouse') {
  return getInventoryItem(product, location)?.allow_backorder ?? false
}

function getInventoryMaxBackorder(product: ApiInventoryProduct, location: 'branch' | 'warehouse') {
  return getInventoryItem(product, location)?.max_backorder_quantity ?? 0
}

function getStockStatus(product: ApiInventoryProduct): StockStatus {
  if (product.stock_quantity === 0) return product.allow_backorder ? 'Backorder' : 'Out'
  if (product.stock_quantity <= product.low_stock_threshold) return 'Low'
  return 'In Stock'
}

function formatStockSource(value: ApiInventoryProduct['stock_source']): string {
  if (value === 'branch') return 'Main Shop'
  if (value === 'warehouse') return 'POS Store'
  return 'Out of Stock'
}

function formatBackorderSummary(product: ApiInventoryProduct): string {
  const parts = [
    getInventoryAllowBackorder(product, 'branch') ? `Main Shop · Max ${getInventoryMaxBackorder(product, 'branch')}` : null,
    getInventoryAllowBackorder(product, 'warehouse') ? `POS Store · Max ${getInventoryMaxBackorder(product, 'warehouse')}` : null,
  ].filter((value): value is string => Boolean(value))

  return parts.length > 0 ? parts.join(' · ') : 'No'
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function formatPosSync(product: ApiInventoryProduct): string {
  const posInventory = getInventoryItem(product, 'warehouse')
  if (!posInventory) return 'Not synced'
  const sourceName = posInventory.source_name || 'POS Store'
  if (!posInventory.is_pos_synced && !posInventory.last_synced_at) {
    return sourceName === 'POS Store' ? 'Not synced' : sourceName
  }
  if (!posInventory.last_synced_at) return sourceName
  return `${sourceName} · ${formatDateTime(posInventory.last_synced_at)}`
}

function InventoryManagement() {
  const [searchParams] = useSearchParams()

  const [inventory, setInventory] = useState<ApiInventoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [adjustItem, setAdjustItem] = useState<ApiInventoryProduct | null>(null)
  const [isAddMode, setIsAddMode] = useState(false)
  const [branchStock, setBranchStock] = useState('0')
  const [branchThreshold, setBranchThreshold] = useState('5')
  const [branchAllowBackorder, setBranchAllowBackorder] = useState(false)
  const [branchMaxBackorder, setBranchMaxBackorder] = useState('0')
  const [adjustError, setAdjustError] = useState('')
  const [adjustSaving, setAdjustSaving] = useState(false)

  const filterProductId = searchParams.get('product')

  useEffect(() => {
    void loadInventory()
  }, [])

  async function loadInventory() {
    setLoading(true)
    setError('')
    try {
      const items = await adminProductService.listInventory()
      setInventory(items)
      if (filterProductId) {
        const match = items.find((product) => String(product.id) === filterProductId)
        if (match) setSearchTerm(match.name)
      }
    } catch {
      setError('Failed to load inventory.')
    } finally {
      setLoading(false)
    }
  }

  const closeAdjustModal = () => {
    if (adjustSaving) return
    setAdjustItem(null)
    setIsAddMode(false)
    setAdjustError('')
  }

  const filteredInventory = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return inventory.filter((item) => {
      const matchSearch = query === '' || item.name.toLowerCase().includes(query) || item.sku.toLowerCase().includes(query)
      const status = getStockStatus(item)
      const matchStatus = selectedStatus === 'all' || status === selectedStatus
      return matchSearch && matchStatus
    })
  }, [inventory, searchTerm, selectedStatus])

  const sortedInventory = useMemo(() => {
    const items = [...filteredInventory]
    items.sort((left, right) => {
      let comparison = 0
      if (sortField === 'created_at') {
        comparison = new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
      } else if (sortField === 'created_by_name') {
        comparison = (left.created_by_name || 'system').localeCompare(right.created_by_name || 'system')
      } else if (sortField === 'branch_stock') {
        comparison = getInventoryQuantity(left, 'branch') - getInventoryQuantity(right, 'branch')
      } else if (sortField === 'warehouse_stock') {
        comparison = getInventoryQuantity(left, 'warehouse') - getInventoryQuantity(right, 'warehouse')
      } else if (sortField === 'total_stock') {
        comparison = left.stock_quantity - right.stock_quantity
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
    return items
  }, [filteredInventory, sortField, sortDirection])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedStatus, sortField, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sortedInventory.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedInventory = sortedInventory.slice(startIndex, startIndex + PAGE_SIZE)

  const populateAdjustForm = (item: ApiInventoryProduct) => {
    setAdjustItem(item)
    setBranchStock(String(getInventoryQuantity(item, 'branch')))
    setBranchThreshold(String(getInventoryThreshold(item, 'branch')))
    setBranchAllowBackorder(getInventoryAllowBackorder(item, 'branch'))
    setBranchMaxBackorder(String(getInventoryMaxBackorder(item, 'branch')))
    setAdjustError('')
  }

  const handleAdjustOpen = (item: ApiInventoryProduct) => {
    setIsAddMode(false)
    populateAdjustForm(item)
  }

  const handleAddOpen = () => {
    if (inventory.length === 0) return
    setIsAddMode(true)
    populateAdjustForm(inventory[0])
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection(field === 'created_at' ? 'desc' : 'asc')
  }

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return '↕'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const handleAdjustSave = async () => {
    if (!adjustItem) return

    const branchPayload = {
      stock_quantity: Math.max(0, Number.parseInt(branchStock, 10) || 0),
      low_stock_threshold: Math.max(0, Number.parseInt(branchThreshold, 10) || 0),
      allow_backorder: branchAllowBackorder,
      max_backorder_quantity: branchAllowBackorder ? Math.max(0, Number.parseInt(branchMaxBackorder, 10) || 0) : 0,
    }

    if (branchAllowBackorder && branchPayload.max_backorder_quantity === 0) {
      setAdjustError('Set a main shop max backorder quantity greater than 0 when main shop backorder is enabled.')
      return
    }

    setAdjustSaving(true)
    setAdjustError('')
    try {
      const updated = await adminProductService.adjustInventory(adjustItem.id, {
        branch_inventory: branchPayload,
      })
      setInventory((prev) => prev.map((product) => (product.id === adjustItem.id ? updated : product)))
      closeAdjustModal()
    } catch {
      setAdjustError('Failed to save inventory changes.')
    } finally {
      setAdjustSaving(false)
    }
  }

  const posInventory = adjustItem ? getInventoryItem(adjustItem, 'warehouse') : null

  return (
    <div className="category-management admin-page">
      <div className="category-management__header">
        <div className="cm-title-group">
          <h1>Inventory Management</h1>
          <p className="cm-title-sub">Track stock levels across Main Shop and POS Store</p>
        </div>
        <div className="category-management__actions">
          <button className="btn btn--primary btn--sm" type="button" onClick={handleAddOpen} disabled={inventory.length === 0}>+ Add Inventory</button>
        </div>
      </div>

      {error && (
        <div className="cm-error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="cm-kpi-grid">
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Total Products</span>
            <strong className="cm-kpi-card__value">{loading ? '—' : inventory.length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">In Stock</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--green">{loading ? '—' : inventory.filter(i => getStockStatus(i) === 'In Stock').length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Low Stock</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--amber">{loading ? '—' : inventory.filter(i => getStockStatus(i) === 'Low').length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Out of Stock</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--red">{loading ? '—' : inventory.filter(i => getStockStatus(i) === 'Out').length}</strong>
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
            placeholder="Search products or SKU…"
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
        <div className="cm-toolbar__right">
          <select className="cm-filter-select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Low">Low</option>
            <option value="Backorder">Backorder</option>
            <option value="Out">Out</option>
          </select>
        </div>
      </div>

      <div className="cm-panel">
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
        {!loading && sortedInventory.length === 0 && (
          <div className="cm-empty-state">
            <div className="cm-empty-state__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <p className="cm-empty-state__title">No items match your filters.</p>
          </div>
        )}
        {!loading && sortedInventory.length > 0 && (
          <div className="cm-table-wrap">
            <table className="cm-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleSort('branch_stock')}>
                      Main Shop {getSortIndicator('branch_stock')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleSort('warehouse_stock')}>
                      POS Store {getSortIndicator('warehouse_stock')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleSort('total_stock')}>
                      Total {getSortIndicator('total_stock')}
                    </button>
                  </th>
                  <th>Source</th>
                  <th>POS Sync</th>
                  <th>Backorder</th>
                  <th>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleSort('created_at')}>
                      Created At {getSortIndicator('created_at')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleSort('created_by_name')}>
                      Created By {getSortIndicator('created_by_name')}
                    </button>
                  </th>
                  <th>Status</th>
                  <th className="cm-th-actions">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedInventory.map((item) => {
                  const status = getStockStatus(item)
                  return (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td style={{ color: '#6b7280' }}>{item.sku}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span>{getInventoryQuantity(item, 'branch')}</span>
                          <span className="cm-name-cell__id">Threshold {getInventoryThreshold(item, 'branch')}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span>{getInventoryQuantity(item, 'warehouse')}</span>
                          <span className="cm-name-cell__id">Threshold {getInventoryThreshold(item, 'warehouse')}</span>
                        </div>
                      </td>
                      <td>{item.stock_quantity}</td>
                      <td>{formatStockSource(item.stock_source)}</td>
                      <td style={{ color: '#6b7280' }}>{formatPosSync(item)}</td>
                      <td>{formatBackorderSummary(item)}</td>
                      <td>{formatDateTime(item.created_at)}</td>
                      <td>{item.created_by_name || 'system'}</td>
                      <td>
                        <span className={`admin-status ${status === 'In Stock' ? 'admin-status--success' : status === 'Low' ? 'admin-status--warning' : status === 'Backorder' ? 'admin-status--warning' : 'admin-status--danger'}`}>
                          {status}
                        </span>
                      </td>
                      <td>
                        <button className="cm-row-btn cm-row-btn--edit" type="button" onClick={() => handleAdjustOpen(item)}>
                          Adjust
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredInventory.length > PAGE_SIZE && (
          <div className="cm-pagination">
            <span className="cm-pagination__info">
              Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, sortedInventory.length)} of {sortedInventory.length}
            </span>
            <div className="cm-pagination__controls">
              <button className="pagination__button" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>Prev</button>
              <div className="pagination__pages">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button key={page} className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`} type="button" onClick={() => setCurrentPage(page)}>{page}</button>
                ))}
              </div>
              <button className="pagination__button" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>Next</button>
            </div>
          </div>
        )}
      </div>

      {adjustItem && (
        <div className="modal-overlay" onClick={closeAdjustModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{isAddMode ? 'Add Inventory' : 'Adjust Inventory'}</h2>
              <button className="modal__close" onClick={closeAdjustModal}>×</button>
            </div>
            <div className="modal__content">
              <div className="adjust-info">
                <p className="adjust-title">{isAddMode ? 'Add Inventory' : adjustItem.name}</p>
                <p className="adjust-subtitle" style={{ color: '#6b7280', fontSize: '0.85rem' }}>{adjustItem.sku}</p>
              </div>
              {isAddMode && (
                <div className="form-group">
                  <label>Product</label>
                  <select
                    value={adjustItem.id}
                    onChange={(e) => {
                      const selected = inventory.find((item) => item.id === Number(e.target.value))
                      if (selected) populateAdjustForm(selected)
                    }}
                  >
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.sku}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Main shop stock</label>
                <input type="number" min={0} value={branchStock} onChange={(e) => setBranchStock(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Main shop low stock threshold</label>
                <input type="number" min={0} value={branchThreshold} onChange={(e) => setBranchThreshold(e.target.value)} />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={branchAllowBackorder} onChange={(e) => setBranchAllowBackorder(e.target.checked)} />
                  Allow main shop backorder
                </label>
              </div>
              {branchAllowBackorder && (
                <div className="form-group">
                  <label>Main shop max backorder quantity</label>
                  <input type="number" min={0} value={branchMaxBackorder} onChange={(e) => setBranchMaxBackorder(e.target.value)} />
                </div>
              )}

              <div className="form-group">
                <label>POS store stock</label>
                <input type="text" value={String(getInventoryQuantity(adjustItem, 'warehouse'))} readOnly />
              </div>
              <div className="form-group">
                <label>POS source</label>
                <input type="text" value={posInventory?.source_name || 'POS Store'} readOnly />
              </div>
              <div className="form-group">
                <label>Last POS sync</label>
                <input type="text" value={formatDateTime(posInventory?.last_synced_at)} readOnly />
              </div>

              <p style={{ color: '#6b7280', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                POS store stock is read-only here. It is updated by the external POS sync API.
              </p>
              {adjustError && <p style={{ color: 'red', marginTop: '0.75rem' }}>{adjustError}</p>}
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={closeAdjustModal}>Cancel</button>
              <button className="btn btn--primary btn--sm" onClick={handleAdjustSave} disabled={adjustSaving}>
                {adjustSaving ? 'Saving…' : isAddMode ? 'Add Inventory' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryManagement
