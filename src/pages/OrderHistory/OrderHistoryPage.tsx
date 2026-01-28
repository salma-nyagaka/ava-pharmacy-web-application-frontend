import { Link } from 'react-router-dom'
import './OrderHistoryPage.css'

function OrderHistoryPage() {
  const orders = [
    {
      id: 'ORD-001',
      date: 'January 20, 2026',
      status: 'Delivered',
      items: 3,
      total: 7000,
      trackingNumber: 'TRK123456789',
    },
    {
      id: 'ORD-002',
      date: 'January 15, 2026',
      status: 'In Transit',
      items: 2,
      total: 3200,
      trackingNumber: 'TRK987654321',
    },
    {
      id: 'ORD-003',
      date: 'January 10, 2026',
      status: 'Processing',
      items: 5,
      total: 4500,
      trackingNumber: null,
    },
    {
      id: 'ORD-004',
      date: 'January 5, 2026',
      status: 'Delivered',
      items: 1,
      total: 1250,
      trackingNumber: 'TRK555666777',
    },
  ]

  const formatPrice = (price: number) => `KSh ${price.toLocaleString()}`

  return (
    <div className="order-history">
      <div className="container">
        <div className="page-header">
          <h1>Order History</h1>
          <Link to="/account" className="btn btn--outline">Back to Account</Link>
        </div>

        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-item">
              <div className="order-item__header">
                <div>
                  <h3 className="order-item__id">{order.id}</h3>
                  <p className="order-item__date">{order.date}</p>
                </div>
                <span className={`order-status order-status--${order.status.toLowerCase().replace(' ', '-')}`}>
                  {order.status}
                </span>
              </div>

              <div className="order-item__details">
                <div className="order-detail">
                  <span className="order-detail__label">Items:</span>
                  <span className="order-detail__value">{order.items}</span>
                </div>
                <div className="order-detail">
                  <span className="order-detail__label">Total:</span>
                  <span className="order-detail__value">{formatPrice(order.total)}</span>
                </div>
                {order.trackingNumber && (
                  <div className="order-detail">
                    <span className="order-detail__label">Tracking:</span>
                    <span className="order-detail__value">{order.trackingNumber}</span>
                  </div>
                )}
              </div>

              <div className="order-item__actions">
                <Link to={`/account/orders/${order.id}`} className="btn btn--outline btn--sm">
                  View Details
                </Link>
                {order.status === 'Delivered' && (
                  <button className="btn btn--primary btn--sm">Reorder</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default OrderHistoryPage
