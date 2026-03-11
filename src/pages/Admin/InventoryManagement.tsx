import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { adminProductService, ApiInventoryProduct, ApiStockMovement } from '../../services/adminProductService'
import './AdminShared.css'
import './InventoryManagement.css'

function getStockStatus(product: ApiInventoryProduct): 'In Stock' | 'Low' | 'Out' {
  if (product.stock_quantity === 0) return 'Out'
  if (product.stock_quantity <= product.low_stock_threshold) return 'Low'
  return 'In Stock'
}

function InventoryManagement() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const PAGE_SIZE = 10

  const [inventory, setInventory] = useState<ApiInventoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [adjustItem, setAdjustItem] = useState<ApiInventoryProduct | null>(null)
  const [adjustStock, setAdjustStock] = useState('')
  const [adjustThreshold, setAdjustThreshold] = useState('')
  const [adjustSaving, setAdjustSaving] = useState(false)

  const filterProductId = searchParams.get('product')

  useEffect(() => {
    loadInventory()
  }, [])

  async function loadInventory() {
    setLoading(true)
    setError('')
    try {
      const items = await adminProductService.listInventory()
      setInventory(items)
      if (filterProductId) {
        const match = items.find((p) => String(p.id) === filterProductId)
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

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
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
  }

  const handleAdjustSave = async () => {
    if (!adjustItem) return
    setAdjustSaving(true)
    try {
      const updated = await adminProductService.adjustInventory(adjustItem.id, {
        stock_quantity: Math.max(0, Number.parseInt(adjustStock, 10) || 0),
        low_stock_threshold: Math.max(0, Number.parseInt(adjustThreshold, 10) || 0),
      })
      setInventory((prev) => prev.map((p) => (p.id === adjustItem.id ? updated : p)))
      setAdjustItem(null)
    } catch {
      // keep modal open on error
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
          placeholder="Search products"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="In Stock">In Stock</option>
          <option value="Low">Low</option>
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
                <th>Low Stock Threshold</th>
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
                    <td>
                      <span className={`admin-status ${status === 'In Stock' ? 'admin-status--success' : status === 'Low' ? 'admin-status--warning' : 'admin-status--danger'}`}>
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
                <tr><td colSpan={6} className="inventory-empty">No items match your filters.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {filteredInventory.length > PAGE_SIZE && (
        <div className="inventory-pagination">
          <button className="pagination__button" type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
          <div className="pagination__pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`} type="button" onClick={() => setCurrentPage(page)}>{page}</button>
            ))}
          </div>
          <button className="pagination__button" type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
        </div>
      )}

      {adjustItem && (
        <div className="modal-overlay" onClick={() => setAdjustItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Adjust Stock</h2>
              <button className="modal__close" onClick={() => setAdjustItem(null)}>×</button>
            </div>
            <div className="modal__content">
              <div className="adjust-info">
                <p className="adjust-title">{adjustItem.name}</p>
                <p className="adjust-subtitle" style={{ color: '#6b7280', fontSize: '0.85rem' }}>{adjustItem.sku}</p>
              </div>
              <div className="form-group">
                <label>New stock count</label>
                <input type="number" min={0} value={adjustStock} onChange={(e) => setAdjustStock(e.target.value)} />
                <p className="adjust-hint">Status updates automatically based on stock.</p>
              </div>
              <div className="form-group">
                <label>Low stock threshold</label>
                <input type="number" min={0} value={adjustThreshold} onChange={(e) => setAdjustThreshold(e.target.value)} />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setAdjustItem(null)}>Cancel</button>
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
