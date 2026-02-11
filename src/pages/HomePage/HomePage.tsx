import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import {
  categoryHealth,
  categoryBeauty,
  categoryBaby,
  categoryPersonal,
  productVitaminC,
  productBpMonitor,
  productFaceCream,
  productOmega3,
  productBabyDiapers,
  productSanitizer,
  productThermometer,
  productMultivitamin,
  articleSkincare,
} from '../../assets/images/remote'
import { applyPromotionsToProduct, loadPromotions } from '../../data/promotions'
import { cartService } from '../../services/cartService'
import './HomePage.css'

function HomePage() {
  const categoryTrackRef = useRef<HTMLDivElement | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [addedId, setAddedId] = useState<number | null>(null)

  const slides = [
    {
      id: 1,
      tag: 'NOW AVAILABLE',
      title: 'Premium Skincare Collection',
      subtitle: 'Dermatologist Recommended',
      description: 'Shop our exclusive range of professional-grade skincare products',
      discount: 'Up to 30% Off',
      bgColor: 'linear-gradient(135deg, #c8e6c9 0%, #81c784 100%)',
      products: [productFaceCream, articleSkincare, productVitaminC, productOmega3],
      buttonText: 'ORDER NOW',
    },
    {
      id: 2,
      tag: 'SPECIAL OFFER',
      title: 'Health Monitoring Devices',
      subtitle: 'Professional Grade Equipment',
      description: 'Advanced medical devices for home healthcare monitoring',
      discount: 'Save Big Today',
      bgColor: 'linear-gradient(135deg, #90caf9 0%, #42a5f5 100%)',
      products: [productBpMonitor, productThermometer, productSanitizer, productBabyDiapers],
      buttonText: 'SHOP NOW',
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [slides.length])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

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

  const featuredProducts = [
    {
      id: 1,
      name: 'Vitamin C 1000mg',
      brand: 'HealthPlus',
      price: 1250,
      originalPrice: 1500,
      category: 'Health & Wellness',
      image: productVitaminC,
      badge: 'Best Seller',
      rating: 4.8,
      reviews: 124,
    },
    {
      id: 2,
      name: 'Digital Blood Pressure Monitor',
      brand: 'MedTech',
      price: 4500,
      originalPrice: 5500,
      category: 'Health & Wellness',
      image: productBpMonitor,
      badge: '18% Off',
      rating: 4.6,
      reviews: 89,
    },
    {
      id: 3,
      name: 'Moisturizing Face Cream',
      brand: 'SkinGlow',
      price: 890,
      originalPrice: null,
      category: 'Beauty & Skincare',
      image: productFaceCream,
      badge: null,
      rating: 4.5,
      reviews: 67,
    },
    {
      id: 4,
      name: 'Hand Sanitizer 500ml',
      brand: 'CleanGuard',
      price: 450,
      originalPrice: 550,
      category: 'Health & Wellness',
      image: productSanitizer,
      badge: null,
      rating: 4.4,
      reviews: 45,
    },
  ]

  const newProducts = [
    {
      id: 101,
      name: 'Omega-3 Fish Oil Capsules',
      brand: 'NutraLife',
      price: 2100,
      originalPrice: 2500,
      category: 'Health & Wellness',
      image: productOmega3,
      badge: 'New',
      rating: 4.7,
      reviews: 156,
    },
    {
      id: 102,
      name: 'Baby Diapers Pack of 60',
      brand: 'BabyCare',
      price: 1800,
      originalPrice: 2200,
      category: 'Mother & Baby Care',
      image: productBabyDiapers,
      badge: '18% Off',
      rating: 4.9,
      reviews: 234,
    },
    {
      id: 103,
      name: 'Infrared Thermometer',
      brand: 'MedTech',
      price: 2800,
      originalPrice: 3500,
      category: 'Health & Wellness',
      image: productThermometer,
      badge: '20% Off',
      rating: 4.6,
      reviews: 112,
    },
    {
      id: 104,
      name: 'Multivitamin Tablets',
      brand: 'VitaMax',
      price: 1650,
      originalPrice: null,
      category: 'Health & Wellness',
      image: productMultivitamin,
      badge: 'Popular',
      rating: 4.7,
      reviews: 198,
    },
  ]

  const promotions = loadPromotions()
  const featuredDeals = featuredProducts.map((product) =>
    applyPromotionsToProduct(product, promotions)
  )
  const newDeals = newProducts.map((product) =>
    applyPromotionsToProduct(product, promotions)
  )

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

  const scrollCategories = (direction: 'prev' | 'next') => {
    const track = categoryTrackRef.current
    if (!track) return
    const card = track.querySelector<HTMLElement>('.category-card')
    const cardWidth = card?.offsetWidth ?? 200
    const gap = 24
    const amount = (cardWidth + gap) * 2
    track.scrollBy({ left: direction === 'next' ? amount : -amount, behavior: 'smooth' })
  }

  const handleAddToCart = (product: {
    id: number
    name: string
    brand: string
    price: number
    image: string
  }) => {
    void cartService.add({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      image: product.image,
      stockSource: 'branch',
    })
    setAddedId(product.id)
    window.setTimeout(() => {
      setAddedId((prev) => (prev === product.id ? null : prev))
    }, 1200)
  }

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero__slideshow">
          <button className="hero__slideshow-nav hero__slideshow-nav--prev" onClick={prevSlide} aria-label="Previous slide">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <div className="hero__slideshow-container">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`hero__slide ${index === currentSlide ? 'hero__slide--active' : ''}`}
                style={{ background: slide.bgColor }}
              >
                <div className="container">
                  <div className="hero__slide-content">
                    <div className="hero__slide-text">
                      <span className="hero__badge">{slide.tag}</span>
                      <h1 className="hero__title">{slide.title}</h1>
                      <p className="hero__subtitle">{slide.subtitle}</p>
                      <p className="hero__description">{slide.description}</p>
                      <div className="hero__discount">{slide.discount}</div>
                      <Link to="/products" className="hero__cta">
                        {slide.buttonText}
                      </Link>
                    </div>
                    <div className="hero__slide-products">
                      {slide.products.map((product, idx) => (
                        <div key={idx} className={`hero__product-card hero__product-card--${idx + 1}`}>
                          <ImageWithFallback src={product} alt="Product" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="hero__slideshow-nav hero__slideshow-nav--next" onClick={nextSlide} aria-label="Next slide">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          <div className="hero__slideshow-dots">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`hero__slideshow-dot ${index === currentSlide ? 'hero__slideshow-dot--active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Promotional Banner */}
      <section className="promo-banner">
        <div className="container">
          <div className="promo-banner__content">
            <div className="promo-banner__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              <div>
                <strong>Free Delivery</strong>
                <span>On orders over KSh 3,000</span>
              </div>
            </div>
            <div className="promo-banner__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <div>
                <strong>24/7 Support</strong>
                <span>Expert pharmacist advice</span>
              </div>
            </div>
            <div className="promo-banner__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <div>
                <strong>Easy Returns</strong>
                <span>30-day return policy</span>
              </div>
            </div>
            <div className="promo-banner__item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <div>
                <strong>Secure Checkout</strong>
                <span>100% secure payments</span>
              </div>
            </div>
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
          <div className="products__grid">
            {featuredDeals.map((product) => (
              <article key={product.id} className="product-card">
                <div className="product-card__image">
                  {product.badge && (
                    <span className={`product-card__badge ${product.badge.includes('Off') ? 'product-card__badge--sale' : ''}`}>
                      {product.badge}
                    </span>
                  )}
                  <ImageWithFallback src={product.image} alt={product.name} />
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
          <div className="featured-products__cta">
            <Link to="/products" className="btn btn--primary btn--lg">
              View All Products
            </Link>
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
                  <ImageWithFallback src={product.image} alt={product.name} />
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
            <Link to="/consultation" className="btn btn--primary">Doctor Consultation</Link>
            <Link to="/pediatrician/dashboard" className="btn btn--primary">Pediatric Services</Link>
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
            <form className="newsletter__form">
              <input
                type="email"
                placeholder="Enter your email address"
                className="newsletter__input"
              />
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
