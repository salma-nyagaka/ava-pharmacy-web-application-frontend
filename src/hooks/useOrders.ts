import { useState, useEffect } from 'react'
import { fetchOrders } from '../services/orderService'
import { isPlacedApiOrder, mapApiOrder, type Order } from '../data/ordersData'

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

    fetchOrders()
      .then(({ data }) => {
        setOrders(data.filter(isPlacedApiOrder).map(mapApiOrder))
      })
      .catch(() => {
        setError('Failed to load orders.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return { orders, loading, error }
}
