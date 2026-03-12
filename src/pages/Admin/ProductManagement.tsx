import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import {
  adminProductService,
  ApiBrand,
  ApiProductCategory,
  ApiHealthConcern,
  ApiProductSubcategory,
  ApiProduct,
  ProductCreatePayload,
} from '../../services/adminProductService'
import './AdminShared.css'
import '../../styles/admin/shared/AdminButtonUtilities.css'
import '../../styles/admin/shared/AdminEntityManagement.css'
import './ProductManagement.css'

const PAGE_SIZE = 6

function formatDate(value?: string): string {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCurrency(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '—'
  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) ? `KSh ${amount.toLocaleString()}` : '—'
}

function getEffectiveSellingPrice(product: ApiProduct): number {
  const sellingPrice = Number(product.price)
  const discountPrice = Number(product.discount_price)

  if (Number.isFinite(discountPrice) && discountPrice > 0 && discountPrice < sellingPrice) {
    return discountPrice
  }

  return sellingPrice
}

function getMarginData(product: ApiProduct): { amount: number; percent: number } | null {
  const costPrice = Number(product.cost_price)
  if (!Number.isFinite(costPrice) || costPrice <= 0) return null

  const effectiveSellingPrice = getEffectiveSellingPrice(product)
  const amount = effectiveSellingPrice - costPrice
  const percent = effectiveSellingPrice > 0 ? (amount / effectiveSellingPrice) * 100 : 0

  return { amount, percent }
}

function formatFeatureLines(features: string[] | null | undefined): string {
  return Array.isArray(features) ? features.join('\n') : ''
}

function parseFeatureLines(value: string): string[] {
  return value
    .split('\n')
    .map((feature) => feature.trim())
    .filter(Boolean)
}

function generateSku(name: string): string {
  const base = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 12)
  const suffix = Date.now().toString(36).toUpperCase().slice(-4)
  return `${base}-${suffix}`
}

function generateSlug(name: string): string {
  return name.trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function getInventoryItem(product: ApiProduct, location: 'branch' | 'warehouse') {
  return product.inventories?.find((inventory) => inventory.location === location)
}

function getInventoryQuantity(product: ApiProduct, location: 'branch' | 'warehouse') {
  return getInventoryItem(product, location)?.stock_quantity ?? 0
}

function formatInventoryBreakdown(product: ApiProduct): string {
  const branchQty = getInventoryQuantity(product, 'branch')
  const warehouseQty = getInventoryQuantity(product, 'warehouse')
  return `Shop:${branchQty} · POS:${warehouseQty}`
}

function isFieldErrorMap(value: unknown): value is Record<string, string | string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  return Object.values(value).every(
    (entry) => typeof entry === 'string' || (Array.isArray(entry) && entry.every((item) => typeof item === 'string')),
  )
}

type ProductFormPayload =
  Pick<ProductCreatePayload, 'name' | 'slug' | 'sku' | 'price' | 'is_active' | 'requires_prescription'>
  & Partial<ProductCreatePayload>

function ProductManagement() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [brands, setBrands] = useState<ApiBrand[]>([])
  const [categories, setCategories] = useState<ApiProductCategory[]>([])
  const [subcategories, setSubcategories] = useState<ApiProductSubcategory[]>([])
  const [allConcerns, setAllConcerns] = useState<ApiHealthConcern[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSubcat, setSelectedSubcat] = useState('all')
  const [selectedConcern, setSelectedConcern] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ApiProduct | null>(null)

  const [productName, setProductName] = useState('')
  const [productSlug, setProductSlug] = useState('')
  const [productSku, setProductSku] = useState('')
  const [productStrength, setProductStrength] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productCostPrice, setProductCostPrice] = useState('')
  const [productDiscountPrice, setProductDiscountPrice] = useState('')
  const [productSubcategoryId, setProductSubcategoryId] = useState<number | ''>('')
  const [productBrandId, setProductBrandId] = useState<number | ''>('')
  const [productHealthConcernIds, setProductHealthConcernIds] = useState<number[]>([])
  const [productStatus, setProductStatus] = useState<'active' | 'inactive'>('active')
  const [productRequiresRx, setProductRequiresRx] = useState(false)
  const [productDescription, setProductDescription] = useState('')
  const [productFeaturesText, setProductFeaturesText] = useState('')
  const [productDirections, setProductDirections] = useState('')
  const [productWarnings, setProductWarnings] = useState('')
  const [productBadge, setProductBadge] = useState('')
  const [branchStockQuantity, setBranchStockQuantity] = useState('0')
  const [branchLowStockThreshold, setBranchLowStockThreshold] = useState('5')
  const [branchAllowBackorder, setBranchAllowBackorder] = useState(false)
  const [branchMaxBackorderQuantity, setBranchMaxBackorderQuantity] = useState('0')
  const [productImageFile, setProductImageFile] = useState<File | null>(null)
  const [formError, setFormError] = useState('')
  const [showBrandModal, setShowBrandModal] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [brandDescription, setBrandDescription] = useState('')
  const [brandLogoFile, setBrandLogoFile] = useState<File | null>(null)
  const [brandSaving, setBrandSaving] = useState(false)
  const [brandFormError, setBrandFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ApiProduct | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [prods, brandList, cats, subs, concerns] = await Promise.all([
        adminProductService.listProducts(),
        adminProductService.listBrands(),
        adminProductService.listProductCategories(),
        adminProductService.listProductSubcategories(),
        adminProductService.listHealthConcerns(),
      ])
      setProducts(prods)
      setBrands(brandList)
      setCategories(cats)
      setSubcategories(subs)
      setAllConcerns(concerns)
    } catch {
      setError('Failed to load products.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setProductName('')
    setProductSlug('')
    setProductSku('')
    setProductStrength('')
    setProductPrice('')
    setProductCostPrice('')
    setProductDiscountPrice('')
    setProductSubcategoryId(subcategories[0]?.id ?? '')
    setProductBrandId(brands[0]?.id ?? '')
    setProductHealthConcernIds([])
    setProductStatus('active')
    setProductRequiresRx(false)
    setProductDescription('')
    setProductFeaturesText('')
    setProductDirections('')
    setProductWarnings('')
    setProductBadge('')
    setBranchStockQuantity('0')
    setBranchLowStockThreshold('5')
    setBranchAllowBackorder(false)
    setBranchMaxBackorderQuantity('0')
    setProductImageFile(null)
    setEditingProduct(null)
    setFormError('')
  }

  const openAddModal = () => {
    resetForm()
    setShowAddModal(true)
  }

  const openBrandModal = () => {
    setBrandName('')
    setBrandDescription('')
    setBrandLogoFile(null)
    setBrandFormError('')
    setShowBrandModal(true)
  }

  const closeBrandModal = () => {
    if (brandSaving) return
    setBrandName('')
    setBrandDescription('')
    setBrandLogoFile(null)
    setBrandFormError('')
    setShowBrandModal(false)
  }

  const openEditModal = (product: ApiProduct) => {
    setProductName(product.name)
    setProductSlug(product.slug ?? generateSlug(product.name))
    setProductSku(product.sku)
    setProductStrength(product.strength ?? '')
    setProductPrice(product.price)
    setProductCostPrice(product.cost_price ?? '')
    setProductDiscountPrice(product.discount_price ?? '')
    setProductSubcategoryId(product.subcategory_id ?? (subcategories[0]?.id ?? ''))
    setProductBrandId(product.brand?.id ?? (brands[0]?.id ?? ''))
    setProductHealthConcernIds(product.health_concerns?.map((c) => c.id) ?? [])
    setProductStatus(product.is_active ? 'active' : 'inactive')
    setProductRequiresRx(product.requires_prescription)
    setProductDescription(product.description ?? '')
    setProductFeaturesText(formatFeatureLines(product.features))
    setProductDirections(product.directions ?? '')
    setProductWarnings(product.warnings ?? '')
    setProductBadge(product.badge ?? '')
    setBranchStockQuantity(String(getInventoryItem(product, 'branch')?.stock_quantity ?? 0))
    setBranchLowStockThreshold(String(getInventoryItem(product, 'branch')?.low_stock_threshold ?? 5))
    setBranchAllowBackorder(getInventoryItem(product, 'branch')?.allow_backorder ?? false)
    setBranchMaxBackorderQuantity(String(getInventoryItem(product, 'branch')?.max_backorder_quantity ?? 0))
    setProductImageFile(null)
    setEditingProduct(product)
    setFormError('')
    setShowAddModal(true)
  }

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault()
    if (!productName.trim()) { setFormError('Product name is required.'); return }
    if (!productPrice) { setFormError('Price is required.'); return }
    if (productBrandId === '') {
      setFormError(brands.length === 0 ? 'Create a brand before adding a product.' : 'Brand is required.')
      return
    }
    if (productSubcategoryId === '') {
      setFormError(subcategories.length === 0 ? 'Create a subcategory before adding a product.' : 'Subcategory is required.')
      return
    }
    if (!editingProduct && !productImageFile) { setFormError('Product image is required.'); return }

    const branchInventory = {
      stock_quantity: Math.max(0, Number.parseInt(branchStockQuantity, 10) || 0),
      low_stock_threshold: Math.max(0, Number.parseInt(branchLowStockThreshold, 10) || 0),
      allow_backorder: branchAllowBackorder,
      max_backorder_quantity: branchAllowBackorder
        ? Math.max(0, Number.parseInt(branchMaxBackorderQuantity, 10) || 0)
        : 0,
    }

    if (branchAllowBackorder && branchInventory.max_backorder_quantity === 0) {
      setFormError('Set a main shop max backorder quantity greater than 0 when main shop backorder is enabled.')
      return
    }

    const priceValue = Number(productPrice)
    const costPriceValue = productCostPrice ? Number(productCostPrice) : undefined
    const discountPriceValue = productDiscountPrice ? Number(productDiscountPrice) : undefined

    if (discountPriceValue !== undefined && discountPriceValue >= priceValue) {
      setFormError('Discount price must be lower than the selling price.')
      return
    }

    const features = parseFeatureLines(productFeaturesText)
    const sku = productSku.trim() || generateSku(productName)
    const slug = productSlug.trim() || generateSlug(productName)
    const commonPayload: ProductFormPayload = {
      name: productName.trim(),
      slug,
      sku,
      strength: productStrength.trim(),
      price: priceValue,
      cost_price: costPriceValue,
      discount_price: discountPriceValue,
      brand_id: Number(productBrandId),
      subcategory_id: Number(productSubcategoryId),
      health_concern_ids: productHealthConcernIds,
      is_active: productStatus === 'active',
      requires_prescription: productRequiresRx,
      description: productDescription.trim(),
      features,
      directions: productDirections.trim(),
      warnings: productWarnings.trim(),
      badge: productBadge.trim(),
      branch_inventory: branchInventory,
    }

    const createPayload: ProductCreatePayload = {
      ...commonPayload,
    }

    const updatePayload: ProductFormPayload = {
      ...commonPayload,
    }

    const buildProductFormData = (payload: ProductFormPayload) => {
      const formData = new FormData()
      formData.append('name', payload.name)
      formData.append('slug', payload.slug)
      formData.append('sku', payload.sku)
      formData.append('price', String(payload.price))
      formData.append('is_active', String(payload.is_active))
      formData.append('requires_prescription', String(payload.requires_prescription))
      formData.append('strength', payload.strength ?? '')
      formData.append('description', payload.description ?? '')
      formData.append('features', JSON.stringify(payload.features ?? []))
      formData.append('directions', payload.directions ?? '')
      formData.append('warnings', payload.warnings ?? '')
      formData.append('badge', payload.badge ?? '')
      formData.append('branch_inventory', JSON.stringify(payload.branch_inventory ?? {}))

      if (payload.cost_price !== undefined) formData.append('cost_price', String(payload.cost_price))
      if (payload.discount_price !== undefined) formData.append('discount_price', String(payload.discount_price))
      if (payload.brand_id !== null && payload.brand_id !== undefined) formData.append('brand_id', String(payload.brand_id))
      if (payload.subcategory_id !== null && payload.subcategory_id !== undefined) formData.append('subcategory_id', String(payload.subcategory_id))
      productHealthConcernIds.forEach((id) => formData.append('health_concern_ids', String(id)))
      if (productImageFile) formData.append('image', productImageFile)
      return formData
    }

    setSaving(true)
    setFormError('')
    try {
      if (editingProduct) {
        const requestPayload = productImageFile ? buildProductFormData(updatePayload) : updatePayload
        const updated = await adminProductService.updateProduct(editingProduct.id, requestPayload)
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? updated : p)))
      } else {
        const requestPayload = buildProductFormData(createPayload)
        const created = await adminProductService.createProduct(requestPayload)
        setProducts((prev) => [created, ...prev])
      }
      setShowAddModal(false)
    } catch (err: unknown) {
      type ApiErr = {
        response?: {
          data?: {
            error?: {
              message?: string
              details?: Record<string, string[] | string> | { errors?: { details?: Record<string, string[]> } }
            }
          }
        }
      }
      const apiErr = (err as ApiErr)?.response?.data?.error
      const rawDetails = apiErr?.details
      let fieldErrors: Record<string, string[] | string> | null = null

      if (rawDetails && typeof rawDetails === 'object' && !Array.isArray(rawDetails)) {
        if ('errors' in rawDetails) {
          const nestedErrors = rawDetails.errors

          if (
            nestedErrors &&
            typeof nestedErrors === 'object' &&
            !Array.isArray(nestedErrors) &&
            'details' in nestedErrors
          ) {
            const nestedDetails = nestedErrors.details

            if (nestedDetails && typeof nestedDetails === 'object' && !Array.isArray(nestedDetails)) {
              fieldErrors = nestedDetails
            }
          }
        } else if (isFieldErrorMap(rawDetails)) {
          fieldErrors = rawDetails
        }
      }
      if (fieldErrors) {
        const msgs = Object.entries(fieldErrors)
          .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(', ') : String(errs)}`)
          .join(' · ')
        setFormError(msgs)
      } else {
        setFormError(apiErr?.message ?? 'Failed to save product.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCreateBrand = async (e: FormEvent) => {
    e.preventDefault()
    if (!brandName.trim()) { setBrandFormError('Brand name is required.'); return }
    if (!brandLogoFile) { setBrandFormError('Brand logo is required.'); return }

    setBrandSaving(true)
    setBrandFormError('')
    try {
      const payload = new FormData()
      payload.append('name', brandName.trim())
      if (brandDescription.trim()) payload.append('description', brandDescription.trim())
      payload.append('logo', brandLogoFile)

      const created = await adminProductService.createBrand(payload)
      setBrands((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setProductBrandId(created.id)
      setBrandName('')
      setBrandDescription('')
      setBrandLogoFile(null)
      setBrandFormError('')
      setShowBrandModal(false)
    } catch (err: unknown) {
      type ApiErr = { response?: { data?: { error?: { message?: string } } } }
      setBrandFormError((err as ApiErr)?.response?.data?.error?.message ?? 'Failed to create brand.')
    } finally {
      setBrandSaving(false)
    }
  }

  const handleToggleProduct = async (product: ApiProduct) => {
    try {
      const updated = await adminProductService.updateProduct(product.id, { is_active: !product.is_active })
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)))
    } catch {
      // silent
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError('')
    try {
      await adminProductService.deleteProduct(deleteTarget.id)
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: unknown) {
      type ApiErr = { response?: { data?: { error?: { message?: string } } } }
      setDeleteError((err as ApiErr)?.response?.data?.error?.message ?? 'Failed to delete. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleBack = () => {
    if (window.history.length > 1) { navigate(-1); return }
    navigate('/admin')
  }

  useEffect(() => { setCurrentPage(1) }, [searchTerm, selectedCategory, selectedSubcat, selectedConcern])

  const visibleSubcategories =
    selectedCategory === 'all'
      ? subcategories
      : subcategories.filter((subcategory) => String(subcategory.category) === selectedCategory)

  useEffect(() => {
    if (!showAddModal || editingProduct || productBrandId !== '' || brands.length === 0) return
    setProductBrandId(brands[0].id)
  }, [showAddModal, editingProduct, productBrandId, brands])

  useEffect(() => {
    if (!showAddModal || editingProduct || productSubcategoryId !== '' || subcategories.length === 0) return
    setProductSubcategoryId(subcategories[0].id)
  }, [showAddModal, editingProduct, productSubcategoryId, subcategories])

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedSubcat !== 'all' ||
    selectedConcern !== 'all'

  const resolveProductSubcategory = (product: ApiProduct) => {
    if (product.subcategory_id !== null) {
      const byId = subcategories.find((subcategory) => subcategory.id === product.subcategory_id)
      if (byId) return byId
    }

    if (product.subcategory_name) {
      const normalizedSubcategory = product.subcategory_name.trim().toLowerCase()
      const normalizedCategory = product.category_name?.trim().toLowerCase()

      const exactMatch = subcategories.find((subcategory) => (
        subcategory.name.trim().toLowerCase() === normalizedSubcategory &&
        (!normalizedCategory || subcategory.category_name.trim().toLowerCase() === normalizedCategory)
      ))
      if (exactMatch) return exactMatch

      const byName = subcategories.find((subcategory) => subcategory.name.trim().toLowerCase() === normalizedSubcategory)
      if (byName) return byName
    }

    return null
  }

  const getProductCategoryId = (product: ApiProduct) => {
    if (product.category !== null) return product.category
    const resolvedSubcategory = resolveProductSubcategory(product)
    if (resolvedSubcategory) return resolvedSubcategory.category
    if (!product.category_name) return null
    return categories.find((category) => category.name.trim().toLowerCase() === product.category_name!.trim().toLowerCase())?.id ?? null
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategory('all')
    setSelectedSubcat('all')
    setSelectedConcern('all')
  }

  const filteredProducts = products.filter((p) => {
    const query = searchTerm.toLowerCase()
    const matchSearch =
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query)
    const matchCategory = selectedCategory === 'all' || String(getProductCategoryId(p)) === selectedCategory
    const matchSubcategory = selectedSubcat === 'all' || String(p.subcategory_id) === selectedSubcat
    const matchConcern =
      selectedConcern === 'all' ||
      p.health_concerns.some((concern) => String(concern.id) === selectedConcern)

    return matchSearch && matchCategory && matchSubcategory && matchConcern
  })

  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedProducts = filteredProducts.slice(startIndex, startIndex + PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))

  const getProductCatalog = (product: ApiProduct) => {
    const resolvedSubcategory = resolveProductSubcategory(product)
    const categoryName =
      product.category_name ||
      resolvedSubcategory?.category_name ||
      (getProductCategoryId(product) !== null
        ? categories.find((category) => category.id === getProductCategoryId(product))?.name ?? null
        : null) ||
      'Uncategorized'

    const subcategoryName =
      product.subcategory_name ||
      resolvedSubcategory?.name ||
      'Uncategorized'

    return {
      categoryName,
      subcategoryName,
      combinedLabel: `${categoryName} / ${subcategoryName}`,
    }
  }

  const getCategoryLabel = (product: ApiProduct) => {
    return getProductCatalog(product).categoryName
  }

  const getProductBrandLabel = (product: ApiProduct) => product.brand?.name ?? product.brand_name ?? 'No brand'

  const activeFilterChips = [
    searchTerm.trim() ? { key: 'search', label: `Search: ${searchTerm.trim()}` } : null,
    selectedCategory !== 'all'
      ? { key: 'category', label: `Category: ${categories.find((category) => String(category.id) === selectedCategory)?.name ?? 'Unknown'}` }
      : null,
    selectedSubcat !== 'all'
      ? { key: 'subcategory', label: `Subcategory: ${subcategories.find((subcategory) => String(subcategory.id) === selectedSubcat)?.name ?? 'Unknown'}` }
      : null,
    selectedConcern !== 'all'
      ? { key: 'concern', label: `Health concern: ${allConcerns.find((concern) => String(concern.id) === selectedConcern)?.name ?? 'Unknown'}` }
      : null,
  ].filter((value): value is { key: string; label: string } => value !== null)

  return (
    <div className="product-management">
      <div className="product-management__header">
        <div className="product-management__title">
          <button className="pm-back-btn" type="button" onClick={handleBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
            Back
          </button>
          <div className="pm-title-group">
            <div className="pm-title-row">
              <h1>Products</h1>
              <span className="pm-count">{filteredProducts.length} items</span>
            </div>
          </div>
        </div>
        <div className="product-management__actions">
        
          <button className="btn btn--primary btn--sm" onClick={openAddModal}>+ Add Product</button>
          <Link className="btn btn--secondary btn--sm" to="/admin/inventory">
            Add Inventory
          </Link>
        </div>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      <div className="product-management__filters">
        <div className="search-box">
          <svg className="search-box__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Search products"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value)
            setSelectedSubcat('all')
          }}
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>{category.name}</option>
          ))}
        </select>
        <select value={selectedSubcat} onChange={(e) => setSelectedSubcat(e.target.value)}>
          <option value="all">All Subcategories</option>
          {visibleSubcategories.map((s) => (
            <option key={s.id} value={String(s.id)}>{s.category_name} / {s.name}</option>
          ))}
        </select>
        <select value={selectedConcern} onChange={(e) => setSelectedConcern(e.target.value)}>
          <option value="all">All Health Concerns</option>
          {allConcerns.map((concern) => (
            <option key={concern.id} value={String(concern.id)}>{concern.name}</option>
          ))}
        </select>
        {hasActiveFilters && (
          <button
            type="button"
            className="btn btn--secondary btn--sm product-management__clear-filters"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="product-management__filter-summary">
          <div className="product-management__filter-summary-copy">
            <span className="product-management__filter-summary-label">Active filters</span>
            <span className="product-management__filter-summary-count">
              {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="product-management__filter-chips">
            {activeFilterChips.map((chip) => (
              <span key={chip.key} className="product-filter-chip">
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="product-management__table">
        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading products…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Subcategory</th>
                <th>Selling</th>
                <th>Discount</th>
                <th>Margin</th>
                <th>Stock</th>
                <th>Prescription</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Created By</th>
                <th>Updated By</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pagedProducts.map((product) => {
                const margin = getMarginData(product)
                return (
                <tr key={product.id}>
                  <td>
                    <div className="product-info">
                      <ImageWithFallback src={product.image ?? ''} alt={product.name} />
                      <div>
                        <span className="product-info__name">{product.name}</span>
                        <span className="product-info__concerns">{product.sku}</span>
                        {getProductBrandLabel(product) !== 'No brand' && (
                          <span className="product-info__concerns">Brand: {getProductBrandLabel(product)}</span>
                        )}
                        <div className="product-info__catalog-tags">
                          <span className="product-catalog-chip">{getCategoryLabel(product)}</span>
                          <span className="product-catalog-chip product-catalog-chip--sub">
                            {getProductCatalog(product).subcategoryName}
                          </span>
                        </div>
                        {product.health_concerns.length > 0 && (
                          <div className="product-info__health-concerns">
                            {product.health_concerns.slice(0, 3).map((concern) => (
                              <span key={concern.id} className="product-health-chip">
                                {concern.name}
                              </span>
                            ))}
                            {product.health_concerns.length > 3 && (
                              <span className="product-health-chip product-health-chip--more">
                                +{product.health_concerns.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="td--muted">
                    <div className="product-table-catalog">
                      <span className="product-table-catalog__sub">{getProductCatalog(product).subcategoryName}</span>
                      <span className="product-table-catalog__category">{getProductCatalog(product).categoryName}</span>
                    </div>
                  </td>
                  <td>{formatCurrency(product.price)}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span>{formatCurrency(product.discount_price)}</span>
                      <span className="td--muted" style={{ fontSize: '0.75rem' }}>
                        {product.discount_price ? 'Current deal price' : 'No discount'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span className={margin && margin.amount < 0 ? 'stock stock--low' : ''}>
                        {margin ? formatCurrency(margin.amount) : '—'}
                      </span>
                      <span className="td--muted" style={{ fontSize: '0.75rem' }}>
                        {margin ? `${margin.percent.toFixed(1)}%` : 'No bought price'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span className={`stock ${product.stock_quantity <= product.low_stock_threshold ? 'stock--low' : ''}`}>{product.stock_quantity}</span>
                      <span className="td--muted" style={{ fontSize: '0.75rem' }}>{formatInventoryBreakdown(product)}</span>
                    </div>
                  </td>
                  <td className="td--muted">{product.requires_prescription ? <span className="rx-badge">Required</span> : '-'}</td>
                  <td>
                    <span className={`status status--${product.is_active ? 'active' : 'inactive'}`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDate(product.created_at)}</td>
                  <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{product.created_by_name || '—'}</td>
                  <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>—</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" title="Edit" onClick={() => openEditModal(product)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <Link className="btn-icon" title="View inventory" to={`/admin/inventory?product=${product.id}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                      </Link>
                      <button
                        className={`btn-icon ${product.is_active ? 'btn-icon--pause' : 'btn-icon--play'}`}
                        title={product.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggleProduct(product)}
                      >
                        {product.is_active
                          ? <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                          : <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        }
                      </button>
                      <button
                        className="btn-icon btn-icon--danger"
                        title="Delete product"
                        onClick={() => { setDeleteTarget(product); setDeleteError('') }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
              {pagedProducts.length === 0 && (
                <tr><td colSpan={12} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No products found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="pagination">
        <button className="pagination__button" type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
        <div className="pagination__pages">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button key={page} className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`} type="button" onClick={() => setCurrentPage(page)}>{page}</button>
          ))}
        </div>
        <button className="pagination__button" type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal modal--product" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div className="modal__header-info">
                <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                <span className="modal__header-sub">All fields marked * are required</span>
              </div>
              <button className="modal__close" onClick={() => setShowAddModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {formError && (
              <div className="form-alert form-alert--error">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} noValidate>
              <div className="modal__body">

                <div className="pf-section">
                  <div className="pf-section__label">Basic Info</div>
                  <div className="pf-row">
                    <div className="pf-field">
                      <label className="pf-label">Product Name <span className="pf-req">*</span></label>
                      <input
                        className="pf-input"
                        type="text"
                        placeholder="e.g. Panadol Extra"
                        value={productName}
                        onChange={(e) => {
                          setProductName(e.target.value)
                          setProductSlug(generateSlug(e.target.value))
                        }}
                      />
                    </div>
                    <div className="pf-field pf-field--sm">
                      <label className="pf-label">Strength <span className="pf-optional">optional</span></label>
                      <input
                        className="pf-input"
                        type="text"
                        placeholder="e.g. 500mg"
                        value={productStrength}
                        onChange={(e) => setProductStrength(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="pf-row">
                    <div className="pf-field">
                      <label className="pf-label">Brand <span className="pf-req">*</span></label>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <select
                          className="pf-input"
                          style={{ flex: 1 }}
                          value={productBrandId}
                          onChange={(e) => setProductBrandId(e.target.value !== '' ? Number(e.target.value) : '')}
                          disabled={brands.length === 0}
                        >
                          {brands.length === 0 && <option value="">Create a brand first</option>}
                          {brands.map((brand) => (
                            <option key={brand.id} value={brand.id}>{brand.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="pf-field">
                      <label className="pf-label">Subcategory <span className="pf-req">*</span></label>
                      <select
                        className="pf-input"
                        value={productSubcategoryId}
                        onChange={(e) => setProductSubcategoryId(e.target.value !== '' ? Number(e.target.value) : '')}
                        disabled={subcategories.length === 0}
                      >
                        {subcategories.length === 0 && <option value="">Create a subcategory first</option>}
                        {subcategories.map((s) => (
                          <option key={s.id} value={s.id}>{s.category_name} / {s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="pf-row">
                    <div className="pf-field pf-field--sm">
                      <label className="pf-label">Status</label>
                      <select className="pf-input" value={productStatus} onChange={(e) => setProductStatus(e.target.value as 'active' | 'inactive')}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  {allConcerns.length > 0 && (
                    <div className="pf-field">
                      <label className="pf-label">Health Concerns <span className="pf-optional">optional</span></label>
                      <div className="pf-concern-grid">
                        {allConcerns.filter((c) => c.is_active).map((c) => {
                          const checked = productHealthConcernIds.includes(c.id)
                          return (
                            <label key={c.id} className={`pf-concern-chip${checked ? ' pf-concern-chip--selected' : ''}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setProductHealthConcernIds((prev) =>
                                    checked ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                                  )
                                }
                              />
                              {c.icon && <span>{c.icon}</span>}
                              {c.name}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <div className="pf-field">
                    <label className="pf-label">Description <span className="pf-optional">optional</span></label>
                    <textarea
                      className="pf-input pf-textarea"
                      rows={2}
                      placeholder="Brief description shown on the product page"
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                    />
                  </div>
                  <div className="pf-row">
                    <div className="pf-field pf-field--sm">
                      <label className="pf-label">Badge <span className="pf-optional">optional</span></label>
                      <input
                        className="pf-input"
                        type="text"
                        placeholder="e.g. New, Best Seller"
                        value={productBadge}
                        onChange={(e) => setProductBadge(e.target.value)}
                      />
                      <span className="pf-hint">Short label shown on product cards.</span>
                    </div>
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Features <span className="pf-optional">optional</span></label>
                    <textarea
                      className="pf-input pf-textarea"
                      rows={3}
                      placeholder="Enter one feature per line"
                      value={productFeaturesText}
                      onChange={(e) => setProductFeaturesText(e.target.value)}
                    />
                    <span className="pf-hint">Each line becomes a separate bullet point on the product page.</span>
                  </div>
                  <div className="pf-row">
                    <div className="pf-field">
                      <label className="pf-label">Directions <span className="pf-optional">optional</span></label>
                      <textarea
                        className="pf-input pf-textarea"
                        rows={3}
                        placeholder="How the customer should use the product"
                        value={productDirections}
                        onChange={(e) => setProductDirections(e.target.value)}
                      />
                    </div>
                    <div className="pf-field">
                      <label className="pf-label">Warnings <span className="pf-optional">optional</span></label>
                      <textarea
                        className="pf-input pf-textarea"
                        rows={3}
                        placeholder="Safety warnings, contraindications, or cautions"
                        value={productWarnings}
                        onChange={(e) => setProductWarnings(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Product Image <span className="pf-req">*</span></label>
                    <input
                      className="pf-input"
                      type="file"
                      accept="image/*"
                      required={!editingProduct}
                      onChange={(e) => setProductImageFile(e.currentTarget.files?.[0] ?? null)}
                    />
                    <span className="pf-hint">
                      {editingProduct ? 'Leave empty to keep the current image.' : 'Upload the main product image.'}
                    </span>
                    {productImageFile && <span className="pf-hint">Selected: {productImageFile.name}</span>}
                  </div>
                </div>

                <div className="pf-section">
                  <div className="pf-section__label">Pricing</div>
                  <div className="pf-row">
                    <div className="pf-field">
                      <label className="pf-label">Selling Price <span className="pf-req">*</span></label>
                      <div className="pf-prefix-wrap">
                        <span className="pf-prefix">KSh</span>
                        <input className="pf-input pf-input--prefixed" type="number" min="0" step="0.01" placeholder="0.00" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} />
                      </div>
                    </div>
                    <div className="pf-field">
                      <label className="pf-label">Bought At Price <span className="pf-optional">optional</span></label>
                      <div className="pf-prefix-wrap">
                        <span className="pf-prefix">KSh</span>
                        <input className="pf-input pf-input--prefixed" type="number" min="0" step="0.01" placeholder="0.00" value={productCostPrice} onChange={(e) => setProductCostPrice(e.target.value)} />
                      </div>
                      <span className="pf-hint">Internal cost price for margin tracking. This is not shown to customers.</span>
                    </div>
                  </div>
                  <div className="pf-row">
                    <div className="pf-field">
                      <label className="pf-label">Discount Price <span className="pf-optional">optional</span></label>
                      <div className="pf-prefix-wrap">
                        <span className="pf-prefix">KSh</span>
                        <input className="pf-input pf-input--prefixed" type="number" min="0" step="0.01" placeholder="0.00" value={productDiscountPrice} onChange={(e) => setProductDiscountPrice(e.target.value)} />
                      </div>
                      <span className="pf-hint">Must be lower than the selling price. Customers will see this as the discounted price.</span>
                    </div>
                  </div>
                </div>

                <div className="pf-section">
                  <div className="pf-section__label">Inventory</div>
                  <div className="pf-row">
                    <div className="pf-field">
                      <label className="pf-label">Main Shop Stock</label>
                      <input className="pf-input" type="number" min="0" value={branchStockQuantity} onChange={(e) => setBranchStockQuantity(e.target.value)} />
                    </div>
                    <div className="pf-field">
                      <label className="pf-label">Main Shop Low Stock Threshold</label>
                      <input className="pf-input" type="number" min="0" value={branchLowStockThreshold} onChange={(e) => setBranchLowStockThreshold(e.target.value)} />
                    </div>
                  </div>
                  <div className="pf-row">
                    <div className="pf-field">
                      <label className="pf-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="checkbox" checked={branchAllowBackorder} onChange={(e) => setBranchAllowBackorder(e.target.checked)} />
                        Allow Main Shop Backorder
                      </label>
                      {branchAllowBackorder && (
                        <input className="pf-input" type="number" min="0" value={branchMaxBackorderQuantity} onChange={(e) => setBranchMaxBackorderQuantity(e.target.value)} />
                      )}
                    </div>
                  </div>
                  <span className="pf-hint">Only main shop stock is entered here. POS store stock is synced from the external POS API.</span>
                </div>

                <div className="pf-section">
                  <div className="pf-section__label">Access</div>
                  <div className="pf-toggle-row" onClick={() => setProductRequiresRx(!productRequiresRx)}>
                    <div className="pf-toggle-row__text">
                      <span className="pf-toggle-row__title">Prescription Required</span>
                      <span className="pf-toggle-row__sub">
                        {productRequiresRx ? 'Customer must present a valid prescription to purchase' : 'Available over the counter without a prescription'}
                      </span>
                    </div>
                    <label className="rx-toggle" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={productRequiresRx} onChange={(e) => setProductRequiresRx(e.target.checked)} />
                      <span className={`rx-toggle__track${productRequiresRx ? ' rx-toggle__track--on' : ''}`}>
                        <span className="rx-toggle__thumb" style={{ transform: productRequiresRx ? 'translateX(20px)' : 'translateX(0)' }} />
                      </span>
                    </label>
                  </div>
                </div>

              </div>

              <div className="modal__footer">
                <button type="button" className="btn btn--secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? (
                    <><span className="btn-spinner" />Saving…</>
                  ) : editingProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBrandModal && (
        <div className="cm-overlay" onClick={closeBrandModal}>
          <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal__header">
              <div>
                <h2>New Brand</h2>
                <p>Create a brand and immediately assign it to this product.</p>
              </div>
              <button type="button" className="cm-modal__close" onClick={closeBrandModal} disabled={brandSaving} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form className="cm-form" onSubmit={handleCreateBrand}>
              <label className="cm-field">
                <span>Name</span>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => { setBrandName(e.target.value); setBrandFormError('') }}
                  placeholder="e.g. Panadol"
                  disabled={brandSaving}
                  autoFocus
                />
              </label>

              <label className="cm-field">
                <span>Description <em className="cm-field__optional">optional</em></span>
                <textarea
                  value={brandDescription}
                  onChange={(e) => setBrandDescription(e.target.value)}
                  placeholder="Brief description visible to shoppers"
                  disabled={brandSaving}
                  rows={2}
                />
              </label>

              <label className="cm-field">
                <span>Brand Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => { setBrandLogoFile(e.target.files?.[0] ?? null); setBrandFormError('') }}
                  disabled={brandSaving}
                  required
                />
              </label>

              {brandFormError && (
                <p className="cm-form__error">
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {brandFormError}
                </p>
              )}

              <div className="cm-modal__actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={closeBrandModal} disabled={brandSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary btn--sm" disabled={brandSaving}>
                  {brandSaving ? <><span className="cm-spinner" /> Saving…</> : 'Create Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteTarget && (
        <div className="cm-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="cm-modal cm-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal__header cm-modal__header--danger">
              <h2>Delete Product</h2>
              <button
                type="button"
                className="cm-modal__close"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="cm-delete-body">
              <div className="cm-delete-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <p>Delete <strong>"{deleteTarget.name}"</strong>? This action cannot be undone.</p>
              <p className="cm-delete-warning">SKU: {deleteTarget.sku}</p>
              {deleteError && (
                <p className="cm-form__error" style={{ marginTop: '0.75rem', justifyContent: 'center' }}>
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  {deleteError}
                </p>
              )}
            </div>
            <div className="cm-modal__actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductManagement
