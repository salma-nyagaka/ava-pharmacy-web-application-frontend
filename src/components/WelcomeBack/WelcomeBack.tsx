import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchOrders, type Order } from '../../services/orderService'
import { cartService } from '../../services/cartService'
import { useAuth } from '../../context/AuthContext'
import './WelcomeBack.css'

function WelcomeBack() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [latestOrder, setLatestOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [reordering, setReordering] = useState(false)
  const [reordered, setReordered] = useState(false)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    let mounted = true
    void fetchOrders({ page_size: 1, ordering: '-created_at' })
      .then((res) => {
        if (!mounted) return
        const first = res.data?.[0]
        setLatestOrder(first && first.items?.length ? first : null)
      })
      .catch(() => { if (mounted) setLatestOrder(null) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [user])

  const reorder = async () => {
    if (!latestOrder?.items?.length) return
    setReordering(true)
    try {
      for (const item of latestOrder.items) {
        await cartService.add({
          id: item.product_id ?? item.id,
          productId: item.product_id ?? undefined,
          name: item.product_name,
          brand: '',
          price: parseFloat(item.unit_price ?? '0'),
        }, item.quantity)
      }
      setReordered(true)
    } finally {
      setReordering(false)
    }
  }

  if (loading || !latestOrder) return null

  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <section className="welcome-back" aria-label="Welcome back">
      <div className="container">
        <div className="welcome-back__card">
          <div className="welcome-back__copy">
            <span className="welcome-back__eyebrow">Welcome back, {firstName}</span>
            <h2 className="welcome-back__title">Reorder your last purchase</h2>
            <p className="welcome-back__sub">
              Order <strong>#{latestOrder.order_number}</strong> · {latestOrder.items.length} item{latestOrder.items.length === 1 ? '' : 's'}.
            </p>
            <div className="welcome-back__actions">
              <button
                type="button"
                className="welcome-back__btn welcome-back__btn--primary"
                disabled={reordering || reordered}
                onClick={() => void reorder()}
              >
                {reordered ? 'Added to cart ✓' : reordering ? 'Adding…' : 'Reorder all items'}
              </button>
              <Link to="/account/orders" className="welcome-back__btn welcome-back__btn--ghost">View order history</Link>
              <button
                type="button"
                className="welcome-back__btn welcome-back__btn--ghost"
                onClick={() => navigate('/cart')}
              >
                Go to cart
              </button>
            </div>
          </div>
          <ul className="welcome-back__items" aria-label="Items in last order">
            {latestOrder.items.slice(0, 4).map((item) => (
              <li key={item.id} className="welcome-back__item">
                <span className="welcome-back__item-name">{item.product_name}</span>
                <span className="welcome-back__item-qty">×{item.quantity}</span>
              </li>
            ))}
            {latestOrder.items.length > 4 && (
              <li className="welcome-back__item welcome-back__item--more">
                +{latestOrder.items.length - 4} more
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  )
}

export default WelcomeBack
