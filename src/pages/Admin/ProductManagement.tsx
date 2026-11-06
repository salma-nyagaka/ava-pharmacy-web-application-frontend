import LowStockThresholdInput from '../../components/LowStockThresholdInput'
import AdminKpiStats from '../../components/AdminKpiStats'
import { formatStatus } from '../../utils/formatStatus'
import Dialog from '../../components/Dialog/Dialog'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
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
  ProductCreatePayload,
} from '../../services/adminProductService'
import { getImageUploadHint, validateImageFile } from '../../utils/imageUploadSpecs'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/shared/AdminButtonUtilities.css'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/admin/ProductManagement.css'

const PAGE_SIZE = 6
type SortDirection = 'asc' | 'desc'
type ProductSortField = 'name' | 'brand' | 'subcategory' | 'price' | 'stock' | 'rx' | 'status' | 'created_at'
type ProductBrandSortField = 'name' | 'products' | 'status' | 'created_at'

function formatDate(value?: string): string {
  if (!value) return '-'
  const d = new Date(value)
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
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
  if (value === null || value === undefined || value === '') return '-'
  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) ? `KSh ${amount.toLocaleString()}` : '-'
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

function generateSlug(name: string): string {
  return name.trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
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

function formatInventoryBreakdown(_product: ApiProduct): string {
  return 'Across stores and batches'
}

function isFieldErrorMap(value: unknown): value is Record<string, string | string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  return Object.values(value).every(
    (entry) => typeof entry === 'string' || (Array.isArray(entry) && entry.every((item) => typeof item === 'string')),
  )
}

type ProductFormPayload =
  Pick<ProductCreatePayload, 'name' | 'slug' | 'is_active' | 'requires_prescription'>
  & Partial<ProductCreatePayload>

type ProductFieldErrorKey =
  | 'name'
  | 'brand'
  | 'subcategory'
  | 'health_concerns'
  | 'description'
  | 'features'
  | 'status'
  | 'requires_prescription'

type BrandFieldErrorKey = 'name' | 'description' | 'logo'

function ProductManagement({ embedded = false }: { embedded?: boolean }) {
  const [searchParams] = useSearchParams()
  const pageRequest = useRef(0)
  const [productTotal, setProductTotal] = useState(0)
  const [catalogStats, setCatalogStats] = useState({ total: 0, active: 0, inactive: 0, low_stock: 0 })
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [brands, setBrands] = useState<ApiBrand[]>([])
  const [categories, setCategories] = useState<ApiProductCategory[]>([])
  const [subcategories, setSubcategories] = useState<ApiProductSubcategory[]>([])
  const [allConcerns, setAllConcerns] = useState<ApiHealthConcern[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [prescriptionFilter, setPrescriptionFilter] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSubcat, setSelectedSubcat] = useState('all')
  const [selectedConcern, setSelectedConcern] = useState('all')
  const [productSortField, setProductSortField] = useState<ProductSortField>('created_at')
  const [brandSortField, setBrandSortField] = useState<ProductBrandSortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const productDialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!showAddModal) return
    const previousFocus = document.activeElement as HTMLElement | null
    const dialog = productDialogRef.current
    dialog?.querySelector<HTMLElement>('#product-name')?.focus()
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialog) return
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
      )).filter((element) => element.getClientRects().length > 0)
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus()
      }
    }
    dialog?.addEventListener('keydown', containFocus)
    return () => {
      dialog?.removeEventListener('keydown', containFocus)
      previousFocus?.focus()
    }
  }, [showAddModal])

  const [editingProduct, setEditingProduct] = useState<ApiProduct | null>(null)

  const [itemSku, setItemSku] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemStrength, setItemStrength] = useState('')
  const [itemPackSize, setItemPackSize] = useState('')
  const [itemQuantity, setItemQuantity] = useState('0')
  const [itemThreshold, setItemThreshold] = useState('5')
  const [itemStore, setItemStore] = useState('')
  const [itemBatch, setItemBatch] = useState('')
  const [itemExpiry, setItemExpiry] = useState('')
  const [stores, setStores] = useState<{ id: number; name: string }[]>([])
  const [productCategoryId, setProductCategoryId] = useState<number | ''>('')
  const [productName, setProductName] = useState('')
  const [productSlug, setProductSlug] = useState('')
  const [productSubcategoryId, setProductSubcategoryId] = useState<number | ''>('')
  const [productBrandId, setProductBrandId] = useState<number | ''>('')
  const [productHealthConcernIds, setProductHealthConcernIds] = useState<number[]>([])
  const [productStatus, setProductStatus] = useState<'active' | 'inactive'>('active')
  const [productRequiresRx, setProductRequiresRx] = useState(false)
  const [productDescription, setProductDescription] = useState('')
  const [productFeaturesText, setProductFeaturesText] = useState('')
  const [formError, setFormError] = useState('')
  const [productFieldErrors, setProductFieldErrors] = useState<Partial<Record<ProductFieldErrorKey, string>>>({})
  const [showBrandModal, setShowBrandModal] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [brandDescription, setBrandDescription] = useState('')
  const [brandLogoFile, setBrandLogoFile] = useState<File | null>(null)
  const [brandSaving, setBrandSaving] = useState(false)
  const [brandFormError, setBrandFormError] = useState('')
  const [brandFieldErrors, setBrandFieldErrors] = useState<Partial<Record<BrandFieldErrorKey, string>>>({})
  const [activeTab, setActiveTab] = useState<'products' | 'brands'>('products')
  const [editingBrand, setEditingBrand] = useState<ApiBrand | null>(null)
  const [handledProductQuery, setHandledProductQuery] = useState('')
  const productQueryKey = searchParams.toString()


  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAll() }, 250)
    return () => { window.clearTimeout(timer); pageRequest.current += 1 }
  }, [currentPage, searchTerm, selectedCategory, selectedSubcat, selectedConcern, prescriptionFilter, productSortField, sortDirection])

  useEffect(() => {
    const refresh = () => { void adminProductService.listStores().then(setStores).catch(() => setError('Unable to load stores.')) }
    refresh()
    window.addEventListener('ava:stores-updated', refresh)
    return () => window.removeEventListener('ava:stores-updated', refresh)
  }, [])

  useEffect(() => {
    setHandledProductQuery('')
  }, [productQueryKey])

  async function loadAll() {
    const request = ++pageRequest.current
    setLoading(true)
    setError('')
    try {
      const ordering = { name: 'name', brand: 'brand__name', subcategory: 'catalog_subcategory', price: 'price', stock: 'total_stock_quantity', rx: 'catalog_requires_rx', status: 'is_active', created_at: 'created_at' }[productSortField]
      const params: Record<string, string> = { page: String(currentPage), page_size: String(PAGE_SIZE), search: searchTerm, ordering: `${sortDirection === 'desc' ? '-' : ''}${ordering}` }
      if (selectedCategory !== 'all') params.category_id = selectedCategory
      if (selectedSubcat !== 'all') params.subcategory_id = selectedSubcat
      if (selectedConcern !== 'all') params.health_concern_id = selectedConcern
      if (prescriptionFilter !== 'all') params.requires_prescription = prescriptionFilter
      const [page, brandList, cats, subs, concerns, stats] = await Promise.all([
        adminProductService.listProductsPage(params),
        adminProductService.listBrands(),
        adminProductService.listProductCategories(),
        adminProductService.listProductSubcategories(),
        adminProductService.listHealthConcerns(),
        adminProductService.getCatalogStats(),
      ])
      if (request !== pageRequest.current) return
      setProducts(page.items)
      setProductTotal(page.total)
      setCatalogStats(stats.products)
      setBrands(brandList)
      setCategories(cats)
      setSubcategories(subs)
      setAllConcerns(concerns)
    } catch {
      if (request !== pageRequest.current) return
      setError('Failed to load products.')
    } finally {
      if (request === pageRequest.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (loading || activeTab !== 'products') return

    const productId = searchParams.get('product')
    if (!productId || handledProductQuery === productId) return

    setHandledProductQuery(productId)
    void adminProductService.getProduct(Number(productId)).then(openEditModal).catch(() => setError('Unable to open the selected product.'))
  }, [activeTab, handledProductQuery, loading, productQueryKey, products, searchParams])

  const resetForm = () => {
    setProductName('')
    setProductCategoryId('')
    setItemSku(''); setItemPrice(''); setItemStrength(''); setItemPackSize(''); setItemQuantity('0'); setItemThreshold('5'); setItemStore(''); setItemBatch(''); setItemExpiry('')
    setProductSlug('')
    setProductSubcategoryId('')
    setProductBrandId(brands[0]?.id ?? '')
    setProductHealthConcernIds([])
    setProductStatus('active')
    setProductRequiresRx(false)
    setProductDescription('')
    setProductFeaturesText('')
    setEditingProduct(null)
    setFormError('')
    setProductFieldErrors({})
  }

  const clearProductFieldError = (field: ProductFieldErrorKey) => {
    setProductFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const clearBrandFieldError = (field: BrandFieldErrorKey) => {
    setBrandFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
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
    setBrandFieldErrors({})
    setEditingBrand(null)
    setShowBrandModal(false)
  }

  const openAddBrand = () => {
    setEditingBrand(null)
    setBrandName('')
    setBrandDescription('')
    setBrandLogoFile(null)
    setBrandFormError('')
    setBrandFieldErrors({})
    setShowBrandModal(true)
  }

  const openEditBrand = (brand: ApiBrand) => {
    setEditingBrand(brand)
    setBrandName(brand.name)
    setBrandDescription(brand.description ?? '')
    setBrandLogoFile(null)
    setBrandFormError('')
    setBrandFieldErrors({})
    setShowBrandModal(true)
  }

  const openEditModal = (product: ApiProduct) => {
    const resolvedBrand = resolveProductBrand(product)
    const resolvedSubcategory = resolveProductSubcategory(product)

    setItemPrice(String(product.price ?? ''))
    setItemStrength(product.variants?.[0]?.strength || product.strength || '')
    setItemPackSize(product.pack_size || product.variants?.[0]?.pack_size || '')
    setProductName(product.name)
    setProductSlug(product.slug ?? generateSlug(product.name))
    setProductCategoryId(getProductCategoryId(product) ?? '')
    setProductSubcategoryId(resolvedSubcategory?.id ?? product.subcategory_id ?? '')
    setProductBrandId(resolvedBrand?.id ?? product.brand?.id ?? '')
    setProductHealthConcernIds(product.health_concerns?.map((c) => c.id) ?? [])
    setProductStatus(product.is_active ? 'active' : 'inactive')
    setProductRequiresRx(product.requires_prescription)
    setProductDescription(product.description ?? '')
    setProductFeaturesText(formatFeatureLines(product.features))
    setEditingProduct(product)
    setFormError('')
    setProductFieldErrors({})
    setShowAddModal(true)
  }

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setProductFieldErrors({})
    if (!productName.trim()) {
      setProductFieldErrors({ name: 'Product name is required.' })
      return
    }
    if (productBrandId === '') {
      setProductFieldErrors({ brand: brands.length === 0 ? 'Create a brand before adding a product.' : 'Brand is required.' })
      return
    }
    if (productCategoryId === '') {
      setFormError('Select a category for this item.')
      return
    }
    if ((!Number.isFinite(Number(itemPrice)) || Number(itemPrice) <= 0)) { setFormError('Enter an item price greater than zero.'); return }
    if (!editingProduct && (![itemQuantity, itemThreshold].every(value => value.trim() !== '' && Number.isInteger(Number(value)) && Number(value) >= 0))) { setFormError('Enter valid non-negative whole quantities.'); return }
    if (!editingProduct && !itemBatch.trim()) { setFormError('Batch number is required.'); return }
    if (!editingProduct && Number(itemQuantity) > 0 && !itemStore) { setFormError('Select the store that owns the opening stock.'); return }
    if (productHealthConcernIds.length === 0) {
      setProductFieldErrors({ health_concerns: 'Select at least one health concern.' })
      return
    }
    if (!productDescription.trim()) {
      setProductFieldErrors({ description: 'Description is required.' })
      return
    }

    const features = parseFeatureLines(productFeaturesText)
    if (features.length === 0) {
      setProductFieldErrors({ features: 'Add at least one feature.' })
      return
    }
    const slug = productSlug.trim() || generateSlug(productName)
    const commonPayload: ProductFormPayload = {
      name: productName.trim(),
      slug,
      brand_id: Number(productBrandId),
      category_id: Number(productCategoryId),
      subcategory_id: productSubcategoryId === '' ? null : Number(productSubcategoryId),
      health_concern_ids: productHealthConcernIds,
      is_active: productStatus === 'active',
      requires_prescription: productRequiresRx,
      description: productDescription.trim(),
      features,
    }

    const createPayload: ProductCreatePayload = {
      ...commonPayload,
      item: { name: productName.trim().slice(0,120), sku: itemSku.trim(), strength: itemStrength.trim(), pack_size: itemPackSize.trim(), price: Number(itemPrice), stock_quantity: Number(itemQuantity), low_stock_threshold: Number(itemThreshold), store_id: itemStore ? Number(itemStore) : undefined, batch_number: itemBatch.trim(), expiry_date: itemExpiry || undefined },
    }

    const updatePayload: ProductFormPayload = {
      ...commonPayload,
      item: { price: Number(itemPrice), strength: itemStrength.trim(), pack_size: itemPackSize.trim() },
    }

    const buildProductFormData = (payload: ProductFormPayload) => {
      const formData = new FormData()
      formData.append('name', payload.name)
      formData.append('slug', payload.slug)
      formData.append('is_active', String(payload.is_active))
      formData.append('requires_prescription', String(payload.requires_prescription))
      formData.append('description', payload.description ?? '')
      formData.append('features', JSON.stringify(payload.features ?? []))
      if ('item' in payload && payload.item) formData.append('item', JSON.stringify(payload.item))
      if (payload.category_id != null) formData.append('category_id', String(payload.category_id))

      if (payload.brand_id !== null && payload.brand_id !== undefined) formData.append('brand_id', String(payload.brand_id))
      if (payload.subcategory_id !== null && payload.subcategory_id !== undefined) formData.append('subcategory_id', String(payload.subcategory_id))
      productHealthConcernIds.forEach((id) => formData.append('health_concern_ids', String(id)))
      return formData
    }

    setSaving(true)
    try {
      if (editingProduct) {
        const updated = await adminProductService.updateProduct(editingProduct.id, updatePayload)
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? updated : p)))
        void loadAll()
        setShowAddModal(false)
      } else {
        const requestPayload = buildProductFormData(createPayload)
        const created = await adminProductService.createProduct(requestPayload)
        setProducts((prev) => [created, ...prev])
        void loadAll()
        setShowAddModal(false)
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
        const fieldMap: Partial<Record<ProductFieldErrorKey, string>> = {}
        const genericMessages: string[] = []
        const aliases: Record<string, ProductFieldErrorKey> = {
          name: 'name',
          product_name: 'name',
          slug: 'name',
          brand: 'brand',
          brand_id: 'brand',
          subcategory: 'subcategory',
          subcategory_id: 'subcategory',
          health_concerns: 'health_concerns',
          health_concern_ids: 'health_concerns',
          description: 'description',
          features: 'features',
          is_active: 'status',
          status: 'status',
          requires_prescription: 'requires_prescription',
        }

        Object.entries(fieldErrors).forEach(([field, errs]) => {
          const message = Array.isArray(errs) ? errs.join(', ') : String(errs)
          const key = aliases[field]
          if (key) {
            fieldMap[key] = message
          } else {
            genericMessages.push(`${field}: ${message}`)
          }
        })
        setProductFieldErrors(fieldMap)
        setFormError(genericMessages.join(' · '))
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
      clearBrandFieldError('logo')
      return
    }

    const validationError = await validateImageFile(file, 'brand')
    if (validationError) {
      setBrandLogoFile(null)
      setBrandFieldErrors((prev) => ({ ...prev, logo: validationError }))
      return
    }

    setBrandLogoFile(file)
    clearBrandFieldError('logo')
  }

  const handleSaveBrand = async (e: FormEvent) => {
    e.preventDefault()
    setBrandFormError('')
    setBrandFieldErrors({})
    if (!brandName.trim()) {
      setBrandFieldErrors({ name: 'Brand name is required.' })
      return
    }
    if (!editingBrand && !brandLogoFile) {
      setBrandFieldErrors({ logo: 'Brand logo is required.' })
      return
    }

    setBrandSaving(true)
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
      type ApiErr = { response?: { data?: { error?: { message?: string; details?: Record<string, string[] | string> } } } }
      const apiErr = (err as ApiErr)?.response?.data?.error
      const details = apiErr?.details
      if (details && isFieldErrorMap(details)) {
        const fieldMap: Partial<Record<BrandFieldErrorKey, string>> = {}
        const genericMessages: string[] = []
        const aliases: Record<string, BrandFieldErrorKey> = {
          name: 'name',
          description: 'description',
          logo: 'logo',
          image: 'logo',
        }
        Object.entries(details).forEach(([field, errs]) => {
          const message = Array.isArray(errs) ? errs.join(', ') : String(errs)
          const key = aliases[field]
          if (key) fieldMap[key] = message
          else genericMessages.push(`${field}: ${message}`)
        })
        setBrandFieldErrors(fieldMap)
        setBrandFormError(genericMessages.join(' · '))
      } else {
        setBrandFormError(apiErr?.message ?? 'Failed to save brand.')
      }
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
      void loadAll()
    } catch {
      // silent
    }
  }

  useEffect(() => { setCurrentPage(1) }, [searchTerm, selectedCategory, selectedSubcat, selectedConcern, prescriptionFilter, productSortField, brandSortField, sortDirection])

  const visibleSubcategories =
    selectedCategory === 'all'
      ? subcategories
      : subcategories.filter((subcategory) => String(subcategory.category) === selectedCategory)

  useEffect(() => {
    if (!showAddModal || editingProduct || productBrandId !== '' || brands.length === 0) return
    setProductBrandId(brands[0].id)
  }, [showAddModal, editingProduct, productBrandId, brands])


  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedSubcat !== 'all' ||
    selectedConcern !== 'all' || prescriptionFilter !== 'all'

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
    setPrescriptionFilter('all')
  }

  const sortedProducts = products

  const sortedBrands = useMemo(() => {
    const items = [...brands]
    const getBrandProductCount = (brand: ApiBrand) => brand.product_count ?? 0
    items.sort((left, right) => {
      let comparison = 0
      if (brandSortField === 'name') comparison = left.name.localeCompare(right.name)
      else if (brandSortField === 'products') comparison = getBrandProductCount(left) - getBrandProductCount(right)
      else if (brandSortField === 'status') comparison = Number(left.is_active) - Number(right.is_active)
      else comparison = compareCreatedAt(left.created_at, right.created_at)
      return sortDirection === 'asc' ? (comparison || left.id - right.id) : -(comparison || left.id - right.id)
    })
    return items
  }, [brands, products, brandSortField, sortDirection])

  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedProducts = sortedProducts
  const totalPages = Math.max(1, Math.ceil(productTotal / PAGE_SIZE))

  function getProductCatalog(product: ApiProduct) {
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

  function getProductBrandLabel(product: ApiProduct) {
    return product.brand?.name ?? product.brand_name ?? 'No brand'
  }

  const handleProductSort = (field: ProductSortField) => {
    if (productSortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setProductSortField(field)
    setSortDirection(field === 'created_at' ? 'desc' : 'asc')
  }

  const handleBrandSort = (field: ProductBrandSortField) => {
    if (brandSortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setBrandSortField(field)
    setSortDirection(field === 'created_at' ? 'desc' : 'asc')
  }

  const productSortIndicator = (field: ProductSortField) => productSortField === field ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'
  const brandSortIndicator = (field: ProductBrandSortField) => brandSortField === field ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'
  const renderProductSortButton = (field: ProductSortField, label: string) => (
    <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleProductSort(field)}>
      {label} {productSortIndicator(field)}
    </button>
  )
  const renderBrandSortButton = (field: ProductBrandSortField, label: string) => (
    <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleBrandSort(field)}>
      {label} {brandSortIndicator(field)}
    </button>
  )

  return (
    <div className="category-management product-management">
      <div className="category-management__header">
        <div className="cm-title-group">
          <h1>{activeTab === 'brands' ? 'Brands' : embedded ? 'Items' : 'Products'}</h1>
          <p className="cm-title-sub">{activeTab === 'brands' ? 'Manage product brands' : 'Each row is one product/SKU. Stock can be held in multiple stores and batches.'}</p>
        </div>
        <div className="category-management__actions">
          {activeTab === 'products' ? (
            <button className="btn btn--primary btn--sm" onClick={openAddModal}>+ Add item</button>
          ) : (
            <button className="btn btn--primary btn--sm" onClick={openAddBrand}>+ Add Brand</button>
          )}
        </div>
      </div>

      <div className="cm-tabs" style={{ marginBottom: '1rem' }}>
        <button className={`cm-tab${activeTab === 'products' ? ' cm-tab--active' : ''}`} onClick={() => setActiveTab('products')}>
          Products <span className="cm-tab__count">{productTotal}</span>
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
                    <th style={{ minWidth: 220 }}>{renderBrandSortButton('name', 'Brand')}</th>
                    <th style={{ minWidth: 200 }}>Description</th>
                    <th style={{ minWidth: 80 }}>{renderBrandSortButton('products', 'Products')}</th>
                    <th style={{ minWidth: 90 }}>{renderBrandSortButton('status', 'Status')}</th>
                    <th style={{ minWidth: 120, whiteSpace: 'nowrap' }}>{renderBrandSortButton('created_at', 'Created At')}</th>
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
                        <span style={{ fontSize: '0.74rem', color: brand.description ? '#374151' : '#d1d5db' }}>
                          {brand.description || '-'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          {brand.product_count ?? 0}
                        </span>
                      </td>
                      <td>
                        <span className={`cm-status ${brand.is_active ? 'cm-status--active' : 'cm-status--inactive'}`}>
                          {brand.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(brand.created_at)}</td>
                      <td>{brand.created_by_name || '-'}</td>
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
      <AdminKpiStats items={[
        { label: 'Products', value: loading ? '—' : catalogStats.total },
        { label: 'Active', value: loading ? '—' : catalogStats.active },
        { label: 'Low stock', value: loading ? '—' : catalogStats.low_stock },
        { label: 'Inactive', value: loading ? '—' : catalogStats.inactive },
      ]} />

      <div className="cm-toolbar">
        <div className="cm-search-box">
          <svg className="cm-search-box__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <circle cx="9" cy="9" r="5.75" /><path d="M13.5 13.5L17 17" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            aria-label="Search catalog products"
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
            aria-label="Filter products by category" value={selectedCategory}
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
          <select className="cm-filter-select" aria-label="Filter products by subcategory" value={selectedSubcat} onChange={(e) => setSelectedSubcat(e.target.value)}>
            <option value="all">All Subcategories</option>
            {visibleSubcategories.map((s) => (
              <option key={s.id} value={String(s.id)}>{s.category_name} / {s.name}</option>
            ))}
          </select>
          <select className="cm-filter-select" aria-label="Filter products by health concern" value={selectedConcern} onChange={(e) => setSelectedConcern(e.target.value)}>
            <option value="all">All Health Concerns</option>
            {allConcerns.map((concern) => (
              <option key={concern.id} value={String(concern.id)}>{concern.name}</option>
            ))}
          </select>
          <select className="cm-filter-select" aria-label="Filter by prescription requirement" value={prescriptionFilter} onChange={event => setPrescriptionFilter(event.target.value)}>
            <option value="all">All prescription types</option>
            <option value="true">Prescription required</option>
            <option value="false">No prescription required</option>
          </select>
          {hasActiveFilters && (
            <button type="button" className="cm-clear-filter" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
          {hasActiveFilters && (
            <span className="cm-result-count">{productTotal} result{productTotal !== 1 ? 's' : ''}</span>
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
          <table className="cm-table pm-products-table">
            <thead>
              <tr>
                <th style={{ minWidth: 190 }}>{renderProductSortButton('name', 'Product')}</th>
                <th>Strength</th>
                <th>Pack size</th>
                <th style={{ minWidth: 100 }}>{renderProductSortButton('brand', 'Brand')}</th>
                <th style={{ minWidth: 110 }}>{renderProductSortButton('subcategory', 'Subcategory')}</th>
                <th style={{ minWidth: 92 }}>{renderProductSortButton('price', 'Price')}</th>
                <th style={{ minWidth: 115 }}>Active Deal</th>
                <th style={{ minWidth: 72 }}>{renderProductSortButton('stock', 'Total stock')}</th>
                <th style={{ minWidth: 92 }}>{renderProductSortButton('rx', 'Rx')}</th>
                <th style={{ minWidth: 78 }}>{renderProductSortButton('status', 'Status')}</th>
                <th style={{ minWidth: 92, whiteSpace: 'nowrap' }}>{renderProductSortButton('created_at', 'Created At')}</th>
                <th style={{ minWidth: 88 }}>Created By</th>
                <th style={{ minWidth: 88 }}>Updated By</th>
                <th className="cm-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedProducts.map((product) => {
                const stockQty = getSellableQuantity(product)
                const stockClass = getSellableStatusClass(product)
                const activePromotion = product.active_promotions?.[0]
                const activeDealLabel = activePromotion?.title || product.badge
                return (
                <tr key={product.id}>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <ImageWithFallback src={product.image ?? ''} alt={product.name} style={{ width: 30, height: 30, borderRadius: '0.35rem', objectFit: 'cover', flexShrink: 0 }} />
                      <div className="cm-name-cell">
                        <span className="cm-name-cell__name">{product.name}</span>
                        {product.strength && <span className="cm-name-cell__id">{product.strength}</span>}
                        {product.dosage_quantity && product.dosage_unit && product.dosage_frequency && (
                          <span className="cm-name-cell__id" style={{ color: '#10b981' }}>
                            {product.dosage_quantity} {product.dosage_unit} · {product.dosage_frequency.replace(/_/g, ' ')}{product.dosage_notes ? ` · ${product.dosage_notes}` : ''}
                          </span>
                        )}
                        <span className="cm-name-cell__id">SKU {product.sku || 'Pending'}</span>
                        {product.health_concerns.length > 0 && (
                          <div className="cm-chips" style={{ marginTop: '0.25rem' }}>
                            {product.health_concerns.slice(0, 1).map((concern) => (
                              <span key={concern.id} className="cm-chip">{concern.name}</span>
                            ))}
                            {product.health_concerns.length > 1 && (
                              <span className="cm-chip cm-chip--more">+{product.health_concerns.length - 1}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{product.strength || 'Not recorded'}</td>
                  <td>{product.pack_size || 'Not recorded'}</td>
                  <td>
                    <span style={{ fontSize: '0.74rem', fontWeight: 500 }}>{getProductBrandLabel(product)}</span>
                  </td>
                  <td>
                    <div className="cm-name-cell">
                      <span className="cm-name-cell__name">{getProductCatalog(product).subcategoryName}</span>
                      <span className="cm-name-cell__id">{getProductCatalog(product).categoryName}</span>
                    </div>
                  </td>
                  <td>{formatCurrency(product.final_price || product.price)}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span>{activeDealLabel || 'No active deal'}</span>
                      <span className="cm-name-cell__id">
                        {activeDealLabel ? formatCurrency(product.final_price || product.price) : 'Manage in Deals'}
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
                      : <span className="cm-name-cell__id">-</span>}
                  </td>
                  <td>
                    <span className={`cm-status ${product.is_active ? 'cm-status--active' : 'cm-status--inactive'}`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(product.created_at)}</td>
                  <td>{product.created_by_name || '-'}</td>
                  <td>-</td>
                  <td>
                    <div className="cm-row-actions">
                      <Link className="cm-row-btn" to={`/admin/products-stock?view=stock&product=${product.id}`}>Manage stock</Link>
                      <button
                        type="button"
                        className="cm-row-btn cm-row-btn--edit"
                        title="Edit"
                        onClick={() => { void adminProductService.getProduct(product.id).then(openEditModal).catch(() => setError('Unable to open product.')) }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="cm-row-btn"
                        title={product.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggleProduct(product)}
                      >
                        {product.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
              {pagedProducts.length === 0 && (
                <tr><td colSpan={14} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No products found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        )}
        {!loading && productTotal > PAGE_SIZE && (
          <div className="cm-pagination">
            <span className="cm-pagination__info">
              Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, productTotal)} of {productTotal}
            </span>
            <div className="cm-pagination__controls">
              <button className="pagination__button" type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
              <div className="pagination__pages">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i).map((page) => (
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
        <div className="modal-overlay" onClick={() => { if (!saving) setShowAddModal(false) }}>
          <div ref={productDialogRef} role="dialog" aria-modal="true" aria-labelledby="product-dialog-title"
            className="modal modal--product" onClick={(e) => e.stopPropagation()}
            onKeyDown={(event) => { if (event.key === 'Escape' && !saving) { event.stopPropagation(); setShowAddModal(false); resetForm() } }}>
            <div className="modal__header">
              <div className="modal__header-info">
                <h2 id="product-dialog-title">{editingProduct ? 'Edit item' : 'Add item'}</h2>
                <span className="modal__header-sub">All fields marked * are required</span>
              </div>
              <button type="button" aria-label="Close product form" disabled={saving} className="modal__close" onClick={() => { setShowAddModal(false); resetForm() }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {formError && (
              <div role="alert" className="form-alert form-alert--error">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} noValidate>
              <div className="modal__body">

                <div className="pf-section">
                  <div className="pf-section__label">Basic Info</div>
                  <div className="pf-grid pf-grid--basic">
                    <div className="pf-field pf-field--name">
                      <label htmlFor="product-name" className="pf-label">Product Name <span className="pf-req">*</span></label>
                      <input
                        className="pf-input"
                        type="text"
                        id="product-name"
                        placeholder="e.g. Panadol Extra"
                        value={productName}
                        onChange={(e) => {
                          setProductName(e.target.value)
                          setProductSlug(generateSlug(e.target.value))
                          clearProductFieldError('name')
                        }}
                      />
                      {productFieldErrors.name && <span className="pf-error">{productFieldErrors.name}</span>}
                    </div>
                    <div className="pf-field pf-field--status">
                      <label htmlFor="product-status" className="pf-label">Status <span className="pf-req">*</span></label>
                      <select id="product-status" className="pf-input" value={productStatus} onChange={(e) => { setProductStatus(e.target.value as 'active' | 'inactive'); clearProductFieldError('status') }}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      {productFieldErrors.status && <span className="pf-error">{formatStatus(productFieldErrors.status)}</span>}
                    </div>
                    <div className="pf-field pf-field--brand">
                      <label className="pf-label">Brand <span className="pf-req">*</span></label>
                      <div className="pf-control-wrap">
                        <SearchableSelect
                          ariaLabel="Brand"
                          className="pf-ss"
                          value={productBrandId}
                          onChange={(v) => { setProductBrandId(v !== '' ? Number(v) : ''); clearProductFieldError('brand') }}
                          options={brands.map((b) => ({ value: b.id, label: b.name }))}
                          placeholder={brands.length === 0 ? 'Create a brand first' : 'Select brand…'}
                          disabled={brands.length === 0}
                          emptyMessage="No brands found"
                        />
                      </div>
                      {productFieldErrors.brand && <span className="pf-error">{productFieldErrors.brand}</span>}
                    </div>
                    <div className="pf-field">
                      <label className="pf-label" htmlFor="flat-item-category">Category <span className="pf-req">*</span></label>
                      <select id="flat-item-category" className="pf-input" value={productCategoryId} onChange={e => { setProductCategoryId(e.target.value ? Number(e.target.value) : ''); setProductSubcategoryId('') }} required><option value="">Select category…</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
                    </div>
                    <div className="pf-field pf-field--subcategory">
                      <label className="pf-label">Subcategory (optional)</label>
                      <SearchableSelect
                        ariaLabel="Subcategory"
                        value={productSubcategoryId}
                        onChange={(v) => { setProductSubcategoryId(v !== '' ? Number(v) : ''); clearProductFieldError('subcategory') }}
                        options={subcategories.filter(s => !productCategoryId || s.category === productCategoryId).map((s) => ({ value: s.id, label: `${s.category_name} / ${s.name}` }))}
                        placeholder={subcategories.length === 0 ? 'No subcategories — optional' : 'Select subcategory…'}
                        disabled={subcategories.length === 0}
                        emptyMessage="No subcategories found"
                      />
                      {productFieldErrors.subcategory && <span className="pf-error">{productFieldErrors.subcategory}</span>}
                    </div>
                  </div>
                  <div className="pf-field pf-field--full pf-field--spaced">
                    <label className="pf-label">Health Concerns <span className="pf-req">*</span></label>
                    <SearchableMultiSelect
                      ariaLabel="Health concerns"
                      value={productHealthConcernIds}
                      onChange={(values) => { setProductHealthConcernIds(values.map((v) => Number(v))); clearProductFieldError('health_concerns') }}
                      options={allConcerns.filter((c) => c.is_active).map((c) => ({ value: c.id, label: c.name }))}
                      placeholder={allConcerns.length === 0 ? 'Create a health concern first' : 'Select one or more concerns…'}
                    />
                    {productFieldErrors.health_concerns && <span className="pf-error">{productFieldErrors.health_concerns}</span>}
                  </div>
                  <div className="pf-field pf-field--full pf-field--spaced">
                    <label htmlFor="product-description" className="pf-label">Description <span className="pf-req">*</span></label>
                    <textarea
                      className="pf-input pf-textarea"
                      rows={2}
                      id="product-description"
                        placeholder="Brief description shown on the product page"
                      value={productDescription}
                      onChange={(e) => { setProductDescription(e.target.value); clearProductFieldError('description') }}
                    />
                    {productFieldErrors.description && <span className="pf-error">{productFieldErrors.description}</span>}
                  </div>
               
                  <div className="pf-field pf-field--full pf-field--spaced">
                    <label htmlFor="product-features" className="pf-label">Features <span className="pf-req">*</span></label>
                    <textarea
                      className="pf-input pf-textarea"
                      rows={3}
                      id="product-features"
                        placeholder="Enter one feature per line"
                      value={productFeaturesText}
                      onChange={(e) => { setProductFeaturesText(e.target.value); clearProductFieldError('features') }}
                    />
                    <span className="pf-hint">Each line becomes a separate bullet point on the product page.</span>
                    {productFieldErrors.features && <span className="pf-error">{productFieldErrors.features}</span>}
                  </div>
                </div>

      

                <div className="pf-section">
                  <div className="pf-section__label">Strength &amp; pack size</div>
                  <p className="pf-hint">Create a separate item/SKU for each strength or pack size. Each item can then have stock at multiple stores and batches.</p>
                  <div className="pf-grid pf-grid--basic">
                    <div className="pf-field"><label htmlFor="item-strength">Strength</label><input id="item-strength" className="pf-input" maxLength={50} value={itemStrength} onChange={event => setItemStrength(event.target.value)} placeholder="e.g. 500 mg, 10 mg/5 mL, 2%" /></div>
                    <div className="pf-field"><label htmlFor="item-pack-size">Pack size</label><input id="item-pack-size" className="pf-input" maxLength={80} value={itemPackSize} onChange={event => setItemPackSize(event.target.value)} placeholder="e.g. 20 tablets, 100 mL, 30 capsules" /></div>
                  </div>
                </div>

                {!editingProduct && <div className="pf-section"><div className="pf-section__label">Item details &amp; opening stock</div><p className="pf-hint">Opening stock is the first store/batch record for this product. You can add more stock records later from Manage stock. Enter zero if stock will be added later.</p><div className="pf-grid pf-grid--basic">
                  <div className="pf-field"><label htmlFor="flat-item-sku">SKU (optional)</label><input id="flat-item-sku" className="pf-input" value={itemSku} onChange={e => setItemSku(e.target.value)} placeholder="Auto-generated if blank" /></div>
                  <div className="pf-field"><label htmlFor="flat-item-price">Selling price (KSh) *</label><input id="flat-item-price" className="pf-input" type="number" min="0.01" step="0.01" required value={itemPrice} onChange={e => setItemPrice(e.target.value)} /></div>
                  <div className="pf-field"><label htmlFor="flat-item-quantity">Opening stock quantity *</label><input id="flat-item-quantity" className="pf-input" type="number" min="0" step="1" required value={itemQuantity} onChange={e => setItemQuantity(e.target.value)} /></div>
                  <div className="pf-field"><label htmlFor="flat-item-threshold">Low stock threshold *</label><LowStockThresholdInput id="flat-item-threshold" className="pf-input" type="number" min="0" step="1" required value={itemThreshold} onChange={e => setItemThreshold(e.target.value)} /></div>
                  <div className="pf-field"><label htmlFor="flat-item-store">Stock store</label><select id="flat-item-store" className="pf-input" required={Number(itemQuantity) > 0} value={itemStore} onChange={e => setItemStore(e.target.value)}><option value="">Select store…</option>{stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></div>
                  <div className="pf-field"><label htmlFor="flat-item-batch">Batch number *</label><input id="flat-item-batch" required className="pf-input" value={itemBatch} onChange={e => setItemBatch(e.target.value)} /></div>
                  <div className="pf-field"><label htmlFor="flat-item-expiry">Expiry date</label><input id="flat-item-expiry" className="pf-input" type="date" value={itemExpiry} onChange={e => setItemExpiry(e.target.value)} /></div>
                </div></div>}
                {editingProduct && <div className="pf-section"><div className="pf-field"><label htmlFor="flat-edit-price">Selling price (KSh) *</label><input id="flat-edit-price" className="pf-input" type="number" min="0.01" step="0.01" required value={itemPrice} onChange={e => setItemPrice(e.target.value)} /></div><Link className="btn btn--outline btn--sm" to={`/admin/products-stock?view=stock&product=${editingProduct.id}`}>Manage this item's store and batch stock</Link></div>}

                <div className="pf-section">
                  <div className="pf-section__label">Access</div>
                  <div className="pf-toggle-row" onClick={() => { setProductRequiresRx(!productRequiresRx); clearProductFieldError('requires_prescription') }}>
                    <div className="pf-toggle-row__text">
                      <span className="pf-toggle-row__title">Prescription Required</span>
                      <span className="pf-toggle-row__sub">
                        {productRequiresRx ? 'Customer must present a valid prescription to purchase' : 'Available over the counter without a prescription'}
                      </span>
                    </div>
                    <label className="rx-toggle" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={productRequiresRx} onChange={(e) => { setProductRequiresRx(e.target.checked); clearProductFieldError('requires_prescription') }} />
                      <span className={`rx-toggle__track${productRequiresRx ? ' rx-toggle__track--on' : ''}`}>
                        <span className="rx-toggle__thumb" style={{ transform: productRequiresRx ? 'translateX(20px)' : 'translateX(0)' }} />
                      </span>
                    </label>
                  </div>
                  {productFieldErrors.requires_prescription && <span className="pf-error">{productFieldErrors.requires_prescription}</span>}
                </div>

              </div>

              <div className="modal__footer">
                <button type="button" className="btn btn--secondary" disabled={saving} onClick={() => { setShowAddModal(false); resetForm() }}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? (
                    <><span className="btn-spinner" />Saving…</>
                  ) : editingProduct ? 'Save Changes' : 'Add item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBrandModal && (
        <div className="cm-overlay" onClick={closeBrandModal}>
          <Dialog busy={brandSaving} onClose={closeBrandModal} className="cm-modal" onClick={(e) => e.stopPropagation()}>
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
              {brandFormError && (
                <p className="cm-form__error">
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {brandFormError}
                </p>
              )}

              <label className="cm-field">
                <span>Name</span>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => { setBrandName(e.target.value); clearBrandFieldError('name') }}
                  placeholder="e.g. Panadol"
                  disabled={brandSaving}
                  autoFocus
                />
                {brandFieldErrors.name && <span className="cm-field__error">{brandFieldErrors.name}</span>}
              </label>

              <label className="cm-field">
                <span>Description <em className="cm-field__optional">optional</em></span>
                <textarea
                  value={brandDescription}
                  onChange={(e) => { setBrandDescription(e.target.value); clearBrandFieldError('description') }}
                  placeholder="Brief description visible to shoppers"
                  disabled={brandSaving}
                  rows={2}
                />
                {brandFieldErrors.description && <span className="cm-field__error">{brandFieldErrors.description}</span>}
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
                {brandFieldErrors.logo && <span className="cm-field__error">{brandFieldErrors.logo}</span>}
              </label>

              <div className="cm-modal__actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={closeBrandModal} disabled={brandSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary btn--sm" disabled={brandSaving}>
                  {brandSaving ? <><span className="cm-spinner" /> Saving…</> : editingBrand ? 'Save Changes' : 'Create Brand'}
                </button>
              </div>
            </form>
          </Dialog>
        </div>
      )}

    </div>
  )
}

export default ProductManagement
