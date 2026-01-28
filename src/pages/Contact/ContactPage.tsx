import PageHeader from '../../components/PageHeader/PageHeader'

function ContactPage() {
  return (
    <div>
      <PageHeader
        title="Contact us"
        subtitle="Reach our support team for prescriptions, orders, and partnerships."
        badge="Customer Care"
      />
      <section className="page">
        <div className="container">
          <div className="split-layout">
            <div className="form-card">
              <h2 className="card__title">Send a message</h2>
              <form>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="contact-name">Full name</label>
                    <input id="contact-name" type="text" placeholder="Sarah Mwangi" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="contact-email">Email</label>
                    <input id="contact-email" type="email" placeholder="you@example.com" required />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="contact-topic">Topic</label>
                  <select id="contact-topic" required>
                    <option value="">Select a topic</option>
                    <option>Order support</option>
                    <option>Prescription assistance</option>
                    <option>Telemedicine</option>
                    <option>Lab services</option>
                    <option>Partnerships</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="contact-message">Message</label>
                  <textarea id="contact-message" rows={5} placeholder="How can we help?" required></textarea>
                </div>
                <button className="btn btn--primary">Submit</button>
              </form>
            </div>
            <div className="card card--soft">
              <h3 className="card__title">Quick contacts</h3>
              <ul className="card__list">
                <li>📞 +254 700 000 000</li>
                <li>💬 WhatsApp: +254 700 000 000</li>
                <li>📧 support@avapharmacy.co.ke</li>
                <li>📍 Nairobi, Kenya</li>
              </ul>
              <div style={{ marginTop: '1rem' }}>
                <span className="badge badge--info">Response time</span>
                <p className="card__meta" style={{ marginTop: '0.5rem' }}>Within 2 hours on business days.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ContactPage
