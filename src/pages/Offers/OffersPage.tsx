import { Link } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import PageHeader from '../../components/PageHeader/PageHeader'
import { loadCatalogProducts } from '../../data/products'
import { applyPromotionsToProduct, loadPromotions } from '../../data/promotions'
import './OffersPage.css'

function OffersPage() {
  const promotions = loadPromotions()
  const deals = loadCatalogProducts()
    .map((product) => applyPromotionsToProduct(product, promotions))
    .filter((product) => product.stockSource !== 'out' && (product.originalPrice ?? product.price) > product.price)
    .sort((a, b) => {
      const aSaving = (a.originalPrice ?? a.price) - a.price
      const bSaving = (b.originalPrice ?? b.price) - b.price
      return bSaving - aSaving
    })

  const formatPrice = (price: number) => `KSh ${price.toLocaleString()}`

  return (
    <div>
      <PageHeader
        title="Latest offers"
        subtitle="Save on essentials, wellness products, and daily healthcare items."
        badge="Promotions"
      />
      <section className="page offers-page">
        <div className="container">
          {deals.length === 0 && (
            <div className="card offer-empty">
              <h3>No active offers right now</h3>
              <p className="card__meta">Check back soon or browse all products.</p>
              <Link to="/products" className="btn btn--primary btn--sm">Shop products</Link>
            </div>
          )}

          {deals.length > 0 && (
            <div className="offers-products-grid">
              {deals.map((offer) => (
                <article key={offer.id} className="offer-product-card">
                  <div className="offer-product-card__image">
                    <ImageWithFallback src={offer.image} alt={offer.name} />
                    {offer.badge && <span className="offer-product-card__badge">{offer.badge}</span>}
                  </div>
                  <div className="offer-product-card__content">
                    <p className="offer-product-card__brand">{offer.brand}</p>
                    <h3>
                      <Link to={`/product/${offer.id}`}>{offer.name}</Link>
                    </h3>
                    <div className="offer-product-card__price">
                      <strong>{formatPrice(offer.price)}</strong>
                      {offer.originalPrice && <span>{formatPrice(offer.originalPrice)}</span>}
                    </div>
                    <p className="offer-product-card__saving">
                      Save {formatPrice((offer.originalPrice ?? offer.price) - offer.price)}
                    </p>
                    <div className="offer-product-card__actions">
                      <Link to={`/product/${offer.id}`} className="btn btn--primary btn--sm">View deal</Link>
                      <Link to={`/category/${offer.categorySlug}`} className="btn btn--outline btn--sm">More in category</Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default OffersPage
