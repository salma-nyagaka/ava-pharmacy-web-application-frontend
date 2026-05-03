import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SearchableMultiSelect } from '../../components/SearchableMultiSelect/SearchableMultiSelect'
import { adminProductService, ApiHealthConcern, ApiInventoryProduct, ApiPosProductOption, ApiProduct, ApiProductVariant } from '../../services/adminProductService'
import { resolveMediaUrl } from '../../lib/apiClient'
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
  healthConcernIds: number[]
  price: string
  requires_prescription: boolean
  image: string
  imageFile: File | null
  attributes: Record<string, unknown>
  stock_source: ApiProductVariant['stock_source']
  is_active: boolean
  branch_stock_quantity: string
  branch_low_stock_threshold: string
  branch_allow_backorder: boolean
  branch_max_backorder_quantity: string
  warehouse_stock_quantity: string
  warehouse_low_stock_threshold: string
  warehouse_allow_backorder: boolean
  warehouse_max_backorder_quantity: string
}

function generateVariantSku(product: Pick<ApiProduct, 'slug' | 'name'>, variantName: string) {
  const productKey = (product.slug || product.name || 'variant')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 18)
  const base = `${productKey}-${variantName}`
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36)
  const suffix = Date.now().toString(36).toUpperCase().slice(-4)
  return `${base || productKey}-${suffix}`
}

function getInventoryItem(product: ApiInventoryProduct, location: 'branch' | 'warehouse') {
  return product.inventories?.find((inventory) => inventory.location === location)
}

function getInventoryQuantity(product: ApiInventoryProduct, location: 'branch' | 'warehouse') {
  return getInventoryItem(product, location)?.stock_quantity ?? 0
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

function getManagedStock(product: ApiInventoryProduct): number {
  return getInventoryQuantity(product, 'branch')
}

function getPosManagedQuantity(product: ApiInventoryProduct): number {
  return getInventoryQuantity(product, 'warehouse')
}

function getSellableQuantity(product: ApiInventoryProduct): number {
  return product.available_quantity ?? product.stock_quantity ?? 0
}

function formatBackorderSummary(product: ApiInventoryProduct): string {
  if (!product.allow_backorder) return 'No'
  const quantity = product.max_backorder_quantity ?? 0
  return quantity > 0 ? `Yes · ${quantity}` : 'Yes'
}

function getParentProductId(item: ApiInventoryProduct): number {
  return item.product_id ?? item.id
}

function createVariantDraft(variant: ApiProductVariant): VariantDraft {
  const branchInventory = variant.inventories?.find((inventory) => inventory.location === 'branch')
  const warehouseInventory = variant.inventories?.find((inventory) => inventory.location === 'warehouse')
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
    healthConcernIds: Array.isArray(variant.health_concerns) ? variant.health_concerns.map((concern) => concern.id) : [],
    price: variant.price ?? variant.effective_price ?? '',
    requires_prescription: Boolean(variant.requires_prescription),
    image: variant.image ?? '',
    imageFile: null,
    attributes: variant.attributes ?? {},
    stock_source: variant.stock_source,
    is_active: Boolean(variant.is_active),
    branch_stock_quantity: String(branchInventory?.stock_quantity ?? variant.stock_quantity ?? 0),
    branch_low_stock_threshold: String(branchInventory?.low_stock_threshold ?? variant.low_stock_threshold ?? 0),
    branch_allow_backorder: Boolean(branchInventory?.allow_backorder ?? variant.allow_backorder),
    branch_max_backorder_quantity: String(branchInventory?.max_backorder_quantity ?? variant.max_backorder_quantity ?? 0),
    warehouse_stock_quantity: String(warehouseInventory?.stock_quantity ?? 0),
    warehouse_low_stock_threshold: String(warehouseInventory?.low_stock_threshold ?? 0),
    warehouse_allow_backorder: Boolean(warehouseInventory?.allow_backorder),
    warehouse_max_backorder_quantity: String(warehouseInventory?.max_backorder_quantity ?? 0),
  }
}

function parseNonNegativeInteger(value: string): number {
  return Math.max(0, Number.parseInt(value, 10) || 0)
}

function getVariantDraftQuantity(draft: VariantDraft): number {
  return parseNonNegativeInteger(draft.branch_stock_quantity) + parseNonNegativeInteger(draft.warehouse_stock_quantity)
}

function getVariantDraftThreshold(draft: VariantDraft): number {
  return parseNonNegativeInteger(draft.branch_low_stock_threshold) + parseNonNegativeInteger(draft.warehouse_low_stock_threshold)
}

function getVariantDraftMaxBackorder(draft: VariantDraft): number {
  const branchBackorder = draft.branch_allow_backorder ? parseNonNegativeInteger(draft.branch_max_backorder_quantity) : 0
  const warehouseBackorder = draft.warehouse_allow_backorder ? parseNonNegativeInteger(draft.warehouse_max_backorder_quantity) : 0
  return branchBackorder + warehouseBackorder
}

function getVariantDraftAvailableQuantity(draft: VariantDraft): number {
  const stockQuantity = getVariantDraftQuantity(draft)
  if (!draft.branch_allow_backorder && !draft.warehouse_allow_backorder) return stockQuantity
  return stockQuantity + getVariantDraftMaxBackorder(draft)
}

function getVariantDraftStatus(draft: VariantDraft): string {
  if (!draft.is_active) return 'inactive'
  const stockQuantity = getVariantDraftQuantity(draft)
  if (stockQuantity === 0) return draft.branch_allow_backorder || draft.warehouse_allow_backorder ? 'backorder' : 'out_of_stock'
  if (stockQuantity <= getVariantDraftThreshold(draft)) return 'low_stock'
  return 'in_stock'
}

function formatVariantAttributes(attributes: Record<string, unknown>): string {
  const entries = Object.entries(attributes ?? {}).filter(([, value]) => value !== null && value !== '')
  if (entries.length === 0) return 'No attributes'
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(' · ')
}

function buildVariantFormData(payload: {
  name?: string
  sku?: string
  pos_product_id?: string
  strength?: string
  dosage_instructions?: string
  directions?: string
  warnings?: string
  health_concern_ids?: number[]
  requires_prescription?: boolean
  price?: number
  branch_inventory?: { stock_quantity?: number; low_stock_threshold?: number; allow_backorder?: boolean; max_backorder_quantity?: number }
  warehouse_inventory?: { stock_quantity?: number; low_stock_threshold?: number; allow_backorder?: boolean; max_backorder_quantity?: number }
  is_active?: boolean
  image?: File | null
}) {
  const formData = new FormData()
  if (payload.name !== undefined) formData.append('name', payload.name)
  if (payload.sku !== undefined) formData.append('sku', payload.sku)
  if (payload.pos_product_id !== undefined) formData.append('pos_product_id', payload.pos_product_id)
  if (payload.strength !== undefined) formData.append('strength', payload.strength)
  if (payload.dosage_instructions !== undefined) formData.append('dosage_instructions', payload.dosage_instructions)
  if (payload.directions !== undefined) formData.append('directions', payload.directions)
  if (payload.warnings !== undefined) formData.append('warnings', payload.warnings)
  if (payload.health_concern_ids !== undefined) payload.health_concern_ids.forEach((id) => formData.append('health_concern_ids', String(id)))
  if (payload.requires_prescription !== undefined) formData.append('requires_prescription', String(payload.requires_prescription))
  if (payload.price !== undefined) formData.append('price', String(payload.price))
  if (payload.branch_inventory !== undefined) formData.append('branch_inventory', JSON.stringify(payload.branch_inventory))
  if (payload.warehouse_inventory !== undefined) formData.append('warehouse_inventory', JSON.stringify(payload.warehouse_inventory))
  if (payload.is_active !== undefined) formData.append('is_active', String(payload.is_active))
  if (payload.image) formData.append('image', payload.image)
  return formData
}

function InventoryManagement() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [inventory, setInventory] = useState<ApiInventoryProduct[]>([])
  const [parentProducts, setParentProducts] = useState<ApiProduct[]>([])
  const [allConcerns, setAllConcerns] = useState<ApiHealthConcern[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<InventoryStatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('sellable_quantity')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [adjustItem, setAdjustItem] = useState<ApiInventoryProduct | null>(null)
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
  const [newVariantHealthConcernIds, setNewVariantHealthConcernIds] = useState<number[]>([])
  const [newVariantRequiresPrescription, setNewVariantRequiresPrescription] = useState(false)
  const [newVariantPosProductId, setNewVariantPosProductId] = useState('')
  const [newVariantPrice, setNewVariantPrice] = useState('')
  const [newVariantImage, setNewVariantImage] = useState<File | null>(null)
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

  useEffect(() => {
    void adminProductService.listHealthConcerns()
      .then(setAllConcerns)
      .catch(() => setAllConcerns([]))
  }, [])

  useEffect(() => {
    void adminProductService.listProducts()
      .then(setParentProducts)
      .catch(() => setParentProducts([]))
  }, [])

  async function buildInventoryList(productId?: string | null) {
    return adminProductService.listInventory(productId ? { product_id: productId } : undefined)
  }

  async function loadInventory() {
    setLoading(true)
    setError('')
    try {
      const items = await buildInventoryList(filterProductId)
      setInventory(items)

      if (filterProductId) {
        const targetId = Number(filterProductId)
        const match = items.find((product) => getParentProductId(product) === targetId)
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

  async function refreshInventoryItem(productId: number, inventoryItemId?: number) {
    const items = await buildInventoryList(String(productId))
    const refreshed = inventoryItemId ? items.find((item) => item.id === inventoryItemId) ?? null : items[0] ?? null
    if (!refreshed) return null

    setInventory((prev) => {
      if (filterProductId) return items
      const refreshedIds = new Set(items.map((item) => item.id))
      const remaining = prev.filter((item) => !refreshedIds.has(item.id))
      return [...items, ...remaining]
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
    setNewVariantHealthConcernIds([])
    setNewVariantRequiresPrescription(false)
    setNewVariantPosProductId('')
    setNewVariantPrice('')
    setNewVariantImage(null)
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
    const fallbackProductId = parentProducts[0]?.id ?? ''
    if (!initialItem && !fallbackProductId) return
    setNewStockProductId(initialItem ? getParentProductId(initialItem) : fallbackProductId)
    resetNewStockForm()
    setShowNewStockModal(true)
  }

  const handleNewStockSave = async () => {
    const selectedProduct = parentProducts.find((item) => item.id === Number(newStockProductId))
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
    if (!newVariantImage) {
      setNewStockError('Attach an image for this stock item before saving.')
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

      const variantPayload = {
        name: newVariantName.trim(),
        sku: generateVariantSku(selectedProduct, newVariantName),
        pos_product_id: newVariantPosProductId,
        strength: newVariantStrength.trim(),
        dosage_instructions: dosageInstructionValue,
        directions: newVariantDirections.trim(),
        warnings: newVariantWarnings.trim(),
        health_concern_ids: newVariantHealthConcernIds,
        requires_prescription: newVariantRequiresPrescription,
        price: priceValue,
        branch_inventory: {
          stock_quantity: parseNonNegativeInteger(newVariantStockQuantity),
          low_stock_threshold: parseNonNegativeInteger(newVariantLowStockThreshold),
        },
        is_active: true,
        image: newVariantImage,
      }
      await adminProductService.createProductVariant(
        selectedProduct.id,
        newVariantImage ? buildVariantFormData(variantPayload) : variantPayload,
      )
      const refreshed = await refreshInventoryItem(selectedProduct.id)
      if (refreshed && adjustItem?.id === refreshed.id) {
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
    if (variantDrafts.length === 0) {
      setAdjustError('Use New Stock to create a variant before managing stock here.')
      return
    }

    const variantUpdates = []
    for (const draft of variantDrafts) {
      if (!draft.image && !draft.imageFile) {
        setAdjustError(`Attach an image for ${draft.name} before saving stock changes.`)
        return
      }
      const branchPayload = {
        stock_quantity: parseNonNegativeInteger(draft.branch_stock_quantity),
        low_stock_threshold: parseNonNegativeInteger(draft.branch_low_stock_threshold),
        allow_backorder: draft.branch_allow_backorder,
        max_backorder_quantity: draft.branch_allow_backorder ? parseNonNegativeInteger(draft.branch_max_backorder_quantity) : 0,
      }
      const warehousePayload = {
        stock_quantity: parseNonNegativeInteger(draft.warehouse_stock_quantity),
        low_stock_threshold: parseNonNegativeInteger(draft.warehouse_low_stock_threshold),
        allow_backorder: draft.warehouse_allow_backorder,
        max_backorder_quantity: draft.warehouse_allow_backorder ? parseNonNegativeInteger(draft.warehouse_max_backorder_quantity) : 0,
      }

      if (draft.branch_allow_backorder && branchPayload.max_backorder_quantity === 0) {
        setAdjustError(`Set a main shop max backorder quantity greater than 0 for ${draft.name}.`)
        return
      }
      if (draft.warehouse_allow_backorder && warehousePayload.max_backorder_quantity === 0) {
        setAdjustError(`Set a POS store max backorder quantity greater than 0 for ${draft.name}.`)
        return
      }

      variantUpdates.push({
        variantId: draft.id,
        payload: {
          health_concern_ids: draft.healthConcernIds,
          requires_prescription: draft.requires_prescription,
          branch_inventory: branchPayload,
          warehouse_inventory: warehousePayload,
        },
        imageFile: draft.imageFile,
      })
    }

    setAdjustSaving(true)
    setAdjustError('')
    try {
      await Promise.all(
        variantUpdates.map((update) =>
          adminProductService.updateProductVariant(
            getParentProductId(adjustItem),
            update.variantId,
            update.imageFile
              ? buildVariantFormData({ ...update.payload, image: update.imageFile })
              : update.payload,
          ),
        ),
      )
      await refreshInventoryItem(getParentProductId(adjustItem), adjustItem.id)
      closeAdjustModal()
    } catch {
      setAdjustError('Failed to save variant stock changes.')
    } finally {
      setAdjustSaving(false)
    }
  }

  const handlePosSync = async (item: ApiInventoryProduct) => {
    setPosSyncingIds((prev) => ({ ...prev, [item.id]: true }))
    setPosSyncError('')
    try {
      const variantIds = (item.variants ?? []).map((variant) => variant.id)
      if (variantIds.length === 0) {
        setPosSyncError('Use New Stock to create a variant before syncing POS stock for this item.')
        return
      }
      await adminProductService.refreshVariantPosInventory(variantIds, true)
      const refreshed = await refreshInventoryItem(getParentProductId(item), item.id)
      if (refreshed && adjustItem?.id === item.id) {
        populateAdjustForm(refreshed)
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
            <strong>{focusedProduct.product_name ?? focusedProduct.name}</strong>
            <span className="inventory-focus-banner__meta">
              {`${inventory.length} inventory item${inventory.length === 1 ? '' : 's'} · Main Shop ${getManagedStock(focusedProduct)} · POS ${getPosManagedQuantity(focusedProduct)}`}
            </span>
          </div>
          <span className="inventory-model-chip inventory-model-chip--variant">Inventory variants</span>
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
            <span className="cm-kpi-card__label">Tracked Variants</span>
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
            placeholder="Search parent product, variant, or SKU…"
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
                  <th>Inventory Item</th>
                  <th>Parent Product</th>
                  <th>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleSort('managed_stock')}>
                      Main Shop {getSortIndicator('managed_stock')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleSort('pos_stock')}>
                      POS Store {getSortIndicator('pos_stock')}
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

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="inventory-product-cell">
                          <div className="inventory-product-cell__thumb">
                            {item.image ? (
                              <img src={resolveMediaUrl(item.image) || item.image} alt={item.name} />
                            ) : (
                              <span>{item.name.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span>{item.name}</span>
                            <span className="cm-name-cell__id">{item.sku}{item.strength ? ` · ${item.strength}` : ''}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span>{item.product_name || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span>{getManagedStock(item)}</span>
                          <span className="cm-name-cell__id">Branch inventory</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span>{getPosManagedQuantity(item)}</span>
                          <span className="cm-name-cell__id">Warehouse / POS store</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span>{getSellableQuantity(item)}</span>
                          <span className="cm-name-cell__id">Available to sell</span>
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
                          <Link
                            className="cm-row-btn"
                            to={`/admin/products?product=${getParentProductId(item)}`}
                          >
                            Parent Record
                          </Link>
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
                            {posSyncingIds[item.id] ? 'Syncing…' : 'Sync POS'}
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
                      {parentProducts.map((item) => (
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
                  <div className="adjust-field">
                    <label>Variant image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewVariantImage(e.target.files?.[0] ?? null)}
                    />
                    <span className="adjust-hint">Attach the exact image staff should use for this stock item.</span>
                  </div>
                  <div className="adjust-field">
                    <label>Health concerns</label>
                    <SearchableMultiSelect
                      value={newVariantHealthConcernIds}
                      onChange={(values) => setNewVariantHealthConcernIds(values.map((value) => Number(value)))}
                      options={allConcerns.filter((concern) => concern.is_active).map((concern) => ({ value: concern.id, label: concern.name }))}
                      placeholder="Tag this variant to one or more concerns…"
                    />
                    <span className="adjust-hint">Use variant-level tags for storefront filters and more precise catalog grouping.</span>
                  </div>
                  <div className="adjust-field">
                    <label className="adjust-checkbox">
                      <input
                        type="checkbox"
                        checked={newVariantRequiresPrescription}
                        onChange={(e) => setNewVariantRequiresPrescription(e.target.checked)}
                      />
                      Prescription required for this variant
                    </label>
                    <span className="adjust-hint">Set this on the variant that actually needs a prescription.</span>
                  </div>
                </div>
                {newVariantImage && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <img
                      src={URL.createObjectURL(newVariantImage)}
                      alt="New stock preview"
                      style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 12, border: '1px solid #e5e7eb' }}
                    />
                  </div>
                )}
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
              <h2>Manage Variant Stock</h2>
              <button className="modal__close" onClick={closeAdjustModal}>×</button>
            </div>
            <div className="modal__content">
              <div className="adjust-info">
                <p className="adjust-title">{adjustItem.name}</p>
                <p className="adjust-subtitle">{adjustItem.product_name ?? adjustItem.name} · {adjustItem.sku}</p>
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

              <div className="adjust-section">
                <div className="adjust-section__title">Inventory Item</div>
                <div className="adjust-callout">
                  This page manages sellable variant inventory. Main Shop and POS Store values below belong to this inventory item.
                </div>
              </div>

              <div className="adjust-section">
                <div className="adjust-section__title">Inventory Stock</div>
                {variantDrafts.length === 0 ? (
                  <div className="inventory-empty">No inventory item is available to edit.</div>
                ) : (
                  <div className="adjust-variant-list">
                    {variantDrafts.map((draft) => {
                      const status = getVariantDraftStatus(draft)
                      return (
                        <div key={draft.id} className="adjust-variant-card">
                          <div className="adjust-variant-card__header">
                            <div className="adjust-variant-card__copy">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <div style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#f8fafc', flexShrink: 0 }}>
                                  {(draft.imageFile || draft.image) ? (
                                    <img
                                      src={draft.imageFile ? URL.createObjectURL(draft.imageFile) : (resolveMediaUrl(draft.image) || draft.image)}
                                      alt={draft.name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', padding: '0.35rem' }}>
                                      No image
                                    </div>
                                  )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div className="adjust-variant-card__title">{draft.name}</div>
                                  <div className="adjust-variant-card__meta">
                                    {draft.sku || 'No SKU'}
                                    {draft.pos_product_id ? ` · POS ${draft.pos_product_id}` : ' · No POS Product ID'}
                                    {draft.barcode ? ` · Barcode ${draft.barcode}` : ''}
                                  </div>
                                  {(draft.imageFile || draft.image) && (
                                    <a
                                      href={draft.imageFile ? URL.createObjectURL(draft.imageFile) : (resolveMediaUrl(draft.image) || draft.image || '#')}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="adjust-variant-card__image-link"
                                    >
                                      Open image
                                    </a>
                                  )}
                                </div>
                              </div>
                              <div className="adjust-variant-card__meta">
                                {draft.strength ? `${draft.strength} · ` : ''}Selling price {draft.price ? `KSh ${Number(draft.price).toLocaleString()}` : '—'}
                              </div>
                              <div className="adjust-variant-card__meta">
                                {draft.requires_prescription ? 'Prescription required' : 'Over the counter'}
                              </div>
                              <div className="adjust-variant-card__meta">
                                {draft.healthConcernIds.length > 0
                                  ? `${draft.healthConcernIds.length} health concern${draft.healthConcernIds.length === 1 ? '' : 's'} tagged`
                                  : 'No health concerns tagged'}
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
                              <div className="adjust-variant-card__meta" style={{ marginTop: '0.5rem' }}>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                  <span>Update image</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleVariantDraftChange(draft.id, { imageFile: e.target.files?.[0] ?? null })}
                                  />
                                </label>
                              </div>
                            </div>
                            <span className={getStatusClass(status)}>{formatStatusLabel(status)}</span>
                          </div>

                          <div className="adjust-grid">
                            <div className="adjust-field">
                              <label>Health concerns</label>
                              <SearchableMultiSelect
                                value={draft.healthConcernIds}
                                onChange={(values) => handleVariantDraftChange(draft.id, { healthConcernIds: values.map((value) => Number(value)) })}
                                options={allConcerns.filter((concern) => concern.is_active).map((concern) => ({ value: concern.id, label: concern.name }))}
                                placeholder="Select variant health concerns…"
                              />
                            </div>
                            <div className="adjust-field">
                              <label className="adjust-checkbox">
                                <input
                                  type="checkbox"
                                  checked={draft.requires_prescription}
                                  onChange={(e) => handleVariantDraftChange(draft.id, { requires_prescription: e.target.checked })}
                                />
                                Prescription required
                              </label>
                            </div>
                          </div>

                          <div className="adjust-grid">
                            <div className="adjust-field">
                              <label>Main Shop stock</label>
                              <input
                                type="number"
                                min={0}
                                value={draft.branch_stock_quantity}
                                onChange={(e) => handleVariantDraftChange(draft.id, { branch_stock_quantity: e.target.value })}
                              />
                            </div>
                            <div className="adjust-field">
                              <label>Main Shop threshold</label>
                              <input
                                type="number"
                                min={0}
                                value={draft.branch_low_stock_threshold}
                                onChange={(e) => handleVariantDraftChange(draft.id, { branch_low_stock_threshold: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="adjust-grid">
                            <div className="adjust-field">
                              <label>POS Store stock</label>
                              <input
                                type="number"
                                min={0}
                                value={draft.warehouse_stock_quantity}
                                onChange={(e) => handleVariantDraftChange(draft.id, { warehouse_stock_quantity: e.target.value })}
                              />
                            </div>
                            <div className="adjust-field">
                              <label>POS Store threshold</label>
                              <input
                                type="number"
                                min={0}
                                value={draft.warehouse_low_stock_threshold}
                                onChange={(e) => handleVariantDraftChange(draft.id, { warehouse_low_stock_threshold: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="adjust-grid">
                            <div className="adjust-field">
                              <label className="adjust-checkbox">
                                <input
                                  type="checkbox"
                                  checked={draft.branch_allow_backorder}
                                  onChange={(e) => handleVariantDraftChange(draft.id, { branch_allow_backorder: e.target.checked })}
                                />
                                Main Shop backorder
                              </label>
                            </div>
                            {draft.branch_allow_backorder && (
                              <div className="adjust-field">
                                <label>Main Shop max backorder</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={draft.branch_max_backorder_quantity}
                                  onChange={(e) => handleVariantDraftChange(draft.id, { branch_max_backorder_quantity: e.target.value })}
                                />
                              </div>
                            )}
                          </div>

                          <div className="adjust-grid">
                            <div className="adjust-field">
                              <label className="adjust-checkbox">
                                <input
                                  type="checkbox"
                                  checked={draft.warehouse_allow_backorder}
                                  onChange={(e) => handleVariantDraftChange(draft.id, { warehouse_allow_backorder: e.target.checked })}
                                />
                                POS Store backorder
                              </label>
                            </div>
                            {draft.warehouse_allow_backorder && (
                              <div className="adjust-field">
                                <label>POS Store max backorder</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={draft.warehouse_max_backorder_quantity}
                                  onChange={(e) => handleVariantDraftChange(draft.id, { warehouse_max_backorder_quantity: e.target.value })}
                                />
                              </div>
                            )}
                          </div>

                          <div className="adjust-variant-card__footer">
                            <span className="adjust-hint">
                              Sellable quantity: {getVariantDraftAvailableQuantity(draft)} · Main Shop {parseNonNegativeInteger(draft.branch_stock_quantity)} · POS Store {parseNonNegativeInteger(draft.warehouse_stock_quantity)}
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
                      <span>{(adjustItem.variants ?? []).filter((variant) => (variant.inventories ?? []).some((inventory) => inventory.location === 'warehouse' && inventory.stock_quantity > 0)).length}</span>
                    </div>
                    <p className="adjust-hint">Syncing here refreshes all variant POS Store rows and replaces the values shown above.</p>
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

              {adjustError && <p className="adjust-error">{adjustError}</p>}
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={closeAdjustModal}>Cancel</button>
              <button className="btn btn--primary btn--sm" onClick={handleAdjustSave} disabled={adjustSaving}>
                {adjustSaving ? 'Saving…' : 'Save Variant Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryManagement
