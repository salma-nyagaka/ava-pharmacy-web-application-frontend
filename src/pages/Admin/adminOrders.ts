export interface AdminOrderItem {
  name: string
  quantity: number
  price: number
}

export interface AdminOrder {
  id: string
  customer: string
  email: string
  phone: string
  date: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  paymentMethod: string
  shippingAddress: string
  shippingFee: number
  items: AdminOrderItem[]
  notes: string[]
  refundReason?: string
}

export const defaultAdminOrders: AdminOrder[] = [
  {
    id: 'ORD-001',
    customer: 'John Doe',
    email: 'john@example.com',
    phone: '+254 712 345 678',
    date: 'Jan 20, 2026',
    status: 'processing',
    paymentMethod: 'M-Pesa',
    shippingAddress: '123 Main Street, Westlands, Nairobi, Kenya',
    shippingFee: 250,
    items: [
      { name: 'Paracetamol 500mg', quantity: 2, price: 250 },
      { name: 'Ibuprofen 400mg', quantity: 1, price: 350 },
      { name: 'Vitamin C 1000mg', quantity: 3, price: 800 },
    ],
    notes: ['Customer requested discreet packaging.', 'Verify ID on delivery.'],
  },
  {
    id: 'ORD-002',
    customer: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+254 722 456 789',
    date: 'Jan 18, 2026',
    status: 'shipped',
    paymentMethod: 'Card',
    shippingAddress: '88 Riverside Drive, Nairobi, Kenya',
    shippingFee: 300,
    items: [
      { name: 'Hand Sanitizer 500ml', quantity: 2, price: 450 },
      { name: 'Face Masks (50 pack)', quantity: 1, price: 650 },
    ],
    notes: ['Courier assigned: Same-day express.'],
  },
  {
    id: 'ORD-003',
    customer: 'Mike Johnson',
    email: 'mike@example.com',
    phone: '+254 733 111 222',
    date: 'Jan 17, 2026',
    status: 'shipped',
    paymentMethod: 'M-Pesa',
    shippingAddress: '14 Ngong Road, Nairobi, Kenya',
    shippingFee: 200,
    items: [
      { name: 'Omega-3 Capsules', quantity: 1, price: 1200 },
      { name: 'Thermometer', quantity: 1, price: 900 },
    ],
    notes: ['Deliver after 2 PM.'],
  },
  {
    id: 'ORD-004',
    customer: 'Sarah Williams',
    email: 'sarah@example.com',
    phone: '+254 700 555 010',
    date: 'Jan 16, 2026',
    status: 'delivered',
    paymentMethod: 'Card',
    shippingAddress: '70 Kilimani Road, Nairobi, Kenya',
    shippingFee: 250,
    items: [
      { name: 'Baby Diapers (Large)', quantity: 2, price: 1200 },
      { name: 'Baby Wipes', quantity: 1, price: 450 },
    ],
    notes: ['Delivered to reception desk.'],
  },
  {
    id: 'ORD-005',
    customer: 'David Brown',
    email: 'david@example.com',
    phone: '+254 711 222 333',
    date: 'Jan 15, 2026',
    status: 'cancelled',
    paymentMethod: 'M-Pesa',
    shippingAddress: '12 Parklands Ave, Nairobi, Kenya',
    shippingFee: 0,
    items: [
      { name: 'Pain Relief Gel', quantity: 1, price: 900 },
    ],
    notes: ['Customer cancelled before dispatch.'],
  },
  {
    id: 'ORD-006',
    customer: 'Emily Davis',
    email: 'emily@example.com',
    phone: '+254 701 989 808',
    date: 'Jan 14, 2026',
    status: 'delivered',
    paymentMethod: 'Card',
    shippingAddress: '33 Karen Road, Nairobi, Kenya',
    shippingFee: 350,
    items: [
      { name: 'Multivitamin Daily', quantity: 2, price: 1500 },
      { name: 'Vitamin C 1000mg', quantity: 1, price: 800 },
      { name: 'Hand Sanitizer 500ml', quantity: 1, price: 450 },
    ],
    notes: ['Leave package with guardhouse.'],
  },
  {
    id: 'ORD-007',
    customer: 'Robert Wilson',
    email: 'robert@example.com',
    phone: '+254 708 444 555',
    date: 'Jan 13, 2026',
    status: 'processing',
    paymentMethod: 'M-Pesa',
    shippingAddress: '24 Mombasa Road, Nairobi, Kenya',
    shippingFee: 250,
    items: [
      { name: 'Blood Pressure Monitor', quantity: 1, price: 4200 },
      { name: 'Digital Thermometer', quantity: 1, price: 950 },
    ],
    notes: ['Call before arrival.'],
  },
  {
    id: 'ORD-008',
    customer: 'Lisa Anderson',
    email: 'lisa@example.com',
    phone: '+254 720 123 456',
    date: 'Jan 12, 2026',
    status: 'pending',
    paymentMethod: 'Card',
    shippingAddress: '11 Upper Hill Lane, Nairobi, Kenya',
    shippingFee: 250,
    items: [
      { name: 'Skincare Moisturizer', quantity: 1, price: 1800 },
      { name: 'Sunscreen SPF 50', quantity: 1, price: 1400 },
      { name: 'Facial Cleanser', quantity: 1, price: 950 },
    ],
    notes: ['Awaiting payment confirmation.'],
  },
]

export const getOrderTotals = (order: AdminOrder) => {
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = subtotal + order.shippingFee
  return { subtotal, total }
}

const STORAGE_KEY = 'ava_admin_orders'

export const loadAdminOrders = (): AdminOrder[] => {
  if (typeof window === 'undefined') {
    return defaultAdminOrders
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultAdminOrders))
      return defaultAdminOrders
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : defaultAdminOrders
  } catch {
    return defaultAdminOrders
  }
}

export const saveAdminOrders = (orders: AdminOrder[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
}
