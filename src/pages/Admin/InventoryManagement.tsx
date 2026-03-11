import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { adminProductService, ApiInventoryProduct, StockSource } from '../../services/adminProductService'
import './AdminShared.css'
import './InventoryManagement.css'

const PAGE_SIZE = 10
const STOCK_SOURCE_OPTIONS: Array<{ value: StockSource; label: string }> = [
  { value: 'branch', label: 'In Branch' },
  { value: 'warehouse', label: 'In Warehouse' },
  { value: 'out', label: 'Out of Stock' },
]

type StockStatus = 'In Stock' | 'Low' | 'Backorder' | 'Out'

function getStockStatus(product: ApiInventoryProduct): StockStatus {
  if (product.stock_quantity === 0) return product.allow_backorder ? 'Backorder' : 'Out'
  if (product.stock_quantity <= product.low_stock_threshold) return 'Low'
  return 'In Stock'
}

function formatStockSource(value: StockSource): string {
  return STOCK_SOURCE_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function InventoryManagement() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [inventory, setInventory] = useState<ApiInventoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [adjustItem, setAdjustItem] = useState<ApiInventoryProduct | null>(null)
  const [adjustStock, setAdjustStock] = useState('')
  const [adjustThreshold, setAdjustThreshold] = useState('')
  const [adjustSource, setAdjustSource] = useState<StockSource>('branch')
  const [adjustAllowBackorder, setAdjustAllowBackorder] = useState(false)
  const [adjustMaxBackorder, setAdjustMaxBackorder] = useState('0')
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
    if (window.history.length > 1) { navigate(-1); return }
    navigate('/admin')
  }

  const closeAdjustModal = () => {
    if (adjustSaving) return
    setAdjustItem(null)
    setAdjustError('')
  }

  const filteredInventory = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return inventory.filter((item) => {
      const matchSearch =
        query === '' ||
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query)
      const status = getStockStatus(item)
      const matchStatus = selectedStatus === 'all' || status === selectedStatus
      return matchSearch && matchStatus
    })
  }, [inventory, searchTerm, selectedStatus])

  useEffect(() => { setCurrentPage(1) }, [searchTerm, selectedStatus])

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedInventory = filteredInventory.slice(startIndex, startIndex + PAGE_SIZE)

  const handleAdjustOpen = (item: ApiInventoryProduct) => {
    setAdjustItem(item)
    setAdjustStock(String(item.stock_quantity))
    setAdjustThreshold(String(item.low_stock_threshold))
    setAdjustSource(item.stock_source)
    setAdjustAllowBackorder(item.allow_backorder)
    setAdjustMaxBackorder(String(item.max_backorder_quantity ?? 0))
    setAdjustError('')
  }

  const handleAdjustSave = async () => {
    if (!adjustItem) return

    const maxBackorderQuantity = adjustAllowBackorder
      ? Math.max(0, Number.parseInt(adjustMaxBackorder, 10) || 0)
      : 0

    if (adjustAllowBackorder && maxBackorderQuantity === 0) {
      setAdjustError('Set a max backorder quantity greater than 0 when backorder is enabled.')
      return
    }

    setAdjustSaving(true)
    setAdjustError('')
    try {
      const updated = await adminProductService.adjustInventory(adjustItem.id, {
        stock_quantity: Math.max(0, Number.parseInt(adjustStock, 10) || 0),
        low_stock_threshold: Math.max(0, Number.parseInt(adjustThreshold, 10) || 0),
        stock_source: adjustSource,
        allow_backorder: adjustAllowBackorder,
        max_backorder_quantity: maxBackorderQuantity,
      })
      setInventory((prev) => prev.map((product) => (product.id === adjustItem.id ? updated : product)))
      closeAdjustModal()
    } catch {
      setAdjustError('Failed to save inventory changes.')
    } finally {
      setAdjustSaving(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>Back</button>
          <h1>Inventory Management</h1>
        </div>
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
                <th>Stock</th>
                <th>Threshold</th>
                <th>Source</th>
                <th>Backorder</th>
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
                    <td>{item.stock_quantity}</td>
                    <td>{item.low_stock_threshold}</td>
                    <td>{formatStockSource(item.stock_source)}</td>
                    <td>{item.allow_backorder ? `Yes · Max ${item.max_backorder_quantity}` : 'No'}</td>
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
              {filteredInventory.length === 0 && (
                <tr><td colSpan={8} className="inventory-empty">No items match your filters.</td></tr>
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
              <h2>Adjust Stock</h2>
              <button className="modal__close" onClick={closeAdjustModal}>×</button>
            </div>
            <div className="modal__content">
              <div className="adjust-info">
                <p className="adjust-title">{adjustItem.name}</p>
                <p className="adjust-subtitle" style={{ color: '#6b7280', fontSize: '0.85rem' }}>{adjustItem.sku}</p>
              </div>
              <div className="form-group">
                <label>New stock count</label>
                <input type="number" min={0} value={adjustStock} onChange={(e) => setAdjustStock(e.target.value)} />
                <p className="adjust-hint">Status updates automatically based on stock and threshold.</p>
              </div>
              <div className="form-group">
                <label>Low stock threshold</label>
                <input type="number" min={0} value={adjustThreshold} onChange={(e) => setAdjustThreshold(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Stock source</label>
                <select value={adjustSource} onChange={(e) => setAdjustSource(e.target.value as StockSource)}>
                  {STOCK_SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={adjustAllowBackorder} onChange={(e) => setAdjustAllowBackorder(e.target.checked)} />
                  Allow backorder
                </label>
              </div>
              {adjustAllowBackorder && (
                <div className="form-group">
                  <label>Max backorder quantity</label>
                  <input type="number" min={0} value={adjustMaxBackorder} onChange={(e) => setAdjustMaxBackorder(e.target.value)} />
                </div>
              )}
              {adjustError && <p style={{ color: 'red', marginTop: '0.75rem' }}>{adjustError}</p>}
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={closeAdjustModal}>Cancel</button>
              <button className="btn btn--primary btn--sm" onClick={handleAdjustSave} disabled={adjustSaving}>
                {adjustSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryManagement
