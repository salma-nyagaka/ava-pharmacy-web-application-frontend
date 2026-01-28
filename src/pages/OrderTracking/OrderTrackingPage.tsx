import PageHeader from '../../components/PageHeader/PageHeader'
import './OrderTrackingPage.css'

function OrderTrackingPage() {
  const steps = [
    { title: 'Order confirmed', body: 'Payment received and order approved by pharmacy.', time: '10:15 AM' },
    { title: 'Prescription verified', body: 'Pharmacist verified your prescription and dosage.', time: '11:00 AM' },
    { title: 'Packed & ready', body: 'Items packed at Nairobi CBD branch.', time: '11:30 AM' },
    { title: 'Out for delivery', body: 'Courier picked up the package.', time: '1:05 PM' },
  ]

  return (
    <div>
      <PageHeader
        title="Track your order"
        subtitle="Follow every step from prescription approval to delivery in real time."
        badge="Order Tracking"
      />
      <section className="page">
        <div className="container">
          <div className="form-card" style={{ marginBottom: '2rem' }}>
            <h2 className="card__title">Find your order</h2>
            <p className="card__subtitle">Enter your order ID or phone number.</p>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="order-id">Order ID</label>
                <input id="order-id" type="text" placeholder="ORD-2026-1042" />
              </div>
              <div className="form-group">
                <label htmlFor="order-phone">Phone number</label>
                <input id="order-phone" type="tel" placeholder="+254 700 000 000" />
              </div>
            </div>
            <button className="btn btn--primary">Track order</button>
          </div>

          <div className="tracking-summary">
            <div className="tracking-summary__item">
              <p className="tracking-summary__label">Order status</p>
              <p className="tracking-summary__value">Out for delivery</p>
            </div>
            <div className="tracking-summary__item">
              <p className="tracking-summary__label">Estimated delivery</p>
              <p className="tracking-summary__value">Today, 5:00 PM - 7:00 PM</p>
            </div>
            <div className="tracking-summary__item">
              <p className="tracking-summary__label">Delivery method</p>
              <p className="tracking-summary__value">Same-day courier</p>
            </div>
          </div>

          <div className="split-layout">
            <div>
              <h2 style={{ marginBottom: '1rem' }}>Timeline</h2>
              <div className="timeline">
                {steps.map((step) => (
                  <div key={step.title} className="timeline__item">
                    <div className="timeline__title">{step.title}</div>
                    <div className="timeline__body">{step.body}</div>
                    <div className="card__meta">{step.time}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card card--soft">
              <h3 className="card__title">Need assistance?</h3>
              <p className="card__subtitle">Our support team can update delivery instructions.</p>
              <ul className="card__list">
                <li>📞 Call +254 700 000 000</li>
                <li>💬 WhatsApp chat available</li>
                <li>📧 support@avapharmacy.co.ke</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default OrderTrackingPage
