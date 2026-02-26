import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import {
  categoryHealth,
  categoryBeauty,
  categoryBaby,
  categoryPersonal,
  productMultivitamin,
  articleSkincare,
} from '../../assets/images/remote'
import defaultHeroBanner from '../../assets/images/banner/banner1.png'
import { applyPromotionsToProduct, loadPromotions } from '../../data/promotions'
import { cartService } from '../../services/cartService'
import { categoryData } from '../../data/categories'
import { loadCatalogProducts } from '../../data/products'
import './HomePage.css'

function HomePage() {
  const categoryTrackRef = useRef<HTMLDivElement | null>(null)
  const [addedId, setAddedId] = useState<number | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterError, setNewsletterError] = useState('')
  const [newsletterSuccess, setNewsletterSuccess] = useState(false)

  const categories = [
    {
      id: 1,
      name: 'Health & Wellness',
      image: categoryHealth,
      link: '/category/health-wellness',
    },
    {
      id: 2,
      name: 'Beauty & Skincare',
      image: categoryBeauty,
      link: '/category/beauty-skincare',
    },
    {
      id: 3,
      name: 'Mother & Baby Care',
      image: categoryBaby,
      link: '/category/mother-baby-care',
    },
    {
      id: 4,
      name: 'Self-Care & Lifestyle',
      image: categoryPersonal,
      link: '/category/self-care-lifestyle',
    },
  ]

    .slice(0, 4)

  const valueBannerItems = [
    {
      key: 'delivery',
      title: 'Free Delivery',
      subtitle: 'On orders over KSh 3,000',
      cta: 'View delivery options',
      link: '/help',
    },
    {
      key: 'support',
      title: 'Pharmacist Support',
      subtitle: 'Professional guidance every day',
      cta: 'Start consultation',
      link: '/doctor-consultation',
    },
    {
      key: 'quality',
      title: 'Quality Products',
      subtitle: 'Genuine, certified healthcare products',
      cta: 'Learn more',
      link: '/about',
    },
    {
      key: 'secure',
      title: 'Secure Checkout',
      subtitle: 'M-Pesa, card, and cash on delivery',
      cta: 'How payment works',
      link: '/help',
    },
  ] as const

  const catalogProducts = loadCatalogProducts()
  const featuredProducts = catalogProducts.filter((product) => product.stockSource !== 'out').slice(0, 4)
  const curatedProducts = catalogProducts.filter((product) => product.badge === 'New' || product.badge === 'Popular')
  const newProducts = [...curatedProducts, ...catalogProducts.filter((product) => !curatedProducts.includes(product))]
    .slice(0, 4)
  const promotions = loadPromotions()
  const featuredDeals = featuredProducts.map((product) =>
    applyPromotionsToProduct(product, promotions)
  )
  const newDeals = newProducts.map((product) =>
    applyPromotionsToProduct(product, promotions)
  )
  const offerDeals = catalogProducts
    .map((product) => applyPromotionsToProduct(product, promotions))
    .filter((product) => product.stockSource !== 'out' && (product.originalPrice ?? product.price) > product.price)
    .slice(0, 4)

  const formatPrice = (price: number) => {
    return `KSh ${price.toLocaleString()}`
  }

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    const stars = []

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg key={`full-${i}`} className="product-card__star product-card__star--filled" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      )
    }

    if (hasHalfStar) {
      stars.push(
        <svg key="half" className="product-card__star product-card__star--half" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      )
    }

    const emptyStars = 5 - stars.length
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg key={`empty-${i}`} className="product-card__star" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      )
    }

    return stars
  }

  const updateScrollButtons = () => {
    const track = categoryTrackRef.current
    if (!track) return
    const { scrollLeft, scrollWidth, clientWidth } = track
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
  }

  useEffect(() => {
    const track = categoryTrackRef.current
    if (!track) return
    updateScrollButtons()
    track.addEventListener('scroll', updateScrollButtons)
    window.addEventListener('resize', updateScrollButtons)
    return () => {
      track.removeEventListener('scroll', updateScrollButtons)
      window.removeEventListener('resize', updateScrollButtons)
    }
  }, [])

  const scrollCategories = (direction: 'prev' | 'next') => {
    const track = categoryTrackRef.current
    if (!track) return
    const card = track.querySelector<HTMLElement>('.category-card')
    const cardWidth = card?.offsetWidth ?? 200
    const gap = 24
    const amount = (cardWidth + gap) * 2
    track.scrollBy({ left: direction === 'next' ? amount : -amount, behavior: 'smooth' })
  }

  const handleCategoryKeyDown = (event: React.KeyboardEvent, direction: 'prev' | 'next') => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      scrollCategories(direction)
    }
  }

  const handleNewsletterSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setNewsletterError('')
    setNewsletterSuccess(false)

    const email = newsletterEmail.trim()
    if (!email) {
      setNewsletterError('Email is required')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setNewsletterError('Please enter a valid email address')
      return
    }

    setNewsletterSuccess(true)
    setNewsletterEmail('')
    setTimeout(() => setNewsletterSuccess(false), 5000)
  }

  const handleAddToCart = (product: {
    id: number
    name: string
    brand: string
    price: number
    image: string
    stockSource?: 'branch' | 'warehouse' | 'out'
  }) => {
    void cartService.add({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      image: product.image,
      stockSource: product.stockSource === 'out' ? 'warehouse' : (product.stockSource ?? 'branch'),
    })
    setAddedId(product.id)
    window.setTimeout(() => {
      setAddedId((prev) => (prev === product.id ? null : prev))
    }, 1200)
  }

  const renderBannerIcon = (key: (typeof valueBannerItems)[number]['key']) => {
    if (key === 'delivery') {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="3" width="15" height="13"/>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      )
    }
    if (key === 'support') {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      )
    }
    if (key === 'quality') {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      )
    }
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    )
  }

  return (
    <div className="home">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      {/* Hero Section */}
      <section className="hero" id="main-content">
        <div className="hero__single-banner">
          <Link to="/offers" className="hero__single-banner-link" aria-label="View offers">
            <ImageWithFallback src={defaultHeroBanner} alt="AVA Pharmacy featured banner" className="hero__single-banner-image" />
          </Link>
        </div>
      </section>

      {/* Promotional Banner */}
      <section className="promo-banner">
        <div className="container">
          <div className="promo-banner__head">
            <h2>Why customers choose AVA Pharmacy</h2>
            <p>Fast fulfillment, licensed professionals, and transparent service from order to delivery.</p>
          </div>
          <div className="promo-banner__content">
            {valueBannerItems.map((item) => (
              <Link key={item.title} to={item.link} className="promo-banner__item">
                {renderBannerIcon(item.key)}
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                  <em>{item.cta} →</em>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="section categories">
        <div className="container">
          <div className="section__header">
            <h2 className="section__title">Shop by Category</h2>
            <p className="section__subtitle">
              Browse our wide range of healthcare products and find what you need
            </p>
          </div>
          <div className="categories__carousel">
            <button
              className="carousel__btn carousel__btn--prev"
              type="button"
              aria-label="Scroll categories left"
              onClick={() => scrollCategories('prev')}
              onKeyDown={(e) => handleCategoryKeyDown(e, 'prev')}
              disabled={!canScrollLeft}
            >
              ‹
            </button>
            <div className="categories__track" ref={categoryTrackRef}>
              {categories.map((category) => (
                <Link key={category.id} to={category.link} className="category-card">
                  <div className="category-card__image">
                    <ImageWithFallback src={category.image} alt={category.name} />
                  </div>
                  <h3 className="category-card__name">{category.name}</h3>
                </Link>
              ))}
            </div>
            <button
              className="carousel__btn carousel__btn--next"
              type="button"
              aria-label="Scroll categories right"
              onClick={() => scrollCategories('next')}
              onKeyDown={(e) => handleCategoryKeyDown(e, 'next')}
              disabled={!canScrollRight}
            >
              ›
            </button>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="section section--alt featured-products">
        <div className="container">
          <div className="section__header">
            <h2 className="section__title">Featured Products</h2>
            <p className="section__subtitle">
              Discover our most popular health and wellness products
            </p>
          </div>
          {featuredDeals.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state__message">No featured products available at the moment.</p>
            </div>
          ) : (
            <div className="products__grid">
              {featuredDeals.map((product) => (
              <article key={product.id} className="product-card">
                <div className="product-card__image">
                  {product.badge && (
                    <span className={`product-card__badge ${product.badge.includes('Off') ? 'product-card__badge--sale' : ''}`}>
                      {product.badge}
                    </span>
                  )}
                  <ImageWithFallback src={product.image} alt={product.name} loading="lazy" />
                  <div className="product-card__actions">
                    <button className="product-card__action" title="Add to Wishlist">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
                    <button className="product-card__action" title="Quick View">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                  </div>
                </div>
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
                  <button className="product-card__add-to-cart" type="button" onClick={() => handleAddToCart(product)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="21" r="1"/>
                      <circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    {addedId === product.id ? 'Added' : 'Add to Cart'}
                  </button>
                </div>
              </article>
              ))}
            </div>
          )}
          <div className="featured-products__cta">
            <Link to="/products" className="btn btn--primary btn--lg">
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* Promotional Section */}
      <section className="section offers-preview">
        <div className="container">
          <div className="section__header">
            <h2 className="section__title">Hot Offers</h2>
            <p className="section__subtitle">
              Discounted products handpicked for today&apos;s savings.
            </p>
          </div>
          <div className="products__grid">
            {offerDeals.map((product) => (
              <article key={product.id} className="product-card">
                <div className="product-card__image">
                  {product.badge && (
                    <span className={`product-card__badge ${product.badge.includes('Off') ? 'product-card__badge--sale' : ''}`}>
                      {product.badge}
                    </span>
                  )}
                  <ImageWithFallback src={product.image} alt={product.name} loading="lazy" />
                </div>
                <div className="product-card__content">
                  <span className="product-card__brand">{product.brand}</span>
                  <h3 className="product-card__name">
                    <Link to={`/product/${product.id}`}>{product.name}</Link>
                  </h3>
                  <div className="product-card__rating">
                    <div className="product-card__stars">{renderStars(product.rating)}</div>
                    <span className="product-card__reviews">({product.reviews})</span>
                  </div>
                  <div className="product-card__pricing">
                    <span className="product-card__price">{formatPrice(product.price)}</span>
                    {product.originalPrice && (
                      <span className="product-card__original-price">{formatPrice(product.originalPrice)}</span>
                    )}
                  </div>
                  <button className="product-card__add-to-cart" type="button" onClick={() => handleAddToCart(product)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="21" r="1"/>
                      <circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    {addedId === product.id ? 'Added' : 'Add to Cart'}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="featured-products__cta">
            <Link to="/offers" className="btn btn--outline btn--lg">View All Offers</Link>
          </div>
        </div>
      </section>

      {/* Promotional Section */}
      <section className="section promo-section">
        <div className="container">
          <div className="promo-cards">
            <div className="promo-card promo-card--primary">
              <div className="promo-card__content">
                <span className="promo-card__tag">Limited Offer</span>
                <h3 className="promo-card__title">Up to 30% Off on Vitamins</h3>
                <p className="promo-card__description">
                  Boost your immunity with our premium vitamin supplements at special prices
                </p>
                <Link to="/offers" className="btn btn--secondary">
                  Shop Vitamins
                </Link>
              </div>
              <div className="promo-card__image">
                <ImageWithFallback src={productMultivitamin} alt="Vitamins offer" />
              </div>
            </div>
            <div className="promo-card promo-card--secondary">
              <div className="promo-card__content">
                <span className="promo-card__tag">New Arrivals</span>
                <h3 className="promo-card__title">Premium Skincare Range</h3>
                <p className="promo-card__description">
                  Discover our new collection of dermatologist-recommended skincare products
                </p>
                <Link to="/category/beauty-skincare" className="btn btn--outline">
                  Explore Now
                </Link>
              </div>
              <div className="promo-card__image">
                <ImageWithFallback src={articleSkincare} alt="Skincare products" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* New Products Section */}
      <section className="section section--alt new-products">
        <div className="container">
          <div className="section__header">
            <h2 className="section__title">New Products</h2>
            <p className="section__subtitle">
              Fresh arrivals curated for your daily wellness needs
            </p>
          </div>
          <div className="products__grid">
            {newDeals.map((product) => (
              <article key={product.id} className="product-card">
                <div className="product-card__image">
                  {product.badge && (
                    <span className={`product-card__badge ${product.badge.includes('Off') ? 'product-card__badge--sale' : ''}`}>
                      {product.badge}
                    </span>
                  )}
                  <ImageWithFallback src={product.image} alt={product.name} loading="lazy" />
                  <div className="product-card__actions">
                    <button className="product-card__action" title="Add to Wishlist">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
                    <button className="product-card__action" title="Quick View">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                  </div>
                </div>
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
                  <button className="product-card__add-to-cart" type="button" onClick={() => handleAddToCart(product)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="21" r="1"/>
                      <circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    {addedId === product.id ? 'Added' : 'Add to Cart'}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="services-cta">
            <Link to="/contact" className="btn btn--outline">Contact Us</Link>
            <Link to="/doctor-consultation" className="btn btn--primary">Doctor Consultation</Link>
            <Link to="/pediatric-consultation" className="btn btn--primary">Pediatric Services</Link>
            <Link to="/labaratory" className="btn btn--primary">Laboratory Services</Link>
            <Link to="/prescriptions" className="btn btn--primary">Prescription Fulfillment</Link>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="newsletter">
        <div className="container">
          <div className="newsletter__content">
            <div className="newsletter__text">
              <h2 className="newsletter__title">Subscribe to Our Newsletter</h2>
              <p className="newsletter__description">
                Get exclusive offers and new product updates delivered straight to your inbox
              </p>
            </div>
            <form className="newsletter__form" onSubmit={handleNewsletterSubmit}>
              <div className="newsletter__input-wrapper">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  className="newsletter__input"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  aria-label="Email address"
                  aria-invalid={!!newsletterError}
                  aria-describedby={newsletterError ? 'newsletter-error' : undefined}
                />
                {newsletterError && (
                  <span className="newsletter__error" id="newsletter-error" role="alert">
                    {newsletterError}
                  </span>
                )}
                {newsletterSuccess && (
                  <span className="newsletter__success" role="status">
                    Thank you for subscribing!
                  </span>
                )}
              </div>
              <button type="submit" className="btn btn--primary">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
