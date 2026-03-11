import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import { cartService } from '../../services/cartService'
import { fetchHealthConcernsFromBackend, type HealthConcern, matchesHealthConcern } from '../../data/healthConcerns'
import { loadCatalogProducts } from '../../data/products'
import '../../styles/pages/Conditions/ConditionsPage.css'
import '../../styles/pages/ProductListing/ProductListingPage.css'

type ConditionMeta = { color: string; desc: string; icon: ReactNode }

const conditionMeta: Record<string, ConditionMeta> = {
  'aches-pains':      { color: 'amber',  desc: 'Headaches, muscle pain & joint relief',        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
  'acne':             { color: 'rose',   desc: 'Clear skin treatments & blemish control',       icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg> },
  'allergy-hayfever': { color: 'green',  desc: 'Antihistamines & seasonal allergy relief',      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg> },
  'anti-infectives':  { color: 'blue',   desc: 'Antibiotics & immune-supporting treatments',    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
  'bites-stings':     { color: 'orange', desc: 'Soothing creams for bites & stings',            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
  'cold-flu-cough':   { color: 'cyan',   desc: 'Cold, flu & cough remedies that work fast',    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg> },
  'dry-skin':         { color: 'sky',    desc: 'Intense moisturisers & hydrating formulas',     icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg> },
  'eczema':           { color: 'purple', desc: 'Gentle emollients for eczema-prone skin',       icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg> },
  'eye-ear-care':     { color: 'indigo', desc: 'Eye drops, ear care & specialist treatments',   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> },
  'first-aid':        { color: 'red',    desc: 'Bandages, antiseptics & wound care essentials', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
  'oral-care':        { color: 'teal',   desc: 'Toothpaste, mouthwash & dental essentials',     icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
  'skin-treatments':  { color: 'pink',   desc: 'Dermatologist-recommended skin treatments',     icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
}

const formatPrice = (value: number) => `KSh ${value.toLocaleString()}`

const renderStars = (rating: number) => {
  const full = Math.min(5, Math.max(0, Math.round(rating)))
  return Array.from({ length: 5 }, (_, i) =>
    i < full
      ? <svg key={i} className="star star--filled" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      : <svg key={i} className="star" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
  )
}

function ConditionsPage() {
  const { condition } = useParams()
  const products = loadCatalogProducts()
  const [healthConcerns, setHealthConcerns] = useState<HealthConcern[]>([])
  const [concernsLoading, setConcernsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setConcernsLoading(true)
    fetchHealthConcernsFromBackend()
      .then((items) => {
        if (!cancelled) setHealthConcerns(items)
      })
      .finally(() => {
        if (!cancelled) setConcernsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedConcern = useMemo(
    () => healthConcerns.find((concernItem) => concernItem.slug === condition),
    [condition, healthConcerns],
  )

  const [searchTerm, setSearchTerm]     = useState('')
  const [minPrice, setMinPrice]         = useState(0)
  const [maxPrice, setMaxPrice]         = useState(10000)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [minRating, setMinRating]       = useState(0)
  const [availability, setAvailability] = useState<'all' | 'in_stock' | 'out_of_stock'>('all')
  const [sortBy, setSortBy]             = useState('recommended')
  const [addedId, setAddedId]           = useState<number | null>(null)

  const concernProducts = useMemo(
    () => selectedConcern ? products.filter((p) => matchesHealthConcern(p, selectedConcern)) : [],
    [products, selectedConcern]
  )

  const brands = useMemo(
    () => Array.from(new Set(concernProducts.map((p) => p.brand))).sort((a, b) => a.localeCompare(b)),
    [concernProducts]
  )

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return concernProducts.filter((p) => {
      const queryMatch = !query || [p.name, p.brand, p.category].some((v) => v.toLowerCase().includes(query))
      const priceMatch = p.price >= minPrice && p.price <= maxPrice
      const brandMatch = selectedBrands.length === 0 || selectedBrands.includes(p.brand)
      const ratingMatch = minRating === 0 || p.rating >= minRating
      const availMatch =
        availability === 'all' ||
        (availability === 'in_stock' && p.stockSource !== 'out') ||
        (availability === 'out_of_stock' && p.stockSource === 'out')
      return queryMatch && priceMatch && brandMatch && ratingMatch && availMatch
    })
  }, [concernProducts, searchTerm, minPrice, maxPrice, selectedBrands, minRating, availability])

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts]
    if (sortBy === 'price-low')  list.sort((a, b) => a.price - b.price)
    if (sortBy === 'price-high') list.sort((a, b) => b.price - a.price)
    if (sortBy === 'rating')     list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
    if (sortBy === 'newest')     list.sort((a, b) => b.id - a.id)
    return list
  }, [filteredProducts, sortBy])

  const activeFilterCount =
    (searchTerm ? 1 : 0) + selectedBrands.length + (minRating > 0 ? 1 : 0) +
    (availability !== 'all' ? 1 : 0) + (minPrice > 0 || maxPrice < 10000 ? 1 : 0)

  const clearAllFilters = () => {
    setSearchTerm(''); setMinPrice(0); setMaxPrice(10000)
    setSelectedBrands([]); setMinRating(0); setAvailability('all'); setSortBy('recommended')
  }

  const toggleBrand = (brand: string) =>
    setSelectedBrands((prev) => prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand])

  const handleAddToCart = (product: typeof products[0]) => {
    if (product.stockSource === 'out') return
    void cartService.add({ id: product.id, name: product.name, brand: product.brand, price: product.price, image: product.image, stockSource: product.stockSource })
    setAddedId(product.id)
    window.setTimeout(() => setAddedId((prev) => prev === product.id ? null : prev), 1200)
  }

  /* ── Landing ─────────────────────────────────── */
  if (!selectedConcern) {
    return (
      <div className="cond-page">
        <div className="cond-hero">
          <div className="container">
            <p className="cond-hero__eyebrow">Health & Wellness</p>
            <h1 className="cond-hero__title">Shop by Health Concern</h1>
            <p className="cond-hero__sub">Find products curated for your specific health and wellness needs.</p>
          </div>
        </div>
        <div className="container">
          <div className="cond-grid">
            {concernsLoading ? (
              <p style={{ color: '#6b7280' }}>Loading health concerns…</p>
            ) : healthConcerns.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No health concerns have been created yet.</p>
            ) : healthConcerns.map((concern) => {
              const meta = conditionMeta[concern.slug]
              const count = products.filter((p) => matchesHealthConcern(p, concern)).length
              return (
                <Link key={concern.slug} to={concern.path} className={`cond-card cond-card--${meta?.color ?? 'blue'}`}>
                  <span className="cond-card__icon">{meta?.icon}</span>
                  <div className="cond-card__body">
                    <strong className="cond-card__name">{concern.name}</strong>
                    <span className="cond-card__desc">{meta?.desc}</span>
                  </div>
                  <span className="cond-card__count">{count}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  /* ── Detail ─────────────────────────────────── */
  return (
    <div className="cond-page plp">
      <div className="container">
        <nav className="breadcrumbs">
          <Link to="/">Home</Link><span>/</span>
          <Link to="/conditions">Health Concerns</Link><span>/</span>
          <span>{selectedConcern.name}</span>
        </nav>

        <div className="plp__header">
          <div className="plp__header-top">
            <div>
              <h1 className="plp__title">{selectedConcern.name}</h1>
              <p className="plp__subtitle">{concernProducts.length} products matched for this health concern</p>
            </div>
          </div>
        </div>

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

              <div className="filter-panel__section">
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

              <div className="filter-panel__section">
                <h4 className="filter-panel__heading">Customer Rating</h4>
                <div className="filter-options">
                  {[4, 3, 2, 1].map((r) => (
                    <label key={r} className="checkbox-label">
                      <input type="radio" name="cond-rating" checked={minRating === r} onChange={() => setMinRating(r)} />
                      <div className="rating-filter">
                        {Array(r).fill(0).map((_, i) => <svg key={i} className="star star--filled" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}
                        <span>& Up</span>
                      </div>
                    </label>
                  ))}
                  <label className="checkbox-label">
                    <input type="radio" name="cond-rating" checked={minRating === 0} onChange={() => setMinRating(0)} />
                    <span>All ratings</span>
                  </label>
                </div>
              </div>

              <div className="filter-panel__section filter-panel__section--last">
                <h4 className="filter-panel__heading">Availability</h4>
                <div className="filter-options">
                  {([['all','All'],['in_stock','In Stock'],['out_of_stock','Out of Stock']] as const).map(([v, l]) => (
                    <label key={v} className="checkbox-label">
                      <input type="radio" name="cond-avail" checked={availability === v} onChange={() => setAvailability(v)} />
                      <span>{l}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <main className="plp__main">
            <div className="plp__toolbar">
              <p className="plp__results-count">
                <strong>{sortedProducts.length}</strong> product{sortedProducts.length !== 1 ? 's' : ''}
              </p>
              <div className="plp__toolbar-right">
                <div className="plp__search-wrap">
                  <svg className="plp__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input type="text" className="plp__search-input" placeholder="Search products…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  {searchTerm && <button className="plp__search-clear" type="button" onClick={() => setSearchTerm('')}>×</button>}
                </div>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="plp__sort-select">
                  <option value="recommended">Recommended</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>

            <div className="products-grid">
              {sortedProducts.map((product) => (
                <article key={product.id} className="product-card">
                  <Link to={`/product/${product.id}`} className="product-card__image">
                    {product.badge && <span className={`product-card__badge${product.badge.includes('Off') ? ' product-card__badge--sale' : ''}`}>{product.badge}</span>}
                    {product.stockSource === 'out' && <div className="product-card__overlay">Out of Stock</div>}
                    <ImageWithFallback src={product.image} alt={product.name} />
                  </Link>
                  <div className="product-card__content">
                    <span className="product-card__brand">{product.brand}</span>
                    <h3 className="product-card__name"><Link to={`/product/${product.id}`}>{product.name}</Link></h3>
                    <div className="product-card__rating">
                      <div className="product-card__stars">{renderStars(product.rating)}</div>
                      <span className="product-card__reviews">{product.rating.toFixed(1)} ({product.reviews})</span>
                    </div>
                    <div className="product-card__pricing">
                      <span className="product-card__price">{formatPrice(product.price)}</span>
                      {product.originalPrice && <span className="product-card__original-price">{formatPrice(product.originalPrice)}</span>}
                    </div>
                    {product.stockSource !== 'out' ? (
                      <button className={`product-card__add-to-cart${addedId === product.id ? ' product-card__add-to-cart--added' : ''}`} type="button" onClick={() => handleAddToCart(product)}>
                        {addedId === product.id ? (
                          <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Added</>
                        ) : (
                          <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>Add to Cart</>
                        )}
                      </button>
                    ) : (
                      <Link to={`/product/${product.id}`} className="product-card__add-to-cart product-card__add-to-cart--restock">View Product</Link>
                    )}
                  </div>
                </article>
              ))}
              {sortedProducts.length === 0 && (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="44" height="44"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <p className="empty-state__title">No products found</p>
                  <p className="empty-state__sub">Try adjusting your filters.</p>
                  {activeFilterCount > 0 && <button className="btn btn--sm btn--primary" type="button" onClick={clearAllFilters}>Clear filters</button>}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default ConditionsPage
