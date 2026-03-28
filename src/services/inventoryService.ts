import { apiClient } from '../lib/apiClient'

export interface InventoryItem {
  id: number
  product_id: number
  product_name: string
  sku: string
  location: string
  quantity_on_hand: number
  low_stock_threshold: number
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
  last_synced_at: string | null
}

export interface ProductAvailability {
  product_id: number
  in_stock: boolean
  quantity: number
  location_stock: Array<{ location: string; quantity: number }>
  next_restock_date: string | null
  allow_backorder: boolean
  max_backorder_quantity: number
}

export interface FailedOrderPush {
  id: number
  order_id: number
  order_number: string
  attempts: number
  last_error: string
  last_tried_at: string
  status: 'pending' | 'failed'
}

export interface SyncResult {
  synced_at: string
  updated_count: number
}

export async function triggerInventorySync(): Promise<SyncResult> {
  const res = await apiClient.post('/webhooks/inventory/')
  return res.data?.data ?? res.data
}

export async function fetchInventoryItems(params: {
  search?: string
  location?: string
  low_stock?: boolean
  page?: number
} = {}): Promise<{ data: InventoryItem[]; meta: { count: number; next: string | null } }> {
  const res = await apiClient.get('/admin/inventory/', { params })
  const payload = res.data?.data ?? res.data
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.results)
      ? payload.results
      : []
  return {
    data: items as InventoryItem[],
    meta: { count: payload?.count ?? items.length, next: payload?.next ?? null },
  }
}

export async function fetchProductAvailability(productId: number): Promise<ProductAvailability> {
  const res = await apiClient.get(`/products/${productId}/availability/`)
  return res.data?.data ?? res.data
}

export async function fetchFailedOrderPushes(): Promise<FailedOrderPush[]> {
  const res = await apiClient.get('/admin/order-push/')
  const payload = res.data?.data ?? res.data ?? []
  return Array.isArray(payload) ? payload : payload?.results ?? []
}

export async function retryOrderPush(pushId: number): Promise<void> {
  await apiClient.post(`/admin/order-push/${pushId}/retry/`)
}

export async function fetchLastSyncTime(): Promise<string | null> {
  try {
    const res = await apiClient.get('/admin/inventory/last-sync/')
    return res.data?.data?.synced_at ?? res.data?.synced_at ?? null
  } catch {
    return null
  }
}
