import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import { getCategoryBySlug, getSubcategoryBySlug } from '../../data/categories'
import {
  productVitaminC,
  productBpMonitor,
  productFaceCream,
  productOmega3,
  productSanitizer,
  productMultivitamin,
  productThermometer,
  productBabyDiapers,
  productPainRelief,
} from '../../assets/images/remote'
import { applyPromotionsToProduct, loadPromotions } from '../../data/promotions'
import { StockSource } from '../../data/cart'
import { cartService } from '../../services/cartService'
import './ProductListingPage.css'

type ListingProduct = {
  id: number
  name: string
  brand: string
  price: number
  originalPrice: number | null
  category: string
  image: string
  rating: number
  reviews: number
  badge: string | null
  stockSource: StockSource
}

const getStockLabel = (stockSource: StockSource) => {
  if (stockSource === 'branch') return 'In stock at selected branch'
  if (stockSource === 'warehouse') return 'Available in central warehouse (2-3 days)'
  return 'Out of stock'
}

function ProductListingPage() {
  const [searchParams] = useSearchParams()
  const { category: categoryParam } = useParams()
  const categorySlug = categoryParam || searchParams.get('category') || 'all'
  const activeCategory = getCategoryBySlug(categorySlug)
  const activeSubcategorySlug = searchParams.get('subcategory')
  const activeSubcategory = getSubcategoryBySlug(activeCategory?.slug, activeSubcategorySlug)
  const queryFromUrl = searchParams.get('query') ?? ''

  const formatSlug = (value: string) =>
    value
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (match) => match.toUpperCase())

  const categoryTitle = activeCategory?.name ?? (categorySlug === 'all' ? 'All Products' : formatSlug(categorySlug))
  const categoryPath = activeCategory?.path ?? '/products'
  const subcategories = activeCategory?.subcategories ?? []

  const [searchTerm, setSearchTerm] = useState(queryFromUrl)
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(10000)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [minRating, setMinRating] = useState(0)
  const [availability, setAvailability] = useState<'all' | 'in_stock' | 'out_of_stock'>('all')
  const [sortBy, setSortBy] = useState('recommended')
  const [restockAlerts, setRestockAlerts] = useState<Record<number, boolean>>({})
  const [addedProductId, setAddedProductId] = useState<number | null>(null)

  const products: ListingProduct[] = [
    {
      id: 1,
      name: 'Vitamin C 1000mg Tablets',
      brand: 'HealthPlus',
      price: 1250,
      originalPrice: 1500,
      category: 'Health & Wellness',
      image: productVitaminC,
      rating: 4.8,
      reviews: 124,
      badge: 'Best Seller',
      stockSource: 'branch',
    },
    {
      id: 2,
      name: 'Digital Blood Pressure Monitor',
      brand: 'MedTech',
      price: 4500,
      originalPrice: 5500,
      category: 'Health & Wellness',
      image: productBpMonitor,
      rating: 4.6,
      reviews: 89,
      badge: '18% Off',
      stockSource: 'warehouse',
    },
    {
      id: 3,
      name: 'Moisturizing Face Cream 50ml',
      brand: 'SkinGlow',
      price: 890,
      originalPrice: null,
      category: 'Beauty & Skincare',
      image: productFaceCream,
      rating: 4.5,
      reviews: 67,
      badge: null,
      stockSource: 'branch',
    },
    {
      id: 4,
      name: 'Omega-3 Fish Oil Capsules',
      brand: 'NutraLife',
      price: 2100,
      originalPrice: 2500,
      category: 'Health & Wellness',
      image: productOmega3,
      rating: 4.7,
      reviews: 156,
      badge: 'New',
      stockSource: 'warehouse',
    },
    {
      id: 5,
      name: 'Hand Sanitizer 500ml',
      brand: 'CleanGuard',
      price: 450,
      originalPrice: 550,
      category: 'Health & Wellness',
      image: productSanitizer,
      rating: 4.4,
      reviews: 45,
      badge: null,
      stockSource: 'out',
    },
    {
      id: 6,
      name: 'Multivitamin Complex Tablets',
      brand: 'VitaMax',
      price: 1650,
      originalPrice: null,
      category: 'Health & Wellness',
      image: productMultivitamin,
      rating: 4.7,
      reviews: 198,
      badge: 'Popular',
      stockSource: 'branch',
    },
    {
      id: 7,
      name: 'Infrared Thermometer',
      brand: 'MedTech',
      price: 2800,
      originalPrice: 3500,
      category: 'Health & Wellness',
      image: productThermometer,
      rating: 4.6,
      reviews: 112,
      badge: '20% Off',
      stockSource: 'branch',
    },
    {
      id: 8,
      name: 'Baby Diapers Pack of 60',
      brand: 'BabyCare',
      price: 1800,
      originalPrice: 2200,
      category: 'Mother & Baby Care',
      image: productBabyDiapers,
      rating: 4.9,
      reviews: 234,
      badge: '18% Off',
      stockSource: 'branch',
    },
    {
      id: 9,
      name: 'Pain Relief Gel 100g',
      brand: 'MediRelief',
      price: 650,
      originalPrice: 800,
      category: 'Health & Wellness',
      image: productPainRelief,
      rating: 4.3,
      reviews: 78,
      badge: null,
      stockSource: 'warehouse',
    },
  ]

  const promotions = loadPromotions()
  const productsWithDeals = products.map((product) =>
    applyPromotionsToProduct(
      { ...product, inStock: product.stockSource !== 'out' },
      promotions
    ) as ListingProduct & { inStock: boolean; dealLabel?: string | null }
  )

  const brands = ['HealthPlus', 'MedTech', 'SkinGlow', 'NutraLife', 'CleanGuard', 'VitaMax', 'BabyCare', 'MediRelief']

  const formatPrice = (price: number) => `KSh ${price.toLocaleString()}`

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating)
    const stars = []
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg key={`full-${i}`} className="star star--filled" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      )
    }
    const emptyStars = 5 - fullStars
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg key={`empty-${i}`} className="star" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      )
    }
    return stars
  }

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((item) => item !== brand) : [...prev, brand]
    )
  }

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return productsWithDeals.filter((product) => {
      const categoryMatches = categorySlug === 'all' || !activeCategory || product.category === activeCategory.name
      const subcategoryMatches = !activeSubcategory || product.name.toLowerCase().includes(activeSubcategory.name.toLowerCase())
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

      return (
        categoryMatches &&
        subcategoryMatches &&
        queryMatches &&
        priceMatches &&
        brandMatches &&
        ratingMatches &&
        availabilityMatches
      )
    })
  }, [
    productsWithDeals,
    categorySlug,
    activeCategory,
    activeSubcategory,
    searchTerm,
    minPrice,
    maxPrice,
    selectedBrands,
    minRating,
    availability,
  ])

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts]
    if (sortBy === 'price-low') list.sort((a, b) => a.price - b.price)
    if (sortBy === 'price-high') list.sort((a, b) => b.price - a.price)
    if (sortBy === 'rating') list.sort((a, b) => b.rating - a.rating)
    if (sortBy === 'newest') list.sort((a, b) => b.id - a.id)
    return list
  }, [filteredProducts, sortBy])

  const clearAllFilters = () => {
    setSearchTerm(queryFromUrl)
    setMinPrice(0)
    setMaxPrice(10000)
    setSelectedBrands([])
    setMinRating(0)
    setAvailability('all')
  }

  const handleAddToCart = (product: ListingProduct) => {
    if (product.stockSource === 'out') return
    void cartService.add({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      image: product.image,
      stockSource: product.stockSource,
    })
    setAddedProductId(product.id)
    window.setTimeout(() => {
      setAddedProductId((prev) => (prev === product.id ? null : prev))
    }, 1200)
  }

  const toggleRestockAlert = (productId: number) => {
    setRestockAlerts((prev) => ({ ...prev, [productId]: !prev[productId] }))
  }

  return (
    <div className="plp">
      <div className="container">
        <nav className="breadcrumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          {activeCategory ? (
            activeSubcategory ? (
              <>
                <Link to={categoryPath}>{categoryTitle}</Link>
                <span>/</span>
                <span>{activeSubcategory.name}</span>
              </>
            ) : (
              <span>{categoryTitle}</span>
            )
          ) : (
            <span>{categoryTitle}</span>
          )}
        </nav>

        <div className="plp__header">
          <div className="plp__header-text">
            <p className="plp__eyebrow">Shop by Category</p>
            <h1 className="plp__title">{categoryTitle}</h1>
            <p className="plp__subtitle">
              {activeSubcategory ? activeSubcategory.name : 'Explore curated picks, essentials, and best sellers.'}
            </p>
          </div>
          {subcategories.length > 0 && (
            <div className="plp__subcategories">
              <Link
                to={categoryPath}
                className={`plp__subcategory ${!activeSubcategory ? 'is-active' : ''}`}
              >
                All {categoryTitle}
              </Link>
              {subcategories.map((subcategory) => (
                <Link
                  key={subcategory.slug}
                  to={`${categoryPath}?subcategory=${encodeURIComponent(subcategory.slug)}`}
                  className={`plp__subcategory ${activeSubcategorySlug === subcategory.slug ? 'is-active' : ''}`}
                >
                  {subcategory.name}
                </Link>
              ))}
            </div>
          )}
        </div>

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
                      name="rating-filter"
                      checked={minRating === rating}
                      onChange={() => setMinRating(rating)}
                    />
                    <div className="rating-filter">
                      {Array(rating).fill(0).map((_, index) => (
                        <svg key={`${rating}-${index}`} className="star star--filled" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      ))}
                      <span>&amp; Up</span>
                    </div>
                  </label>
                ))}
                <label className="checkbox-label">
                  <input
                    type="radio"
                    name="rating-filter"
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
                    name="availability-filter"
                    checked={availability === 'in_stock'}
                    onChange={() => setAvailability('in_stock')}
                  />
                  <span>In Stock</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="radio"
                    name="availability-filter"
                    checked={availability === 'out_of_stock'}
                    onChange={() => setAvailability('out_of_stock')}
                  />
                  <span>Out of Stock</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="radio"
                    name="availability-filter"
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
                  className="sort-select"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
                <label htmlFor="sort-select">Sort by:</label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="sort-select"
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
                      <div className="product-card__stars">
                        {renderStars(product.rating)}
                      </div>
                      <span className="product-card__reviews">({product.reviews})</span>
                    </div>

                    <div className="product-card__pricing">
                      <span className="product-card__price">{formatPrice(product.price)}</span>
                      {product.originalPrice && (
                        <span className="product-card__original-price">{formatPrice(product.originalPrice)}</span>
                      )}
                    </div>

                    <p className={`product-stock-source product-stock-source--${product.stockSource}`}>
                      {getStockLabel(product.stockSource)}
                    </p>

                    {product.stockSource !== 'out' ? (
                      <button className="product-card__add-to-cart" type="button" onClick={() => handleAddToCart(product)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="9" cy="21" r="1"/>
                          <circle cx="20" cy="21" r="1"/>
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                        </svg>
                        {addedProductId === product.id ? 'Added' : 'Add to Cart'}
                      </button>
                    ) : (
                      <button
                        className="product-card__add-to-cart product-card__add-to-cart--restock"
                        type="button"
                        onClick={() => toggleRestockAlert(product.id)}
                      >
                        {restockAlerts[product.id] ? 'Restock Alert Set' : 'Notify on Restock'}
                      </button>
                    )}
                  </div>
                </article>
              ))}
              {sortedProducts.length === 0 && (
                <div className="empty-state">No products match your current filters.</div>
              )}
            </div>

            <div className="pagination">
              <button className="pagination__btn" disabled>Previous</button>
              <button className="pagination__btn pagination__btn--active">1</button>
              <button className="pagination__btn" disabled>Next</button>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default ProductListingPage
