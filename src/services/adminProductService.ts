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
  attributes?: Record<string, unknown>
  price?: number | null
  cost_price?: number | null
  original_price?: number | null
  stock_quantity?: number
  low_stock_threshold?: number
  allow_backorder?: boolean
  max_backorder_quantity?: number
  is_active?: boolean
  sort_order?: number
  image?: File | null
}

export interface ApiInventoryProduct extends ApiProduct {
  stock_quantity: number
  low_stock_threshold: number
  allow_backorder: boolean
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
  sku: string
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
  requires_prescription: boolean
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

function normalizePromotion<T extends ApiPromotion>(promotion: T): T {
  return {
    ...promotion,
    image: resolveMediaUrl(promotion.image),
  }
}

export const adminProductService = {
  async listProducts(params?: Record<string, string>) {
    const res = await apiClient.get('/admin/products/', { params })
    return unwrapList<ApiProduct>(res)
  },

  async createProduct(payload: ProductCreatePayload | FormData) {
    const res = await apiClient.post('/admin/products/', payload)
    return unwrap<ApiProduct>(res)
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
    return unwrap<ApiProduct>(res)
  },

  async deleteProduct(id: number) {
    await apiClient.delete(`/admin/products/${id}/`)
  },

  async listProductVariants(productId: number) {
    const res = await apiClient.get(`/admin/products/${productId}/variants/`)
    return unwrapList<ApiProductVariant>(res)
  },

  async createProductVariant(productId: number, payload: ProductVariantPayload | FormData) {
    const res = await apiClient.post(`/admin/products/${productId}/variants/`, payload)
    return unwrap<ApiProductVariant>(res)
  },

  async updateProductVariant(productId: number, variantId: number, payload: Partial<ProductVariantPayload> | FormData) {
    const res = await apiClient.patch(`/admin/products/${productId}/variants/${variantId}/`, payload)
    return unwrap<ApiProductVariant>(res)
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
    const res = await apiClient.get('/admin/product-categories/')
    return unwrapList<ApiProductCategory>(res)
  },

  async createProductCategory(payload: FormData | { name: string; description?: string }) {
    const res = await apiClient.post('/admin/product-categories/', payload)
    return unwrap<ApiProductCategory>(res)
  },

  async updateProductCategory(id: number, payload: FormData | Partial<{ name: string; description: string; is_active: boolean }>) {
    const res = await apiClient.patch(`/admin/product-categories/${id}/`, payload)
    return unwrap<ApiProductCategory>(res)
  },

  async deleteProductCategory(id: number) {
    await apiClient.delete(`/admin/product-categories/${id}/`)
  },

  async listProductSubcategories(params?: Record<string, string>) {
    const res = await apiClient.get('/admin/product-subcategories/', { params })
    return unwrapList<ApiProductSubcategory>(res)
  },

  async createProductSubcategory(payload: { name: string; category: number; description?: string }) {
    const res = await apiClient.post('/admin/product-subcategories/', payload)
    return unwrap<ApiProductSubcategory>(res)
  },

  async updateProductSubcategory(id: number, payload: Partial<{ name: string; category: number; description: string; is_active: boolean }>) {
    const res = await apiClient.patch(`/admin/product-subcategories/${id}/`, payload)
    return unwrap<ApiProductSubcategory>(res)
  },

  async deleteProductSubcategory(id: number) {
    await apiClient.delete(`/admin/product-subcategories/${id}/`)
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
    const res = await apiClient.get('/admin/inventory/', { params })
    return unwrapList<ApiInventoryProduct>(res)
  },

  async adjustInventory(id: number, payload: InventoryAdjustPayload) {
    const res = await apiClient.patch(`/admin/inventory/${id}/`, payload)
    return unwrap<ApiInventoryProduct>(res)
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
    return updated
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
    return updated
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
