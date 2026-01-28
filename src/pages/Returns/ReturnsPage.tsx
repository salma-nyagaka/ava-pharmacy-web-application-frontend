import PageHeader from '../../components/PageHeader/PageHeader'

function ReturnsPage() {
  return (
    <div>
      <PageHeader
        title="Returns & refunds"
        subtitle="Submit a return request and track your refund status securely."
        badge="Customer Support"
      />
      <section className="page">
        <div className="container">
          <div className="split-layout">
            <div className="form-card">
              <h2 className="card__title">Request a return</h2>
              <p className="card__subtitle">We process refunds within 3-5 business days.</p>
              <form>
                <div className="form-group">
                  <label htmlFor="return-order">Order ID</label>
                  <input id="return-order" type="text" placeholder="ORD-2026-1042" required />
                </div>
                <div className="form-group">
                  <label htmlFor="return-reason">Reason for return</label>
                  <select id="return-reason" required>
                    <option value="">Select a reason</option>
                    <option>Damaged item</option>
                    <option>Incorrect item</option>
                    <option>Prescription issue</option>
                    <option>Changed my mind</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="return-notes">Additional notes</label>
                  <textarea id="return-notes" rows={4} placeholder="Provide extra details to help our team"></textarea>
                </div>
                <button className="btn btn--primary">Submit request</button>
              </form>
            </div>
            <div className="card card--soft">
              <h3 className="card__title">Return policy highlights</h3>
              <ul className="card__list">
                <li>🕒 Return window: 7 days for non-prescription items.</li>
                <li>💊 Prescriptions are eligible only for quality issues.</li>
                <li>📦 Keep original packaging for a faster review.</li>
                <li>✅ Refunds sent to original payment method.</li>
              </ul>
              <div style={{ marginTop: '1.5rem' }}>
                <span className="badge badge--info">Need help?</span>
                <p className="card__meta" style={{ marginTop: '0.5rem' }}>
                  Email support@avapharmacy.co.ke or call +254 700 000 000.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ReturnsPage
