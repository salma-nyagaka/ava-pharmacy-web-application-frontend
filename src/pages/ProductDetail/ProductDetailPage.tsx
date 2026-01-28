import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import './ProductDetailPage.css'

function ProductDetailPage() {
  const { id: _id } = useParams()
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)

  const product = {
    id: 1,
    name: 'Vitamin C 1000mg Tablets - 60 Count',
    brand: 'HealthPlus',
    price: 1250,
    originalPrice: 1500,
    rating: 4.8,
    reviews: 124,
    inStock: true,
    sku: 'HP-VIT-C-1000',
    category: 'Vitamins & Supplements',
    images: [
      'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1550572017-edd951b55104?w=600&h=600&fit=crop',
    ],
    description: 'High-quality Vitamin C 1000mg tablets to support your immune system and overall health. Each tablet contains pure ascorbic acid in an easy-to-swallow format.',
    features: [
      '1000mg of pure Vitamin C per tablet',
      'Supports immune system function',
      'Powerful antioxidant',
      '60 tablets - 2 month supply',
      'Suitable for vegetarians',
      'No artificial colors or preservatives',
    ],
    directions: 'Take one tablet daily with food, or as directed by your healthcare professional.',
    warnings: 'Consult your doctor before use if pregnant, nursing, or taking medication. Keep out of reach of children.',
  }

  const relatedProducts = [
    {
      id: 2,
      name: 'Multivitamin Complex',
      price: 1650,
      image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=300&h=300&fit=crop',
      rating: 4.7,
    },
    {
      id: 3,
      name: 'Omega-3 Fish Oil',
      price: 2100,
      image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300&h=300&fit=crop',
      rating: 4.7,
    },
    {
      id: 4,
      name: 'Vitamin D3 5000 IU',
      price: 980,
      image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&h=300&fit=crop',
      rating: 4.6,
    },
  ]

  const reviews = [
    {
      id: 1,
      author: 'Jane D.',
      rating: 5,
      date: '2 weeks ago',
      comment: 'Excellent quality! I\'ve been taking these for a month and feel much better. Highly recommend!',
      verified: true,
    },
    {
      id: 2,
      author: 'Michael K.',
      rating: 4,
      date: '1 month ago',
      comment: 'Good product, easy to swallow. Noticed improvement in my overall health.',
      verified: true,
    },
    {
      id: 3,
      author: 'Sarah M.',
      rating: 5,
      date: '1 month ago',
      comment: 'Great value for money. Will definitely buy again!',
      verified: true,
    },
  ]

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
    <div className="pdp">
      <div className="container">
        {/* Breadcrumbs */}
        <nav className="breadcrumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/products">{product.category}</Link>
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        {/* Product Main Section */}
        <div className="pdp__main">
          {/* Images */}
          <div className="pdp__gallery">
            <div className="pdp__main-image">
              <img src={product.images[selectedImage]} alt={product.name} />
            </div>
            <div className="pdp__thumbnails">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  className={`pdp__thumbnail ${selectedImage === index ? 'pdp__thumbnail--active' : ''}`}
                  onClick={() => setSelectedImage(index)}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="pdp__info">
            <span className="pdp__brand">{product.brand}</span>
            <h1 className="pdp__title">{product.name}</h1>

            <div className="pdp__rating-section">
              <div className="pdp__stars">
                {renderStars(product.rating)}
              </div>
              <span className="pdp__rating-text">{product.rating} ({product.reviews} reviews)</span>
            </div>

            <div className="pdp__pricing">
              <span className="pdp__price">{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <span className="pdp__original-price">{formatPrice(product.originalPrice)}</span>
              )}
              {product.originalPrice && (
                <span className="pdp__savings">Save {Math.round((1 - product.price / product.originalPrice) * 100)}%</span>
              )}
            </div>

            <p className="pdp__sku">SKU: {product.sku}</p>

            <div className="pdp__availability">
              {product.inStock ? (
                <span className="pdp__in-stock">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  In Stock
                </span>
              ) : (
                <span className="pdp__out-of-stock">Out of Stock</span>
              )}
            </div>

            <div className="pdp__description">
              <p>{product.description}</p>
            </div>

            {/* Quantity & Add to Cart */}
            <div className="pdp__actions">
              <div className="quantity-selector">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} />
                <button onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>

              <button className="btn btn--primary btn--lg pdp__add-to-cart">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                Add to Cart
              </button>

              <button className="pdp__wishlist-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pdp__trust-badges">
              <div className="trust-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>100% Genuine</span>
              </div>
              <div className="trust-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13"/>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
                <span>Fast Delivery</span>
              </div>
              <div className="trust-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span>Easy Returns</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="pdp__tabs">
          <div className="tabs">
            <button className="tab tab--active">Description</button>
            <button className="tab">Features</button>
            <button className="tab">Reviews ({product.reviews})</button>
          </div>

          <div className="tab-content">
            <div className="tab-panel">
              <h3>Product Description</h3>
              <p>{product.description}</p>
              <h4>Directions</h4>
              <p>{product.directions}</p>
              <h4>Warnings</h4>
              <p>{product.warnings}</p>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="pdp__reviews">
          <h2>Customer Reviews</h2>
          <div className="reviews-summary">
            <div className="reviews-summary__score">
              <span className="reviews-summary__number">{product.rating}</span>
              <div className="reviews-summary__stars">{renderStars(product.rating)}</div>
              <span className="reviews-summary__count">Based on {product.reviews} reviews</span>
            </div>
          </div>

          <div className="reviews-list">
            {reviews.map((review) => (
              <div key={review.id} className="review">
                <div className="review__header">
                  <div className="review__stars">{renderStars(review.rating)}</div>
                  <span className="review__date">{review.date}</span>
                </div>
                <p className="review__author">
                  {review.author}
                  {review.verified && <span className="review__verified">Verified Purchase</span>}
                </p>
                <p className="review__comment">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Related Products */}
        <div className="pdp__related">
          <h2>Related Products</h2>
          <div className="related-products">
            {relatedProducts.map((relatedProduct) => (
              <Link key={relatedProduct.id} to={`/product/${relatedProduct.id}`} className="related-product">
                <img src={relatedProduct.image} alt={relatedProduct.name} />
                <h4>{relatedProduct.name}</h4>
                <div className="related-product__stars">{renderStars(relatedProduct.rating)}</div>
                <p className="related-product__price">{formatPrice(relatedProduct.price)}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetailPage
