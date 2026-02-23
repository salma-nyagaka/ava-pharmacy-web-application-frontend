import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import { getHealthConcernBySlug, healthConcerns, matchesHealthConcern } from '../../data/healthConcerns'
import { loadCatalogProducts } from '../../data/products'
import '../ProductListing/ProductListingPage.css'

function ConditionsPage() {
  const { condition } = useParams()
  const products = loadCatalogProducts()
  const selectedConcern = getHealthConcernBySlug(condition)
  const [searchTerm, setSearchTerm] = useState('')
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(10000)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [minRating, setMinRating] = useState(0)
  const [availability, setAvailability] = useState<'all' | 'in_stock' | 'out_of_stock'>('all')
  const [sortBy, setSortBy] = useState('recommended')

  const concernProducts = useMemo(
    () => (selectedConcern ? products.filter((product) => matchesHealthConcern(product, selectedConcern)) : []),
    [products, selectedConcern]
  )

  const brands = Array.from(new Set(concernProducts.map((product) => product.brand))).sort((a, b) => a.localeCompare(b))

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return concernProducts.filter((product) => {
      const queryMatches =
        !query ||
        [product.name, product.brand, product.category].some((value) => value.toLowerCase().includes(query))
      const priceMatches = product.price >= minPrice && product.price <= maxPrice
      const brandMatches = selectedBrands.length === 0 || selectedBrands.includes(product.brand)
      const ratingMatches = minRating === 0 || product.rating >= minRating
      const availabilityMatches =
        availability === 'all' ||
        (availability === 'in_stock' && product.stockSource !== 'out') ||
        (availability === 'out_of_stock' && product.stockSource === 'out')

      return queryMatches && priceMatches && brandMatches && ratingMatches && availabilityMatches
    })
  }, [concernProducts, searchTerm, minPrice, maxPrice, selectedBrands, minRating, availability])

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts]
    if (sortBy === 'price-low') list.sort((a, b) => a.price - b.price)
    if (sortBy === 'price-high') list.sort((a, b) => b.price - a.price)
    if (sortBy === 'rating') {
      list.sort((a, b) => {
        const ratingDiff = b.rating - a.rating
        if (ratingDiff !== 0) return ratingDiff
        const reviewsDiff = b.reviews - a.reviews
        if (reviewsDiff !== 0) return reviewsDiff
        return a.name.localeCompare(b.name)
      })
    }
    if (sortBy === 'newest') list.sort((a, b) => b.id - a.id)
    return list
  }, [filteredProducts, sortBy])

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) => (prev.includes(brand) ? prev.filter((item) => item !== brand) : [...prev, brand]))
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setMinPrice(0)
    setMaxPrice(10000)
    setSelectedBrands([])
    setMinRating(0)
    setAvailability('all')
    setSortBy('recommended')
  }

  const formatPrice = (value: number) => `KSh ${value.toLocaleString()}`

  const renderStars = (rating: number) => {
    const fullStars = Math.min(5, Math.max(0, Math.round(rating)))
    const stars = []
    for (let i = 0; i < fullStars; i += 1) {
      stars.push(
        <svg key={`full-${i}`} className="star star--filled" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )
    }
    const emptyStars = 5 - fullStars
    for (let i = 0; i < emptyStars; i += 1) {
      stars.push(
        <svg key={`empty-${i}`} className="star" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )
    }
    return stars
  }

  return (
    <div>
      <PageHeader
        title={selectedConcern ? selectedConcern.name : 'Shop by Health Concern'}
        subtitle={
          selectedConcern
            ? `${concernProducts.length} product${concernProducts.length === 1 ? '' : 's'} matched for this health concern.`
            : 'Find products curated for specific health and wellness needs.'
        }
        badge="Health Concern"
      />
      <section className="page">
        <div className="container">
          {!selectedConcern && (
            <div className="page-grid page-grid--3">
              {healthConcerns.map((concern) => (
                <div key={concern.slug} className="card">
                  <h3 className="card__title">{concern.name}</h3>
                  <p className="card__meta">Recommended products and care tips.</p>
                  <Link className="btn btn--outline btn--sm" to={concern.path} style={{ marginTop: '0.75rem' }}>
                    View products
                  </Link>
                </div>
              ))}
            </div>
          )}

          {selectedConcern && (
            <div className="plp">
              <nav className="breadcrumbs">
                <Link to="/">Home</Link>
                <span>/</span>
                <Link to="/conditions">Shop by Health Concern</Link>
                <span>/</span>
                <span>{selectedConcern.name}</span>
              </nav>
              <div className="plp__layout">
                <aside className="plp__sidebar">
                  <div className="filter-section">
                    <h3 className="filter-section__title">Filters</h3>
                    <button className="btn btn--sm btn--outline" type="button" onClick={clearAllFilters}>
                      Clear All
                    </button>
                  </div>

                  <div className="filter-section">
                    <h4 className="filter-section__heading">Price Range</h4>
                    <div className="price-inputs">
                      <input
                        type="number"
                        placeholder="Min"
                        className="price-input"
                        value={minPrice}
                        onChange={(event) => setMinPrice(Number(event.target.value) || 0)}
                      />
                      <span>-</span>
                      <input
                        type="number"
                        placeholder="Max"
                        className="price-input"
                        value={maxPrice}
                        onChange={(event) => setMaxPrice(Number(event.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="filter-section">
                    <h4 className="filter-section__heading">Brands</h4>
                    <div className="filter-options">
                      {brands.map((brand) => (
                        <label key={brand} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand)}
                            onChange={() => toggleBrand(brand)}
                          />
                          <span>{brand}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="filter-section">
                    <h4 className="filter-section__heading">Customer Rating</h4>
                    <div className="filter-options">
                      {[4, 3, 2, 1].map((rating) => (
                        <label key={rating} className="checkbox-label">
                          <input
                            type="radio"
                            name="concern-rating-filter"
                            checked={minRating === rating}
                            onChange={() => setMinRating(rating)}
                          />
                          <div className="rating-filter">
                            {Array(rating).fill(0).map((_, index) => (
                              <svg key={`${rating}-${index}`} className="star star--filled" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                            ))}
                            <span>&amp; Up</span>
                          </div>
                        </label>
                      ))}
                      <label className="checkbox-label">
                        <input
                          type="radio"
                          name="concern-rating-filter"
                          checked={minRating === 0}
                          onChange={() => setMinRating(0)}
                        />
                        <span>All ratings</span>
                      </label>
                    </div>
                  </div>

                  <div className="filter-section">
                    <h4 className="filter-section__heading">Availability</h4>
                    <div className="filter-options">
                      <label className="checkbox-label">
                        <input
                          type="radio"
                          name="concern-availability-filter"
                          checked={availability === 'in_stock'}
                          onChange={() => setAvailability('in_stock')}
                        />
                        <span>In Stock</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="radio"
                          name="concern-availability-filter"
                          checked={availability === 'out_of_stock'}
                          onChange={() => setAvailability('out_of_stock')}
                        />
                        <span>Out of Stock</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="radio"
                          name="concern-availability-filter"
                          checked={availability === 'all'}
                          onChange={() => setAvailability('all')}
                        />
                        <span>All</span>
                      </label>
                    </div>
                  </div>
                </aside>

                <main className="plp__main">
                  <div className="plp__toolbar">
                    <p className="plp__results-count">{sortedProducts.length} Products</p>
                    <div className="plp__sort">
                      <input
                        type="text"
                        className="sort-select plp__search-input"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                      />
                      <label htmlFor="concern-sort-select">Sort by:</label>
                      <select
                        id="concern-sort-select"
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value)}
                        className="sort-select plp__sort-select"
                      >
                        <option value="recommended">Recommended</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="rating">Customer Rating</option>
                        <option value="newest">Newest First</option>
                      </select>
                    </div>
                  </div>

                  <div className="products-grid">
                    {sortedProducts.map((product) => (
                      <article key={product.id} className="product-card">
                        <Link to={`/product/${product.id}`} className="product-card__image">
                          {product.badge && (
                            <span className={`product-card__badge ${product.badge.includes('Off') ? 'product-card__badge--sale' : ''}`}>
                              {product.badge}
                            </span>
                          )}
                          {product.stockSource === 'out' && (
                            <div className="product-card__overlay">Out of Stock</div>
                          )}
                          <ImageWithFallback src={product.image} alt={product.name} />
                        </Link>
                        <div className="product-card__content">
                          <span className="product-card__brand">{product.brand}</span>
                          <h3 className="product-card__name">
                            <Link to={`/product/${product.id}`}>{product.name}</Link>
                          </h3>
                          <div className="product-card__rating">
                            <div className="product-card__stars">{renderStars(product.rating)}</div>
                            <span className="product-card__reviews">{product.rating.toFixed(1)} ({product.reviews})</span>
                          </div>
                          <div className="product-card__pricing">
                            <span className="product-card__price">{formatPrice(product.price)}</span>
                            {product.originalPrice && (
                              <span className="product-card__original-price">{formatPrice(product.originalPrice)}</span>
                            )}
                          </div>
                          <Link className="product-card__add-to-cart" to={`/product/${product.id}`}>
                            View Product
                          </Link>
                        </div>
                      </article>
                    ))}
                    {sortedProducts.length === 0 && (
                      <div className="empty-state">No products match your current filters.</div>
                    )}
                  </div>
                </main>
              </div>
            </div>
          )}
          {!selectedConcern && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <p className="card__meta">Pick a health concern to view filtered products with full pricing and filter controls.</p>
            </div>
          )}
          {selectedConcern && concernProducts.length === 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div className="card">
                <h3 className="card__title">No matching products yet</h3>
                <p className="card__meta">No products are currently mapped to this concern in demo data.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default ConditionsPage
