import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import './ProductListingPage.css'

function ProductListingPage() {
  const [searchParams] = useSearchParams()
  const { category: categoryParam } = useParams()
  const category = categoryParam || searchParams.get('category') || 'all'

  const [_filters, _setFilters] = useState({
    priceRange: { min: 0, max: 10000 },
    brands: [] as string[],
    rating: 0,
    availability: 'all',
  })

  const [sortBy, setSortBy] = useState('recommended')

  const products = [
    {
      id: 1,
      name: 'Vitamin C 1000mg Tablets',
      brand: 'HealthPlus',
      price: 1250,
      originalPrice: 1500,
      image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400&h=400&fit=crop',
      rating: 4.8,
      reviews: 124,
      inStock: true,
      badge: 'Best Seller',
    },
    {
      id: 2,
      name: 'Digital Blood Pressure Monitor',
      brand: 'MedTech',
      price: 4500,
      originalPrice: 5500,
      image: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400&h=400&fit=crop',
      rating: 4.6,
      reviews: 89,
      inStock: true,
      badge: '18% Off',
    },
    {
      id: 3,
      name: 'Moisturizing Face Cream 50ml',
      brand: 'SkinGlow',
      price: 890,
      originalPrice: null,
      image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&h=400&fit=crop',
      rating: 4.5,
      reviews: 67,
      inStock: true,
      badge: null,
    },
    {
      id: 4,
      name: 'Omega-3 Fish Oil Capsules',
      brand: 'NutraLife',
      price: 2100,
      originalPrice: 2500,
      image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop',
      rating: 4.7,
      reviews: 156,
      inStock: true,
      badge: 'New',
    },
    {
      id: 5,
      name: 'Hand Sanitizer 500ml',
      brand: 'CleanGuard',
      price: 450,
      originalPrice: 550,
      image: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=400&h=400&fit=crop',
      rating: 4.4,
      reviews: 45,
      inStock: false,
      badge: null,
    },
    {
      id: 6,
      name: 'Multivitamin Complex Tablets',
      brand: 'VitaMax',
      price: 1650,
      originalPrice: null,
      image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&h=400&fit=crop',
      rating: 4.7,
      reviews: 198,
      inStock: true,
      badge: 'Popular',
    },
    {
      id: 7,
      name: 'Infrared Thermometer',
      brand: 'MedTech',
      price: 2800,
      originalPrice: 3500,
      image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=400&fit=crop',
      rating: 4.6,
      reviews: 112,
      inStock: true,
      badge: '20% Off',
    },
    {
      id: 8,
      name: 'Baby Diapers Pack of 60',
      brand: 'BabyCare',
      price: 1800,
      originalPrice: 2200,
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop',
      rating: 4.9,
      reviews: 234,
      inStock: true,
      badge: '18% Off',
    },
    {
      id: 9,
      name: 'Pain Relief Gel 100g',
      brand: 'MediRelief',
      price: 650,
      originalPrice: 800,
      image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=400&fit=crop',
      rating: 4.3,
      reviews: 78,
      inStock: true,
      badge: null,
    },
  ]

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

  return (
    <div className="plp">
      <div className="container">
        {/* Breadcrumbs */}
        <nav className="breadcrumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <span>{category === 'all' ? 'All Products' : category}</span>
        </nav>

        <div className="plp__layout">
          {/* Sidebar Filters */}
          <aside className="plp__sidebar">
            <div className="filter-section">
              <h3 className="filter-section__title">Filters</h3>
              <button className="btn btn--sm btn--outline">Clear All</button>
            </div>

            {/* Price Range */}
            <div className="filter-section">
              <h4 className="filter-section__heading">Price Range</h4>
              <div className="price-inputs">
                <input type="number" placeholder="Min" className="price-input" defaultValue={0} />
                <span>-</span>
                <input type="number" placeholder="Max" className="price-input" defaultValue={10000} />
              </div>
            </div>

            {/* Brands */}
            <div className="filter-section">
              <h4 className="filter-section__heading">Brands</h4>
              <div className="filter-options">
                {brands.map((brand) => (
                  <label key={brand} className="checkbox-label">
                    <input type="checkbox" />
                    <span>{brand}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div className="filter-section">
              <h4 className="filter-section__heading">Customer Rating</h4>
              <div className="filter-options">
                {[4, 3, 2, 1].map((rating) => (
                  <label key={rating} className="checkbox-label">
                    <input type="checkbox" />
                    <div className="rating-filter">
                      {Array(rating).fill(0).map((_, i) => (
                        <svg key={i} className="star star--filled" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      ))}
                      <span>& Up</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div className="filter-section">
              <h4 className="filter-section__heading">Availability</h4>
              <div className="filter-options">
                <label className="checkbox-label">
                  <input type="checkbox" />
                  <span>In Stock</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" />
                  <span>Out of Stock</span>
                </label>
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <main className="plp__main">
            {/* Toolbar */}
            <div className="plp__toolbar">
              <p className="plp__results-count">{products.length} Products</p>
              <div className="plp__sort">
                <label>Sort by:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
                  <option value="recommended">Recommended</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Customer Rating</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            <div className="products-grid">
              {products.map((product) => (
                <article key={product.id} className="product-card">
                  <Link to={`/product/${product.id}`} className="product-card__image">
                    {product.badge && (
                      <span className={`product-card__badge ${product.badge.includes('Off') ? 'product-card__badge--sale' : ''}`}>
                        {product.badge}
                      </span>
                    )}
                    {!product.inStock && (
                      <div className="product-card__overlay">Out of Stock</div>
                    )}
                    <img src={product.image} alt={product.name} />
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

                    <button className="product-card__add-to-cart" disabled={!product.inStock}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="9" cy="21" r="1"/>
                        <circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                      </svg>
                      {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            <div className="pagination">
              <button className="pagination__btn" disabled>Previous</button>
              <button className="pagination__btn pagination__btn--active">1</button>
              <button className="pagination__btn">2</button>
              <button className="pagination__btn">3</button>
              <button className="pagination__btn">Next</button>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default ProductListingPage
