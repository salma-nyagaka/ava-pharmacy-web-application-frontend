import { apiClient } from '../lib/apiClient'

export interface OrderItem {
  id: number
  product_name: string
  product_sku: string
  quantity: number
  unit_price: string
  discount_total: string
  subtotal: string
}

export interface ShippingMethod {
  id: number
  code: string
  name: string
  description: string
  fee: string
  free_shipping_threshold: string | null
  estimated_delivery_window: string
}

export interface PaymentIntent {
  id: number
  provider: 'mpesa' | 'card' | 'manual'
  status: 'pending' | 'requires_action' | 'succeeded' | 'failed' | 'cancelled'
  reference: string
  provider_reference: string
  checkout_request_id: string
  amount: string
  currency: string
  client_secret?: string
  next_action_url: string
  payload: Record<string, unknown>
  last_error: string
}

export interface Order {
  id: number
  order_number: string
  status: string
  payment_method: string
  payment_status: string
  payment_reference: string
  subtotal: string
  discount_total: string
  shipping_fee: string
  total: string
  shipping_address: string | null
  shipping_method: ShippingMethod | null
  items: OrderItem[]
  payment_intents: PaymentIntent[]
  created_at: string
  updated_at: string
}

export interface CheckoutDraftPayload {
  first_name: string
  last_name: string
  email: string
  phone: string
  street: string
  city: string
  county: string
  address_id?: number | null
  save_address?: boolean
  address_label?: string
  set_default_address?: boolean
  payment_method: 'mpesa_stk' | 'mpesa_paybill' | 'card' | 'cash_on_delivery'
  delivery_method?: string
  shipping_method_id?: number | null
  delivery_notes?: string
}

export async function fetchOrders(params: Record<string, unknown> = {}): Promise<{ data: Order[]; meta: Record<string, unknown> }> {
  const res = await apiClient.get('/orders/', { params })
  return { data: res.data?.data ?? [], meta: res.data?.meta ?? {} }
}

export async function fetchOrder(id: number): Promise<Order> {
  const res = await apiClient.get(`/orders/${id}/`)
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

export async function fetchShippingMethods(): Promise<ShippingMethod[]> {
  const res = await apiClient.get('/shipping-methods/')
  return res.data?.data ?? res.data ?? []
}

export async function createCheckoutDraft(payload: CheckoutDraftPayload): Promise<Order> {
  const res = await apiClient.post('/checkout/draft/', payload)
  return res.data?.data ?? res.data
}

export async function createPaymentIntent(payload: {
  order_id: number
  provider: 'mpesa' | 'card' | 'manual'
  phone?: string
  return_url?: string
}): Promise<PaymentIntent> {
  const res = await apiClient.post('/payments/intents/', payload)
  return res.data?.data ?? res.data
}

export async function syncPaymentIntent(id: number, payload: { transaction_id?: string } = {}): Promise<PaymentIntent> {
  const res = await apiClient.post(`/payments/intents/${id}/sync/`, payload)
  return res.data?.data ?? res.data
}

export async function finalizeCheckout(orderId: number): Promise<Order> {
  const res = await apiClient.post(`/checkout/${orderId}/finalize/`)
  return res.data?.data ?? res.data
}

export async function createReturnRequest(orderId: number, payload: { reason: string; items?: unknown[] }): Promise<unknown> {
  const res = await apiClient.post(`/orders/${orderId}/return/`, payload)
  return res.data?.data ?? res.data
}
