import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
  ApiProductVariant,
  ProductVariantPayload,
  ProductCreatePayload,
} from '../../services/adminProductService'
import { getImageUploadHint, validateImageFile } from '../../utils/imageUploadSpecs'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/shared/AdminButtonUtilities.css'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/admin/ProductManagement.css'

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

const DOSAGE_UNIT_OPTIONS = [
  'tablet',
  'tablets',
  'capsule',
  'capsules',
  'ml',
  'mg',
  'drop',
  'drops',
  'sachet',
  'application',
  'spray',
  'unit',
] as const

const DOSAGE_FREQUENCY_OPTIONS = [
  'once_daily',
  'twice_daily',
  'three_times_daily',
  'four_times_daily',
  'every_4_hours',
  'every_6_hours',
  'every_8_hours',
  'every_12_hours',
  'weekly',
  'as_needed',
  'as_directed',
] as const

function normalizeDosageUnitValue(value?: string | null): string {
  if (!value) return ''
  const normalized = value.trim().toLowerCase()
  return DOSAGE_UNIT_OPTIONS.find((option) => option === normalized) ?? ''
}

function normalizeDosageFrequencyValue(value?: string | null): string {
  if (!value) return ''
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_')
  const aliasMap: Record<string, typeof DOSAGE_FREQUENCY_OPTIONS[number]> = {
    '1x_daily': 'once_daily',
    '1_time_daily': 'once_daily',
    '2x_daily': 'twice_daily',
    '2_times_daily': 'twice_daily',
    '3x_daily': 'three_times_daily',
    '3_times_daily': 'three_times_daily',
    'four_times_a_day': 'four_times_daily',
    '4x_daily': 'four_times_daily',
    '4_times_daily': 'four_times_daily',
    'prn': 'as_needed',
  }
  return DOSAGE_FREQUENCY_OPTIONS.find((option) => option === normalized)
    ?? aliasMap[normalized]
    ?? ''
}

function ProductManagement() {
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
  const [productBarcode, setProductBarcode] = useState('')
  const [productPosProductId, setProductPosProductId] = useState('')
  const [productStrength, setProductStrength] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productCostPrice, setProductCostPrice] = useState('')
  const [productSubcategoryId, setProductSubcategoryId] = useState<number | ''>('')
  const [productBrandId, setProductBrandId] = useState<number | ''>('')
  const [productHealthConcernIds, setProductHealthConcernIds] = useState<number[]>([])
  const [productStatus, setProductStatus] = useState<'active' | 'inactive'>('active')
  const [productRequiresRx, setProductRequiresRx] = useState(false)
  const [productDescription, setProductDescription] = useState('')
  const [productFeaturesText, setProductFeaturesText] = useState('')
  const [productDirections, setProductDirections] = useState('')
  const [productWarnings, setProductWarnings] = useState('')
  const [dosageQuantity, setDosageQuantity] = useState('')
  const [dosageUnit, setDosageUnit] = useState('')
  const [dosageFrequency, setDosageFrequency] = useState('')
  const [dosageNotes, setDosageNotes] = useState('')
  const [branchStockQuantity, setBranchStockQuantity] = useState('0')
  const [branchLowStockThreshold, setBranchLowStockThreshold] = useState('5')
  const [branchAllowBackorder, setBranchAllowBackorder] = useState(false)
  const [branchMaxBackorderQuantity, setBranchMaxBackorderQuantity] = useState('0')
  const [productImageFile, setProductImageFile] = useState<File | null>(null)
  const [productImagePreviewSrc, setProductImagePreviewSrc] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [variants, setVariants] = useState<ApiProductVariant[]>([])
  const [variantsLoading, setVariantsLoading] = useState(false)
  const [variantsError, setVariantsError] = useState('')
  const [showVariantForm, setShowVariantForm] = useState(false)
  const [editingVariant, setEditingVariant] = useState<ApiProductVariant | null>(null)
  const [variantName, setVariantName] = useState('')
  const [variantSku, setVariantSku] = useState('')
  const [variantBarcode, setVariantBarcode] = useState('')
  const [variantPosProductId, setVariantPosProductId] = useState('')
  const [variantPrice, setVariantPrice] = useState('')
  const [variantOriginalPrice, setVariantOriginalPrice] = useState('')
  const [variantStockQuantity, setVariantStockQuantity] = useState('0')
  const [variantLowStockThreshold, setVariantLowStockThreshold] = useState('5')
  const [variantAllowBackorder, setVariantAllowBackorder] = useState(false)
  const [variantMaxBackorderQuantity, setVariantMaxBackorderQuantity] = useState('0')
  const [variantIsActive, setVariantIsActive] = useState(true)
  const [variantAttributesText, setVariantAttributesText] = useState('{}')
  const [variantSaving, setVariantSaving] = useState(false)
  const [variantFormError, setVariantFormError] = useState('')
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
    setProductBarcode('')
    setProductPosProductId('')
    setProductStrength('')
    setProductPrice('')
    setProductCostPrice('')
    setProductSubcategoryId(subcategories[0]?.id ?? '')
    setProductBrandId(brands[0]?.id ?? '')
    setProductHealthConcernIds([])
    setProductStatus('active')
    setProductRequiresRx(false)
    setProductDescription('')
    setProductFeaturesText('')
    setProductDirections('')
    setProductWarnings('')
    setDosageQuantity('')
    setDosageUnit('')
    setDosageFrequency('')
    setDosageNotes('')
    setBranchStockQuantity('0')
    setBranchLowStockThreshold('5')
    setBranchAllowBackorder(false)
    setBranchMaxBackorderQuantity('0')
    setProductImageFile(null)
    setEditingProduct(null)
    setFormError('')
    setVariants([])
    setVariantsLoading(false)
    setVariantsError('')
    setShowVariantForm(false)
    setEditingVariant(null)
    setVariantName('')
    setVariantSku('')
    setVariantBarcode('')
    setVariantPosProductId('')
    setVariantPrice('')
    setVariantOriginalPrice('')
    setVariantStockQuantity('0')
    setVariantLowStockThreshold('5')
    setVariantAllowBackorder(false)
    setVariantMaxBackorderQuantity('0')
    setVariantIsActive(true)
    setVariantAttributesText('{}')
    setVariantSaving(false)
    setVariantFormError('')
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
    setProductPosProductId(product.pos_product_id ?? '')
    setProductStrength(product.strength ?? '')
    setProductPrice(product.price)
    setProductCostPrice(product.cost_price ?? '')
    setProductSubcategoryId(resolvedSubcategory?.id ?? product.subcategory_id ?? (subcategories[0]?.id ?? ''))
    setProductBrandId(resolvedBrand?.id ?? product.brand?.id ?? (brands[0]?.id ?? ''))
    setProductHealthConcernIds(product.health_concerns?.map((c) => c.id) ?? [])
    setProductStatus(product.is_active ? 'active' : 'inactive')
    setProductRequiresRx(product.requires_prescription)
    setProductDescription(product.description ?? '')
    setProductFeaturesText(formatFeatureLines(product.features))
    setProductDirections(product.directions ?? '')
    setProductWarnings(product.warnings ?? '')
    setDosageQuantity(product.dosage_quantity ?? '')
    setDosageUnit(normalizeDosageUnitValue(product.dosage_unit))
    setDosageFrequency(normalizeDosageFrequencyValue(product.dosage_frequency))
    setDosageNotes(product.dosage_notes ?? '')
    setBranchStockQuantity(String(getInventoryItem(product, 'branch')?.stock_quantity ?? 0))
    setBranchLowStockThreshold(String(getInventoryItem(product, 'branch')?.low_stock_threshold ?? 5))
    setBranchAllowBackorder(getInventoryItem(product, 'branch')?.allow_backorder ?? false)
    setBranchMaxBackorderQuantity(String(getInventoryItem(product, 'branch')?.max_backorder_quantity ?? 0))
    setProductImageFile(null)
    setProductImagePreviewSrc(product.image ?? null)
    setEditingProduct(product)
    setFormError('')
    setVariants([])
    setVariantsError('')
    setShowVariantForm(false)
    setEditingVariant(null)
    void loadVariants(product.id)
    setShowAddModal(true)
  }

  const loadVariants = async (productId: number) => {
    setVariantsLoading(true)
    setVariantsError('')
    try {
      const rows = await adminProductService.listProductVariants(productId)
      setVariants(rows)
    } catch {
      setVariantsError('Failed to load variants.')
    } finally {
      setVariantsLoading(false)
    }
  }

  const resetVariantForm = () => {
    setEditingVariant(null)
    setVariantName('')
    setVariantSku('')
    setVariantBarcode('')
    setVariantPosProductId('')
    setVariantPrice('')
    setVariantOriginalPrice('')
    setVariantStockQuantity('0')
    setVariantLowStockThreshold('5')
    setVariantAllowBackorder(false)
    setVariantMaxBackorderQuantity('0')
    setVariantIsActive(true)
    setVariantAttributesText('{}')
    setVariantFormError('')
  }

  const openAddVariant = () => {
    resetVariantForm()
    setShowVariantForm(true)
  }

  const openEditVariant = (variant: ApiProductVariant) => {
    setEditingVariant(variant)
    setVariantName(variant.name ?? '')
    setVariantSku(variant.sku ?? '')
    setVariantBarcode(variant.barcode ?? '')
    setVariantPosProductId(variant.pos_product_id ?? '')
    setVariantPrice(variant.price ?? '')
    setVariantOriginalPrice(variant.original_price ?? '')
    setVariantStockQuantity(String(variant.stock_quantity ?? 0))
    setVariantLowStockThreshold(String(variant.low_stock_threshold ?? 5))
    setVariantAllowBackorder(Boolean(variant.allow_backorder))
    setVariantMaxBackorderQuantity(String(variant.max_backorder_quantity ?? 0))
    setVariantIsActive(Boolean(variant.is_active))
    setVariantAttributesText(JSON.stringify(variant.attributes ?? {}, null, 2))
    setVariantFormError('')
    setShowVariantForm(true)
  }

  const handleSaveVariant = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return
    if (!variantName.trim()) { setVariantFormError('Variant name is required.'); return }
    if (!variantPosProductId.trim()) { setVariantFormError('POS Product ID is required.'); return }

    let attributes: Record<string, unknown> = {}
    if (variantAttributesText.trim()) {
      try {
        attributes = JSON.parse(variantAttributesText)
        if (typeof attributes !== 'object' || Array.isArray(attributes) || attributes === null) {
          setVariantFormError('Attributes must be a JSON object.')
          return
        }
      } catch {
        setVariantFormError('Attributes must be valid JSON.')
        return
      }
    }

    const stockQuantity = Math.max(0, Number.parseInt(variantStockQuantity, 10) || 0)
    const lowStockThreshold = Math.max(0, Number.parseInt(variantLowStockThreshold, 10) || 0)
    const maxBackorder = variantAllowBackorder
      ? Math.max(0, Number.parseInt(variantMaxBackorderQuantity, 10) || 0)
      : 0

    if (variantAllowBackorder && maxBackorder === 0) {
      setVariantFormError('Set a max backorder quantity greater than 0 when backorder is enabled.')
      return
    }

    const skuValue = variantSku.trim() || generateSku(variantName)
    const priceValue = variantPrice ? Number(variantPrice) : undefined
    if (variantPrice && !Number.isFinite(priceValue)) {
      setVariantFormError('Variant price must be a valid number.')
      return
    }
    const originalPriceValue = variantOriginalPrice ? Number(variantOriginalPrice) : undefined
    if (variantOriginalPrice && !Number.isFinite(originalPriceValue)) {
      setVariantFormError('Original price must be a valid number.')
      return
    }

    const payload: ProductVariantPayload = {
      name: variantName.trim(),
      sku: skuValue,
      barcode: variantBarcode.trim(),
      pos_product_id: variantPosProductId.trim(),
      attributes,
      price: priceValue,
      original_price: originalPriceValue,
      stock_quantity: stockQuantity,
      low_stock_threshold: lowStockThreshold,
      allow_backorder: variantAllowBackorder,
      max_backorder_quantity: maxBackorder,
      is_active: variantIsActive,
    }

    setVariantSaving(true)
    setVariantFormError('')
    try {
      if (editingVariant) {
        const updated = await adminProductService.updateProductVariant(editingProduct.id, editingVariant.id, payload)
        setVariants((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
      } else {
        const created = await adminProductService.createProductVariant(editingProduct.id, payload)
        setVariants((prev) => [...prev, created])
      }
      setShowVariantForm(false)
      resetVariantForm()
    } catch {
      setVariantFormError('Failed to save variant.')
    } finally {
      setVariantSaving(false)
    }
  }

  const handleDeleteVariant = async (variant: ApiProductVariant) => {
    if (!editingProduct) return
    if (!window.confirm(`Delete variant "${variant.name}"?`)) return
    try {
      await adminProductService.deleteProductVariant(editingProduct.id, variant.id)
      setVariants((prev) => prev.filter((row) => row.id !== variant.id))
    } catch {
      setVariantsError('Failed to delete variant.')
    }
  }

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault()
    if (!productName.trim()) { setFormError('Product name is required.'); return }
    if (!productPrice) { setFormError('Price is required.'); return }
    if (!productPosProductId.trim()) { setFormError('POS Product ID is required.'); return }
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
    const features = parseFeatureLines(productFeaturesText)
    const sku = productSku.trim() || generateSku(productName)
    const slug = productSlug.trim() || generateSlug(productName)
    const commonPayload: ProductFormPayload = {
      name: productName.trim(),
      slug,
      sku,
      barcode: productBarcode.trim(),
      pos_product_id: productPosProductId.trim(),
      strength: productStrength.trim(),
      price: priceValue,
      cost_price: costPriceValue,
      brand_id: Number(productBrandId),
      subcategory_id: Number(productSubcategoryId),
      health_concern_ids: productHealthConcernIds,
      is_active: productStatus === 'active',
      requires_prescription: productRequiresRx,
      description: productDescription.trim(),
      features,
      directions: productDirections.trim(),
      warnings: productWarnings.trim(),
      dosage_quantity: dosageQuantity.trim(),
      dosage_unit: dosageUnit.trim(),
      dosage_frequency: dosageFrequency,
      dosage_notes: dosageNotes.trim(),
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
      formData.append('barcode', payload.barcode ?? '')
      formData.append('pos_product_id', payload.pos_product_id ?? '')
      formData.append('price', String(payload.price))
      formData.append('is_active', String(payload.is_active))
      formData.append('requires_prescription', String(payload.requires_prescription))
      formData.append('strength', payload.strength ?? '')
      formData.append('description', payload.description ?? '')
      formData.append('features', JSON.stringify(payload.features ?? []))
      formData.append('directions', payload.directions ?? '')
      formData.append('warnings', payload.warnings ?? '')
      formData.append('dosage_quantity', payload.dosage_quantity ?? '')
      formData.append('dosage_unit', payload.dosage_unit ?? '')
      formData.append('dosage_frequency', payload.dosage_frequency ?? '')
      formData.append('dosage_notes', payload.dosage_notes ?? '')
      formData.append('branch_inventory', JSON.stringify(payload.branch_inventory ?? {}))

      if (payload.cost_price !== undefined) formData.append('cost_price', String(payload.cost_price))
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

  useEffect(() => {
    if (!productImageFile) {
      setProductImagePreviewSrc(editingProduct?.image ?? null)
      return
    }
    const url = URL.createObjectURL(productImageFile)
    setProductImagePreviewSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [editingProduct, productImageFile])

  const handleProductImageChange = async (file: File | null) => {
    if (!file) {
      setProductImageFile(null)
      setFormError('')
      return
    }

    const validationError = await validateImageFile(file, 'product')
    if (validationError) {
      setProductImageFile(null)
      setFormError(validationError)
      return
    }

    setProductImageFile(file)
    setFormError('')
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

  const getProductBrandLabel = (product: ApiProduct) => product.brand?.name ?? product.brand_name ?? 'No brand'

  return (
    <div className="category-management product-management">
      <div className="category-management__header">
        <div className="cm-title-group">
          <h1>{activeTab === 'brands' ? 'Brands' : 'Products'}</h1>
          <p className="cm-title-sub">{activeTab === 'brands' ? 'Manage product brands' : 'Manage your product catalog'}</p>
        </div>
        <div className="category-management__actions">
          {activeTab === 'products' ? (
            <>
              <button className="btn btn--primary btn--sm" onClick={openAddModal}>+ Add Product</button>
              <Link className="btn btn--secondary btn--sm" to="/admin/inventory">Add Inventory</Link>
            </>
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
                    <th style={{ minWidth: 110 }}>Created By</th>
                    <th className="cm-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((brand) => (
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
                <th style={{ minWidth: 90 }}>Selling</th>
                <th style={{ minWidth: 140 }}>Active Deal</th>
                <th style={{ minWidth: 90 }}>Margin</th>
                <th style={{ minWidth: 80 }}>Stock</th>
                <th style={{ minWidth: 110 }}>Prescription</th>
                <th style={{ minWidth: 90 }}>Status</th>
                <th style={{ minWidth: 100, whiteSpace: 'nowrap' }}>Created At</th>
                <th style={{ minWidth: 100 }}>Created By</th>
                <th style={{ minWidth: 100 }}>Updated By</th>
                <th className="cm-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedProducts.map((product) => {
                const margin = getMarginData(product)
                const stockQty = product.stock_quantity ?? 0
                const lowThreshold = product.low_stock_threshold ?? 5
                const stockClass = stockQty === 0 ? 'cm-status--inactive' : stockQty <= lowThreshold ? 'cm-status--scheduled' : 'cm-status--active'
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
                        title="View inventory"
                        to={`/admin/inventory?product=${product.id}`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                        Inventory
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
                      <label className="pf-label">Barcode <span className="pf-optional">optional</span></label>
                      <input
                        className="pf-input"
                        type="text"
                        placeholder="Scan or enter barcode"
                        value={productBarcode}
                        onChange={(e) => setProductBarcode(e.target.value)}
                      />
                    </div>
                    <div className="pf-field">
                      <label className="pf-label">POS Product ID <span className="pf-req">*</span></label>
                      <input
                        className="pf-input"
                        type="text"
                        placeholder="POS item identifier"
                        value={productPosProductId}
                        onChange={(e) => setProductPosProductId(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="pf-row">
                    <div className="pf-field">
                      <span className="pf-hint">POS Product ID is the item identifier in the POS system. We match products to POS items using POS Product ID.</span>
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
                    <label className="pf-label">Promotions & Deals</label>
                    <span className="pf-hint">Discount pricing and deal badges are managed from the Deals screen.</span>
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
                  {/* ── Dosage ── */}
                  <div className="pf-dosage-section">
                    <div className="pf-dosage-section__label">Dosage <span className="pf-optional">optional</span></div>
                    <div className="pf-dosage-grid">
                      <div className="pf-field">
                        <label className="pf-label">Quantity</label>
                        <input
                          className="pf-input"
                          type="text"
                          placeholder="e.g. 1, 2, 1–2"
                          value={dosageQuantity}
                          onChange={(e) => setDosageQuantity(e.target.value)}
                        />
                      </div>
                      <div className="pf-field">
                        <label className="pf-label">Unit</label>
                        <select className="pf-input" value={dosageUnit} onChange={(e) => setDosageUnit(e.target.value)}>
                          <option value="">-select_</option>
                          <option value="tablet">Tablet</option>
                          <option value="tablets">Tablets</option>
                          <option value="capsule">Capsule</option>
                          <option value="capsules">Capsules</option>
                          <option value="ml">ml</option>
                          <option value="mg">mg</option>
                          <option value="drop">Drop</option>
                          <option value="drops">Drops</option>
                          <option value="sachet">Sachet</option>
                          <option value="application">Application</option>
                          <option value="spray">Spray</option>
                          <option value="unit">Unit</option>
                        </select>
                      </div>
                      <div className="pf-field">
                        <label className="pf-label">Frequency</label>
                        <select className="pf-input" value={dosageFrequency} onChange={(e) => setDosageFrequency(e.target.value)}>
                          <option value="">-select_</option>
                          <option value="once_daily">Once daily</option>
                          <option value="twice_daily">Twice daily</option>
                          <option value="three_times_daily">3 times daily</option>
                          <option value="four_times_daily">4 times daily</option>
                          <option value="every_4_hours">Every 4 hours</option>
                          <option value="every_6_hours">Every 6 hours</option>
                          <option value="every_8_hours">Every 8 hours</option>
                          <option value="every_12_hours">Every 12 hours</option>
                          <option value="weekly">Weekly</option>
                          <option value="as_needed">As needed</option>
                          <option value="as_directed">As directed</option>
                        </select>
                      </div>
                      <div className="pf-field">
                        <label className="pf-label">Notes</label>
                        <input
                          className="pf-input"
                          type="text"
                          placeholder="e.g. with food, before meals"
                          value={dosageNotes}
                          onChange={(e) => setDosageNotes(e.target.value)}
                        />
                      </div>
                    </div>
                    {dosageQuantity && dosageUnit && dosageFrequency && (
                      <div className="pf-dosage-preview">
                        {dosageQuantity} {dosageUnit} · {dosageFrequency.replace(/_/g, ' ')}{dosageNotes ? ` · ${dosageNotes}` : ''}
                      </div>
                    )}
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
                      onChange={(e) => { void handleProductImageChange(e.currentTarget.files?.[0] ?? null) }}
                    />
                    <span className="pf-hint">
                      {editingProduct ? 'Leave empty to keep the current image.' : 'Upload the main product image.'} {getImageUploadHint('product')}
                    </span>
                    {productImagePreviewSrc && (
                      <div className="cm-brand-preview" style={{ marginTop: '0.5rem' }}>
                        <img src={productImagePreviewSrc} alt="Product preview" className="cm-brand-preview__img" />
                        <div className="cm-brand-preview__meta">
                          <span className="cm-brand-preview__label">{productImageFile ? 'Selected file' : 'Current image'}</span>
                          <span className="cm-brand-preview__name">{productImageFile?.name ?? editingProduct?.name ?? 'Product image'}</span>
                        </div>
                      </div>
                    )}
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
                      <span className="pf-hint">Customer-facing discounts and deal badges are created from Deals, not on the product record.</span>
                    </div>
                  </div>
                </div>

                <div className="pf-section">
                  <div className="pf-section__label">Variants</div>
                  {!editingProduct && (
                    <span className="pf-hint">Save the product first, then add variants (sizes, strengths, packs).</span>
                  )}
                  {editingProduct && (
                    <div className="pf-variant-panel">
                      <div className="pf-variant-header">
                        <div>
                          <div className="pf-variant-title">Variants</div>
                          <div className="pf-hint">Variants are different sellable versions of the same product. Each variant must have its own POS Product ID for POS matching.</div>
                        </div>
                        <button type="button" className="btn btn--ghost pf-variant-btn" onClick={openAddVariant}>Add Variant</button>
                      </div>

                      {variantsError && (
                        <div className="form-alert form-alert--error">
                          <span>{variantsError}</span>
                        </div>
                      )}

                      {variantsLoading && <div className="pf-hint">Loading variants…</div>}

                      {!variantsLoading && variants.length === 0 && (
                        <div className="pf-hint">No variants yet.</div>
                      )}

                      {!variantsLoading && variants.length > 0 && (
                        <div className="pf-variant-table-wrap">
                          <table className="pf-variant-table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>SKU</th>
                                <th>Barcode</th>
                                <th>POS ID</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Status</th>
                                <th className="pf-variant-actions">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {variants.map((variant) => (
                                <tr key={variant.id}>
                                  <td>{variant.name}</td>
                                  <td>{variant.sku}</td>
                                  <td>{variant.barcode ?? '—'}</td>
                                  <td>{variant.pos_product_id ?? '—'}</td>
                                  <td>{formatCurrency(variant.price ?? variant.effective_price)}</td>
                                  <td>{variant.stock_quantity}</td>
                                  <td>{variant.is_active ? 'Active' : 'Inactive'}</td>
                                  <td className="pf-variant-actions">
                                    <button type="button" className="cm-row-btn cm-row-btn--edit" onClick={() => openEditVariant(variant)}>
                                      Edit
                                    </button>
                                    <button type="button" className="cm-row-btn cm-row-btn--delete" onClick={() => handleDeleteVariant(variant)}>
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {showVariantForm && (
                        <form className="pf-variant-form" onSubmit={handleSaveVariant}>
                          {variantFormError && (
                            <div className="form-alert form-alert--error">
                              <span>{variantFormError}</span>
                            </div>
                          )}

                          <div className="pf-row">
                            <div className="pf-field">
                              <label className="pf-label">Variant Name <span className="pf-req">*</span></label>
                              <input className="pf-input" type="text" value={variantName} onChange={(e) => setVariantName(e.target.value)} placeholder="e.g. 500mg - 20 tablets" />
                            </div>
                            <div className="pf-field">
                              <label className="pf-label">SKU <span className="pf-optional">optional</span></label>
                              <input className="pf-input" type="text" value={variantSku} onChange={(e) => setVariantSku(e.target.value)} placeholder="Auto-generated if blank" />
                            </div>
                          </div>

                          <div className="pf-row">
                            <div className="pf-field">
                              <label className="pf-label">Barcode <span className="pf-optional">optional</span></label>
                              <input className="pf-input" type="text" value={variantBarcode} onChange={(e) => setVariantBarcode(e.target.value)} placeholder="Scan or enter barcode" />
                            </div>
                            <div className="pf-field">
                              <label className="pf-label">POS Product ID <span className="pf-req">*</span></label>
                              <input className="pf-input" type="text" value={variantPosProductId} onChange={(e) => setVariantPosProductId(e.target.value)} placeholder="POS item identifier" />
                            </div>
                          </div>

                          <div className="pf-row">
                            <div className="pf-field">
                              <label className="pf-label">Variant Price <span className="pf-optional">optional</span></label>
                              <div className="pf-prefix-wrap">
                                <span className="pf-prefix">KSh</span>
                                <input className="pf-input pf-input--prefixed" type="number" min="0" step="0.01" value={variantPrice} onChange={(e) => setVariantPrice(e.target.value)} placeholder="0.00" />
                              </div>
                            </div>
                            <div className="pf-field">
                              <label className="pf-label">Original Price <span className="pf-optional">optional</span></label>
                              <div className="pf-prefix-wrap">
                                <span className="pf-prefix">KSh</span>
                                <input className="pf-input pf-input--prefixed" type="number" min="0" step="0.01" value={variantOriginalPrice} onChange={(e) => setVariantOriginalPrice(e.target.value)} placeholder="0.00" />
                              </div>
                            </div>
                          </div>

                          <div className="pf-row">
                            <div className="pf-field">
                              <label className="pf-label">Stock Quantity</label>
                              <input className="pf-input" type="number" min="0" value={variantStockQuantity} onChange={(e) => setVariantStockQuantity(e.target.value)} />
                            </div>
                            <div className="pf-field">
                              <label className="pf-label">Low Stock Threshold</label>
                              <input className="pf-input" type="number" min="0" value={variantLowStockThreshold} onChange={(e) => setVariantLowStockThreshold(e.target.value)} />
                            </div>
                          </div>

                          <div className="pf-row">
                            <div className="pf-field">
                              <label className="pf-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input type="checkbox" checked={variantAllowBackorder} onChange={(e) => setVariantAllowBackorder(e.target.checked)} />
                                Allow Backorder
                              </label>
                              {variantAllowBackorder && (
                                <input className="pf-input" type="number" min="0" value={variantMaxBackorderQuantity} onChange={(e) => setVariantMaxBackorderQuantity(e.target.value)} />
                              )}
                            </div>
                            <div className="pf-field">
                              <label className="pf-label">Status</label>
                              <select className="pf-input" value={variantIsActive ? 'active' : 'inactive'} onChange={(e) => setVariantIsActive(e.target.value === 'active')}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </div>
                          </div>

                          <div className="pf-field">
                            <label className="pf-label">Attributes (JSON) <span className="pf-optional">optional</span></label>
                            <textarea className="pf-input pf-textarea" rows={3} value={variantAttributesText} onChange={(e) => setVariantAttributesText(e.target.value)} />
                            <span className="pf-hint">Example: {"{\"size\":\"500mg\",\"pack\":\"20\"}"}</span>
                          </div>

                          <div className="pf-variant-form__actions">
                            <button type="button" className="btn btn--secondary" onClick={() => { setShowVariantForm(false); resetVariantForm() }}>Cancel</button>
                            <button type="submit" className="btn btn--primary" disabled={variantSaving}>
                              {variantSaving ? 'Saving…' : editingVariant ? 'Save Variant' : 'Add Variant'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
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
