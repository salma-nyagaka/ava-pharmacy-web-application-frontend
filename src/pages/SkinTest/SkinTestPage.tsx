import PageHeader from '../../components/PageHeader/PageHeader'

function SkinTestPage() {
  return (
    <div>
      <PageHeader
        title="Skin test"
        subtitle="Get personalized skincare recommendations based on a quick assessment."
        badge="Skin Health"
      />
      <section className="page">
        <div className="container">
          <div className="split-layout">
            <div className="form-card">
              <h2 className="card__title">Start your skin test</h2>
              <p className="card__subtitle">Answer a few questions to match products to your skin type.</p>
              <form>
                <div className="form-group">
                  <label htmlFor="skin-type">Skin type</label>
                  <select id="skin-type" required>
                    <option value="">Select skin type</option>
                    <option>Normal</option>
                    <option>Dry</option>
                    <option>Oily</option>
                    <option>Combination</option>
                    <option>Sensitive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="skin-concern">Primary concern</label>
                  <select id="skin-concern" required>
                    <option value="">Select concern</option>
                    <option>Acne</option>
                    <option>Hyperpigmentation</option>
                    <option>Dryness</option>
                    <option>Aging</option>
                    <option>Redness</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="routine">Current routine</label>
                  <textarea id="routine" rows={4} placeholder="Describe your current products"></textarea>
                </div>
                <button className="btn btn--primary">Get recommendations</button>
              </form>
            </div>
            <div className="card card--soft">
              <h3 className="card__title">What you&apos;ll receive</h3>
              <ul className="card__list">
                <li>🧴 Recommended products and routines.</li>
                <li>🧪 Ingredient matches based on skin concerns.</li>
                <li>👩‍⚕️ Optional advisor follow-up.</li>
              </ul>
              <p className="card__meta" style={{ marginTop: '1rem' }}>
                Results are sent to your account and email.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default SkinTestPage
