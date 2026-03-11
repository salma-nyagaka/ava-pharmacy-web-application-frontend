import { useState, useEffect } from 'react'
import { fetchOrders, type Order as ApiOrder } from '../services/orderService'
import type { Order, OrderStatus } from '../data/ordersData'

function mapApiStatus(status: string): OrderStatus {
  if (status === 'shipped') return 'In Transit'
  if (status === 'delivered') return 'Delivered'
  if (status === 'cancelled') return 'Cancelled'
  return 'Processing'
}

function mapApiOrder(o: ApiOrder): Order {
  const items = o.items ?? []
  return {
    id: o.order_number,
    date: new Date(o.created_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' }),
    status: mapApiStatus(o.status),
    items: items.length,
    total: parseFloat(o.total ?? '0'),
    trackingNumber: null,
    products: items.map((i) => i.product_name),
    productItems: items.map((i) => ({
      name: i.product_name,
      qty: i.quantity,
      price: parseFloat(i.unit_price ?? '0'),
    })),
    address: '',
    payment: o.payment_status ?? '',
  }
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('ava_access_token')
    if (!token) {
      setLoading(false)
      return
    }
    fetchOrders().then(({ data }) => {
      setOrders(data.map(mapApiOrder))
    }).catch(() => {
      setError('Failed to load orders.')
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  return { orders, loading, error }
}
