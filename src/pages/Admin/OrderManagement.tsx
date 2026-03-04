import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { type AdminOrder, getOrderTotals, loadAdminOrders, saveAdminOrders } from './adminOrders'
import { logAdminAction } from '../../data/adminAudit'
import './OrderManagement.css'

const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`

function OrderManagement() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [orders, setOrders] = useState(loadAdminOrders())

  useEffect(() => {
    saveAdminOrders(orders)
  }, [orders])
  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return orders.filter((order) => {
      const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus
      if (!query) {
        return matchesStatus
      }
      const matchesQuery = [order.id, order.customer, order.email].some((value) =>
        value.toLowerCase().includes(query)
      )
      return matchesStatus && matchesQuery
    })
  }, [orders, searchTerm, selectedStatus])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedStatus])

  const PAGE_SIZE = 6
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pagedOrders = filteredOrders.slice(startIndex, startIndex + PAGE_SIZE)

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/admin')
  }

  const [confirmPending, setConfirmPending] = useState<{ orderId: string; status: AdminOrder['status']; label: string } | null>(null)
  const [refundTarget, setRefundTarget] = useState<AdminOrder | null>(null)
  const [refundNote, setRefundNote] = useState('')
  const [refundReasonError, setRefundReasonError] = useState(false)

  const requestStatusChange = (orderId: string, status: AdminOrder['status'], label: string) => {
    setConfirmPending({ orderId, status, label })
  }

  const confirmStatusChange = () => {
    if (!confirmPending) return
    const { orderId, status } = confirmPending
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status } : order))
    )
    logAdminAction({
      action: 'Update order status',
      entity: 'Order',
      entityId: orderId,
      detail: `Status set to ${status}`,
    })
    setConfirmPending(null)
  }

  const openRefundModal = (order: AdminOrder) => {
    setRefundTarget(order)
    setRefundNote('')
    setRefundReasonError(false)
  }

  const confirmRefund = () => {
    if (!refundTarget) return
    if (!refundNote.trim()) {
      setRefundReasonError(true)
      return
    }
    setOrders((prev) =>
      prev.map((order) =>
        order.id === refundTarget.id
          ? { ...order, status: 'refunded', refundReason: refundNote.trim() }
          : order
      )
    )
    logAdminAction({
      action: 'Update order status',
      entity: 'Order',
      entityId: refundTarget.id,
      detail: `Status set to refunded · ${refundNote.trim()}`,
    })
    setRefundTarget(null)
    setRefundNote('')
    setRefundReasonError(false)
  }

  return (
    <div className="order-management">
      <div className="order-management__header">
        <div>
          <button className="btn btn--outline btn--sm" type="button" onClick={handleBack}>
            Back
          </button>
          <h1>Order Management</h1>
        </div>
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
          <option value="refunded">Refunded</option>
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
            {pagedOrders.map((order) => (
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
                <td>{order.date}</td>
                <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                <td>
                  <span className="order-total">KSh {getOrderTotals(order).total.toLocaleString()}</span>
                </td>
                <td>{order.paymentMethod}</td>
                <td>
                  <span className={`status status--${order.status}`}>
                    {order.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <Link className="btn-sm btn--outline" to={`/admin/orders/${order.id}`}>
                      View
                    </Link>
                    <button className="btn-sm btn--primary" onClick={() => requestStatusChange(order.id, 'processing', 'Mark as Processing')}>
                      Process
                    </button>
                    <button className="btn-sm btn--primary" onClick={() => requestStatusChange(order.id, 'shipped', 'Mark as Shipped')}>
                      Ship
                    </button>
                    <button className="btn-sm btn--primary" onClick={() => requestStatusChange(order.id, 'delivered', 'Mark as Delivered')}>
                      Deliver
                    </button>
                    <button
                      className="btn-sm btn--outline"
                      onClick={() => openRefundModal(order)}
                      disabled={order.status === 'cancelled' || order.status === 'refunded'}
                    >
                      Issue refund
                    </button>
                    <button className="btn-sm btn--danger" onClick={() => requestStatusChange(order.id, 'cancelled', 'Cancel Order')}>
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={8} className="order-empty">No orders match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredOrders.length > 0 && (
        <div className="order-pagination">
          <button
            className="pagination__button"
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <div className="pagination__pages">
            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1
              return (
                <button
                  key={page}
                  className={`pagination__page ${page === currentPage ? 'pagination__page--active' : ''}`}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              )
            })}
          </div>
          <button
            className="pagination__button"
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {confirmPending && (
        <div className="modal-overlay" onClick={() => setConfirmPending(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Confirm action</h2>
              <button className="modal__close" onClick={() => setConfirmPending(null)}>×</button>
            </div>
            <div className="modal__content">
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                <strong>{confirmPending.label}</strong> for order <strong>{confirmPending.orderId}</strong>?
              </p>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setConfirmPending(null)}>No, keep</button>
              <button className="btn btn--primary btn--sm" onClick={confirmStatusChange}>Yes, confirm</button>
            </div>
          </div>
        </div>
      )}

      {refundTarget && (
        <div
          className="modal-overlay"
          onClick={() => {
            setRefundTarget(null)
            setRefundReasonError(false)
          }}
        >
          <div className="modal od-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Issue refund</h2>
              <button
                className="modal__close"
                type="button"
                onClick={() => {
                  setRefundTarget(null)
                  setRefundReasonError(false)
                }}
              >
                ×
              </button>
            </div>
            <div className="modal__content">
              <p className="od-modal-warning">
                Refund <strong>{formatCurrency(getOrderTotals(refundTarget).total)}</strong> to <strong>{refundTarget.customer}</strong>?
              </p>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label htmlFor="refund-note">
                  Reason <span className="od-required">Required</span>
                </label>
                <input
                  id="refund-note"
                  type="text"
                  value={refundNote}
                  onChange={(e) => {
                    setRefundNote(e.target.value)
                    setRefundReasonError(false)
                  }}
                  placeholder="e.g. Damaged items returned by customer"
                  style={{ borderColor: refundReasonError ? '#dc2626' : undefined }}
                />
                {refundReasonError && <p className="od-field-error">A reason is required to issue a refund.</p>}
              </div>
            </div>
            <div className="modal__footer">
              <button
                className="btn btn--outline btn--sm"
                type="button"
                onClick={() => {
                  setRefundTarget(null)
                  setRefundReasonError(false)
                }}
              >
                Cancel
              </button>
              <button className="btn btn--primary btn--sm" type="button" onClick={confirmRefund}>
                Confirm refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderManagement
