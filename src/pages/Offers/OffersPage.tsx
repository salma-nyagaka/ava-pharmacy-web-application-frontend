import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import { cartService } from '../../services/cartService'
import { useProducts } from '../../hooks/useProducts'
import './OffersPage.css'
import '../ProductListing/ProductListingPage.css'

const formatPrice = (price: number) => `KSh ${price.toLocaleString()}`

const renderStars = (rating: number) => {
  const full = Math.min(5, Math.max(0, Math.round(rating)))
  return Array.from({ length: 5 }, (_, i) =>
    i < full
      ? <svg key={i} className="star star--filled" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      : <svg key={i} className="star" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
  )
}

function OffersPage() {
  const { products } = useProducts({ page_size: 200 })
  const allDeals = useMemo(
    () => products.filter((product) => product.stockSource !== 'out' && (product.originalPrice ?? product.price) > product.price),
    [products],
  )

  const [searchTerm, setSearchTerm] = useState('')
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(10000)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('savings')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [addedId, setAddedId] = useState<number | null>(null)

  const brands = useMemo(
    () => Array.from(new Set(allDeals.map((product) => product.brand))).sort((a, b) => a.localeCompare(b)),
    [allDeals],
  )

  const filteredDeals = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    let list = allDeals.filter((product) => {
      const queryMatch = !query || [product.name, product.brand, product.category].some((value) => value.toLowerCase().includes(query))
      const priceMatch = product.price >= minPrice && product.price <= maxPrice
      const brandMatch = selectedBrands.length === 0 || selectedBrands.includes(product.brand)
      return queryMatch && priceMatch && brandMatch
    })
    if (sortBy === 'savings') list = [...list].sort((a, b) => ((b.originalPrice ?? b.price) - b.price) - ((a.originalPrice ?? a.price) - a.price))
    if (sortBy === 'price-low') list = [...list].sort((a, b) => a.price - b.price)
    if (sortBy === 'price-high') list = [...list].sort((a, b) => b.price - a.price)
    return list
  }, [allDeals, searchTerm, minPrice, maxPrice, selectedBrands, sortBy])

  const activeFilterCount = selectedBrands.length + (minPrice > 0 || maxPrice < 10000 ? 1 : 0)

  const clearAllFilters = () => {
    setSearchTerm('')
    setMinPrice(0)
    setMaxPrice(10000)
    setSelectedBrands([])
  }

  const toggleBrand = (brand: string) =>
    setSelectedBrands((prev) => prev.includes(brand) ? prev.filter((item) => item !== brand) : [...prev, brand])

  const handleAddToCart = (deal: typeof allDeals[number]) => {
    void cartService.add({
      id: deal.id,
      name: deal.name,
      brand: deal.brand,
      price: deal.price,
      image: deal.image,
      stockSource: deal.stockSource === 'out' ? undefined : deal.stockSource,
    })
    setAddedId(deal.id)
    window.setTimeout(() => setAddedId((prev) => prev === deal.id ? null : prev), 1200)
  }

  return (
    <div className="cond-page">
      <div className="offers-hero">
        <div className="container">
          <p className="offers-hero__eyebrow">Promotions</p>
          <h1 className="offers-hero__title">Latest Offers</h1>
          <p className="offers-hero__sub">Save on products created in admin with discounts or active promotions. {allDeals.length} active deals.</p>
        </div>
      </div>

      <div className="container">
        <div className="plp__layout">
          <aside className="plp__sidebar">
            <div className="filter-panel">
              <div className="filter-panel__header">
                <span className="filter-panel__title">
                  Filters
                  {activeFilterCount > 0 && <span className="filter-panel__count">{activeFilterCount}</span>}
                </span>
                {activeFilterCount > 0 && (
                  <button className="filter-panel__clear" type="button" onClick={clearAllFilters}>Clear all</button>
                )}
              </div>

              <div className="filter-panel__section">
                <h4 className="filter-panel__heading">Price Range</h4>
                <div className="price-inputs">
                  <input type="number" placeholder="Min" className="price-input" value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value) || 0)} />
                  <span className="price-sep">–</span>
                  <input type="number" placeholder="Max" className="price-input" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value) || 0)} />
                </div>
              </div>

              <div className="filter-panel__section filter-panel__section--last">
                <h4 className="filter-panel__heading">Brands</h4>
                <div className="filter-options">
                  {brands.map((brand) => (
                    <label key={brand} className="checkbox-label">
                      <input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => toggleBrand(brand)} />
                      <span>{brand}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <main className="plp__main">
            <div className="plp__toolbar">
              <p className="plp__results-count">
                {filteredDeals.length === 0 ? 'No offers found' : `Showing ${filteredDeals.length} offer${filteredDeals.length !== 1 ? 's' : ''}`}
              </p>
              <div className="plp__toolbar-right">
                <div className="plp__search-wrap">
                  <svg className="plp__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    className="plp__search-input"
                    placeholder="Search offers…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button className="plp__search-clear" type="button" onClick={() => setSearchTerm('')}>×</button>
                  )}
                </div>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="plp__sort-select">
                  <option value="savings">Most savings</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
                <div className="plp__view-toggle">
                  <button className={`plp__view-btn ${viewMode === 'grid' ? 'is-active' : ''}`} type="button" onClick={() => setViewMode('grid')} title="Grid view">
                    <svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
                  </button>
                  <button className={`plp__view-btn ${viewMode === 'list' ? 'is-active' : ''}`} type="button" onClick={() => setViewMode('list')} title="List view">
                    <svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="2" rx="1"/><rect x="1" y="7" width="14" height="2" rx="1"/><rect x="1" y="12" width="14" height="2" rx="1"/></svg>
                  </button>
                </div>
              </div>
            </div>

            <div className={`products-grid ${viewMode === 'list' ? 'products-grid--list' : ''}`}>
              {filteredDeals.map((deal) => (
                <article key={deal.id} className={`product-card ${viewMode === 'list' ? 'product-card--list' : ''}`}>
                  <Link to={`/product/${deal.id}`} className="product-card__image">
                    {deal.badge && (
                      <span className={`product-card__badge ${deal.badge.includes('Off') ? 'product-card__badge--sale' : ''}`}>{deal.badge}</span>
                    )}
                    <span className="product-card__badge product-card__badge--sale offers-saving-badge">
                      Save {formatPrice((deal.originalPrice ?? deal.price) - deal.price)}
                    </span>
                    <ImageWithFallback src={deal.image} alt={deal.name} />
                  </Link>
                  <div className="product-card__content">
                    <span className="product-card__brand">{deal.brand}</span>
                    <h3 className="product-card__name">
                      <Link to={`/product/${deal.id}`}>{deal.name}</Link>
                    </h3>
                    <div className="product-card__rating">
                      <div className="product-card__stars">{renderStars(deal.rating)}</div>
                      <span className="product-card__reviews">{deal.rating.toFixed(1)} ({deal.reviews})</span>
                    </div>
                    <div className="product-card__pricing">
                      <span className="product-card__price">{formatPrice(deal.price)}</span>
                      {deal.originalPrice && (
                        <span className="product-card__original-price">{formatPrice(deal.originalPrice)}</span>
                      )}
                    </div>
                    <button
                      className={`product-card__add-to-cart ${addedId === deal.id ? 'product-card__add-to-cart--added' : ''}`}
                      type="button"
                      onClick={() => handleAddToCart(deal)}
                    >
                      {addedId === deal.id ? (
                        <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Added</>
                      ) : (
                        <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>Add to Cart</>
                      )}
                    </button>
                  </div>
                </article>
              ))}

              {filteredDeals.length === 0 && (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <p className="empty-state__message">No offers match your filters</p>
                  {activeFilterCount > 0 && (
                    <button className="btn btn--outline btn--sm" type="button" onClick={clearAllFilters}>Clear filters</button>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default OffersPage
