import { apiClient, resolveMediaUrl } from '../lib/apiClient'

export interface ApiCategory {
  id: number
  name: string
  slug: string
  parent: number | null
  is_active: boolean
  subcategories?: ApiCategory[]
}

export interface ApiProductCategory {
  id: number
  name: string
  slug: string
  image: string | null
  description: string
  icon: string
  is_active: boolean
  created_at: string
  subcategories: ApiProductSubcategory[]
}

export interface ApiHealthConcern {
  id: number
  name: string
  slug: string
  description: string
  icon: string
  image: string
  is_active: boolean
  created_at: string
}

export type PromotionScope = 'all' | 'category' | 'brand' | 'product'
export type PromotionType = 'percentage' | 'amount'
export type PromotionStatus = 'active' | 'draft'
export type PosLinkStrategy =
  | 'sku'
  | 'pos_product_id'
  | 'barcode'
  | 'barcode_and_pos_id'
  | 'sku_or_pos_id'
  | 'sku_or_barcode'
  | 'any'

export interface ApiPromotion {
  id: number
  title: string
  code: string | null
  description: string
  image: string | null
  type: PromotionType
  value: string
  scope: PromotionScope
  targets: string[]
  badge: string
  priority: number
  is_stackable: boolean
  minimum_order_amount: string
  start_date: string
  end_date: string
  status: PromotionStatus
  is_currently_active: boolean
  created_at: string
  updated_at: string
}

export interface ApiBrand {
  id: number
  name: string
  slug: string
  logo: string | null
  description: string
  is_active: boolean
  created_at?: string
  updated_at?: string
  created_by_name?: string
}

export interface ApiProductSubcategory {
  id: number
  name: string
  slug: string
  description: string
  category: number
  category_name: string
  is_active: boolean
  created_at: string
}

export type StockSource = 'branch' | 'warehouse' | 'out'
export type InventoryLocation = 'branch' | 'warehouse'

export interface ApiProductInventory {
  id: number
  location: InventoryLocation
  source_name: string
  stock_quantity: number
  low_stock_threshold: number
  allow_backorder: boolean
  max_backorder_quantity: number
  is_pos_synced: boolean
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface ApiVariantInventory {
  id: number
  location: InventoryLocation
  source_name: string
  stock_quantity: number
  low_stock_threshold: number
  allow_backorder: boolean
  max_backorder_quantity: number
  is_pos_synced: boolean
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface InventoryLocationPayload {
  stock_quantity?: number
  low_stock_threshold?: number
  allow_backorder?: boolean
  max_backorder_quantity?: number
}


export interface ApiProductPromotion {
  id: number
  title: string
  code: string | null
  badge: string
  discount: string
}

export interface ApiProduct {
  id: number
  name: string
  sku: string
  barcode?: string | null
  pos_product_id?: string | null
  slug: string
  strength: string
  dosage_quantity: string
  dosage_unit: string
  dosage_frequency: string
  dosage_notes: string
  price: string
  cost_price: string | null
  original_price: string | null
  final_price: string
  discount_total: string
  active_promotions: ApiProductPromotion[]
  stock_quantity: number
  available_quantity: number
  low_stock_threshold: number
  stock_source: StockSource
  inventory_status: string
  max_backorder_quantity: number
  inventories: ApiProductInventory[]
  variants?: ApiProductVariant[]
  is_active: boolean
  requires_prescription: boolean
  description: string
  short_description: string
  features: string[]
  directions: string
  warnings: string
  badge: string | null
  image: string | null
  category: number | null
  category_name: string | null
  subcategory_id: number | null
  subcategory_name: string | null
  brand: ApiBrand | null
  brand_name?: string | null
  allow_backorder: boolean
  can_purchase?: boolean
  has_variants?: boolean
  health_concerns: ApiHealthConcern[]
  created_at: string
  updated_at: string
  created_by: number | null
  created_by_name: string
}

export interface ApiProductVariant {
  id: number
  sku: string
  barcode?: string | null
  pos_product_id?: string | null
  name: string
  strength?: string | null
  dosage_instructions?: string | null
  directions?: string | null
  warnings?: string | null
  attributes: Record<string, unknown>
  price: string | null
  cost_price: string | null
  original_price: string | null
  effective_price: string
  image: string | null
  health_concerns: ApiHealthConcern[]
  requires_prescription: boolean
  inventories: ApiVariantInventory[]
  stock_source: StockSource
  stock_quantity: number
  low_stock_threshold: number
  allow_backorder: boolean
  max_backorder_quantity: number
  inventory_status: string
  available_quantity: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ProductVariantPayload {
  sku: string
  barcode?: string
  pos_product_id?: string
  name: string
  strength?: string
  dosage_instructions?: string
  directions?: string
  warnings?: string
  health_concern_ids?: number[]
  requires_prescription?: boolean
  attributes?: Record<string, unknown>
  price?: number | null
  cost_price?: number | null
  original_price?: number | null
  branch_inventory?: InventoryLocationPayload
  warehouse_inventory?: InventoryLocationPayload
  stock_quantity?: number
  low_stock_threshold?: number
  allow_backorder?: boolean
  max_backorder_quantity?: number
  is_active?: boolean
  sort_order?: number
  image?: File | null
}

export interface ApiInventoryProduct extends ApiProduct {
  product_id?: number
  product_name?: string
  product_sku?: string
  product_slug?: string
  stock_quantity: number
  low_stock_threshold: number
  allow_backorder: boolean
}

export interface ApiInventoryItem extends ApiProductVariant {
  product_id: number
  product_name: string
  product_sku: string
  product_slug: string
  brand_name?: string | null
  brand_slug?: string | null
  category_name?: string | null
  category_slug?: string | null
  short_description?: string | null
}

export interface ApiReports {
  total_orders: number
  total_revenue: number
  monthly_revenue: number
  total_customers: number
  pending_orders: number
  today_orders: number
  low_stock_products: number
  orders_by_status: { status: string; count: number }[]
  top_products: { product_name: string; product_sku: string; quantity_sold: number }[]
}

export interface ApiOrder {
  id: number
  order_number: string
  customer_name: string
  total: string
  status: string
  created_at: string
}

export interface ProductCreatePayload {
  name: string
  slug: string
  barcode?: string
  pos_product_id?: string
  strength?: string
  price?: number
  cost_price?: number
  branch_inventory?: InventoryLocationPayload
  warehouse_inventory?: InventoryLocationPayload
  category_id?: number | null
  subcategory_id?: number | null
  brand_id?: number | null
  health_concern_ids?: number[]
  is_active: boolean
  allow_backorder?: boolean
  max_backorder_quantity?: number
  description?: string
  short_description?: string
  features?: string[]
  directions?: string
  warnings?: string
  dosage_quantity?: string
  dosage_unit?: string
  dosage_frequency?: string
  dosage_notes?: string
  image?: File | null
}

export interface InventoryAdjustPayload {
  branch_inventory?: InventoryLocationPayload
  warehouse_inventory?: InventoryLocationPayload
  reason?: string
}

export interface PosSyncPayload {
  updates: Array<{
    product_id?: number
    sku?: string
    pos_quantity: number
    source_name?: string
    low_stock_threshold?: number
    allow_backorder?: boolean
    max_backorder_quantity?: number
  }>
}

export interface ProductFormMeta {
  pos_link_strategy: PosLinkStrategy
  requires_pos_product_id: boolean
  requires_barcode: boolean
  accepts_sku: boolean
  accepts_barcode: boolean
}

export interface ApiPosProductOption {
  pos_product_id: string
  label: string
  product_name: string
  variant_name: string
  sku: string
  source: 'product' | 'variant'
}

export interface ApiStockMovement {
  id: number
  movement_type: string
  quantity_change: number
  quantity_before: number
  quantity_after: number
  reason: string
  reference: string
  created_at: string
  updated_at: string
  created_by: number | null
  created_by_name: string
}

function unwrap<T>(res: { data: { data?: T } | T }): T {
  const d = res.data as { data?: T }
  return (d.data !== undefined ? d.data : res.data) as T
}

function unwrapList<T>(res: { data: unknown }): T[] {
  const d = res.data as { data?: unknown; results?: unknown }
  const inner = d.data !== undefined ? d.data : res.data
  if (Array.isArray(inner)) return inner as T[]
  const paged = inner as { results?: T[] }
  if (paged && Array.isArray(paged.results)) return paged.results
  return []
}

function extractListPage<T>(raw: unknown): { items: T[]; next: string | null } {
  const payload = raw as {
    data?: unknown
    results?: unknown
    next?: string | null
    meta?: { next?: string | null }
  }
  const inner = payload?.data !== undefined ? payload.data : raw
  const metaNext = payload?.meta && typeof payload.meta.next === 'string' ? payload.meta.next : null

  if (Array.isArray(inner)) {
    return { items: inner as T[], next: metaNext }
  }

  if (inner && typeof inner === 'object') {
    const paged = inner as { results?: T[]; next?: string | null }
    if (Array.isArray(paged.results)) {
      return { items: paged.results, next: typeof paged.next === 'string' ? paged.next : null }
    }
  }

  return { items: [], next: null }
}

async function fetchAllListPages<T>(path: string, params?: Record<string, string>): Promise<T[]> {
  const firstRes = await apiClient.get(path, { params: { page_size: '200', ...(params ?? {}) } })
  const firstPage = extractListPage<T>(firstRes.data)
  const items = [...firstPage.items]
  let next = firstPage.next

  while (next) {
    const nextRes = await apiClient.get(next)
    const nextPage = extractListPage<T>(nextRes.data)
    items.push(...nextPage.items)
    next = nextPage.next
  }

  return items
}

function normalizePromotion<T extends ApiPromotion>(promotion: T): T {
  return {
    ...promotion,
    image: resolveMediaUrl(promotion.image),
  }
}

function normalizeVariant<T extends ApiProductVariant>(variant: T): T {
  return {
    ...variant,
    image: resolveMediaUrl(variant.image),
  }
}

function normalizeProduct<T extends ApiProduct>(product: T): T {
  return {
    ...product,
    image: resolveMediaUrl(product.image),
    variants: Array.isArray(product.variants) ? product.variants.map((variant) => normalizeVariant(variant)) : product.variants,
  }
}

function normalizeInventoryRow(item: ApiInventoryItem): ApiInventoryProduct {
  const normalizedVariant = normalizeVariant({
    ...item,
    health_concerns: Array.isArray(item.health_concerns) ? item.health_concerns : [],
  })

  return normalizeProduct({
    id: item.id,
    product_id: item.product_id,
    product_name: item.product_name,
    product_sku: item.product_sku,
    product_slug: item.product_slug,
    name: item.name,
    sku: item.sku,
    slug: item.product_slug,
    strength: item.strength ?? '',
    dosage_quantity: '',
    dosage_unit: '',
    dosage_frequency: '',
    dosage_notes: '',
    price: item.price ?? item.effective_price ?? '0.00',
    cost_price: item.cost_price ?? null,
    original_price: item.original_price ?? null,
    final_price: item.effective_price ?? item.price ?? '0.00',
    discount_total: '0.00',
    active_promotions: [],
    stock_quantity: item.stock_quantity ?? 0,
    available_quantity: item.available_quantity ?? 0,
    low_stock_threshold: item.low_stock_threshold ?? 0,
    stock_source: item.stock_source,
    inventory_status: item.inventory_status,
    max_backorder_quantity: item.max_backorder_quantity ?? 0,
    inventories: Array.isArray(item.inventories) ? item.inventories : [],
    variants: [normalizedVariant],
    is_active: Boolean(item.is_active),
    requires_prescription: Boolean(item.requires_prescription),
    description: '',
    short_description: item.short_description ?? '',
    features: [],
    directions: item.directions ?? '',
    warnings: item.warnings ?? '',
    badge: null,
    image: item.image ?? null,
    category: null,
    category_name: item.category_name ?? null,
    subcategory_id: null,
    subcategory_name: null,
    brand: null,
    brand_name: item.brand_name ?? null,
    allow_backorder: Boolean(item.allow_backorder),
    can_purchase: (item.available_quantity ?? 0) > 0,
    has_variants: true,
    health_concerns: Array.isArray(item.health_concerns) ? item.health_concerns : [],
    created_at: item.created_at,
    updated_at: item.updated_at,
    created_by: null,
    created_by_name: 'system',
  })
}

export const adminProductService = {
  async listProducts(params?: Record<string, string>) {
    const requestParams = { page_size: '200', ...(params ?? {}) }
    const res = await apiClient.get('/admin/products/', { params: requestParams })
    const firstPage = extractListPage<ApiProduct>(res.data)
    const items = [...firstPage.items]
    let next = firstPage.next

    while (next) {
      const nextRes = await apiClient.get(next)
      const nextPage = extractListPage<ApiProduct>(nextRes.data)
      items.push(...nextPage.items)
      next = nextPage.next
    }

    return items.map(normalizeProduct)
  },

  async createProduct(payload: ProductCreatePayload | FormData) {
    const res = await apiClient.post('/admin/products/', payload)
    return normalizeProduct(unwrap<ApiProduct>(res))
  },

  async getProductFormMeta() {
    const res = await apiClient.get('/admin/products/meta/')
    return unwrap<ProductFormMeta>(res)
  },

  async listPosProductOptions() {
    const res = await apiClient.get('/admin/products/pos-options/')
    return unwrapList<ApiPosProductOption>(res)
  },

  async updateProduct(id: number, payload: Partial<ProductCreatePayload> | FormData) {
    const res = await apiClient.patch(`/admin/products/${id}/`, payload)
    return normalizeProduct(unwrap<ApiProduct>(res))
  },

  async deleteProduct(id: number) {
    await apiClient.delete(`/admin/products/${id}/`)
  },

  async listProductVariants(productId: number) {
    const res = await apiClient.get(`/admin/products/${productId}/variants/`)
    return unwrapList<ApiProductVariant>(res).map(normalizeVariant)
  },

  async createProductVariant(productId: number, payload: ProductVariantPayload | FormData) {
    const res = await apiClient.post(`/admin/products/${productId}/variants/`, payload)
    return normalizeVariant(unwrap<ApiProductVariant>(res))
  },

  async updateProductVariant(productId: number, variantId: number, payload: Partial<ProductVariantPayload> | FormData) {
    const res = await apiClient.patch(`/admin/products/${productId}/variants/${variantId}/`, payload)
    return normalizeVariant(unwrap<ApiProductVariant>(res))
  },

  async deleteProductVariant(productId: number, variantId: number) {
    await apiClient.delete(`/admin/products/${productId}/variants/${variantId}/`)
  },

  async listCategories() {
    const res = await apiClient.get('/categories/')
    return unwrapList<ApiCategory>(res)
  },

  async createCategory(payload: { name: string; parent?: number | null }) {
    const res = await apiClient.post('/admin/categories/', payload)
    return unwrap<ApiCategory>(res)
  },

  async listProductCategories() {
    return fetchAllListPages<ApiProductCategory>('/admin/categories/')
  },

  async createProductCategory(payload: FormData | { name: string; description?: string }) {
    const res = await apiClient.post('/admin/categories/', payload)
    return unwrap<ApiProductCategory>(res)
  },

  async updateProductCategory(id: number, payload: FormData | Partial<{ name: string; description: string; is_active: boolean }>) {
    const res = await apiClient.patch(`/admin/categories/${id}/`, payload)
    return unwrap<ApiProductCategory>(res)
  },

  async deleteProductCategory(id: number) {
    await apiClient.delete(`/admin/categories/${id}/`)
  },

  async listProductSubcategories(params?: Record<string, string>) {
    return fetchAllListPages<ApiProductSubcategory>('/admin/sub-categories/', params)
  },

  async createProductSubcategory(payload: { name: string; category: number; description?: string }) {
    const res = await apiClient.post('/admin/sub-categories/', payload)
    return unwrap<ApiProductSubcategory>(res)
  },

  async updateProductSubcategory(id: number, payload: Partial<{ name: string; category: number; description: string; is_active: boolean }>) {
    const res = await apiClient.patch(`/admin/sub-categories/${id}/`, payload)
    return unwrap<ApiProductSubcategory>(res)
  },

  async deleteProductSubcategory(id: number) {
    await apiClient.delete(`/admin/sub-categories/${id}/`)
  },

  async listBrands(params?: Record<string, string>) {
    const res = await apiClient.get('/admin/brands/', { params })
    return unwrapList<ApiBrand>(res)
  },

  async createBrand(payload: FormData | { name: string; description?: string; is_active?: boolean }) {
    const res = await apiClient.post('/admin/brands/', payload)
    return unwrap<ApiBrand>(res)
  },

  async updateBrand(id: number, payload: FormData | Partial<{ name: string; description: string; is_active: boolean }>) {
    const res = await apiClient.patch(`/admin/brands/${id}/`, payload)
    return unwrap<ApiBrand>(res)
  },

  async deleteBrand(id: number) {
    await apiClient.delete(`/admin/brands/${id}/`)
  },

  async listInventory(params?: Record<string, string>) {
    const requestParams = { page_size: '200', ...(params ?? {}) }
    const res = await apiClient.get('/admin/inventory/', { params: requestParams })
    const firstPage = extractListPage<ApiInventoryItem>(res.data)
    const items = [...firstPage.items]
    let next = firstPage.next

    while (next) {
      const nextRes = await apiClient.get(next)
      const nextPage = extractListPage<ApiInventoryItem>(nextRes.data)
      items.push(...nextPage.items)
      next = nextPage.next
    }

    return items.map(normalizeInventoryRow)
  },

  async adjustInventory(id: number, payload: InventoryAdjustPayload) {
    const res = await apiClient.patch(`/admin/inventory/${id}/`, payload)
    return normalizeProduct(unwrap<ApiInventoryProduct>(res))
  },

  async refreshPosInventory(productIds: number[], force = true) {
    const res = await apiClient.post('/admin/inventory/pos-refresh/', {
      product_ids: productIds,
      force,
    })
    const payload = res.data as { data?: { updated?: ApiInventoryProduct[] } } | { updated?: ApiInventoryProduct[] }
    const updated = (payload as { updated?: ApiInventoryProduct[] }).updated
      ?? (payload as { data?: { updated?: ApiInventoryProduct[] } }).data?.updated
      ?? []
    return updated.map(normalizeProduct)
  },

  async refreshVariantPosInventory(variantIds: number[], force = true) {
    const res = await apiClient.post('/admin/inventory/variant-pos-refresh/', {
      variant_ids: variantIds,
      force,
    })
    const payload = res.data as { data?: { updated?: ApiProductVariant[] } } | { updated?: ApiProductVariant[] }
    const updated = (payload as { updated?: ApiProductVariant[] }).updated
      ?? (payload as { data?: { updated?: ApiProductVariant[] } }).data?.updated
      ?? []
    return updated.map(normalizeVariant)
  },

  async syncPosInventory(payload: PosSyncPayload) {
    const res = await apiClient.post('/admin/inventory/pos-sync/', payload)
    return unwrap<{ updated_count: number; updated: string[]; not_found: Array<number | string>; invalid: Array<Record<string, unknown>>; synced_at: string }>(res)
  },

  async getInventoryMovements(id: number) {
    const res = await apiClient.get(`/admin/inventory/${id}/movements/`)
    const d = (res.data as { data?: { movements?: ApiStockMovement[] }; movements?: ApiStockMovement[] })
    const inner = d.data ?? d
    return (inner as { movements?: ApiStockMovement[] }).movements ?? []
  },

  async getReports() {
    const res = await apiClient.get('/admin/reports/')
    return unwrap<ApiReports>(res)
  },

  async listRecentOrders() {
    const res = await apiClient.get('/admin/orders/', { params: { page_size: '5', ordering: '-created_at' } })
    return unwrapList<ApiOrder>(res)
  },

  async listHealthConcerns() {
    const res = await apiClient.get('/admin/health-concerns/')
    return unwrapList<ApiHealthConcern>(res)
  },

  async createHealthConcern(payload: FormData) {
    const res = await apiClient.post('/admin/health-concerns/', payload, { headers: { 'Content-Type': 'multipart/form-data' } })
    return unwrap<ApiHealthConcern>(res)
  },

  async updateHealthConcern(id: number, payload: FormData | Partial<{ name: string; description: string; icon: string; is_active: boolean }>) {
    const isFormData = payload instanceof FormData
    const res = await apiClient.patch(`/admin/health-concerns/${id}/`, payload, isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined)
    return unwrap<ApiHealthConcern>(res)
  },

  async deleteHealthConcern(id: number) {
    await apiClient.delete(`/admin/health-concerns/${id}/`)
  },

  async listPromotions(params?: Record<string, string>) {
    const res = await apiClient.get('/admin/promotions/', { params })
    return unwrapList<ApiPromotion>(res).map(normalizePromotion)
  },

  async createPromotion(payload: FormData | {
    title: string
    type: PromotionType
    value: number
    scope: PromotionScope
    targets: string[]
    start_date: string
    end_date: string
    status: PromotionStatus
    code?: string
    description?: string
    minimum_order_amount?: number
  }) {
    const isFormData = payload instanceof FormData
    const res = await apiClient.post('/admin/promotions/', payload, isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined)
    return normalizePromotion(unwrap<ApiPromotion>(res))
  },

  async updatePromotion(id: number, payload: FormData | Partial<{
    title: string
    type: PromotionType
    value: number
    scope: PromotionScope
    targets: string[]
    start_date: string
    end_date: string
    status: PromotionStatus
    code: string
    description: string
    minimum_order_amount: number
  }>) {
    const isFormData = payload instanceof FormData
    const res = await apiClient.patch(`/admin/promotions/${id}/`, payload, isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined)
    return normalizePromotion(unwrap<ApiPromotion>(res))
  },

  async deletePromotion(id: number) {
    await apiClient.delete(`/admin/promotions/${id}/`)
  },
}
