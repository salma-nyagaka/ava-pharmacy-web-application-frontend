import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import { cartService } from '../../services/cartService'
import { loadCatalogProducts } from '../../data/products'
import { categoryData } from '../../data/categories'
import '../../styles/pages/Brands/BrandsPage.css'
import '../../styles/pages/ProductListing/ProductListingPage.css'

const getStockLabel = (s: string) =>
  s === 'branch' ? 'In stock at selected branch' : s === 'warehouse' ? 'Available in central warehouse (2-3 days)' : 'Out of stock'

const formatPrice = (value: number) => `KSh ${value.toLocaleString()}`

const renderStars = (rating: number) => {
  const full = Math.min(5, Math.max(0, Math.round(rating)))
  return Array.from({ length: 5 }, (_, i) =>
    i < full
      ? <svg key={i} className="star star--filled" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      : <svg key={i} className="star" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
  )
}

const CARD_COLORS = ['blue','green','purple','amber','rose','cyan','indigo','teal','orange','pink'] as const
const getColor = (name: string) => CARD_COLORS[name.charCodeAt(0) % CARD_COLORS.length]

function BrandsPage() {
  const { brand } = useParams()
  const products = loadCatalogProducts()

  const slugify  = (v: string) => v.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
  const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '')
  const formatLabel = (v: string) => v.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')

  const brandDirectory = useMemo(() =>
    Array.from(new Set(products.map((p) => p.brand)))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        name,
        slug: slugify(name),
        count: products.filter((p) => normalize(p.brand) === normalize(name)).length,
      })),
    [products]
  )

  const [brandSearch, setBrandSearch]       = useState('')
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('all')
  const [addedId, setAddedId]               = useState<number | null>(null)
  const [searchTerm, setSearchTerm]         = useState('')
  const [minPrice, setMinPrice]             = useState(0)
  const [maxPrice, setMaxPrice]             = useState(10000)
  const [minRating, setMinRating]           = useState(0)
  const [availability, setAvailability]     = useState<'all' | 'in_stock' | 'out_of_stock'>('all')
  const [sortBy, setSortBy]                 = useState('recommended')
  const [viewMode, setViewMode]             = useState<'grid' | 'list'>('grid')

  const selectedBrandEntry   = brandDirectory.find((e) => e.slug === brand)
  const selectedBrandLabel   = selectedBrandEntry?.name ?? (brand ? formatLabel(brand) : '')
  const selectedBrandProducts = brand
    ? products.filter((p) => normalize(p.brand) === normalize(selectedBrandLabel))
    : []

  const brandCategories = useMemo(() =>
    categoryData
      .filter((cat) => selectedBrandProducts.some((p) => p.categorySlug === cat.slug))
      .map((cat) => ({
        slug: cat.slug,
        name: cat.name,
        count: selectedBrandProducts.filter((p) => p.categorySlug === cat.slug).length,
      })),
    [selectedBrandProducts]
  )

  const filteredBrandProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    let list = selectedBrandProducts.filter((p) => {
      const catMatch = selectedCategorySlug === 'all' || p.categorySlug === selectedCategorySlug
      const queryMatch = !query || [p.name, p.category].some((v) => v.toLowerCase().includes(query))
      const priceMatch = p.price >= minPrice && p.price <= maxPrice
      const ratingMatch = minRating === 0 || p.rating >= minRating
      const availMatch = availability === 'all' || (availability === 'in_stock' && p.stockSource !== 'out') || (availability === 'out_of_stock' && p.stockSource === 'out')
      return catMatch && queryMatch && priceMatch && ratingMatch && availMatch
    })
    if (sortBy === 'price-low')  list = [...list].sort((a, b) => a.price - b.price)
    if (sortBy === 'price-high') list = [...list].sort((a, b) => b.price - a.price)
    if (sortBy === 'rating')     list = [...list].sort((a, b) => b.rating - a.rating)
    if (sortBy === 'newest')     list = [...list].sort((a, b) => b.id - a.id)
    return list
  }, [selectedBrandProducts, selectedCategorySlug, searchTerm, minPrice, maxPrice, minRating, availability, sortBy])

  const activeFilterCount = (searchTerm ? 1 : 0) + (minRating > 0 ? 1 : 0) + (availability !== 'all' ? 1 : 0) + (minPrice > 0 || maxPrice < 10000 ? 1 : 0)

  const clearBrandFilters = () => { setSearchTerm(''); setMinPrice(0); setMaxPrice(10000); setMinRating(0); setAvailability('all') }

  useEffect(() => {
    setSelectedCategorySlug('all')
    setSearchTerm(''); setMinPrice(0); setMaxPrice(10000); setMinRating(0); setAvailability('all')
  }, [brand])

  const handleAddToCart = (product: typeof products[0]) => {
    if (product.stockSource === 'out') return
    void cartService.add({ id: product.id, name: product.name, brand: product.brand, price: product.price, image: product.image, stockSource: product.stockSource })
    setAddedId(product.id)
    window.setTimeout(() => setAddedId((prev) => prev === product.id ? null : prev), 1200)
  }

  /* ── Landing ─────────────────────────────────── */
  if (!brand) {
    const filtered = brandSearch.trim()
      ? brandDirectory.filter((e) => e.name.toLowerCase().includes(brandSearch.trim().toLowerCase()))
      : brandDirectory

    const grouped = filtered.reduce((acc, entry) => {
      const letter = entry.name[0].toUpperCase()
      if (!acc[letter]) acc[letter] = []
      acc[letter].push(entry)
      return acc
    }, {} as Record<string, typeof filtered>)

    const letters = Object.keys(grouped).sort()

    return (
      <div className="brand-page">
        <div className="brand-hero">
          <div className="container">
            <p className="brand-hero__eyebrow">Our Partners</p>
            <h1 className="brand-hero__title">Shop by Brand</h1>
            <p className="brand-hero__sub">{brandDirectory.length} trusted pharmacy and beauty brands.</p>
            <div className="brand-search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                type="text"
                className="brand-search"
                placeholder="Search brands…"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
              />
              {brandSearch && (
                <button className="brand-search__clear" type="button" onClick={() => setBrandSearch('')}>×</button>
              )}
            </div>
          </div>
        </div>

        <div className="container brand-dir">
          {letters.length === 0 ? (
            <div className="brand-empty">No brands match &ldquo;{brandSearch}&rdquo;</div>
          ) : (
            letters.map((letter) => (
              <div key={letter} className="brand-alpha-group">
                <div className="brand-alpha-letter">{letter}</div>
                <div className="brand-alpha-cards">
                  {grouped[letter].map((entry) => {
                    const color = getColor(entry.name)
                    return (
                      <Link key={entry.slug} to={`/brands/${entry.slug}`} className={`brand-dir-card brand-dir-card--${color}`}>
                        <span className="brand-dir-card__initial">{entry.name[0].toUpperCase()}</span>
                        <span className="brand-dir-card__name">{entry.name}</span>
                        <span className="brand-dir-card__count">{entry.count} products</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  /* ── Detail ─────────────────────────────────── */
  return (
    <div className="brand-page brand-page--detail plp">
      <div className="container">
        <nav className="breadcrumbs">
          <Link to="/">Home</Link><span>/</span>
          <Link to="/brands">Brands</Link><span>/</span>
          <span>{selectedBrandLabel}</span>
        </nav>

        <div className="brand-detail-header">
          <div className={`brand-detail-logo brand-detail-logo--${getColor(selectedBrandLabel)}`}>
            {selectedBrandLabel[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="brand-detail-title">{selectedBrandLabel}</h1>
            <p className="brand-detail-sub">{selectedBrandProducts.length} product{selectedBrandProducts.length !== 1 ? 's' : ''} available</p>
          </div>
          <Link to="/brands" className="brand-detail-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            All Brands
          </Link>
        </div>

        {/* Category pill tabs */}
        {brandCategories.length > 1 && (
          <div className="plp__subcategories" style={{ marginBottom: '1rem' }}>
            <button type="button" className={`plp__subcategory${selectedCategorySlug === 'all' ? ' is-active' : ''}`} onClick={() => setSelectedCategorySlug('all')}>
              All {selectedBrandLabel} ({selectedBrandProducts.length})
            </button>
            {brandCategories.map((cat) => (
              <button key={cat.slug} type="button" className={`plp__subcategory${selectedCategorySlug === cat.slug ? ' is-active' : ''}`} onClick={() => setSelectedCategorySlug(cat.slug)}>
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        )}

        <div className="plp__layout">
          {/* Sidebar */}
          <aside className="plp__sidebar">
            <div className="filter-panel">
              <div className="filter-panel__header">
                <span className="filter-panel__title">
                  Filters
                  {activeFilterCount > 0 && <span className="filter-panel__count">{activeFilterCount}</span>}
                </span>
                {activeFilterCount > 0 && (
                  <button className="filter-panel__clear" type="button" onClick={clearBrandFilters}>Clear all</button>
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
                <h4 className="filter-panel__heading">Customer Rating</h4>
                <div className="filter-options">
                  {[4, 3, 2, 1].map((r) => (
                    <label key={r} className="checkbox-label">
                      <input type="radio" name="brand-rating" checked={minRating === r} onChange={() => setMinRating(r)} />
                      <div className="rating-filter">
                        {Array(r).fill(0).map((_, i) => <svg key={i} className="star star--filled" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}
                        <span>& Up</span>
                      </div>
                    </label>
                  ))}
                  <label className="checkbox-label">
                    <input type="radio" name="brand-rating" checked={minRating === 0} onChange={() => setMinRating(0)} />
                    <span>All ratings</span>
                  </label>
                </div>
              </div>
              <div className="filter-panel__section filter-panel__section--last">
                <h4 className="filter-panel__heading">Availability</h4>
                <div className="filter-options">
                  {(['all', 'in_stock', 'out_of_stock'] as const).map((v) => (
                    <label key={v} className="checkbox-label">
                      <input type="radio" name="brand-avail" checked={availability === v} onChange={() => setAvailability(v)} />
                      <span>{v === 'all' ? 'All' : v === 'in_stock' ? 'In Stock' : 'Out of Stock'}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="plp__main">
            <div className="plp__toolbar">
              <p className="plp__results-count">
                {filteredBrandProducts.length === 0 ? 'No products found' : `Showing ${filteredBrandProducts.length} product${filteredBrandProducts.length !== 1 ? 's' : ''}`}
              </p>
              <div className="plp__toolbar-right">
                <div className="plp__search-wrap">
                  <svg className="plp__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input type="text" className="plp__search-input" placeholder={`Search ${selectedBrandLabel}…`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  {searchTerm && <button className="plp__search-clear" type="button" onClick={() => setSearchTerm('')}>×</button>}
                </div>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="plp__sort-select">
                  <option value="recommended">Recommended</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Customer Rating</option>
                  <option value="newest">Newest First</option>
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
              {filteredBrandProducts.map((product) => (
                <article key={product.id} className={`product-card ${viewMode === 'list' ? 'product-card--list' : ''}`}>
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
                    <p className={`product-stock-source product-stock-source--${product.stockSource}`}>{getStockLabel(product.stockSource)}</p>
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
              {filteredBrandProducts.length === 0 && (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="44" height="44"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <p className="empty-state__message">No products match your filters</p>
                  {activeFilterCount > 0 && <button className="btn btn--outline btn--sm" type="button" onClick={clearBrandFilters}>Clear filters</button>}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default BrandsPage
