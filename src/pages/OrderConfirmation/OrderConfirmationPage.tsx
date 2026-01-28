import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'

function OrderConfirmationPage() {
  return (
    <div>
      <PageHeader
        title="Payment confirmed"
        subtitle="Your order is being prepared. We have sent confirmation to your email and phone."
        badge="Order Complete"
        align="center"
      />
      <section className="page">
        <div className="container">
          <div className="split-layout">
            <div className="card">
              <h2 className="card__title">Order summary</h2>
              <p className="card__subtitle">Order ID: ORD-2026-1042</p>
              <ul className="card__list">
                <li>💊 Vitamin C 1000mg x 2</li>
                <li>🩹 Digital Thermometer x 1</li>
                <li>🧴 Hand Sanitizer 500ml x 1</li>
              </ul>
              <div style={{ marginTop: '1rem' }}>
                <p className="card__meta">Delivery: Same-day courier</p>
                <p className="card__meta">Address: Westlands, Nairobi</p>
              </div>
            </div>
            <div className="card card--soft">
              <h3 className="card__title">What happens next?</h3>
              <ul className="card__list">
                <li>✅ Pharmacist verifies prescription</li>
                <li>✅ Items packed at your preferred branch</li>
                <li>✅ Courier dispatch within 2 hours</li>
                <li>✅ SMS updates until delivery</li>
              </ul>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link to="/track-order" className="btn btn--primary">Track order</Link>
                <Link to="/products" className="btn btn--secondary">Continue shopping</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default OrderConfirmationPage
