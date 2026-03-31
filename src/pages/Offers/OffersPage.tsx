import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import { cartService } from '../../services/cartService'
import { useInventoryItems } from '../../hooks/useInventoryItems'
import { usePromotions } from '../../hooks/usePromotions'
import { buildPromotionSummary, filterProductsByPromotion } from '../../services/promotionService'
import '../../styles/pages/OffersPage.css'
import '../../styles/pages/ProductListingPage.css'
import { useAuth } from '../../context/AuthContext'
import type { CatalogProduct } from '../../data/products'

const formatPrice = (price: number) => `KSh ${price.toLocaleString()}`
const hasDeal = (price: number, originalPrice: number | null) => (originalPrice ?? price) > price
const getSavings = (price: number, originalPrice: number | null) => (originalPrice ?? price) - price
const getDiscountPercent = (price: number, originalPrice: number | null) => {
  const baselinePrice = originalPrice ?? price
  if (baselinePrice <= 0 || baselinePrice <= price) return 0
  return ((baselinePrice - price) / baselinePrice) * 100
}
const getInventoryKey = (product: CatalogProduct) => product.variantId ?? product.id
const getProductDetailId = (product: CatalogProduct) => product.productId ?? product.id
const ITEMS_PER_PAGE = 12

const renderStars = (rating: number) => {
  const full = Math.min(5, Math.max(0, Math.round(rating)))
  return Array.from({ length: 5 }, (_, i) =>
    i < full
      ? <svg key={i} className="star star--filled" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      : <svg key={i} className="star" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  )
}

function OffersPage() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const { products } = useInventoryItems({ page_size: 200 }, { loadAllPages: true })
  const { promotions, loading: promotionsLoading } = usePromotions()
  const allDeals = useMemo(
    () => products.filter((product) => product.stockSource !== 'out' && hasDeal(product.price, product.originalPrice)),
    [products],
  )

  const selectedPromotionId = Number(searchParams.get('promotion') ?? '') || null
  const selectedPromotion = useMemo(
    () => promotions.find((promotion) => promotion.id === selectedPromotionId) ?? null,
    [promotions, selectedPromotionId],
  )
  const promotionScopedDeals = useMemo(
    () => filterProductsByPromotion(allDeals, selectedPromotion),
    [allDeals, selectedPromotion],
  )

  const [searchTerm, setSearchTerm] = useState('')
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(10000)
  const [minDiscount, setMinDiscount] = useState(0)
  const [maxDiscount, setMaxDiscount] = useState(100)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('savings')
  const [addedId, setAddedId] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const brands = useMemo(
    () => Array.from(new Set(promotionScopedDeals.map((product) => product.brand).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [promotionScopedDeals],
  )

  const filteredDeals = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    let list = promotionScopedDeals.filter((product) => {
      const queryMatch = !query || [product.name, product.brand, product.category].some((value) => value.toLowerCase().includes(query))
      const priceMatch = product.price >= minPrice && product.price <= maxPrice
      const discountPercent = getDiscountPercent(product.price, product.originalPrice)
      const discountMatch = discountPercent >= minDiscount && discountPercent <= maxDiscount
      const brandMatch = selectedBrands.length === 0 || selectedBrands.includes(product.brand)
      return queryMatch && priceMatch && discountMatch && brandMatch
    })
    if (sortBy === 'savings') list = [...list].sort((a, b) => getSavings(b.price, b.originalPrice) - getSavings(a.price, a.originalPrice))
    if (sortBy === 'price-low') list = [...list].sort((a, b) => a.price - b.price)
    if (sortBy === 'price-high') list = [...list].sort((a, b) => b.price - a.price)
    return list
  }, [promotionScopedDeals, searchTerm, minPrice, maxPrice, minDiscount, maxDiscount, selectedBrands, sortBy])

  const pageTitle = selectedPromotion?.title ?? 'Latest Offers'
  const pageSubtitle = selectedPromotion
    ? `${buildPromotionSummary(selectedPromotion, promotionScopedDeals.length)} ${promotionScopedDeals.length} discounted product${promotionScopedDeals.length === 1 ? '' : 's'} currently match this offer.`
    : `${allDeals.length} discounted product${allDeals.length === 1 ? '' : 's'} available now across medicines, wellness, beauty and everyday essentials.`

  const activeFilterCount =
    (searchTerm ? 1 : 0) +
    selectedBrands.length +
    (minPrice > 0 || maxPrice < 10000 ? 1 : 0) +
    (minDiscount > 0 || maxDiscount < 100 ? 1 : 0)

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedPromotionId, searchTerm, minPrice, maxPrice, minDiscount, maxDiscount, selectedBrands, sortBy])

  useEffect(() => {
    if (!searchParams.get('promotion') || selectedPromotion || promotionsLoading) return
    const next = new URLSearchParams(searchParams)
    next.delete('promotion')
    setSearchParams(next, { replace: true })
  }, [promotionsLoading, searchParams, selectedPromotion, setSearchParams])

  const totalPages = Math.max(1, Math.ceil(filteredDeals.length / ITEMS_PER_PAGE))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedDeals = useMemo(
    () => filteredDeals.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredDeals, currentPage],
  )

  const startItem = filteredDeals.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredDeals.length)

  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | '...')[] = [1]
    if (currentPage > 3) pages.push('...')
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i)
    }
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setMinPrice(0)
    setMaxPrice(10000)
    setMinDiscount(0)
    setMaxDiscount(100)
    setSelectedBrands([])
  }

  const clearSelectedPromotion = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('promotion')
    setSearchParams(next)
  }

  const toggleBrand = (brand: string) =>
    setSelectedBrands((prev) => prev.includes(brand) ? prev.filter((item) => item !== brand) : [...prev, brand])

  const handleAddToCart = (deal: typeof allDeals[number]) => {
    if (deal.requiresPrescription) {
      const prescriptionPath = `/prescriptions?product_id=${getProductDetailId(deal)}&product_name=${encodeURIComponent(deal.name)}`
      navigate(isLoggedIn ? prescriptionPath : `/login?redirect=${encodeURIComponent(prescriptionPath)}`)
      return
    }
    void cartService.add({
      id: getInventoryKey(deal),
      productId: getProductDetailId(deal),
      variantId: deal.variantId,
      name: deal.name,
      brand: deal.brand,
      price: deal.price,
      image: deal.image,
      stockSource: deal.stockSource === 'out' ? undefined : deal.stockSource,
    })
    setAddedId(getInventoryKey(deal))
    window.setTimeout(() => setAddedId((prev) => prev === getInventoryKey(deal) ? null : prev), 1200)
  }

  return (
    <div className="plp offers-page">
      <div className="container">
        <div className="plp__header offers-page__header">
          <div className="breadcrumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            {selectedPromotion ? <Link to="/offers">Offers</Link> : <span>Offers</span>}
            {selectedPromotion && (
              <>
                <span>/</span>
                <span>{selectedPromotion.title}</span>
              </>
            )}
          </div>

          <div className="plp__header-top">
            <div className="plp__title-row">
              <div>
                <p className="offers-page__eyebrow">{selectedPromotion ? 'Promotion' : 'Deals'}</p>
                <h1 className="plp__title">{pageTitle}</h1>
                <p className="plp__subtitle offers-page__subtitle">{pageSubtitle}</p>
              </div>
            </div>
          </div>
        </div>

        {selectedPromotion && (
          <div className="offers-selection-bar">
            <div>
              <span className="offers-selection-bar__eyebrow">{selectedPromotion.badge}</span>
              <p className="offers-selection-bar__copy">
                Showing discounted products attached to <strong>{selectedPromotion.title}</strong>.
              </p>
            </div>
            <button className="btn btn--outline btn--sm" type="button" onClick={clearSelectedPromotion}>
              Show all offers
            </button>
          </div>
        )}

        {(selectedPromotion || activeFilterCount > 0) && (
          <div className="plp__filter-chips">
            <span className="plp__filter-chips__label">Active filters:</span>
            {selectedPromotion && (
              <span className="plp__chip plp__chip--promotion">
                Offer: {selectedPromotion.title}
                <button className="plp__chip__remove" type="button" onClick={clearSelectedPromotion}>×</button>
              </span>
            )}
            {searchTerm && (
              <span className="plp__chip">
                Search: &ldquo;{searchTerm}&rdquo;
                <button className="plp__chip__remove" type="button" onClick={() => setSearchTerm('')}>×</button>
              </span>
            )}
            {selectedBrands.map((brand) => (
              <span key={brand} className="plp__chip">
                {brand}
                <button className="plp__chip__remove" type="button" onClick={() => toggleBrand(brand)}>×</button>
              </span>
            ))}
            {(minPrice > 0 || maxPrice < 10000) && (
              <span className="plp__chip">
                KSh {minPrice.toLocaleString()}–{maxPrice.toLocaleString()}
                <button className="plp__chip__remove" type="button" onClick={() => { setMinPrice(0); setMaxPrice(10000) }}>×</button>
              </span>
            )}
            {(minDiscount > 0 || maxDiscount < 100) && (
              <span className="plp__chip">
                Discount {minDiscount}%–{maxDiscount}%
                <button className="plp__chip__remove" type="button" onClick={() => { setMinDiscount(0); setMaxDiscount(100) }}>×</button>
              </span>
            )}
            {activeFilterCount > 0 && (
              <button className="plp__chip plp__chip--clear" type="button" onClick={clearAllFilters}>
                Clear filters
              </button>
            )}
          </div>
        )}

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
                <h4 className="filter-panel__heading">Discount Range</h4>
                <div className="price-inputs">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Min %"
                    className="price-input"
                    value={minDiscount}
                    onChange={(e) => setMinDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  />
                  <span className="price-sep">–</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Max %"
                    className="price-input"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  />
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
                  {brands.length === 0 && <p className="offers-filter-empty">No brands available for this offer.</p>}
                </div>
              </div>
            </div>
          </aside>

          <main className="plp__main">
            <div className="plp__toolbar">
              <p className="plp__results-count">
                {filteredDeals.length === 0
                  ? 'No offers found'
                  : `Showing ${startItem}–${endItem} of ${filteredDeals.length} offer${filteredDeals.length !== 1 ? 's' : ''}`}
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
              </div>
            </div>

            <div className="products-grid">
              {paginatedDeals.map((deal) => (
                <article key={getInventoryKey(deal)} className="product-card">
                  <Link to={`/product/${getProductDetailId(deal)}`} className="product-card__image">
                    {deal.badge && (
                      <span className={`product-card__badge ${deal.badge.includes('Off') ? 'product-card__badge--sale' : ''}`}>{deal.badge}</span>
                    )}
                    <ImageWithFallback src={deal.image} alt={deal.name} />
                  </Link>
                  <div className="product-card__content">
                    <span className="product-card__brand">{deal.brand}</span>
                    <h3 className="product-card__name">
                      <Link to={`/product/${getProductDetailId(deal)}`}>{deal.name}</Link>
                    </h3>
                    <div className="product-card__pricing">
                      <span className="product-card__price">{formatPrice(deal.price)}</span>
                      {deal.originalPrice && (
                        <span className="product-card__original-price">{formatPrice(deal.originalPrice)}</span>
                      )}
                    </div>
                    <p className="product-card__deal-copy">Save {formatPrice(getSavings(deal.price, deal.originalPrice))} today</p>
                    <div className="product-card__buttons">
                      <button
                        className={`product-card__add-to-cart ${addedId === getInventoryKey(deal) ? 'product-card__add-to-cart--added' : ''}`}
                        type="button"
                        onClick={() => handleAddToCart(deal)}
                      >
                        {addedId === getInventoryKey(deal) ? 'Added!' : deal.requiresPrescription ? 'Add Prescription' : 'Add to cart'}
                      </button>
                      <Link to={`/product/${getProductDetailId(deal)}`} className="product-card__view-details">
                        View details
                      </Link>
                    </div>
                  </div>
                </article>
              ))}

              {filteredDeals.length === 0 && (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <p className="empty-state__title">No offers match your filters</p>
                  <p className="empty-state__sub">Try a broader search, remove brand filters, or clear the current offer filter.</p>
                  {activeFilterCount > 0 && (
                    <button className="btn btn--outline btn--sm" type="button" onClick={clearAllFilters}>Clear filters</button>
                  )}
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="pagination-wrap">
                <p className="pagination-info">
                  Showing <strong>{startItem}–{endItem}</strong> of <strong>{filteredDeals.length}</strong> results
                </p>
                <div className="pagination">
                  <button
                    className="pagination__btn pagination__btn--nav"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    aria-label="Previous page"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6"/>
                    </svg>
                    Prev
                  </button>

                  <div className="pagination__pages">
                    {getPageNumbers().map((page, idx) =>
                      page === '...' ? (
                        <span key={`ellipsis-${idx}`} className="pagination__ellipsis">…</span>
                      ) : (
                        <button
                          key={page}
                          className={`pagination__btn pagination__btn--page ${currentPage === page ? 'pagination__btn--active' : ''}`}
                          onClick={() => setCurrentPage(page)}
                          aria-current={currentPage === page ? 'page' : undefined}
                        >
                          {page}
                        </button>
                      ),
                    )}
                  </div>

                  <button
                    className="pagination__btn pagination__btn--nav"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    aria-label="Next page"
                  >
                    Next
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default OffersPage
