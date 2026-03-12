import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { adminProductService, ApiInventoryProduct } from '../../services/adminProductService'
import './AdminShared.css'
import './InventoryManagement.css'

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
  const navigate = useNavigate()
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

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/admin')
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
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>Back</button>
          <h1>Inventory Management</h1>
        </div>
        <button className="btn btn--primary btn--sm" type="button" onClick={handleAddOpen} disabled={inventory.length === 0}>+ Add Inventory</button>
      </div>

      {error && <p style={{ color: 'red', margin: '0.5rem 0 1rem' }}>{error}</p>}

      <div className="admin-page__filters">
        <input
          type="text"
          placeholder="Search products or SKU"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="In Stock">In Stock</option>
          <option value="Low">Low</option>
          <option value="Backorder">Backorder</option>
          <option value="Out">Out</option>
        </select>
      </div>

      <div className="admin-page__table">
        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading inventory…</p>
        ) : (
          <table>
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pagedInventory.map((item) => {
                const status = getStockStatus(item)
                return (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>{item.sku}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span>{getInventoryQuantity(item, 'branch')}</span>
                        <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>Threshold {getInventoryThreshold(item, 'branch')}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span>{getInventoryQuantity(item, 'warehouse')}</span>
                        <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>Threshold {getInventoryThreshold(item, 'warehouse')}</span>
                      </div>
                    </td>
                    <td>{item.stock_quantity}</td>
                    <td>{formatStockSource(item.stock_source)}</td>
                    <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{formatPosSync(item)}</td>
                    <td>{formatBackorderSummary(item)}</td>
                    <td>{formatDateTime(item.created_at)}</td>
                    <td>{item.created_by_name || 'system'}</td>
                    <td>
                      <span className={`admin-status ${status === 'In Stock' ? 'admin-status--success' : status === 'Low' ? 'admin-status--warning' : status === 'Backorder' ? 'admin-status--warning' : 'admin-status--danger'}`}>
                        {status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn--outline btn--sm" type="button" onClick={() => handleAdjustOpen(item)}>
                        Adjust
                      </button>
                    </td>
                  </tr>
                )
              })}
              {sortedInventory.length === 0 && (
                <tr><td colSpan={12} className="inventory-empty">No items match your filters.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {filteredInventory.length > PAGE_SIZE && (
        <div className="inventory-pagination">
          <button className="pagination__button" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>Prev</button>
          <div className="pagination__pages">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button key={page} className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`} type="button" onClick={() => setCurrentPage(page)}>{page}</button>
            ))}
          </div>
          <button className="pagination__button" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>Next</button>
        </div>
      )}

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
