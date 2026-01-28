import { useState } from 'react'
import './OrderManagement.css'

interface Order {
  id: string
  customer: string
  email: string
  date: string
  total: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  items: number
  paymentMethod: string
}

function OrderManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showDetails, setShowDetails] = useState<string | null>(null)

  const orders: Order[] = [
    { id: 'ORD-001', customer: 'John Doe', email: 'john@example.com', date: '2024-03-15', total: 3500, status: 'pending', items: 3, paymentMethod: 'M-Pesa' },
    { id: 'ORD-002', customer: 'Jane Smith', email: 'jane@example.com', date: '2024-03-14', total: 5200, status: 'processing', items: 5, paymentMethod: 'Card' },
    { id: 'ORD-003', customer: 'Mike Johnson', email: 'mike@example.com', date: '2024-03-14', total: 2800, status: 'shipped', items: 2, paymentMethod: 'M-Pesa' },
    { id: 'ORD-004', customer: 'Sarah Williams', email: 'sarah@example.com', date: '2024-03-13', total: 4100, status: 'delivered', items: 4, paymentMethod: 'Card' },
    { id: 'ORD-005', customer: 'David Brown', email: 'david@example.com', date: '2024-03-13', total: 1500, status: 'cancelled', items: 1, paymentMethod: 'M-Pesa' },
    { id: 'ORD-006', customer: 'Emily Davis', email: 'emily@example.com', date: '2024-03-12', total: 6700, status: 'delivered', items: 7, paymentMethod: 'Card' },
    { id: 'ORD-007', customer: 'Robert Wilson', email: 'robert@example.com', date: '2024-03-12', total: 3300, status: 'processing', items: 3, paymentMethod: 'M-Pesa' },
    { id: 'ORD-008', customer: 'Lisa Anderson', email: 'lisa@example.com', date: '2024-03-11', total: 4900, status: 'shipped', items: 5, paymentMethod: 'Card' },
  ]

  return (
    <div className="order-management">
      <div className="order-management__header">
        <h1>Order Management</h1>
        <div className="stats-mini">
          <div className="stat-mini">
            <span className="stat-mini__value">{orders.filter(o => o.status === 'pending').length}</span>
            <span className="stat-mini__label">Pending</span>
          </div>
          <div className="stat-mini">
            <span className="stat-mini__value">{orders.filter(o => o.status === 'processing').length}</span>
            <span className="stat-mini__label">Processing</span>
          </div>
          <div className="stat-mini">
            <span className="stat-mini__value">{orders.filter(o => o.status === 'shipped').length}</span>
            <span className="stat-mini__label">Shipped</span>
          </div>
        </div>
      </div>

      <div className="order-management__filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by order ID, customer name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="order-management__table">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <span className="order-id">{order.id}</span>
                </td>
                <td>
                  <div className="customer-info">
                    <div className="customer-name">{order.customer}</div>
                    <div className="customer-email">{order.email}</div>
                  </div>
                </td>
                <td>{new Date(order.date).toLocaleDateString()}</td>
                <td>{order.items}</td>
                <td>
                  <span className="order-total">KSh {order.total.toLocaleString()}</span>
                </td>
                <td>{order.paymentMethod}</td>
                <td>
                  <span className={`status status--${order.status}`}>
                    {order.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-sm btn--outline"
                      onClick={() => setShowDetails(order.id)}
                    >
                      View
                    </button>
                    {order.status === 'pending' && (
                      <button className="btn-sm btn--primary">Process</button>
                    )}
                    {order.status === 'processing' && (
                      <button className="btn-sm btn--primary">Ship</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetails && (
        <div className="modal-overlay" onClick={() => setShowDetails(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Order Details - {showDetails}</h2>
              <button className="modal__close" onClick={() => setShowDetails(null)}>×</button>
            </div>
            <div className="modal__content">
              <div className="order-details">
                <div className="detail-section">
                  <h3>Customer Information</h3>
                  <div className="detail-row">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">John Doe</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">john@example.com</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">+254 712 345 678</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Shipping Address</h3>
                  <p>123 Main Street, Nairobi, Kenya</p>
                </div>

                <div className="detail-section">
                  <h3>Order Items</h3>
                  <div className="order-items">
                    <div className="order-item">
                      <span>Paracetamol 500mg × 2</span>
                      <span>KSh 500</span>
                    </div>
                    <div className="order-item">
                      <span>Ibuprofen 400mg × 1</span>
                      <span>KSh 350</span>
                    </div>
                    <div className="order-item">
                      <span>Vitamin C 1000mg × 3</span>
                      <span>KSh 2,400</span>
                    </div>
                  </div>
                  <div className="order-summary">
                    <div className="summary-row">
                      <span>Subtotal:</span>
                      <span>KSh 3,250</span>
                    </div>
                    <div className="summary-row">
                      <span>Shipping:</span>
                      <span>KSh 250</span>
                    </div>
                    <div className="summary-row summary-row--total">
                      <span>Total:</span>
                      <span>KSh 3,500</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Update Status</h3>
                  <select className="status-select">
                    <option>Pending</option>
                    <option>Processing</option>
                    <option>Shipped</option>
                    <option>Delivered</option>
                    <option>Cancelled</option>
                  </select>
                  <button className="btn btn--primary">Update Status</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderManagement
