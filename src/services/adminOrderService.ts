import { apiClient } from '../lib/apiClient'
import type { OrderItem, PaymentIntent } from './orderService'

export interface AdminOrderEvent {
  id: number
  event_type: string
  message: string
  metadata: Record<string, unknown>
  actor_name?: string
  created_at: string
}

export interface AdminOrderNote {
  id: number
  content: string
  created_by_name?: string
  created_at: string
}

export interface AdminOrder {
  id: number
  order_number: string
  customer: number | null
  customer_name: string
  customer_email: string
  customer_phone: string
  status: string
  payment_method: string
  payment_status: string
  payment_reference: string
  delivery_method: string
  delivery_notes: string
  shipping_first_name: string
  shipping_last_name: string
  shipping_email: string
  shipping_phone: string
  shipping_street: string
  shipping_city: string
  shipping_county: string
  shipping_address: string
  paybill_number?: string
  paybill_account_reference?: string
  paybill_account_label?: string
  paybill_instructions?: string
  subtotal: string
  discount_total: string
  shipping_fee: string
  total: string
  placed_at?: string | null
  created_at: string
  updated_at: string
  items: OrderItem[]
  notes: AdminOrderNote[]
  events: AdminOrderEvent[]
  payment_intents: PaymentIntent[]
}

function unwrap<T>(res: { data?: { data?: T } & T }): T {
  const root = res.data as ({ data?: T } & T) | undefined
  return (root?.data ?? root) as T
}

function unwrapList<T>(res: { data?: { data?: T[]; results?: T[] } | T[] }): T[] {
  const root = res.data
  if (Array.isArray(root)) return root
  if (Array.isArray(root?.data)) return root.data
  if (Array.isArray(root?.results)) return root.results
  return []
}

export async function listAdminOrders(params?: Record<string, string>): Promise<AdminOrder[]> {
  const firstResponse = await apiClient.get('/admin/orders/', { params })
  const firstPage = firstResponse.data
  const firstItems = unwrapList<AdminOrder>(firstResponse)

  if (!firstPage || Array.isArray(firstPage) || !Array.isArray(firstPage.results) || !firstPage.next) {
    return firstItems
  }

  const orders = [...firstItems]
  let nextUrl: string | null = typeof firstPage.next === 'string' ? firstPage.next : null

  while (nextUrl) {
    const response = await apiClient.get(nextUrl)
    const page = response.data
    orders.push(...unwrapList<AdminOrder>(response))
    nextUrl = typeof page?.next === 'string' ? page.next : null
  }

  return orders
}

export async function fetchAdminOrder(id: number | string): Promise<AdminOrder> {
  const res = await apiClient.get(`/admin/orders/${id}/`)
  return unwrap<AdminOrder>(res)
}

export async function updateAdminOrder(id: number | string, payload: Partial<{
  status: string
  payment_status: string
  payment_reference: string
  delivery_method: string
  delivery_notes: string
  shipping_method: number | null
}>): Promise<AdminOrder> {
  const res = await apiClient.patch(`/admin/orders/${id}/`, payload)
  return unwrap<AdminOrder>(res)
}

export async function refundAdminOrder(id: number | string): Promise<AdminOrder> {
  const res = await apiClient.post(`/admin/orders/${id}/refund/`)
  return unwrap<AdminOrder>(res)
}

export async function addAdminOrderNote(id: number | string, content: string): Promise<AdminOrder> {
  const res = await apiClient.post(`/admin/orders/${id}/notes/`, { content })
  return unwrap<AdminOrder>(res)
}

export async function reconcilePaybillIntent(
  id: number,
  payload: { status: 'succeeded' | 'failed'; provider_reference?: string; message?: string; payload?: Record<string, unknown> },
): Promise<PaymentIntent> {
  const res = await apiClient.post(`/admin/payments/intents/${id}/reconcile/`, payload)
  return unwrap<PaymentIntent>(res)
}
