import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logAdminAction } from '../../data/adminAudit'
import {
  AdminUser,
  canAddInventoryRecords,
  canUpdateInventory,
  formatAdminRole,
  loadAdminUsers,
} from './adminUsers'
import './AdminShared.css'
import './InventoryManagement.css'

interface InventoryItem {
  id: number
  name: string
  branch: string
  stock: number
  status: 'In Stock' | 'Low' | 'Out'
}

const ACTOR_STORAGE_KEY = 'ava_inventory_actor_id'

function getStatusFromStock(stock: number, threshold: number): InventoryItem['status'] {
  if (stock === 0) return 'Out'
  if (stock <= threshold) return 'Low'
  return 'In Stock'
}

function InventoryManagement() {
  const navigate = useNavigate()
  const PAGE_SIZE = 5
  const [inventory, setInventory] = useState<InventoryItem[]>([
    { id: 1, name: 'Vitamin C 1000mg', branch: 'Nairobi CBD', stock: 18, status: 'In Stock' },
    { id: 2, name: 'Hand Sanitizer', branch: 'Westlands', stock: 6, status: 'Low' },
    { id: 3, name: 'Insulin Pen', branch: 'Central Warehouse', stock: 0, status: 'Out' },
    { id: 4, name: 'Blood Pressure Monitor', branch: 'Westlands', stock: 12, status: 'In Stock' },
    { id: 5, name: 'Baby Diapers (Large)', branch: 'Nairobi CBD', stock: 4, status: 'Low' },
  ])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)
  const [adjustStock, setAdjustStock] = useState('')
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [lowStockThreshold, setLowStockThreshold] = useState(10)
  const [reserveStock, setReserveStock] = useState(true)
  const [reserveMinutes, setReserveMinutes] = useState(15)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemBranch, setNewItemBranch] = useState('')
  const [newItemStock, setNewItemStock] = useState('0')
  const [actorUsers] = useState<AdminUser[]>(() =>
    loadAdminUsers().filter((user) =>
      user.status === 'active' && (user.role === 'admin' || user.role === 'pharmacist')
    )
  )
  const [actorId, setActorId] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return 0
    }
    const stored = window.localStorage.getItem(ACTOR_STORAGE_KEY)
    const parsed = Number.parseInt(stored ?? '', 10)
    return Number.isFinite(parsed) ? parsed : 0
  })

  useEffect(() => {
    if (actorId !== 0 || actorUsers.length === 0) return
    setActorId(actorUsers[0].id)
  }, [actorId, actorUsers])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (actorId === 0) return
    window.localStorage.setItem(ACTOR_STORAGE_KEY, String(actorId))
  }, [actorId])

  const activeActor = useMemo(
    () => actorUsers.find((user) => user.id === actorId) ?? actorUsers[0] ?? null,
    [actorId, actorUsers]
  )
  const canAddRecords = canAddInventoryRecords(activeActor)
  const canEditRecords = canUpdateInventory(activeActor)

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/admin')
  }

  const locations = useMemo(() => {
    return Array.from(new Set(inventory.map((item) => item.branch)))
  }, [inventory])

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesLocation = selectedLocation === 'all' || item.branch === selectedLocation
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus
      return matchesSearch && matchesLocation && matchesStatus
    })
  }, [inventory, searchTerm, selectedLocation, selectedStatus])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedLocation, selectedStatus])

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedInventory = filteredInventory.slice(startIndex, startIndex + PAGE_SIZE)

  const handleAdjustOpen = (item: InventoryItem) => {
    if (!canEditRecords) return
    setAdjustItem(item)
    setAdjustStock(String(item.stock))
  }

  const handleAdjustSave = () => {
    if (!adjustItem || !canEditRecords) return
    const nextStock = Math.max(0, Number.parseInt(adjustStock, 10) || 0)
    const nextStatus = getStatusFromStock(nextStock, lowStockThreshold)
    setInventory((prev) =>
      prev.map((item) =>
        item.id === adjustItem.id ? { ...item, stock: nextStock, status: nextStatus } : item
      )
    )
    logAdminAction({
      action: 'Adjust inventory',
      entity: 'Inventory',
      entityId: adjustItem.name,
      detail: `${adjustItem.branch} stock set to ${nextStock} by ${activeActor?.name ?? 'Unknown user'}`,
    })
    setAdjustItem(null)
  }

  const handleAddInventory = () => {
    if (!canAddRecords || !newItemName.trim() || !newItemBranch.trim()) return
    const parsedStock = Math.max(0, Number.parseInt(newItemStock, 10) || 0)
    const nextItem: InventoryItem = {
      id: Date.now(),
      name: newItemName.trim(),
      branch: newItemBranch.trim(),
      stock: parsedStock,
      status: getStatusFromStock(parsedStock, lowStockThreshold),
    }
    setInventory((prev) => [nextItem, ...prev])
    logAdminAction({
      action: 'Add inventory record',
      entity: 'Inventory',
      entityId: nextItem.name,
      detail: `${nextItem.branch} stock ${nextItem.stock} by ${activeActor?.name ?? 'Unknown user'}`,
    })
    setShowAddModal(false)
    setNewItemName('')
    setNewItemBranch('')
    setNewItemStock('0')
  }

  const handleSync = () => {
    if (!canEditRecords) return
    setLastSynced(new Date())
    logAdminAction({
      action: 'Sync POS',
      entity: 'Inventory',
      detail: `Manual POS sync triggered by ${activeActor?.name ?? 'Unknown user'}`,
    })
  }

  const handleSaveControls = () => {
    if (!canEditRecords) return
    logAdminAction({
      action: 'Update inventory controls',
      entity: 'Inventory',
      detail: `Low stock threshold ${lowStockThreshold}, reserve ${reserveStock ? 'on' : 'off'} (${reserveMinutes} mins) by ${activeActor?.name ?? 'Unknown user'}`,
    })
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
            Back
          </button>
          <h1>Inventory Management</h1>
          {lastSynced && (
            <p className="inventory-sync">Last synced {lastSynced.toLocaleTimeString()}</p>
          )}
        </div>
        <div className="inventory-header-actions">
          <div className="inventory-actor">
            <label htmlFor="inventory-actor-select">Operate as</label>
            <select
              id="inventory-actor-select"
              value={activeActor?.id ?? ''}
              onChange={(event) => setActorId(Number(event.target.value))}
            >
              {actorUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({formatAdminRole(user.role)})
                </option>
              ))}
            </select>
          </div>
          {canAddRecords && (
            <button className="btn btn--outline btn--sm" type="button" onClick={() => setShowAddModal(true)}>
              Add inventory
            </button>
          )}
          <button className="btn btn--primary btn--sm" type="button" onClick={handleSync} disabled={!canEditRecords}>
            Sync POS
          </button>
        </div>
      </div>

      <p className="inventory-access-note">
        {canEditRecords
          ? 'Admin mode: you can add and update inventory.'
          : canAddRecords
            ? 'Pharmacist mode: you can add inventory records, but only admins can update stock.'
            : 'This user cannot add or update inventory records.'}
      </p>

      <div className="admin-page__filters">
        <input
          type="text"
          placeholder="Search products"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select value={selectedLocation} onChange={(event) => setSelectedLocation(event.target.value)}>
          <option value="all">All locations</option>
          {locations.map((location) => (
            <option key={location} value={location}>{location}</option>
          ))}
        </select>
        <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="In Stock">In Stock</option>
          <option value="Low">Low</option>
          <option value="Out">Out</option>
        </select>
      </div>

      <div className="admin-page__table">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Location</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pagedInventory.map((item) => (
              <tr key={`${item.id}-${item.branch}`}>
                <td>{item.name}</td>
                <td>{item.branch}</td>
                <td>{item.stock}</td>
                <td>
                  <span className={`admin-status ${item.status === 'In Stock' ? 'admin-status--success' : item.status === 'Low' ? 'admin-status--warning' : 'admin-status--danger'}`}>
                    {item.status}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn--outline btn--sm"
                    type="button"
                    onClick={() => handleAdjustOpen(item)}
                    disabled={!canEditRecords}
                  >
                    Adjust
                  </button>
                </td>
              </tr>
            ))}
            {filteredInventory.length === 0 && (
              <tr>
                <td colSpan={5} className="inventory-empty">No items match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredInventory.length > 0 && (
        <div className="inventory-pagination">
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

      <div className="inventory-controls">
        <div className="form-card">
          <h2 className="card__title">Low-stock alerts</h2>
          <div className="form-group">
            <label>Threshold (units)</label>
            <input
              type="number"
              min={1}
              value={lowStockThreshold}
              onChange={(event) => setLowStockThreshold(Number(event.target.value))}
              disabled={!canEditRecords}
            />
            <p className="inventory-hint">Items at or below this count will show as Low.</p>
          </div>
        </div>
        <div className="form-card">
          <h2 className="card__title">Reservation logic</h2>
          <div className="form-group inventory-checkbox">
            <label>
              <input
                type="checkbox"
                checked={reserveStock}
                onChange={(event) => setReserveStock(event.target.checked)}
                disabled={!canEditRecords}
              />
              Reserve stock during checkout
            </label>
          </div>
          <div className="form-group">
            <label>Reservation hold time (minutes)</label>
            <input
              type="number"
              min={5}
              value={reserveMinutes}
              onChange={(event) => setReserveMinutes(Number(event.target.value))}
              disabled={!canEditRecords}
            />
          </div>
          <button
            className="btn btn--primary btn--sm"
            type="button"
            onClick={handleSaveControls}
            disabled={!canEditRecords}
          >
            Save controls
          </button>
        </div>
      </div>

      {adjustItem && (
        <div className="modal-overlay" onClick={() => setAdjustItem(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Adjust Stock</h2>
              <button className="modal__close" onClick={() => setAdjustItem(null)}>×</button>
            </div>
            <div className="modal__content">
              <div className="adjust-info">
                <p className="adjust-title">{adjustItem.name}</p>
                <p className="adjust-subtitle">{adjustItem.branch}</p>
              </div>
              <div className="form-group">
                <label>New stock count</label>
                <input
                  type="number"
                  min={0}
                  value={adjustStock}
                  onChange={(event) => setAdjustStock(event.target.value)}
                />
                <p className="adjust-hint">Status updates automatically based on stock.</p>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setAdjustItem(null)}>Cancel</button>
              <button className="btn btn--primary btn--sm" onClick={handleAdjustSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2>Add inventory record</h2>
              <button className="modal__close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="form-group">
                <label>Item name</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(event) => setNewItemName(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={newItemBranch}
                  onChange={(event) => setNewItemBranch(event.target.value)}
                  placeholder="Nairobi CBD"
                />
              </div>
              <div className="form-group">
                <label>Opening stock</label>
                <input
                  type="number"
                  min={0}
                  value={newItemStock}
                  onChange={(event) => setNewItemStock(event.target.value)}
                />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn btn--primary btn--sm" onClick={handleAddInventory}>
                Add item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryManagement
