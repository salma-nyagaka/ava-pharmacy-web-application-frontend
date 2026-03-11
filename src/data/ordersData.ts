export type OrderStatus = 'Processing' | 'In Transit' | 'Delivered' | 'Cancelled'

export interface OrderItem {
  name: string
  qty: number
  price: number
}

export interface Order {
  id: string
  date: string
  status: OrderStatus
  items: number
  total: number
  trackingNumber: string | null
  products: string[]
  productItems: OrderItem[]
  estimatedDelivery?: string
  deliveredDate?: string
  address: string
  payment: string
  courier?: { name: string; phone: string }
}

export const STATUS_CFG: Record<OrderStatus, { color: string; bg: string; step: number; emoji: string; desc: string }> = {
  Processing:   { color: '#d97706', bg: 'rgba(217,119,6,0.1)',  step: 1, emoji: '⚙️', desc: "We're preparing your items" },
  'In Transit': { color: '#2563eb', bg: 'rgba(37,99,235,0.1)', step: 2, emoji: '🚗', desc: 'On its way to you' },
  Delivered:    { color: '#16a34a', bg: 'rgba(22,163,74,0.1)', step: 4, emoji: '✅', desc: 'Successfully delivered' },
  Cancelled:    { color: '#dc2626', bg: 'rgba(220,38,38,0.1)', step: 0, emoji: '✕',  desc: 'This order was cancelled' },
}

export const TRACK_STEPS = ['Ordered', 'Processing', 'In Transit', 'Delivered']

export const ORDERS: Order[] = [
  {
    id: 'ORD-001',
    date: 'January 20, 2026',
    status: 'Delivered',
    items: 3,
    total: 7000,
    trackingNumber: 'TRK123456789',
    products: ['Panadol Extra 500mg', 'CeraVe Moisturising Cream', 'Vitamin C 1000mg'],
    productItems: [
      { name: 'Panadol Extra 500mg', qty: 2, price: 1200 },
      { name: 'CeraVe Moisturising Cream 250ml', qty: 1, price: 3600 },
      { name: 'Vitamin C 1000mg x30', qty: 1, price: 2200 },
    ],
    deliveredDate: 'January 22, 2026',
    address: '24 Mombasa Road, Nairobi, Kenya',
    payment: 'M-Pesa',
    courier: { name: 'Kevin Mutiso', phone: '+254701222444' },
  },
  {
    id: 'ORD-002',
    date: 'January 15, 2026',
    status: 'In Transit',
    items: 2,
    total: 3200,
    trackingNumber: 'TRK987654321',
    products: ['Nivea Body Lotion 400ml', 'Durex Invisible 12-pack'],
    productItems: [
      { name: 'Nivea Body Lotion 400ml', qty: 1, price: 1800 },
      { name: 'Durex Invisible 12-pack', qty: 1, price: 1400 },
    ],
    estimatedDelivery: 'February 1, 2026',
    address: 'Westlands, Nairobi, Kenya',
    payment: 'M-Pesa',
    courier: { name: 'James Ochieng', phone: '+254722333555' },
  },
  {
    id: 'ORD-003',
    date: 'January 10, 2026',
    status: 'Processing',
    items: 5,
    total: 4500,
    trackingNumber: null,
    products: ['Cetirizine 10mg x30', 'Omeprazole 20mg x28'],
    productItems: [
      { name: 'Cetirizine 10mg x30', qty: 2, price: 1100 },
      { name: 'Omeprazole 20mg x28', qty: 2, price: 1600 },
      { name: 'Saline Nasal Spray 30ml', qty: 1, price: 700 },
    ],
    estimatedDelivery: 'February 3, 2026',
    address: 'Karen, Nairobi, Kenya',
    payment: 'Card (Visa)',
  },
  {
    id: 'ORD-004',
    date: 'January 5, 2026',
    status: 'Delivered',
    items: 1,
    total: 1250,
    trackingNumber: 'TRK555666777',
    products: ['Accu-Chek Active Test Strips x50'],
    productItems: [
      { name: 'Accu-Chek Active Test Strips x50', qty: 1, price: 1250 },
    ],
    deliveredDate: 'January 8, 2026',
    address: 'Kilimani, Nairobi, Kenya',
    payment: 'M-Pesa',
    courier: { name: 'Faith Wanjiku', phone: '+254711888999' },
  },
]

export function getRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date('2026-03-03')
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`
}
