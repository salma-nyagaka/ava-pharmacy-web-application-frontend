import PageHeader from '../../components/PageHeader/PageHeader'

function OrderDetailPage() {
  return (
    <div>
      <PageHeader
        title="Order details"
        subtitle="Review items, delivery status, and receipts."
        badge="My Orders"
      />
      <section className="page">
        <div className="container">
          <div className="split-layout">
            <div className="card">
              <h2 className="card__title">Order ORD-001</h2>
              <p className="card__meta">Placed on Jan 20, 2026</p>
              <ul className="card__list">
                <li>Vitamin C 1000mg x 2</li>
                <li>Hand Sanitizer 500ml x 1</li>
              </ul>
              <div style={{ marginTop: '1rem' }}>
                <span className="badge badge--success">Delivered</span>
              </div>
            </div>
            <div className="card card--soft">
              <h3 className="card__title">Delivery details</h3>
              <p className="card__meta">Westlands, Nairobi</p>
              <p className="card__meta">Courier: Same-day express</p>
              <div style={{ marginTop: '1rem' }}>
                <button className="btn btn--outline btn--sm">Download receipt</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default OrderDetailPage
