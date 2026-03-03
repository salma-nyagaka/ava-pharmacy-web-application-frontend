import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import { cartService } from '../../services/cartService'
import { loadCatalogProducts } from '../../data/products'
import { categoryData } from '../../data/categories'
import './BrandsPage.css'
import '../ProductListing/ProductListingPage.css'

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

  const filteredBrandProducts =
    selectedCategorySlug === 'all'
      ? selectedBrandProducts
      : selectedBrandProducts.filter((p) => p.categorySlug === selectedCategorySlug)

  useEffect(() => { setSelectedCategorySlug('all') }, [brand])

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

        {selectedBrandProducts.length > 0 ? (
          <>
            {/* Category pill tabs */}
            {brandCategories.length > 1 && (
              <div className="brand-cat-tabs">
                <button
                  type="button"
                  className={`brand-cat-tab${selectedCategorySlug === 'all' ? ' is-active' : ''}`}
                  onClick={() => setSelectedCategorySlug('all')}
                >
                  All <span>{selectedBrandProducts.length}</span>
                </button>
                {brandCategories.map((cat) => (
                  <button
                    key={cat.slug}
                    type="button"
                    className={`brand-cat-tab${selectedCategorySlug === cat.slug ? ' is-active' : ''}`}
                    onClick={() => setSelectedCategorySlug(cat.slug)}
                  >
                    {cat.name} <span>{cat.count}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="products-grid">
              {filteredBrandProducts.map((product) => (
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
            </div>
          </>
        ) : (
          <div className="empty-state" style={{ marginTop: '2rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="44" height="44"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <p className="empty-state__title">No products found for {selectedBrandLabel}</p>
            <p className="empty-state__sub">Try browsing all brands or searching for a product.</p>
            <Link to="/brands" className="btn btn--sm btn--primary" style={{ marginTop: '0.5rem' }}>Back to Brands</Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default BrandsPage
