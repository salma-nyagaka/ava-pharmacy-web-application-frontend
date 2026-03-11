import { apiClient } from '../lib/apiClient'

export interface OrderItem {
  id: number
  product_name: string
  product_image: string | null
  quantity: number
  unit_price: string
  subtotal: string
}

export interface Order {
  id: number
  order_number: string
  status: string
  payment_status: string
  subtotal: string
  shipping_cost: string
  discount: string
  total: string
  items: OrderItem[]
  shipping_address: Record<string, unknown> | null
  shipping_method: string | null
  notes: string
  created_at: string
  updated_at: string
}

export interface CreateOrderPayload {
  shipping_address_id?: number
  shipping_method_id?: number
  payment_method?: string
  notes?: string
  coupon_code?: string
}

export async function fetchOrders(params: Record<string, unknown> = {}): Promise<{ data: Order[]; meta: Record<string, unknown> }> {
  const res = await apiClient.get('/orders/', { params })
  return { data: res.data?.data ?? [], meta: res.data?.meta ?? {} }
}

export async function fetchOrder(id: number): Promise<Order> {
  const res = await apiClient.get(`/orders/${id}/`)
  return res.data?.data ?? res.data
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const res = await apiClient.post('/orders/create/', payload)
  return res.data?.data ?? res.data
}

export async function cancelOrder(id: number): Promise<Order> {
  const res = await apiClient.post(`/orders/${id}/cancel/`)
  return res.data?.data ?? res.data
}

export async function fetchOrderTracking(id: number): Promise<unknown> {
  const res = await apiClient.get(`/orders/${id}/tracking/`)
  return res.data?.data ?? res.data
}

export async function fetchShippingMethods(): Promise<unknown[]> {
  const res = await apiClient.get('/shipping-methods/')
  return res.data?.data ?? []
}

export async function initiateMpesa(payload: { order_id: number; phone: string; amount?: number }): Promise<unknown> {
  const res = await apiClient.post('/payments/mpesa/initiate/', payload)
  return res.data?.data ?? res.data
}

export async function getMpesaStatus(checkoutRequestId: string): Promise<unknown> {
  const res = await apiClient.get(`/payments/mpesa/status/${checkoutRequestId}/`)
  return res.data?.data ?? res.data
}

export async function createReturnRequest(orderId: number, payload: { reason: string; items?: unknown[] }): Promise<unknown> {
  const res = await apiClient.post(`/orders/${orderId}/return/`, payload)
  return res.data?.data ?? res.data
}
