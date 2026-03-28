import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import { SearchableSelect } from '../../components/SearchableSelect/SearchableSelect'
import { SearchableMultiSelect } from '../../components/SearchableMultiSelect/SearchableMultiSelect'
import {
  adminProductService,
  ApiBrand,
  ApiProductCategory,
  ApiHealthConcern,
  ApiProductSubcategory,
  ApiProduct,
  ProductFormMeta,
  ProductCreatePayload,
} from '../../services/adminProductService'
import { getImageUploadHint, validateImageFile } from '../../utils/imageUploadSpecs'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/shared/AdminButtonUtilities.css'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/admin/ProductManagement.css'

const PAGE_SIZE = 6
type SortDirection = 'asc' | 'desc'

function formatDate(value?: string): string {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function compareCreatedAt(left?: string, right?: string): number {
  const leftTime = left ? new Date(left).getTime() : Number.NaN
  const rightTime = right ? new Date(right).getTime() : Number.NaN
  const leftValid = Number.isFinite(leftTime)
  const rightValid = Number.isFinite(rightTime)
  if (!leftValid && !rightValid) return 0
  if (!leftValid) return 1
  if (!rightValid) return -1
  return leftTime - rightTime
}

function formatCurrency(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '—'
  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) ? `KSh ${amount.toLocaleString()}` : '—'
}

function getEffectiveSellingPrice(product: ApiProduct): number {
  const effectivePrice = Number(product.final_price ?? product.price)
  if (Number.isFinite(effectivePrice) && effectivePrice > 0) return effectivePrice
  return Number(product.price)
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

function getActiveVariantCount(product: ApiProduct): number {
  return (product.variants ?? []).filter((variant) => variant.is_active).length
}

function getSellableQuantity(product: ApiProduct): number {
  return product.available_quantity ?? product.stock_quantity ?? 0
}

function getSellableStatus(product: ApiProduct): string {
  return product.inventory_status ?? 'out_of_stock'
}

function getSellableStatusClass(product: ApiProduct): string {
  const status = getSellableStatus(product)
  if (status === 'in_stock') return 'cm-status--active'
  if (status === 'low_stock' || status === 'backorder') return 'cm-status--scheduled'
  return 'cm-status--inactive'
}

function formatSellableStatusLabel(product: ApiProduct): string {
  const status = getSellableStatus(product)
  if (status === 'in_stock') return 'In stock'
  if (status === 'low_stock') return 'Low stock'
  if (status === 'backorder') return 'Backorder'
  if (status === 'inactive') return 'Inactive'
  return 'Out of stock'
}

function formatInventoryBreakdown(product: ApiProduct): string {
  if (product.has_variants) {
    const variantCount = getActiveVariantCount(product)
    return variantCount > 0
      ? `Variant-managed · ${variantCount} active variant${variantCount === 1 ? '' : 's'}`
      : 'Variant-managed'
  }
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
  Pick<ProductCreatePayload, 'name' | 'slug' | 'sku' | 'is_active' | 'requires_prescription'>
  & Partial<ProductCreatePayload>

function ProductManagement() {
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [brands, setBrands] = useState<ApiBrand[]>([])
  const [categories, setCategories] = useState<ApiProductCategory[]>([])
  const [subcategories, setSubcategories] = useState<ApiProductSubcategory[]>([])
  const [allConcerns, setAllConcerns] = useState<ApiHealthConcern[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [productFormMeta, setProductFormMeta] = useState<ProductFormMeta | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSubcat, setSelectedSubcat] = useState('all')
  const [selectedConcern, setSelectedConcern] = useState('all')
  const [createdAtSortDirection, setCreatedAtSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ApiProduct | null>(null)

  const [productName, setProductName] = useState('')
  const [productSlug, setProductSlug] = useState('')
  const [productSku, setProductSku] = useState('')
  const [productBarcode, setProductBarcode] = useState('')
  const [productSubcategoryId, setProductSubcategoryId] = useState<number | ''>('')
  const [productBrandId, setProductBrandId] = useState<number | ''>('')
  const [productHealthConcernIds, setProductHealthConcernIds] = useState<number[]>([])
  const [productStatus, setProductStatus] = useState<'active' | 'inactive'>('active')
  const [productRequiresRx, setProductRequiresRx] = useState(false)
  const [productDescription, setProductDescription] = useState('')
  const [productFeaturesText, setProductFeaturesText] = useState('')
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
  const [activeTab, setActiveTab] = useState<'products' | 'brands'>('products')
  const [editingBrand, setEditingBrand] = useState<ApiBrand | null>(null)
  const [handledProductQuery, setHandledProductQuery] = useState('')
  const productQueryKey = searchParams.toString()


  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    setHandledProductQuery('')
  }, [productQueryKey])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [prods, brandList, cats, subs, concerns, formMeta] = await Promise.all([
        adminProductService.listProducts(),
        adminProductService.listBrands(),
        adminProductService.listProductCategories(),
        adminProductService.listProductSubcategories(),
        adminProductService.listHealthConcerns(),
        adminProductService.getProductFormMeta(),
      ])
      setProducts(prods)
      setBrands(brandList)
      setCategories(cats)
      setSubcategories(subs)
      setAllConcerns(concerns)
      setProductFormMeta(formMeta)
    } catch {
      setError('Failed to load products.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (loading || activeTab !== 'products') return

    const productId = searchParams.get('product')
    if (!productId || handledProductQuery === productId) return

    const target = products.find((product) => String(product.id) === productId)
    if (!target) return

    openEditModal(target)
    setHandledProductQuery(productId)
  }, [activeTab, handledProductQuery, loading, productQueryKey, products, searchParams])

  const resetForm = () => {
    setProductName('')
    setProductSlug('')
    setProductSku('')
    setProductBarcode('')
    setProductSubcategoryId(subcategories[0]?.id ?? '')
    setProductBrandId(brands[0]?.id ?? '')
    setProductHealthConcernIds([])
    setProductStatus('active')
    setProductRequiresRx(false)
    setProductDescription('')
    setProductFeaturesText('')
    setEditingProduct(null)
    setFormError('')
  }

  const openAddModal = () => {
    resetForm()
    setShowAddModal(true)
  }

  const closeBrandModal = () => {
    if (brandSaving) return
    setBrandName('')
    setBrandDescription('')
    setBrandLogoFile(null)
    setBrandFormError('')
    setEditingBrand(null)
    setShowBrandModal(false)
  }

  const openAddBrand = () => {
    setEditingBrand(null)
    setBrandName('')
    setBrandDescription('')
    setBrandLogoFile(null)
    setBrandFormError('')
    setShowBrandModal(true)
  }

  const openEditBrand = (brand: ApiBrand) => {
    setEditingBrand(brand)
    setBrandName(brand.name)
    setBrandDescription(brand.description ?? '')
    setBrandLogoFile(null)
    setBrandFormError('')
    setShowBrandModal(true)
  }

  const openEditModal = (product: ApiProduct) => {
    const resolvedBrand = resolveProductBrand(product)
    const resolvedSubcategory = resolveProductSubcategory(product)

    setProductName(product.name)
    setProductSlug(product.slug ?? generateSlug(product.name))
    setProductSku(product.sku)
    setProductBarcode(product.barcode ?? '')
    setProductSubcategoryId(resolvedSubcategory?.id ?? product.subcategory_id ?? (subcategories[0]?.id ?? ''))
    setProductBrandId(resolvedBrand?.id ?? product.brand?.id ?? (brands[0]?.id ?? ''))
    setProductHealthConcernIds(product.health_concerns?.map((c) => c.id) ?? [])
    setProductStatus(product.is_active ? 'active' : 'inactive')
    setProductRequiresRx(product.requires_prescription)
    setProductDescription(product.description ?? '')
    setProductFeaturesText(formatFeatureLines(product.features))
    setEditingProduct(product)
    setFormError('')
    setShowAddModal(true)
  }

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault()
    if (!productName.trim()) { setFormError('Product name is required.'); return }
    if (productBarcode.trim() === '') {
      setFormError('Barcode is required.')
      return
    }
    if (productBrandId === '') {
      setFormError(brands.length === 0 ? 'Create a brand before adding a product.' : 'Brand is required.')
      return
    }
    if (productSubcategoryId === '') {
      setFormError(subcategories.length === 0 ? 'Create a subcategory before adding a product.' : 'Subcategory is required.')
      return
    }

    const features = parseFeatureLines(productFeaturesText)
    const sku = productSku.trim() || generateSku(productName)
    const slug = productSlug.trim() || generateSlug(productName)
    const commonPayload: ProductFormPayload = {
      name: productName.trim(),
      slug,
      sku,
      barcode: productBarcode.trim(),
      brand_id: Number(productBrandId),
      subcategory_id: Number(productSubcategoryId),
      health_concern_ids: productHealthConcernIds,
      is_active: productStatus === 'active',
      requires_prescription: productRequiresRx,
      description: productDescription.trim(),
      features,
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
      formData.append('barcode', payload.barcode ?? '')
      formData.append('is_active', String(payload.is_active))
      formData.append('requires_prescription', String(payload.requires_prescription))
      formData.append('description', payload.description ?? '')
      formData.append('features', JSON.stringify(payload.features ?? []))

      if (payload.brand_id !== null && payload.brand_id !== undefined) formData.append('brand_id', String(payload.brand_id))
      if (payload.subcategory_id !== null && payload.subcategory_id !== undefined) formData.append('subcategory_id', String(payload.subcategory_id))
      productHealthConcernIds.forEach((id) => formData.append('health_concern_ids', String(id)))
      return formData
    }

    setSaving(true)
    setFormError('')
    try {
      if (editingProduct) {
        const updated = await adminProductService.updateProduct(editingProduct.id, updatePayload)
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? updated : p)))
        setShowAddModal(false)
      } else {
        const requestPayload = buildProductFormData(createPayload)
        const created = await adminProductService.createProduct(requestPayload)
        setProducts((prev) => [created, ...prev])
        openEditModal(created)
      }
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

  const handleQuickBrandLogoChange = async (file: File | null) => {
    if (!file) {
      setBrandLogoFile(null)
      setBrandFormError('')
      return
    }

    const validationError = await validateImageFile(file, 'brand')
    if (validationError) {
      setBrandLogoFile(null)
      setBrandFormError(validationError)
      return
    }

    setBrandLogoFile(file)
    setBrandFormError('')
  }

  const handleSaveBrand = async (e: FormEvent) => {
    e.preventDefault()
    if (!brandName.trim()) { setBrandFormError('Brand name is required.'); return }
    if (!editingBrand && !brandLogoFile) { setBrandFormError('Brand logo is required.'); return }

    setBrandSaving(true)
    setBrandFormError('')
    try {
      if (editingBrand) {
        let payload: FormData | Partial<{ name: string; description: string; is_active: boolean }>
        if (brandLogoFile) {
          const fd = new FormData()
          fd.append('name', brandName.trim())
          if (brandDescription.trim()) fd.append('description', brandDescription.trim())
          fd.append('logo', brandLogoFile)
          payload = fd
        } else {
          payload = { name: brandName.trim(), description: brandDescription.trim() }
        }
        const updated = await adminProductService.updateBrand(editingBrand.id, payload)
        setBrands((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
      } else {
        const fd = new FormData()
        fd.append('name', brandName.trim())
        if (brandDescription.trim()) fd.append('description', brandDescription.trim())
        fd.append('logo', brandLogoFile!)
        const created = await adminProductService.createBrand(fd)
        setBrands((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        if (activeTab === 'products') setProductBrandId(created.id)
      }
      closeBrandModal()
    } catch (err: unknown) {
      type ApiErr = { response?: { data?: { error?: { message?: string } } } }
      setBrandFormError((err as ApiErr)?.response?.data?.error?.message ?? 'Failed to save brand.')
    } finally {
      setBrandSaving(false)
    }
  }

  const handleToggleBrand = async (brand: ApiBrand) => {
    try {
      const updated = await adminProductService.updateBrand(brand.id, { is_active: !brand.is_active })
      setBrands((prev) => prev.map((b) => (b.id === brand.id ? updated : b)))
    } catch {
      // silent
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

  useEffect(() => { setCurrentPage(1) }, [searchTerm, selectedCategory, selectedSubcat, selectedConcern, createdAtSortDirection])

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

  function resolveProductBrand(product: ApiProduct) {
    if (product.brand?.id !== null && product.brand?.id !== undefined) {
      const byId = brands.find((brand) => brand.id === product.brand!.id)
      if (byId) return byId
    }

    const brandName = product.brand?.name ?? product.brand_name
    if (!brandName) return null

    const normalized = brandName.trim().toLowerCase()
    return brands.find((brand) => brand.name.trim().toLowerCase() === normalized) ?? null
  }

  function resolveProductSubcategory(product: ApiProduct) {
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

  function getProductCategoryId(product: ApiProduct) {
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

  const sortedProducts = useMemo(() => {
    const items = [...filteredProducts]
    items.sort((left, right) => {
      const comparison = compareCreatedAt(left.created_at, right.created_at)
      return createdAtSortDirection === 'asc' ? comparison : -comparison
    })
    return items
  }, [filteredProducts, createdAtSortDirection])

  const sortedBrands = useMemo(() => {
    const items = [...brands]
    items.sort((left, right) => {
      const comparison = compareCreatedAt(left.created_at, right.created_at)
      return createdAtSortDirection === 'asc' ? comparison : -comparison
    })
    return items
  }, [brands, createdAtSortDirection])

  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedProducts = sortedProducts.slice(startIndex, startIndex + PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE))

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

  const getProductBrandLabel = (product: ApiProduct) => product.brand?.name ?? product.brand_name ?? 'No brand'

  const toggleCreatedAtSort = () => {
    setCreatedAtSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
  }

  return (
    <div className="category-management product-management">
      <div className="category-management__header">
        <div className="cm-title-group">
          <h1>{activeTab === 'brands' ? 'Brands' : 'Products'}</h1>
          <p className="cm-title-sub">{activeTab === 'brands' ? 'Manage product brands' : 'Manage catalog details here. Stock is handled from Inventory.'}</p>
        </div>
        <div className="category-management__actions">
          {activeTab === 'products' ? (
            <button className="btn btn--primary btn--sm" onClick={openAddModal}>+ Add Product</button>
          ) : (
            <button className="btn btn--primary btn--sm" onClick={openAddBrand}>+ Add Brand</button>
          )}
        </div>
      </div>

      <div className="cm-tabs" style={{ marginBottom: '1rem' }}>
        <button className={`cm-tab${activeTab === 'products' ? ' cm-tab--active' : ''}`} onClick={() => setActiveTab('products')}>
          Products <span className="cm-tab__count">{products.length}</span>
        </button>
        <button className={`cm-tab${activeTab === 'brands' ? ' cm-tab--active' : ''}`} onClick={() => setActiveTab('brands')}>
          Brands <span className="cm-tab__count">{brands.length}</span>
        </button>
      </div>

      {error && (
        <div className="cm-error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {activeTab === 'brands' && (
        <div className="cm-panel">
          {loading && (
            <div className="cm-skeletons">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="cm-skeleton-row">
                  <div className="cm-skeleton" style={{ width: '40px', height: '40px', borderRadius: '10px' }} />
                  <div className="cm-skeleton" style={{ width: '25%' }} />
                  <div className="cm-skeleton" style={{ width: '35%' }} />
                  <div className="cm-skeleton" style={{ width: '10%', borderRadius: '999px' }} />
                </div>
              ))}
            </div>
          )}
          {!loading && brands.length === 0 && (
            <div className="cm-empty-state">
              <div className="cm-empty-state__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
              </div>
              <p className="cm-empty-state__title">No brands yet</p>
              <p className="cm-empty-state__sub">Add your first brand to get started.</p>
              <button className="btn btn--primary btn--sm" onClick={openAddBrand}>+ Add Brand</button>
            </div>
          )}
          {!loading && brands.length > 0 && (
            <div className="cm-table-wrap">
              <table className="cm-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 220 }}>Brand</th>
                    <th style={{ minWidth: 200 }}>Description</th>
                    <th style={{ minWidth: 80 }}>Products</th>
                    <th style={{ minWidth: 90 }}>Status</th>
                    <th style={{ minWidth: 120, whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={toggleCreatedAtSort}>
                        Created At {createdAtSortDirection === 'asc' ? '↑' : '↓'}
                      </button>
                    </th>
                    <th style={{ minWidth: 110 }}>Created By</th>
                    <th className="cm-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBrands.map((brand) => (
                    <tr key={brand.id}>
                      <td>
                        <div className="cm-brand-identity">
                          {brand.logo ? (
                            <div className="cm-brand-logo">
                              <img className="cm-brand-logo__img" src={brand.logo} alt={brand.name} />
                            </div>
                          ) : (
                            <div className="cm-brand-logo cm-brand-logo--placeholder">
                              {brand.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="cm-name-cell">
                            <span className="cm-name-cell__name">{brand.name}</span>
                            <span className="cm-name-cell__id">{brand.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.875rem', color: brand.description ? '#374151' : '#d1d5db' }}>
                          {brand.description || '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          {products.filter((p) => p.brand?.id === brand.id).length}
                        </span>
                      </td>
                      <td>
                        <span className={`cm-status ${brand.is_active ? 'cm-status--active' : 'cm-status--inactive'}`}>
                          {brand.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(brand.created_at)}</td>
                      <td>{brand.created_by_name || '—'}</td>
                      <td>
                        <div className="cm-row-actions">
                          <button type="button" className="cm-row-btn cm-row-btn--edit" onClick={() => openEditBrand(brand)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit
                          </button>
                          <button type="button" className="cm-row-btn" onClick={() => { void handleToggleBrand(brand) }}>
                            {brand.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'products' && <>
      <div className="cm-kpi-grid">
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Total Products</span>
            <strong className="cm-kpi-card__value">{products.length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Active</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--green">{products.filter(p => p.is_active).length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Low Stock</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--amber">{products.filter(p => (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 5) && (p.stock_quantity ?? 0) > 0).length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Inactive</span>
            <strong className="cm-kpi-card__value cm-kpi-card__value--red">{products.filter(p => !p.is_active).length}</strong>
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
            placeholder="Search products…"
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
          <select
            className="cm-filter-select"
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
          <select className="cm-filter-select" value={selectedSubcat} onChange={(e) => setSelectedSubcat(e.target.value)}>
            <option value="all">All Subcategories</option>
            {visibleSubcategories.map((s) => (
              <option key={s.id} value={String(s.id)}>{s.category_name} / {s.name}</option>
            ))}
          </select>
          <select className="cm-filter-select" value={selectedConcern} onChange={(e) => setSelectedConcern(e.target.value)}>
            <option value="all">All Health Concerns</option>
            {allConcerns.map((concern) => (
              <option key={concern.id} value={String(concern.id)}>{concern.name}</option>
            ))}
          </select>
          {hasActiveFilters && (
            <button type="button" className="cm-clear-filter" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
          {hasActiveFilters && (
            <span className="cm-result-count">{filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''}</span>
          )}
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
        {!loading && (
        <div className="cm-table-wrap">
          <table className="cm-table">
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Product</th>
                <th style={{ minWidth: 120 }}>Brand</th>
                <th style={{ minWidth: 130 }}>Subcategory</th>
                <th style={{ minWidth: 110 }}>Lead Variant Price</th>
                <th style={{ minWidth: 140 }}>Active Deal</th>
                <th style={{ minWidth: 100 }}>Lead Margin</th>
                <th style={{ minWidth: 80 }}>Stock</th>
                <th style={{ minWidth: 110 }}>Prescription</th>
                <th style={{ minWidth: 90 }}>Status</th>
                <th style={{ minWidth: 100, whiteSpace: 'nowrap' }}>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={toggleCreatedAtSort}>
                    Created At {createdAtSortDirection === 'asc' ? '↑' : '↓'}
                  </button>
                </th>
                <th style={{ minWidth: 100 }}>Created By</th>
                <th style={{ minWidth: 100 }}>Updated By</th>
                <th className="cm-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedProducts.map((product) => {
                const margin = getMarginData(product)
                const stockQty = getSellableQuantity(product)
                const stockClass = getSellableStatusClass(product)
                return (
                <tr key={product.id}>
                  <td>
                    <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                      <ImageWithFallback src={product.image ?? ''} alt={product.name} style={{ width: 36, height: 36, borderRadius: '0.375rem', objectFit: 'cover', flexShrink: 0 }} />
                      <div className="cm-name-cell">
                        <span className="cm-name-cell__name">{product.name}</span>
                        <span className="cm-name-cell__id">{product.sku}{product.strength ? ` · ${product.strength}` : ''}</span>
                        {product.dosage_quantity && product.dosage_unit && product.dosage_frequency && (
                          <span className="cm-name-cell__id" style={{ color: '#10b981' }}>
                            {product.dosage_quantity} {product.dosage_unit} · {product.dosage_frequency.replace(/_/g, ' ')}{product.dosage_notes ? ` · ${product.dosage_notes}` : ''}
                          </span>
                        )}
                        {product.health_concerns.length > 0 && (
                          <div className="cm-chips" style={{ marginTop: '0.25rem' }}>
                            {product.health_concerns.slice(0, 3).map((concern) => (
                              <span key={concern.id} className="cm-chip">{concern.name}</span>
                            ))}
                            {product.health_concerns.length > 3 && (
                              <span className="cm-chip cm-chip--more">+{product.health_concerns.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{getProductBrandLabel(product)}</span>
                  </td>
                  <td>
                    <div className="cm-name-cell">
                      <span className="cm-name-cell__name">{getProductCatalog(product).subcategoryName}</span>
                      <span className="cm-name-cell__id">{getProductCatalog(product).categoryName}</span>
                    </div>
                  </td>
                  <td>{formatCurrency(product.price)}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span>{product.badge || 'No active deal'}</span>
                      <span className="cm-name-cell__id">
                        {product.badge ? formatCurrency(product.final_price) : 'Manage in Deals'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span style={{ color: margin && margin.amount < 0 ? '#dc2626' : undefined }}>
                        {margin ? formatCurrency(margin.amount) : '—'}
                      </span>
                      <span className="cm-name-cell__id">
                        {margin ? `${margin.percent.toFixed(1)}%` : 'No cost price'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span className={`cm-status ${stockClass}`}>{stockQty}</span>
                      <span className="cm-name-cell__id">{formatInventoryBreakdown(product)}</span>
                      <span className="cm-name-cell__id">{formatSellableStatusLabel(product)}</span>
                    </div>
                  </td>
                  <td>
                    {product.requires_prescription
                      ? <span className="cm-status cm-status--scheduled">Required</span>
                      : <span className="cm-name-cell__id">—</span>}
                  </td>
                  <td>
                    <span className={`cm-status ${product.is_active ? 'cm-status--active' : 'cm-status--inactive'}`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(product.created_at)}</td>
                  <td>{product.created_by_name || '—'}</td>
                  <td>—</td>
                  <td>
                    <div className="cm-row-actions">
                      <button
                        type="button"
                        className="cm-row-btn cm-row-btn--edit"
                        title="Edit"
                        onClick={() => openEditModal(product)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                      </button>
                      <Link
                        className="cm-row-btn"
                        title="Manage stock"
                        to={`/admin/inventory?product=${product.id}`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                        Stock
                      </Link>
                      <button
                        type="button"
                        className="cm-row-btn"
                        title={product.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggleProduct(product)}
                      >
                        {product.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="cm-row-btn cm-row-btn--delete"
                        title="Delete product"
                        onClick={() => { setDeleteTarget(product); setDeleteError('') }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                        </svg>
                        Delete
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
        </div>
        )}
        {!loading && filteredProducts.length > PAGE_SIZE && (
          <div className="cm-pagination">
            <span className="cm-pagination__info">
              Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredProducts.length)} of {filteredProducts.length}
            </span>
            <div className="cm-pagination__controls">
              <button className="pagination__button" type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
              <div className="pagination__pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button key={page} className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`} type="button" onClick={() => setCurrentPage(page)}>{page}</button>
                ))}
              </div>
              <button className="pagination__button" type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
            </div>
          </div>
        )}
      </div>
      </>}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal modal--product" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div className="modal__header-info">
                <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                <span className="modal__header-sub">All fields marked * are required</span>
              </div>
              <button className="modal__close" onClick={() => { setShowAddModal(false); resetForm() }}>
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
                  </div>
                  <div className="pf-row">
                    <div className="pf-field">
                      <label className="pf-label">SKU <span className="pf-optional">optional</span></label>
                      <input
                        className="pf-input"
                        type="text"
                        placeholder="Auto-generated if blank"
                        value={productSku}
                        onChange={(e) => setProductSku(e.target.value)}
                      />
                    </div>
                    <div className="pf-field">
                      <label className="pf-label">
                        Barcode {productFormMeta?.requires_barcode ? <span className="pf-req">*</span> : <span className="pf-optional">optional</span>}
                      </label>
                      <input
                        className="pf-input"
                        type="text"
                        placeholder="Scan or enter barcode"
                        value={productBarcode}
                        onChange={(e) => setProductBarcode(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="pf-row">
                    <div className="pf-field">
                      <label className="pf-label">Brand <span className="pf-req">*</span></label>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <SearchableSelect
                          className="pf-ss"
                          value={productBrandId}
                          onChange={(v) => setProductBrandId(v !== '' ? Number(v) : '')}
                          options={brands.map((b) => ({ value: b.id, label: b.name }))}
                          placeholder={brands.length === 0 ? 'Create a brand first' : 'Select brand…'}
                          disabled={brands.length === 0}
                          emptyMessage="No brands found"
                        />
                      </div>
                    </div>
                    <div className="pf-field">
                      <label className="pf-label">Subcategory <span className="pf-req">*</span></label>
                      <SearchableSelect
                        value={productSubcategoryId}
                        onChange={(v) => setProductSubcategoryId(v !== '' ? Number(v) : '')}
                        options={subcategories.map((s) => ({ value: s.id, label: `${s.category_name} / ${s.name}` }))}
                        placeholder={subcategories.length === 0 ? 'Create a subcategory first' : 'Select subcategory…'}
                        disabled={subcategories.length === 0}
                        emptyMessage="No subcategories found"
                      />
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
                      <SearchableMultiSelect
                        value={productHealthConcernIds}
                        onChange={(values) => setProductHealthConcernIds(values.map((v) => Number(v)))}
                        options={allConcerns.filter((c) => c.is_active).map((c) => ({ value: c.id, label: c.name }))}
                        placeholder="Select one or more concerns…"
                      />
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
                </div>

      

                <div className="pf-section">
                  <div className="pf-section__label">Variants and Stock Management</div>
                  {!editingProduct && (
                    <span className="pf-hint">Save the product first, then use Inventory → New Stock to create variants(tablets, syrup, or sachets) stock, thresholds, backorder rules, and POS sync are managed</span>
                  )}
               
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
                <button type="button" className="btn btn--secondary" onClick={() => { setShowAddModal(false); resetForm() }}>Cancel</button>
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
                <h2>{editingBrand ? 'Edit Brand' : 'New Brand'}</h2>
                <p>{editingBrand ? 'Update brand details.' : 'Add a new brand to your catalog.'}</p>
              </div>
              <button type="button" className="cm-modal__close" onClick={closeBrandModal} disabled={brandSaving} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form className="cm-form" onSubmit={(e) => { void handleSaveBrand(e) }}>
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
                <span>Brand Logo {editingBrand && <em className="cm-field__optional">leave empty to keep current</em>}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => { void handleQuickBrandLogoChange(e.target.files?.[0] ?? null) }}
                  disabled={brandSaving}
                  required={!editingBrand}
                />
                <span className="cm-upload-note">{getImageUploadHint('brand')}</span>
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
                  {brandSaving ? <><span className="cm-spinner" /> Saving…</> : editingBrand ? 'Save Changes' : 'Create Brand'}
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
