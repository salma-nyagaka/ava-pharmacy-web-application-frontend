import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminProductService, ApiInventoryProduct, ApiPosProductOption, ApiProductVariant } from '../../services/adminProductService'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/InventoryManagement.css'
import '../../styles/admin/shared/AdminEntityManagement.css'

const PAGE_SIZE = 10

type InventoryStatusFilter = 'all' | 'in_stock' | 'low_stock' | 'backorder' | 'out_of_stock' | 'inactive'
type SortField = 'managed_stock' | 'pos_stock' | 'sellable_quantity'
type SortDirection = 'asc' | 'desc'

type VariantDraft = {
  id: number
  name: string
  sku: string
  barcode: string
  pos_product_id: string
  strength: string
  dosage_instructions: string
  directions: string
  warnings: string
  price: string
  attributes: Record<string, unknown>
  stock_source: ApiProductVariant['stock_source']
  is_active: boolean
  stock_quantity: string
  low_stock_threshold: string
  allow_backorder: boolean
  max_backorder_quantity: string
}

function generateVariantSku(product: ApiInventoryProduct, variantName: string) {
  const base = `${product.sku}-${variantName}`
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36)
  const suffix = Date.now().toString(36).toUpperCase().slice(-4)
  return `${base || product.sku}-${suffix}`
}

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

function isVariantManaged(product: ApiInventoryProduct) {
  return Boolean(product.has_variants || (product.variants?.length ?? 0) > 0)
}

function getInventoryStatus(product: ApiInventoryProduct) {
  return product.inventory_status ?? 'out_of_stock'
}

function formatStatusLabel(status: string): string {
  if (status === 'in_stock') return 'In Stock'
  if (status === 'low_stock') return 'Low Stock'
  if (status === 'backorder') return 'Backorder'
  if (status === 'inactive') return 'Inactive'
  return 'Out of Stock'
}

function getStatusClass(status: string): string {
  if (status === 'in_stock') return 'admin-status admin-status--success'
  if (status === 'low_stock' || status === 'backorder') return 'admin-status admin-status--warning'
  return 'admin-status admin-status--danger'
}

function formatStockSource(value: ApiInventoryProduct['stock_source']): string {
  if (value === 'branch') return 'Main Shop'
  if (value === 'warehouse') return 'POS Store'
  return 'Out of Stock'
}

function formatVariantStockSource(value: ApiProductVariant['stock_source']): string {
  if (value === 'branch') return 'Main Shop'
  if (value === 'warehouse') return 'POS-backed'
  return 'Out of Stock'
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function formatPosSync(product: ApiInventoryProduct): string {
  if (isVariantManaged(product)) return 'Variant POS sync'
  const posInventory = getInventoryItem(product, 'warehouse')
  if (!posInventory) return 'Not synced'
  const sourceName = posInventory.source_name || 'POS Store'
  if (!posInventory.is_pos_synced && !posInventory.last_synced_at) {
    return sourceName === 'POS Store' ? 'Not synced' : sourceName
  }
  if (!posInventory.last_synced_at) return sourceName
  return `${sourceName} · ${formatDateTime(posInventory.last_synced_at)}`
}

function getActiveVariantCount(product: ApiInventoryProduct): number {
  return (product.variants ?? []).filter((variant) => variant.is_active).length
}

function getManagedStock(product: ApiInventoryProduct): number {
  if (isVariantManaged(product)) {
    return (product.variants ?? []).reduce((total, variant) => total + (variant.stock_quantity ?? 0), 0)
  }
  return getInventoryQuantity(product, 'branch')
}

function getPosManagedQuantity(product: ApiInventoryProduct): number {
  if (isVariantManaged(product)) {
    return (product.variants ?? [])
      .filter((variant) => variant.stock_source === 'warehouse')
      .reduce((total, variant) => total + (variant.stock_quantity ?? 0), 0)
  }
  return getInventoryQuantity(product, 'warehouse')
}

function getSellableQuantity(product: ApiInventoryProduct): number {
  return product.available_quantity ?? product.stock_quantity ?? 0
}

function formatBackorderSummary(product: ApiInventoryProduct): string {
  if (isVariantManaged(product)) {
    const variants = product.variants ?? []
    const enabled = variants.filter((variant) => variant.allow_backorder)
    if (enabled.length === 0) return 'No'
    return `${enabled.length} variant${enabled.length === 1 ? '' : 's'} enabled`
  }

  const parts = [
    getInventoryAllowBackorder(product, 'branch') ? `Main Shop · Max ${getInventoryMaxBackorder(product, 'branch')}` : null,
    getInventoryAllowBackorder(product, 'warehouse') ? `POS Store · Max ${getInventoryMaxBackorder(product, 'warehouse')}` : null,
  ].filter((value): value is string => Boolean(value))

  return parts.length > 0 ? parts.join(' · ') : 'No'
}

function createVariantDraft(variant: ApiProductVariant): VariantDraft {
  return {
    id: variant.id,
    name: variant.name,
    sku: variant.sku ?? '',
    barcode: variant.barcode ?? '',
    pos_product_id: variant.pos_product_id ?? '',
    strength: variant.strength ?? '',
    dosage_instructions: variant.dosage_instructions ?? '',
    directions: variant.directions ?? '',
    warnings: variant.warnings ?? '',
    price: variant.price ?? variant.effective_price ?? '',
    attributes: variant.attributes ?? {},
    stock_source: variant.stock_source,
    is_active: Boolean(variant.is_active),
    stock_quantity: String(variant.stock_quantity ?? 0),
    low_stock_threshold: String(variant.low_stock_threshold ?? 0),
    allow_backorder: Boolean(variant.allow_backorder),
    max_backorder_quantity: String(variant.max_backorder_quantity ?? 0),
  }
}

function parseNonNegativeInteger(value: string): number {
  return Math.max(0, Number.parseInt(value, 10) || 0)
}

function getVariantDraftQuantity(draft: VariantDraft): number {
  return parseNonNegativeInteger(draft.stock_quantity)
}

function getVariantDraftThreshold(draft: VariantDraft): number {
  return parseNonNegativeInteger(draft.low_stock_threshold)
}

function getVariantDraftMaxBackorder(draft: VariantDraft): number {
  return parseNonNegativeInteger(draft.max_backorder_quantity)
}

function getVariantDraftAvailableQuantity(draft: VariantDraft): number {
  const stockQuantity = getVariantDraftQuantity(draft)
  if (!draft.allow_backorder) return stockQuantity
  return stockQuantity + getVariantDraftMaxBackorder(draft)
}

function getVariantDraftStatus(draft: VariantDraft): string {
  if (!draft.is_active) return 'inactive'
  const stockQuantity = getVariantDraftQuantity(draft)
  if (stockQuantity === 0) return draft.allow_backorder ? 'backorder' : 'out_of_stock'
  if (stockQuantity <= getVariantDraftThreshold(draft)) return 'low_stock'
  return 'in_stock'
}

function formatVariantAttributes(attributes: Record<string, unknown>): string {
  const entries = Object.entries(attributes ?? {}).filter(([, value]) => value !== null && value !== '')
  if (entries.length === 0) return 'No attributes'
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(' · ')
}

function InventoryManagement() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [inventory, setInventory] = useState<ApiInventoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<InventoryStatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('sellable_quantity')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [adjustItem, setAdjustItem] = useState<ApiInventoryProduct | null>(null)
  const [branchStock, setBranchStock] = useState('0')
  const [branchThreshold, setBranchThreshold] = useState('5')
  const [branchAllowBackorder, setBranchAllowBackorder] = useState(false)
  const [branchMaxBackorder, setBranchMaxBackorder] = useState('0')
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>([])
  const [adjustError, setAdjustError] = useState('')
  const [adjustSaving, setAdjustSaving] = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [showNewStockModal, setShowNewStockModal] = useState(false)
  const [newStockProductId, setNewStockProductId] = useState<number | ''>('')
  const [newVariantName, setNewVariantName] = useState('')
  const [newVariantStrength, setNewVariantStrength] = useState('')
  const [newVariantDosageAmount, setNewVariantDosageAmount] = useState('')
  const [newVariantDosageQuantity, setNewVariantDosageQuantity] = useState('')
  const [newVariantDirections, setNewVariantDirections] = useState('')
  const [newVariantWarnings, setNewVariantWarnings] = useState('')
  const [newVariantPosProductId, setNewVariantPosProductId] = useState('')
  const [newVariantPrice, setNewVariantPrice] = useState('')
  const [newVariantStockQuantity, setNewVariantStockQuantity] = useState('0')
  const [newVariantLowStockThreshold, setNewVariantLowStockThreshold] = useState('5')
  const [newStockError, setNewStockError] = useState('')
  const [newStockSaving, setNewStockSaving] = useState(false)
  const [posOptions, setPosOptions] = useState<ApiPosProductOption[]>([])
  const [posSyncingIds, setPosSyncingIds] = useState<Record<number, boolean>>({})
  const [posSyncError, setPosSyncError] = useState('')
  const [autoOpenedProductId, setAutoOpenedProductId] = useState<number | null>(null)

  const filterProductId = searchParams.get('product')

  const closeAdjustModal = () => {
    if (adjustSaving) return
    setAdjustItem(null)
    setVariantDrafts([])
    setShowProductPicker(false)
    setAdjustError('')
    setPosSyncError('')
  }

  const populateAdjustForm = (item: ApiInventoryProduct, options?: { showPicker?: boolean }) => {
    setAdjustItem(item)
    setBranchStock(String(getInventoryQuantity(item, 'branch')))
    setBranchThreshold(String(getInventoryThreshold(item, 'branch')))
    setBranchAllowBackorder(getInventoryAllowBackorder(item, 'branch'))
    setBranchMaxBackorder(String(getInventoryMaxBackorder(item, 'branch')))
    setVariantDrafts((item.variants ?? []).map(createVariantDraft))
    setShowProductPicker(options?.showPicker ?? false)
    setAdjustError('')
    setPosSyncError('')
  }

  useEffect(() => {
    setAutoOpenedProductId(null)
    if (filterProductId) {
      setSearchTerm('')
      setSelectedStatus('all')
    }
  }, [filterProductId])

  useEffect(() => {
    void loadInventory()
  }, [filterProductId])

  useEffect(() => {
    void adminProductService.listPosProductOptions()
      .then(setPosOptions)
      .catch(() => setPosOptions([]))
  }, [])

  async function loadInventory() {
    setLoading(true)
    setError('')
    try {
      const params = filterProductId ? { product_id: filterProductId } : undefined
      const items = await adminProductService.listInventory(params)
      setInventory(items)

      if (filterProductId) {
        const targetId = Number(filterProductId)
        const match = items.find((product) => product.id === targetId)
        if (match && autoOpenedProductId !== targetId) {
          populateAdjustForm(match)
          setAutoOpenedProductId(targetId)
        }
      }
    } catch {
      setError(filterProductId ? 'Failed to load stock for the selected product.' : 'Failed to load inventory.')
    } finally {
      setLoading(false)
    }
  }

  async function refreshInventoryItem(productId: number) {
    const items = await adminProductService.listInventory({ product_id: String(productId) })
    const refreshed = items[0] ?? null
    if (!refreshed) return null

    setInventory((prev) => {
      if (filterProductId) return [refreshed]
      const exists = prev.some((item) => item.id === productId)
      if (!exists) return [refreshed, ...prev]
      return prev.map((item) => (item.id === productId ? refreshed : item))
    })

    return refreshed
  }

  const resetNewStockForm = () => {
    setNewVariantName('')
    setNewVariantStrength('')
    setNewVariantDosageAmount('')
    setNewVariantDosageQuantity('')
    setNewVariantDirections('')
    setNewVariantWarnings('')
    setNewVariantPosProductId('')
    setNewVariantPrice('')
    setNewVariantStockQuantity('0')
    setNewVariantLowStockThreshold('5')
    setNewStockError('')
  }

  const filteredInventory = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return inventory.filter((item) => {
      const matchSearch = query === ''
        || item.name.toLowerCase().includes(query)
        || item.sku.toLowerCase().includes(query)
        || (item.variants ?? []).some((variant) =>
          variant.name.toLowerCase().includes(query)
          || variant.sku.toLowerCase().includes(query)
          || (variant.barcode ?? '').toLowerCase().includes(query)
          || (variant.pos_product_id ?? '').toLowerCase().includes(query),
        )

      const status = getInventoryStatus(item)
      const matchStatus = selectedStatus === 'all' || status === selectedStatus
      return matchSearch && matchStatus
    })
  }, [inventory, searchTerm, selectedStatus])

  const sortedInventory = useMemo(() => {
    const items = [...filteredInventory]
    items.sort((left, right) => {
      let comparison = 0

      if (sortField === 'managed_stock') {
        comparison = getManagedStock(left) - getManagedStock(right)
      } else if (sortField === 'pos_stock') {
        comparison = getPosManagedQuantity(left) - getPosManagedQuantity(right)
      } else {
        comparison = getSellableQuantity(left) - getSellableQuantity(right)
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
    return items
  }, [filteredInventory, sortField, sortDirection])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedStatus, sortField, sortDirection, filterProductId])

  const totalPages = Math.max(1, Math.ceil(sortedInventory.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedInventory = sortedInventory.slice(startIndex, startIndex + PAGE_SIZE)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection(field === 'sellable_quantity' ? 'desc' : 'asc')
  }

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return '↕'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const handleVariantDraftChange = (variantId: number, patch: Partial<VariantDraft>) => {
    setVariantDrafts((prev) => prev.map((draft) => (draft.id === variantId ? { ...draft, ...patch } : draft)))
  }

  const handleAdjustOpen = (item: ApiInventoryProduct) => {
    populateAdjustForm(item)
  }

  const closeNewStockModal = () => {
    if (newStockSaving) return
    setShowNewStockModal(false)
    setNewStockProductId('')
    resetNewStockForm()
  }

  const handleNewStockOpen = (item?: ApiInventoryProduct | null) => {
    const initialItem = item ?? focusedProduct ?? sortedInventory[0] ?? inventory[0] ?? null
    if (!initialItem) return
    setNewStockProductId(initialItem.id)
    resetNewStockForm()
    setShowNewStockModal(true)
  }

  const handleNewStockSave = async () => {
    const selectedProduct = inventory.find((item) => item.id === Number(newStockProductId))
    if (!selectedProduct) {
      setNewStockError('Select a product first.')
      return
    }
    if (!newVariantName.trim()) {
      setNewStockError('Variant name is required.')
      return
    }

    const priceValue = Number(newVariantPrice)
    if (!newVariantPrice.trim() || !Number.isFinite(priceValue) || priceValue < 0) {
      setNewStockError('Enter a valid variant price.')
      return
    }

    setNewStockSaving(true)
    setNewStockError('')
    try {
      const dosageInstructionValue = (() => {
        const amount = newVariantDosageAmount.trim()
        const quantity = newVariantDosageQuantity.trim()
        if (amount && quantity) return `${amount} x ${quantity}`
        if (amount) return amount
        if (quantity) return quantity
        return ''
      })()

      await adminProductService.createProductVariant(selectedProduct.id, {
        name: newVariantName.trim(),
        sku: generateVariantSku(selectedProduct, newVariantName),
        pos_product_id: newVariantPosProductId,
        strength: newVariantStrength.trim(),
        dosage_instructions: dosageInstructionValue,
        directions: newVariantDirections.trim(),
        warnings: newVariantWarnings.trim(),
        price: priceValue,
        stock_quantity: parseNonNegativeInteger(newVariantStockQuantity),
        low_stock_threshold: parseNonNegativeInteger(newVariantLowStockThreshold),
        is_active: true,
      })
      const refreshed = await refreshInventoryItem(selectedProduct.id)
      if (refreshed && adjustItem?.id === selectedProduct.id) {
        populateAdjustForm(refreshed)
      }
      closeNewStockModal()
    } catch {
      setNewStockError('Failed to create stock for this variant.')
    } finally {
      setNewStockSaving(false)
    }
  }

  const handleAdjustSave = async () => {
    if (!adjustItem) return

    if (isVariantManaged(adjustItem)) {
      if (variantDrafts.length === 0) {
        setAdjustError('Use New Stock to create a variant before managing stock here.')
        return
      }

      const variantUpdates = []
      for (const draft of variantDrafts) {
        const stockQuantity = getVariantDraftQuantity(draft)
        const lowStockThreshold = getVariantDraftThreshold(draft)
        const maxBackorderQuantity = draft.allow_backorder ? getVariantDraftMaxBackorder(draft) : 0

        if (draft.allow_backorder && maxBackorderQuantity === 0) {
          setAdjustError(`Set a max backorder quantity greater than 0 for ${draft.name}.`)
          return
        }

        variantUpdates.push({
          variantId: draft.id,
          payload: {
            stock_quantity: stockQuantity,
            low_stock_threshold: lowStockThreshold,
            allow_backorder: draft.allow_backorder,
            max_backorder_quantity: maxBackorderQuantity,
          },
        })
      }

      setAdjustSaving(true)
      setAdjustError('')
      try {
        await Promise.all(
          variantUpdates.map((update) =>
            adminProductService.updateProductVariant(adjustItem.id, update.variantId, update.payload),
          ),
        )
        await refreshInventoryItem(adjustItem.id)
        closeAdjustModal()
      } catch {
        setAdjustError('Failed to save variant stock changes.')
      } finally {
        setAdjustSaving(false)
      }
      return
    }

    const branchPayload = {
      stock_quantity: parseNonNegativeInteger(branchStock),
      low_stock_threshold: parseNonNegativeInteger(branchThreshold),
      allow_backorder: branchAllowBackorder,
      max_backorder_quantity: branchAllowBackorder ? parseNonNegativeInteger(branchMaxBackorder) : 0,
    }

    if (branchAllowBackorder && branchPayload.max_backorder_quantity === 0) {
      setAdjustError('Set a main shop max backorder quantity greater than 0 when backorder is enabled.')
      return
    }

    setAdjustSaving(true)
    setAdjustError('')
    try {
      const updated = await adminProductService.adjustInventory(adjustItem.id, {
        branch_inventory: branchPayload,
      })
      setInventory((prev) => {
        if (filterProductId) return [updated]
        return prev.map((product) => (product.id === adjustItem.id ? updated : product))
      })
      closeAdjustModal()
    } catch {
      setAdjustError('Failed to save inventory changes.')
    } finally {
      setAdjustSaving(false)
    }
  }

  const handlePosSync = async (item: ApiInventoryProduct) => {
    setPosSyncingIds((prev) => ({ ...prev, [item.id]: true }))
    setPosSyncError('')
    try {
      if (isVariantManaged(item)) {
        const variantIds = (item.variants ?? []).map((variant) => variant.id)
        if (variantIds.length === 0) {
          setPosSyncError('Use New Stock to create a variant before syncing POS stock for this item.')
          return
        }
        await adminProductService.refreshVariantPosInventory(variantIds, true)
        const refreshed = await refreshInventoryItem(item.id)
        if (refreshed && adjustItem?.id === item.id) {
          populateAdjustForm(refreshed)
        }
        return
      }

      const updated = await adminProductService.refreshPosInventory([item.id], true)
      const updatedItem = updated[0] ?? await refreshInventoryItem(item.id)
      if (updatedItem) {
        setInventory((prev) => {
          if (filterProductId) return [updatedItem]
          return prev.map((row) => (row.id === updatedItem.id ? updatedItem : row))
        })
        if (adjustItem?.id === updatedItem.id) {
          populateAdjustForm(updatedItem)
        }
      }
    } catch {
      setPosSyncError('Failed to sync POS stock. Make sure the POS lookup endpoint is configured.')
    } finally {
      setPosSyncingIds((prev) => ({ ...prev, [item.id]: false }))
    }
  }

  const clearFocusedProduct = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('product')
    setSearchParams(next)
    closeAdjustModal()
  }

  const focusedProduct = filterProductId ? inventory[0] ?? null : null
  const posInventory = adjustItem && !isVariantManaged(adjustItem) ? getInventoryItem(adjustItem, 'warehouse') : null

  return (
    <div className="category-management admin-page">
      <div className="category-management__header">
        <div className="cm-title-group">
          <h1>Inventory Management</h1>
          <p className="cm-title-sub">Create sellable variants, capture stock, and manage thresholds, backorder, and POS sync here. Products only holds the parent catalog item.</p>
        </div>
        <div className="category-management__actions">
          <button
            className="btn btn--primary btn--sm"
            type="button"
            onClick={() => handleNewStockOpen()}
            disabled={loading || (!focusedProduct && sortedInventory.length === 0 && inventory.length === 0)}
          >
            New Stock
          </button>
          {filterProductId && (
            <button className="btn btn--ghost btn--sm" type="button" onClick={clearFocusedProduct}>Show All Stock</button>
          )}
        </div>
      </div>

      {focusedProduct && (
        <div className="inventory-focus-banner">
          <div className="inventory-focus-banner__copy">
            <span className="inventory-focus-banner__label">Focused product</span>
            <strong>{focusedProduct.name}</strong>
            <span className="inventory-focus-banner__meta">
              {isVariantManaged(focusedProduct)
                ? `Variant-managed · ${getActiveVariantCount(focusedProduct)} active variants`
                : `Single SKU · Main Shop ${getInventoryQuantity(focusedProduct, 'branch')} · POS ${getInventoryQuantity(focusedProduct, 'warehouse')}`}
            </span>
          </div>
          <span className={`inventory-model-chip${isVariantManaged(focusedProduct) ? ' inventory-model-chip--variant' : ''}`}>
            {isVariantManaged(focusedProduct) ? 'Variant-managed' : 'Single SKU'}
          </span>
        </div>
      )}

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
            <span className="cm-kpi-card__label">Tracked Products</span>
            <strong className="cm-kpi-card__value">{loading ? '—' : inventory.length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">In Stock</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--green">{loading ? '—' : inventory.filter((item) => getInventoryStatus(item) === 'in_stock').length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Low / Backorder</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--amber">{loading ? '—' : inventory.filter((item) => ['low_stock', 'backorder'].includes(getInventoryStatus(item))).length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Out / Inactive</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--red">{loading ? '—' : inventory.filter((item) => ['out_of_stock', 'inactive'].includes(getInventoryStatus(item))).length}</strong>
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
            placeholder="Search products, SKU, or variants…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={Boolean(filterProductId)}
          />
          {searchTerm && !filterProductId && (
            <button className="cm-search-box__clear" type="button" onClick={() => setSearchTerm('')} aria-label="Clear search">
              <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          )}
        </div>
        <div className="cm-toolbar__right">
          <select className="cm-filter-select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as InventoryStatusFilter)}>
            <option value="all">All statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="backorder">Backorder</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="cm-panel">
        {posSyncError && (
          <div className="cm-error-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{posSyncError}</span>
          </div>
        )}
        {loading && (
          <div className="cm-skeletons">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="cm-skeleton-row">
                <div className="cm-skeleton" style={{ width: '26%' }} />
                <div className="cm-skeleton" style={{ width: '14%' }} />
                <div className="cm-skeleton" style={{ width: '18%' }} />
                <div className="cm-skeleton" style={{ width: '12%', borderRadius: '999px' }} />
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
            <p className="cm-empty-state__title">{filterProductId ? 'This product could not be loaded.' : 'No items match your filters.'}</p>
          </div>
        )}
        {!loading && sortedInventory.length > 0 && (
          <div className="cm-table-wrap">
            <table className="cm-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock Model</th>
                  <th>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleSort('managed_stock')}>
                      Managed Stock {getSortIndicator('managed_stock')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleSort('pos_stock')}>
                      POS-backed {getSortIndicator('pos_stock')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleSort('sellable_quantity')}>
                      Sellable Qty {getSortIndicator('sellable_quantity')}
                    </button>
                  </th>
                  <th>Backorder</th>
                  <th>POS Sync</th>
                  <th>Status</th>
                  <th className="cm-th-actions">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedInventory.map((item) => {
                  const status = getInventoryStatus(item)
                  const variantMode = isVariantManaged(item)
                  const warehouseVariants = (item.variants ?? []).filter((variant) => variant.stock_source === 'warehouse')
                  const variantPosQuantity = warehouseVariants.reduce((total, variant) => total + variant.stock_quantity, 0)

                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span>{item.name}</span>
                          <span className="cm-name-cell__id">{item.sku}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`inventory-model-chip${variantMode ? ' inventory-model-chip--variant' : ''}`}>
                          {variantMode ? 'Variant-managed' : 'Single SKU'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span>{getManagedStock(item)}</span>
                          <span className="cm-name-cell__id">
                            {variantMode
                              ? `${getActiveVariantCount(item)} active variants`
                              : `Main Shop · Threshold ${getInventoryThreshold(item, 'branch')}`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span>{variantMode ? variantPosQuantity : getInventoryQuantity(item, 'warehouse')}</span>
                          <span className="cm-name-cell__id">
                            {variantMode
                              ? `${warehouseVariants.length} variants currently POS-backed`
                              : `POS Store · ${formatDateTime(getInventoryItem(item, 'warehouse')?.last_synced_at)}`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span>{getSellableQuantity(item)}</span>
                          <span className="cm-name-cell__id">{variantMode ? 'Across all sellable variants' : formatStockSource(item.stock_source)}</span>
                        </div>
                      </td>
                      <td>{formatBackorderSummary(item)}</td>
                      <td style={{ color: '#6b7280' }}>{formatPosSync(item)}</td>
                      <td>
                        <span className={getStatusClass(status)}>
                          {formatStatusLabel(status)}
                        </span>
                      </td>
                      <td>
                        <div className="cm-row-actions">
                          <button className="cm-row-btn cm-row-btn--edit" type="button" onClick={() => handleAdjustOpen(item)}>
                            Adjust Stock
                          </button>
                          <button className="cm-row-btn" type="button" onClick={() => handleNewStockOpen(item)}>
                            New Variant
                          </button>
                          <button
                            className="cm-row-btn cm-row-btn--warn"
                            type="button"
                            onClick={() => handlePosSync(item)}
                            disabled={Boolean(posSyncingIds[item.id])}
                          >
                            {posSyncingIds[item.id] ? 'Syncing…' : variantMode ? 'Sync Variants' : 'POS Sync'}
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

      {showNewStockModal && (
        <div className="modal-overlay" onClick={closeNewStockModal}>
          <div className="modal modal--stock" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>New Stock</h2>
              <button className="modal__close" onClick={closeNewStockModal}>×</button>
            </div>
            <div className="modal__content">
              <div className="adjust-section stock-form__section">
                <div className="adjust-section__title">Variant Details</div>
                <div className="stock-form__section-copy">
                  Start with the parent product, customer-facing name, strength, and POS mapping.
                </div>
                <div className="adjust-grid stock-form__core-grid">
                  <div className="adjust-field">
                    <label>Product</label>
                    <select value={newStockProductId} onChange={(e) => setNewStockProductId(Number(e.target.value))}>
                      {sortedInventory.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.sku}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="adjust-field">
                    <label>Variant name</label>
                    <input
                      type="text"
                      value={newVariantName}
                      onChange={(e) => setNewVariantName(e.target.value)}
                      placeholder="e.g. Tablets, Cough Syrup, Capsules"
                    />
                  </div>
                  <div className="adjust-field">
                    <label>Strength</label>
                    <input
                      type="text"
                      value={newVariantStrength}
                      onChange={(e) => setNewVariantStrength(e.target.value)}
                      placeholder="e.g. 500mg"
                    />
                  </div>
                  <div className="adjust-field">
                    <label>POS item</label>
                    <select value={newVariantPosProductId} onChange={(e) => setNewVariantPosProductId(e.target.value)}>
                      <option value="">No POS ID selected</option>
                      {posOptions.map((option) => (
                        <option key={option.pos_product_id} value={option.pos_product_id}>
                          {option.label} · {option.pos_product_id}
                        </option>
                      ))}
                    </select>
                    <span className="adjust-hint">Shows POS IDs already linked inside the system.</span>
                  </div>
                </div>
              </div>

              <div className="adjust-section stock-form__section">
                <div className="adjust-section__title">Medication Guidance</div>
                <div className="stock-form__section-copy">
                  Keep the guidance fields structured and readable for both staff and customers.
                </div>
                <div className="stock-form__editor-block">
                  <div className="adjust-grid stock-form__dosage-grid">
                    <div className="adjust-field">
                      <label>Dose</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={newVariantDosageAmount}
                        onChange={(e) => setNewVariantDosageAmount(e.target.value)}
                        placeholder="e.g. 1"
                      />
                    </div>
                    <div className="adjust-field">
                      <label>Frequency per day</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={newVariantDosageQuantity}
                        onChange={(e) => setNewVariantDosageQuantity(e.target.value)}
                        placeholder="e.g. 2"
                      />
                    </div>
                  </div>
                  <div className="adjust-field">
                    <label>Directions</label>
                    <textarea
                      rows={3}
                      value={newVariantDirections}
                      onChange={(e) => setNewVariantDirections(e.target.value)}
                      placeholder="How the customer should use this medication"
                    />
                  </div>
                  <div className="adjust-field">
                    <label>Warnings</label>
                    <textarea
                      rows={3}
                      value={newVariantWarnings}
                      onChange={(e) => setNewVariantWarnings(e.target.value)}
                      placeholder="Safety warnings, contraindications, or cautions"
                    />
                  </div>
                </div>
              </div>

              <div className="adjust-section stock-form__section">
                <div className="adjust-section__title">Pricing And Stock</div>
                <div className="stock-form__section-copy">
                  Finish with the price, opening quantity, and low-stock alert level.
                </div>
                <div className="adjust-grid stock-form__pricing-grid">
                  <div className="adjust-field">
                    <label>Selling price</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={newVariantPrice}
                      onChange={(e) => setNewVariantPrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="adjust-field">
                    <label>Opening stock quantity</label>
                    <input
                      type="number"
                      min={0}
                      value={newVariantStockQuantity}
                      onChange={(e) => setNewVariantStockQuantity(e.target.value)}
                    />
                  </div>
                  <div className="adjust-field">
                    <label>Low stock threshold</label>
                    <input
                      type="number"
                      min={0}
                      value={newVariantLowStockThreshold}
                      onChange={(e) => setNewVariantLowStockThreshold(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {newStockError && <p className="adjust-error">{newStockError}</p>}
            </div>
            <div className="modal__footer modal__footer--stock">
              <button className="btn btn--outline btn--sm" onClick={closeNewStockModal}>Cancel</button>
              <button className="btn btn--primary btn--sm" onClick={handleNewStockSave} disabled={newStockSaving}>
                {newStockSaving ? 'Saving…' : 'Create Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {adjustItem && (
        <div className="modal-overlay" onClick={closeAdjustModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{isVariantManaged(adjustItem) ? 'Manage Variant Stock' : 'Adjust Stock'}</h2>
              <button className="modal__close" onClick={closeAdjustModal}>×</button>
            </div>
            <div className="modal__content">
              <div className="adjust-info">
                <p className="adjust-title">{adjustItem.name}</p>
                <p className="adjust-subtitle">{adjustItem.sku} · {isVariantManaged(adjustItem) ? 'Variant-managed parent product' : 'Single SKU product'}</p>
              </div>

              {showProductPicker && !filterProductId && (
                <div className="adjust-section">
                  <div className="adjust-section__title">Product</div>
                  <div className="adjust-grid adjust-grid--single">
                    <div className="adjust-field">
                      <label>Choose product</label>
                      <select
                        value={adjustItem.id}
                        onChange={(e) => {
                          const selected = inventory.find((item) => item.id === Number(e.target.value))
                          if (selected) populateAdjustForm(selected, { showPicker: true })
                        }}
                      >
                        {sortedInventory.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} · {item.sku}
                          </option>
                        ))}
                      </select>
                      <span className="adjust-hint">Select the product whose stock you want to update.</span>
                    </div>
                  </div>
                </div>
              )}

              {isVariantManaged(adjustItem) ? (
                <>
                  <div className="adjust-section">
                    <div className="adjust-section__title">Stock Model</div>
                    <div className="adjust-callout">
                      Base-product stock is read-only for variant-managed products. Each variant below is a separate sellable item with its own SKU, POS link, and stock rules.
                    </div>
                  </div>

                  <div className="adjust-section">
                    <div className="adjust-section__title">Variant Stock</div>
                    {variantDrafts.length === 0 ? (
                      <div className="inventory-empty">No variants exist yet. Use New Stock to create the first sellable variant for this product.</div>
                    ) : (
                      <div className="adjust-variant-list">
                        {variantDrafts.map((draft) => {
                          const status = getVariantDraftStatus(draft)
                          return (
                            <div key={draft.id} className="adjust-variant-card">
                              <div className="adjust-variant-card__header">
                                <div className="adjust-variant-card__copy">
                                  <div className="adjust-variant-card__title">{draft.name}</div>
                                  <div className="adjust-variant-card__meta">
                                    {draft.sku || 'No SKU'}
                                    {draft.pos_product_id ? ` · POS ${draft.pos_product_id}` : ' · No POS Product ID'}
                                    {draft.barcode ? ` · Barcode ${draft.barcode}` : ''}
                                  </div>
                                  <div className="adjust-variant-card__meta">
                                    {draft.strength ? `${draft.strength} · ` : ''}Selling price {draft.price ? `KSh ${Number(draft.price).toLocaleString()}` : '—'}
                                  </div>
                                  {draft.dosage_instructions && (
                                    <div className="adjust-variant-card__meta">Dosage: {draft.dosage_instructions}</div>
                                  )}
                                  {draft.directions && (
                                    <div className="adjust-variant-card__meta">Directions: {draft.directions}</div>
                                  )}
                                  {draft.warnings && (
                                    <div className="adjust-variant-card__meta">Warnings: {draft.warnings}</div>
                                  )}
                                  <div className="adjust-variant-card__meta">{formatVariantAttributes(draft.attributes)}</div>
                                </div>
                                <span className={getStatusClass(status)}>{formatStatusLabel(status)}</span>
                              </div>

                              <div className="adjust-grid">
                                <div className="adjust-field">
                                  <label>Available stock</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={draft.stock_quantity}
                                    onChange={(e) => handleVariantDraftChange(draft.id, { stock_quantity: e.target.value })}
                                  />
                                </div>
                                <div className="adjust-field">
                                  <label>Low stock threshold</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={draft.low_stock_threshold}
                                    onChange={(e) => handleVariantDraftChange(draft.id, { low_stock_threshold: e.target.value })}
                                  />
                                </div>
                              </div>

                              <div className="adjust-grid adjust-grid--single">
                                <div className="adjust-field">
                                  <label className="adjust-checkbox">
                                    <input
                                      type="checkbox"
                                      checked={draft.allow_backorder}
                                      onChange={(e) => handleVariantDraftChange(draft.id, { allow_backorder: e.target.checked })}
                                    />
                                    Allow backorders
                                  </label>
                                </div>
                                {draft.allow_backorder && (
                                  <div className="adjust-field">
                                    <label>Max backorder quantity</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={draft.max_backorder_quantity}
                                      onChange={(e) => handleVariantDraftChange(draft.id, { max_backorder_quantity: e.target.value })}
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="adjust-variant-card__footer">
                                <span className="adjust-hint">
                                  Source: {formatVariantStockSource(draft.stock_source)} · Sellable quantity: {getVariantDraftAvailableQuantity(draft)}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="adjust-section">
                    <div className="adjust-section__title">POS Refresh</div>
                    <div className="adjust-pos-card">
                      <div>
                        <div className="adjust-pos-row">
                          <span>POS-backed quantity</span>
                          <strong>{getPosManagedQuantity(adjustItem)}</strong>
                        </div>
                        <div className="adjust-pos-row">
                          <span>Variants currently POS-backed</span>
                          <span>{(adjustItem.variants ?? []).filter((variant) => variant.stock_source === 'warehouse').length}</span>
                        </div>
                        <p className="adjust-hint">Syncing here refreshes all variants from the POS and replaces the current values shown above.</p>
                      </div>
                      <button
                        className="cm-row-btn cm-row-btn--warn"
                        type="button"
                        onClick={() => handlePosSync(adjustItem)}
                        disabled={Boolean(posSyncingIds[adjustItem.id])}
                      >
                        {posSyncingIds[adjustItem.id] ? 'Syncing…' : 'Sync All Variants'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="adjust-section">
                    <div className="adjust-section__title">Main Shop Stock</div>
                    <div className="adjust-grid adjust-grid--single">
                      <div className="adjust-field">
                        <span className="adjust-hint">
                          Need a sellable variant with its own strength, dosage instructions, directions, POS link, and price? Use the `New Stock` action first.
                        </span>
                      </div>
                    </div>
                    <div className="adjust-grid">
                      <div className="adjust-field">
                        <label>Available stock</label>
                        <input type="number" min={0} value={branchStock} onChange={(e) => setBranchStock(e.target.value)} />
                      </div>
                      <div className="adjust-field">
                        <label>Low stock threshold</label>
                        <input type="number" min={0} value={branchThreshold} onChange={(e) => setBranchThreshold(e.target.value)} />
                      </div>
                    </div>
                    <div className="adjust-grid adjust-grid--single">
                      <div className="adjust-field">
                        <label className="adjust-checkbox">
                          <input type="checkbox" checked={branchAllowBackorder} onChange={(e) => setBranchAllowBackorder(e.target.checked)} />
                          Allow backorders
                        </label>
                      </div>
                      {branchAllowBackorder && (
                        <div className="adjust-field">
                          <label>Max backorder quantity</label>
                          <input type="number" min={0} value={branchMaxBackorder} onChange={(e) => setBranchMaxBackorder(e.target.value)} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="adjust-section">
                    <div className="adjust-section__title">POS Store (Synced, Read-only)</div>
                    <div className="adjust-pos-card">
                      <div>
                        <div className="adjust-pos-row">
                          <span>POS stock</span>
                          <strong>{getInventoryQuantity(adjustItem, 'warehouse')}</strong>
                        </div>
                        <div className="adjust-pos-row">
                          <span>Source</span>
                          <span>{posInventory?.source_name || 'POS Store'}</span>
                        </div>
                        <div className="adjust-pos-row">
                          <span>Last sync</span>
                          <span>{formatDateTime(posInventory?.last_synced_at)}</span>
                        </div>
                        <p className="adjust-hint">POS stock is refreshed from the external POS system. Edit only Main Shop stock here.</p>
                      </div>
                      <button
                        className="cm-row-btn cm-row-btn--warn"
                        type="button"
                        onClick={() => handlePosSync(adjustItem)}
                        disabled={Boolean(posSyncingIds[adjustItem.id])}
                      >
                        {posSyncingIds[adjustItem.id] ? 'Syncing…' : 'Sync POS Now'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {adjustError && <p className="adjust-error">{adjustError}</p>}
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={closeAdjustModal}>Cancel</button>
              <button className="btn btn--primary btn--sm" onClick={handleAdjustSave} disabled={adjustSaving}>
                {adjustSaving ? 'Saving…' : isVariantManaged(adjustItem) ? 'Save Variant Stock' : 'Save Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryManagement
