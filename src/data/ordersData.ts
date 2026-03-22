import type { Order as ApiOrder } from '../services/orderService'

export type OrderStatus = 'Pending' | 'Confirmed' | 'Processing' | 'In Transit' | 'Delivered' | 'Cancelled' | 'Refunded'

export interface OrderItem {
  name: string
  qty: number
  price: number
}

export interface Order {
  apiId: number
  id: string
  rawStatus: string
  date: string
  placedAt: string
  status: OrderStatus
  items: number
  total: number
  subtotal: number
  shippingFee: number
  trackingNumber: string | null
  products: string[]
  productItems: OrderItem[]
  estimatedDelivery?: string
  deliveredDate?: string
  address: string
  payment: string
  paymentStatus: string
  paymentReference: string
  canCancel: boolean
}

export const STATUS_CFG: Record<OrderStatus, { color: string; bg: string; step: number; emoji: string; desc: string }> = {
  Pending: { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', step: 0, emoji: '📝', desc: 'Order received' },
  Confirmed: { color: '#0f766e', bg: 'rgba(15,118,110,0.1)', step: 1, emoji: '💳', desc: 'Payment confirmed' },
  Processing: { color: '#d97706', bg: 'rgba(217,119,6,0.1)', step: 2, emoji: '⚙️', desc: 'We\'re preparing your items' },
  'In Transit': { color: '#2563eb', bg: 'rgba(37,99,235,0.1)', step: 3, emoji: '🚗', desc: 'On its way to you' },
  Delivered: { color: '#16a34a', bg: 'rgba(22,163,74,0.1)', step: 4, emoji: '✅', desc: 'Successfully delivered' },
  Cancelled: { color: '#dc2626', bg: 'rgba(220,38,38,0.1)', step: 0, emoji: '✕', desc: 'This order was cancelled' },
  Refunded: { color: '#475569', bg: 'rgba(71,85,105,0.12)', step: 4, emoji: '↺', desc: 'This order was refunded' },
}

export const TRACK_STEPS = ['Ordered', 'Confirmed', 'Processing', 'In Transit', 'Delivered']

function parseAmount(value: string | null | undefined) {
  const parsed = Number.parseFloat(value ?? '0')
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatPaymentMethod(method: string) {
  switch (method) {
    case 'mpesa_stk':
      return 'M-Pesa STK Push'
    case 'mpesa_paybill':
      return 'M-Pesa Paybill'
    case 'card':
      return 'Card'
    case 'cash_on_delivery':
      return 'Cash on Delivery'
    default:
      return method || 'Not specified'
  }
}

function formatPaymentStatus(status: string) {
  switch (status) {
    case 'paid':
      return 'Paid'
    case 'pending':
      return 'Pending'
    case 'requires_action':
      return 'Requires action'
    case 'failed':
      return 'Failed'
    case 'refunded':
      return 'Refunded'
    default:
      return status || 'Pending'
  }
}

function mapApiStatus(status: string): OrderStatus {
  switch (status) {
    case 'draft':
    case 'pending':
      return 'Pending'
    case 'paid':
      return 'Confirmed'
    case 'processing':
      return 'Processing'
    case 'shipped':
      return 'In Transit'
    case 'delivered':
      return 'Delivered'
    case 'cancelled':
      return 'Cancelled'
    case 'refunded':
      return 'Refunded'
    default:
      return 'Processing'
  }
}

function buildAddress(order: ApiOrder) {
  if (order.shipping_address) return order.shipping_address
  return [order.shipping_street, order.shipping_city, order.shipping_county].filter(Boolean).join(', ') || 'Address not available'
}

export function mapApiOrder(order: ApiOrder): Order {
  const items = order.items ?? []
  const status = mapApiStatus(order.status)

  return {
    apiId: order.id,
    id: order.order_number,
    rawStatus: order.status,
    date: formatDate(order.created_at),
    placedAt: order.created_at,
    status,
    items: items.length,
    total: parseAmount(order.total),
    subtotal: parseAmount(order.subtotal),
    shippingFee: parseAmount(order.shipping_fee),
    trackingNumber: null,
    products: items.map((item) => item.product_name),
    productItems: items.map((item) => ({
      name: item.product_name,
      qty: item.quantity,
      price: parseAmount(item.unit_price),
    })),
    estimatedDelivery: order.status === 'delivered' ? undefined : (order.shipping_method?.estimated_delivery_window || undefined),
    deliveredDate: order.status === 'delivered' ? formatDate(order.updated_at) : undefined,
    address: buildAddress(order),
    payment: formatPaymentMethod(order.payment_method),
    paymentStatus: formatPaymentStatus(order.payment_status),
    paymentReference: order.payment_reference || '',
    canCancel: ['draft', 'pending', 'paid'].includes(order.status),
  }
}

export function getRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  }
  const months = Math.floor(diffDays / 30)
  return `${months} month${months > 1 ? 's' : ''} ago`
}
