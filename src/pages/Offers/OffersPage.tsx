import PageHeader from '../../components/PageHeader/PageHeader'
import './OffersPage.css'

function OffersPage() {
  const offers = [
    { title: '18% Off Blood Pressure Monitors', desc: 'Valid until Jan 31', code: 'HEALTH18' },
    { title: 'Buy 2 Get 1 Free Vitamins', desc: 'Applies to selected brands', code: 'VITA3' },
    { title: 'Free Delivery Over KSh 3,000', desc: 'Nationwide shipping', code: 'FREEDEL' },
  ]

  return (
    <div>
      <PageHeader
        title="Latest offers"
        subtitle="Save on essentials, prescription accessories, and wellness bundles."
        badge="Promotions"
      />
      <section className="page">
        <div className="container">
          <div className="page-grid page-grid--3">
            {offers.map((offer) => (
              <div key={offer.title} className="card offer-card">
                <div className="offer-card__banner">
                  <h3>{offer.title}</h3>
                  <p className="card__meta">{offer.desc}</p>
                </div>
                <div>
                  <span className="badge badge--info">Promo code</span>
                  <p className="card__title" style={{ marginTop: '0.5rem' }}>{offer.code}</p>
                </div>
                <button className="btn btn--primary btn--sm">Apply offer</button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default OffersPage
