import { apiClient } from '../lib/apiClient'

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
  is_active: boolean
  created_at: string
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

export interface ApiProduct {
  id: number
  name: string
  sku: string
  slug: string
  strength: string
  price: string
  cost_price: string | null
  discount_price: string | null
  original_price: string | null
  stock_quantity: number
  low_stock_threshold: number
  stock_source: StockSource
  max_backorder_quantity: number
  inventories: ApiProductInventory[]
  is_active: boolean
  is_featured: boolean
  requires_prescription: boolean
  description: string
  short_description: string
  features: string[]
  directions: string
  warnings: string
  badge: string
  image: string | null
  category: number | null
  category_name: string | null
  subcategory_id: number | null
  subcategory_name: string | null
  brand: ApiBrand | null
  brand_name?: string | null
  allow_backorder: boolean
  health_concerns: ApiHealthConcern[]
  created_at: string
  updated_at: string
  created_by: number | null
  created_by_name: string
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
  strength?: string
  price: number
  cost_price?: number
  discount_price?: number
  branch_inventory?: InventoryLocationPayload
  warehouse_inventory?: InventoryLocationPayload
  category_id?: number | null
  subcategory_id?: number | null
  brand_id?: number | null
  health_concern_ids?: number[]
  is_active: boolean
  is_featured?: boolean
  requires_prescription: boolean
  allow_backorder?: boolean
  max_backorder_quantity?: number
  description?: string
  short_description?: string
  features?: string[]
  directions?: string
  warnings?: string
  badge?: string
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

export const adminProductService = {
  async listProducts(params?: Record<string, string>) {
    const res = await apiClient.get('/admin/products/', { params })
    return unwrapList<ApiProduct>(res)
  },

  async createProduct(payload: ProductCreatePayload | FormData) {
    const res = await apiClient.post('/admin/products/', payload)
    return unwrap<ApiProduct>(res)
  },

  async updateProduct(id: number, payload: Partial<ProductCreatePayload> | FormData) {
    const res = await apiClient.patch(`/admin/products/${id}/`, payload)
    return unwrap<ApiProduct>(res)
  },

  async deleteProduct(id: number) {
    await apiClient.delete(`/admin/products/${id}/`)
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

  async createHealthConcern(payload: { name: string; description?: string; icon?: string }) {
    const res = await apiClient.post('/admin/health-concerns/', payload)
    return unwrap<ApiHealthConcern>(res)
  },

  async updateHealthConcern(id: number, payload: Partial<{ name: string; description: string; icon: string; is_active: boolean }>) {
    const res = await apiClient.patch(`/admin/health-concerns/${id}/`, payload)
    return unwrap<ApiHealthConcern>(res)
  },

  async deleteHealthConcern(id: number) {
    await apiClient.delete(`/admin/health-concerns/${id}/`)
  },
}
