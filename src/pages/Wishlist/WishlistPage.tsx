import PageHeader from '../../components/PageHeader/PageHeader'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import { productOmega3, productBpMonitor, productBabyDiapers } from '../../assets/images/remote'
import './WishlistPage.css'

function WishlistPage() {
  const items = [
    {
      id: 1,
      name: 'Omega-3 Fish Oil Capsules',
      price: 'KSh 2,100',
      image: productOmega3,
    },
    {
      id: 2,
      name: 'Digital Blood Pressure Monitor',
      price: 'KSh 4,500',
      image: productBpMonitor,
    },
    {
      id: 3,
      name: 'Baby Diapers Pack',
      price: 'KSh 1,800',
      image: productBabyDiapers,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Your wishlist"
        subtitle="Save products and get notified when prices drop or items are back in stock."
        badge="Saved Items"
      />
      <section className="page">
        <div className="container">
          <div className="page-grid page-grid--3">
            {items.map((item) => (
              <div key={item.id} className="card wishlist-item">
                <ImageWithFallback src={item.image} alt={item.name} />
                <div>
                  <h3 className="card__title">{item.name}</h3>
                  <div className="wishlist-item__meta">
                    <span className="wishlist-item__price">{item.price}</span>
                    <span className="badge badge--info">In stock</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button className="btn btn--primary btn--sm">Add to cart</button>
                  <button className="btn btn--outline btn--sm">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default WishlistPage
