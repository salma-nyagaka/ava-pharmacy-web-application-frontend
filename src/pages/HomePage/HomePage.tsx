import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import {
  categoryHealth,
  categoryBeauty,
  categoryBaby,
  categoryPersonal,
  categoryMedicines,
  categoryDevices,
} from '../../assets/images/remote'
import huggiesBanner from '../../assets/images/banner/huggies.png'
// import niveaBanner from '../../assets/images/banner/nivea.png'
// import larocheBanner from '../../assets/images/banner/laroche-pink.png'
import { applyPromotionsToProduct, loadPromotions } from '../../data/promotions'
import { cartService } from '../../services/cartService'
import { loadCatalogProducts } from '../../data/products'
import { loadCategories } from '../../data/categories'
import './HomePage.css'

const CATEGORY_IMAGE_MAP: Record<string, string> = {
  'health-wellness': categoryHealth,
  'beauty-skincare': categoryBeauty,
  'mother-baby-care': categoryBaby,
  'self-care-lifestyle': categoryPersonal,
  'medicines': categoryMedicines,
  'medical-devices': categoryDevices,
  'devices': categoryDevices,
}

function HomePage() {
  const categoryTrackRef = useRef<HTMLDivElement | null>(null)
  const [addedId, setAddedId] = useState<number | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterError, setNewsletterError] = useState('')
  const [newsletterSuccess, setNewsletterSuccess] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  const categories = loadCategories().map((cat) => ({
    id: cat.slug,
    name: cat.name,
    image: CATEGORY_IMAGE_MAP[cat.slug] ?? categoryMedicines,
    link: cat.path,
  }))

  const valueBannerItems = [
    { key: 'delivery', title: 'Free Delivery',       subtitle: 'On orders over KSh 3,000',      link: '/help',                color: 'green'  },
    { key: 'support',  title: 'Expert Pharmacists',  subtitle: 'Professional guidance, 24/7',   link: '/doctor-consultation', color: 'blue'   },
    { key: 'quality',  title: 'Genuine Products',    subtitle: 'Certified & lab-verified stock', link: '/about',               color: 'purple' },
    { key: 'secure',   title: 'Flexible Payments',   subtitle: 'M-Pesa, card & cash on delivery',link: '/help',               color: 'amber'  },
  ]

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

  const bannerSlides = [
    { id: 1, image: huggiesBanner,  alt: 'CeraVe Skincare Collection',             link: '/category/beauty-skincare?q=cerave' },
    // { id: 2, image: niveaBanner,   alt: 'Nivea Body & Skin Care',                 link: '/category/beauty-skincare?q=nivea' },
    // { id: 3, image: larocheBanner, alt: 'La Roche-Posay Dermatologist Solutions', link: '/category/beauty-skincare?q=laroche' },
  ]

  useEffect(() => {
    const t = window.setInterval(() => {
      setCurrentSlide(s => (s + 1) % bannerSlides.length)
    }, 5000)
    return () => window.clearInterval(t)
  }, [bannerSlides.length])

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
      {/* Hero Carousel — full-width promotional banner */}
      <section className="hero-carousel" id="main-content">
        <div
          className="hero-carousel__track"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {bannerSlides.map(slide => (
            <Link key={slide.id} to={slide.link} className="hero-carousel__slide">
              <img src={slide.image} alt={slide.alt} className="hero-carousel__img" />
            </Link>
          ))}
        </div>

        <button
          className="hero-carousel__arrow hero-carousel__arrow--prev"
          onClick={() => setCurrentSlide(s => (s - 1 + bannerSlides.length) % bannerSlides.length)}
          aria-label="Previous slide"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <button
          className="hero-carousel__arrow hero-carousel__arrow--next"
          onClick={() => setCurrentSlide(s => (s + 1) % bannerSlides.length)}
          aria-label="Next slide"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        <div className="hero-carousel__dots">
          {bannerSlides.map((_, i) => (
            <button
              key={i}
              className={`hero-carousel__dot${i === currentSlide ? ' hero-carousel__dot--active' : ''}`}
              onClick={() => setCurrentSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Promotional Banner */}
      <section className="promo-banner">
        <div className="container">
          <div className="promo-banner__strip">
            {valueBannerItems.map((item, i) => (
              <div key={item.title} className="promo-banner__item">
                <span className={`promo-banner__icon promo-banner__icon--${item.color}`}>
                  {renderBannerIcon(item.key)}
                </span>
                <div className="promo-banner__text">
                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                </div>
                {i < valueBannerItems.length - 1 && <div className="promo-banner__divider" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories — browse the store */}
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Featured Products — social proof via best sellers */}
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

      {/* Hot Offers — urgency / savings */}
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

      {/* Testimonials */}
      <section className="section hs-reviews">
        <div className="container">
          <div className="hs-reviews__head">
            <p className="hs-reviews__eyebrow">Customer Reviews</p>
            <h2 className="hs-reviews__title">Trusted by thousands across Kenya</h2>
          </div>
          <div className="hs-reviews__grid">
            <div className="hs-review-card">
              <div className="hs-review-card__stars">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                ))}
              </div>
              <p className="hs-review-card__body">"Ordering was so easy and my prescription was verified within the hour. The delivery came the same day — I was genuinely impressed."</p>
              <div className="hs-review-card__author">
                <div className="hs-review-card__avatar">AW</div>
                <div>
                  <strong>Amina Wanjiru</strong>
                  <span>Nairobi, Kenya</span>
                </div>
              </div>
            </div>

            <div className="hs-review-card">
              <div className="hs-review-card__stars">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                ))}
              </div>
              <p className="hs-review-card__body">"I booked a lab test through the app and the technician came home to collect the sample. Results were in my inbox the next morning. Outstanding service."</p>
              <div className="hs-review-card__author">
                <div className="hs-review-card__avatar">DK</div>
                <div>
                  <strong>David Kamau</strong>
                  <span>Karen, Nairobi</span>
                </div>
              </div>
            </div>

            <div className="hs-review-card">
              <div className="hs-review-card__stars">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                ))}
              </div>
              <p className="hs-review-card__body">"The pediatrician consultation saved us a long trip to the hospital. The doctor was thorough and kind, and we had a prescription ready in 20 minutes."</p>
              <div className="hs-review-card__author">
                <div className="hs-review-card__avatar">FM</div>
                <div>
                  <strong>Faith Muthoni</strong>
                  <span>Westlands, Nairobi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="hs-services">
        <div className="container">
          <div className="hs-services__head">
            <p className="hs-services__eyebrow">Complete Healthcare</p>
            <h2 className="hs-services__title">Everything you need, in one place</h2>
            <p className="hs-services__sub">Prescriptions, consults, and lab tests — delivered fast with licensed experts.</p>
          </div>
          <div className="hs-services__grid">

            <Link to="/doctor-consultation" className="hs-svc-card hs-svc-card--doctor" onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
              <div className="hs-svc-card__icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z"/>
                  <path d="M20 21a8 8 0 1 0-16 0"/>
                  <path d="M16 11v4M14 13h4"/>
                </svg>
              </div>
              <div className="hs-svc-card__body">
                <h3 className="hs-svc-card__title">Doctor Consultation</h3>
                <p className="hs-svc-card__desc">Chat with licensed doctors and get e-prescriptions, 7 days a week.</p>
                <span className="hs-svc-card__cta">Book a doctor →</span>
              </div>
            </Link>

            <Link to="/pediatric-consultation" className="hs-svc-card hs-svc-card--paed" onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
              <div className="hs-svc-card__icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="6" r="3"/>
                  <path d="M9 14c-3 0-5 1.5-5 3v1h16v-1c0-1.5-2-3-5-3"/>
                  <path d="M8 10c0 0-1 3 4 3s4-3 4-3"/>
                </svg>
              </div>
              <div className="hs-svc-card__body">
                <h3 className="hs-svc-card__title">Pediatric Care</h3>
                <p className="hs-svc-card__desc">Specialist pediatricians for infants, children, and teens on demand.</p>
                <span className="hs-svc-card__cta">See pediatricians →</span>
              </div>
            </Link>

            <Link to="/prescriptions" className="hs-svc-card hs-svc-card--rx" onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
              <div className="hs-svc-card__icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="9" y1="13" x2="15" y2="13"/>
                  <line x1="9" y1="17" x2="13" y2="17"/>
                </svg>
              </div>
              <div className="hs-svc-card__body">
                <h3 className="hs-svc-card__title">Prescription Upload</h3>
                <p className="hs-svc-card__desc">Upload your prescription for pharmacist verification and same-day delivery.</p>
                <span className="hs-svc-card__cta">Upload prescription →</span>
              </div>
            </Link>

            <Link to="/laboratory" className="hs-svc-card hs-svc-card--lab" onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
              <div className="hs-svc-card__icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11M3 9h18M3 9l3 9h12l3-9"/>
                  <circle cx="12" cy="16" r="1"/>
                </svg>
              </div>
              <div className="hs-svc-card__body">
                <h3 className="hs-svc-card__title">Lab Tests</h3>
                <p className="hs-svc-card__desc">Book 200+ diagnostics with home sample collection and results in 24–48h.</p>
                <span className="hs-svc-card__cta">Book a test →</span>
              </div>
            </Link>

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

      {/* WhatsApp FAB */}
      <a
        href="https://wa.me/254700000000"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-fab"
        aria-label="Chat with us on WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
        </svg>
        <span className="whatsapp-fab__tooltip">Chat with us</span>
      </a>
    </div>
  )
}

export default HomePage
