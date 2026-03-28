import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import easterBanner from '../../assets/images/banner/easter.png'
import easterBannerMobile from '../../assets/images/banner/easter2.png'
import uncoverBanner from '../../assets/images/banner/uncover.png'
import uncoverBannerMobile from '../../assets/images/banner/uncover2.png'
import { cartService } from '../../services/cartService'
import { favouritesService } from '../../services/favouritesService'
import { fetchFeaturedProducts } from '../../services/productService'
import { mapApiProduct, useProducts } from '../../hooks/useProducts'
import { useCatalog } from '../../context/CatalogContext'
import { useAuth } from '../../context/AuthContext'
import type { CatalogProduct } from '../../data/products'
import { categoryCardImages } from '../../data/categoryCardImages'
import SupportShortcuts from '../../components/SupportShortcuts/SupportShortcuts'
import '../../styles/pages/HomePage.css'

type HeroSlide = {
  id: number
  image: string
  mobileImage: string
  alt: string
  link: string
  background: string
}

const bannerSlides: HeroSlide[] = [
  {
    id: 1,
    image: easterBanner,
    mobileImage: easterBannerMobile,
    alt: 'Ava Pharmacy Easter offers banner',
    link: '/offers',
    background: '#d8f3fb',
  },
  {
    id: 2,
    image: uncoverBanner,
    mobileImage: uncoverBannerMobile,
    alt: 'Ava Pharmacy uncover skincare banner',
    link: '/products',
    background: '#e7d3be',
  },
]

const FEATURED_PRODUCTS_LIMIT = 5
const isAvailableProduct = (product: CatalogProduct) => product.stockSource !== 'out'
const isEligibleFeaturedProduct = (product: CatalogProduct) => isAvailableProduct(product) && !product.requiresPrescription

function HomePage() {
  const categoryTrackRef = useRef<HTMLDivElement | null>(null)
  const [addedId, setAddedId] = useState<number | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const navigate = useNavigate()
  const { categories } = useCatalog()
  const { isLoggedIn } = useAuth()
  const [wishlist, setWishlist] = useState<Record<number, boolean>>({})

  const valueBannerItems = [
    { key: 'delivery', title: 'Free Delivery',       subtitle: `On orders over KSh 2500/-`, link: '/help', color: 'green'  },
    { key: 'support',  title: 'Expert Pharmacists',  subtitle: 'Professional guidance, 24/7',   link: '/doctor-consultation', color: 'blue'   },
    { key: 'quality',  title: 'Genuine Products',    subtitle: 'Certified & lab-verified stock', link: '/about',               color: 'purple' },
    { key: 'secure',   title: 'Flexible Payments',   subtitle: 'M-Pesa, card & cash on delivery',link: '/help',               color: 'amber'  },
  ]

  const { products: catalogProducts } = useProducts({ page_size: 200 }, { loadAllPages: true })
  const [featuredSeedProducts, setFeaturedSeedProducts] = useState<CatalogProduct[]>([])
  const visibleCategories = categories.filter((category) => {
    const normalizedName = category.name.trim().toLowerCase()
    const normalizedSlug = category.slug.trim().toLowerCase()
    return normalizedName !== 'collections' && normalizedSlug !== 'collections'
  })

  const prescriptionPathFor = (product: Pick<CatalogProduct, 'id' | 'name'>) =>
    `/prescriptions?product_id=${product.id}&product_name=${encodeURIComponent(product.name)}`

  const isDealProduct = (product: CatalogProduct) => product.originalPrice !== null && product.originalPrice > product.price
  const getDealSavings = (product: CatalogProduct) => (product.originalPrice ?? product.price) - product.price
  const getProductBadge = (product: CatalogProduct, section: 'deals' | 'featured' | 'new') => {
    if (section !== 'deals') return null
    if (product.badge?.trim()) return product.badge.trim()
    return null
  }

  const refreshWishlist = () => {
    if (!isLoggedIn) {
      setWishlist({})
      return
    }
    void favouritesService.list()
      .then((response) => {
        const next: Record<number, boolean> = {}
        response.data.forEach((item) => {
          next[item.id] = true
        })
        setWishlist(next)
      })
      .catch(() => setWishlist({}))
  }

  useEffect(() => {
    refreshWishlist()
    if (!isLoggedIn) return undefined
    return favouritesService.subscribe(refreshWishlist)
  }, [isLoggedIn])

  useEffect(() => {
    let isMounted = true

    void fetchFeaturedProducts()
      .then((items) => {
        if (!isMounted) return
        setFeaturedSeedProducts(
          items
            .map(mapApiProduct)
            .filter(isEligibleFeaturedProduct),
        )
      })
      .catch(() => {
        if (!isMounted) return
        setFeaturedSeedProducts([])
      })

    return () => {
      isMounted = false
    }
  }, [])

  const featuredProducts = (() => {
    const seen = new Set<number>()
    const merged: CatalogProduct[] = []

    const appendUnique = (products: CatalogProduct[]) => {
      products.forEach((product) => {
        if (seen.has(product.id) || !isEligibleFeaturedProduct(product)) return
        seen.add(product.id)
        merged.push(product)
      })
    }

    appendUnique(featuredSeedProducts)
    appendUnique(catalogProducts)

    return merged.slice(0, FEATURED_PRODUCTS_LIMIT)
  })()

  const featuredProductIds = new Set(featuredProducts.map((product) => product.id))

  const newProducts = catalogProducts
    .filter((product) => isAvailableProduct(product) && !featuredProductIds.has(product.id) && !isDealProduct(product))
    .slice(0, 5)

  const offerDeals = [...catalogProducts]
    .filter((product) => isAvailableProduct(product) && isDealProduct(product))
    .sort((a, b) => getDealSavings(b) - getDealSavings(a))
  const spotlightOfferProducts = offerDeals.slice(0, 5)

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
  }, [visibleCategories.length])

  useEffect(() => {
    const t = window.setInterval(() => {
      setCurrentSlide(s => (s + 1) % bannerSlides.length)
    }, 6000)
    return () => window.clearInterval(t)
  }, [bannerSlides.length])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  const showPreviousSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length)
  }

  const showNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % bannerSlides.length)
  }

  const scrollCategories = (direction: 'prev' | 'next') => {
    const track = categoryTrackRef.current
    if (!track) return
    const card = track.querySelector<HTMLElement>('.category-card')
    const cardWidth = card?.offsetWidth ?? 200
    const gapValue = window.getComputedStyle(track).gap || window.getComputedStyle(track).columnGap || '24'
    const gap = Number.parseFloat(gapValue) || 24
    const amount = (cardWidth + gap) * 2
    track.scrollBy({ left: direction === 'next' ? amount : -amount, behavior: 'smooth' })
  }

  const handleCategoryKeyDown = (event: React.KeyboardEvent, direction: 'prev' | 'next') => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      scrollCategories(direction)
    }
  }

  const handleAddToCart = async (product: CatalogProduct) => {
    if (product.requiresPrescription) {
      const prescriptionPath = prescriptionPathFor(product)
      navigate(isLoggedIn ? prescriptionPath : `/login?redirect=${encodeURIComponent(prescriptionPath)}`)
      return
    }

    await cartService.add({
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

  const toggleWishlist = (product: CatalogProduct) => {
    const redirectTarget = `${window.location.pathname}${window.location.search}`
    if (!isLoggedIn) {
      navigate(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
      return
    }

    void favouritesService.toggle({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      stockSource: product.stockSource,
    }).then(refreshWishlist).catch(() => {})
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

  const renderProductCard = (product: CatalogProduct, section: 'deals' | 'featured' | 'new') => {
    const displayBadge = getProductBadge(product, section)

    return (
      <article key={product.id} className="product-card">
        <Link to={`/product/${product.id}`} className="product-card__image">
          {displayBadge && (
            <span className={`product-card__badge ${section === 'deals' ? 'product-card__badge--sale' : ''}`}>
              {displayBadge}
            </span>
          )}
          <ImageWithFallback src={product.image} alt={product.name} loading="lazy" />
          <div className="product-card__actions">
            <button
              className={`product-card__action ${wishlist[product.id] ? 'product-card__action--active' : ''}`}
              title={wishlist[product.id] ? 'Remove from favourites' : 'Save to favourites'}
              onClick={(e) => {
                e.preventDefault()
                toggleWishlist(product)
              }}
            >
              <svg viewBox="0 0 24 24" fill={wishlist[product.id] ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>
        </Link>
        <div className="product-card__content">
          {product.brand && <span className="product-card__brand">{product.brand}</span>}
          <h3 className="product-card__name">
            <Link to={`/product/${product.id}`}>{product.name}</Link>
          </h3>
          {product.rating > 0 && (
            <div className="product-card__rating">
              <div className="product-card__stars">{renderStars(product.rating)}</div>
              <span className="product-card__rating-value">{product.rating.toFixed(1)}</span>
              {product.reviews > 0 && (
                <span className="product-card__reviews">{product.reviews} review{product.reviews === 1 ? '' : 's'}</span>
              )}
            </div>
          )}
          <div className="product-card__spacer" />
          <div className="product-card__footer">
            <div className="product-card__pricing">
              <span className="product-card__price">{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <span className="product-card__original-price">{formatPrice(product.originalPrice)}</span>
              )}
            </div>
            <div className="product-card__buttons">
              <Link
                to={`/product/${product.id}`}
                className="product-card__view-details"
              >
                View details
              </Link>
              <button
                className={`product-card__add-to-cart${addedId === product.id ? ' product-card__add-to-cart--added' : ''}`}
                type="button"
                title={product.requiresPrescription ? 'Upload prescription to request' : 'Add to cart'}
                onClick={() => void handleAddToCart(product)}
              >
              {product.requiresPrescription ? 'Add Prescription' : addedId === product.id ? 'Added!' : 'Add to cart'}
            </button>
            </div>
          </div>
        </div>
      </article>
    )
  }

  return (
    <div className="home">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      {/* Hero Carousel - full-width promotional banner */}
      <section className="hero-carousel" id="main-content">
        <div
          className="hero-carousel__track"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {bannerSlides.map((slide, index) => (
            <Link
              key={slide.id}
              to={slide.link}
              className="hero-carousel__slide"
              style={{ background: slide.background }}
            >
              <picture className="hero-carousel__picture">
                <source media="(max-width: 768px)" srcSet={slide.mobileImage} />
                <img
                  src={slide.image}
                  alt={slide.alt}
                  className="hero-carousel__img"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                />
              </picture>
            </Link>
          ))}
        </div>

        {bannerSlides.length > 1 && (
          <>
            <button
              type="button"
              className="hero-carousel__arrow hero-carousel__arrow--prev"
              aria-label="Show previous banner"
              onClick={showPreviousSlide}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              className="hero-carousel__arrow hero-carousel__arrow--next"
              aria-label="Show next banner"
              onClick={showNextSlide}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            <div className="hero-carousel__dots" aria-label="Banner navigation">
              {bannerSlides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  className={`hero-carousel__dot${currentSlide === index ? ' hero-carousel__dot--active' : ''}`}
                  aria-label={`Show banner ${index + 1}`}
                  aria-pressed={currentSlide === index}
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>
          </>
        )}

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

      {/* Categories - browse the store */}
      {visibleCategories.length > 0 && (
        <section className="section categories">
          <div className="container">
            <div className="section__header">
              <h2 className="section__title">Shop by Category</h2>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div className="categories__track" ref={categoryTrackRef}>
                {visibleCategories.map((cat) => {
                  const cardImage = categoryCardImages[cat.slug] ?? cat.image

                  return (
                    <Link key={cat.id} to={cat.path} className="category-card">
                      <div className={`category-card__image ${cardImage ? 'category-card__image--photo' : 'category-card__image--icon'}`}>
                        {cardImage ? (
                          <ImageWithFallback src={cardImage} alt={cat.name} className="category-card__image-media" />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                            <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/>
                          </svg>
                        )}
                      </div>
                      <div className="category-card__body">
                        <h3 className="category-card__name">{cat.name}</h3>
                        {/* <p className="category-card__description">
                          {cat.description || `Explore trusted ${cat.name.toLowerCase()} picks curated for everyday care.`}
                        </p> */}
                        <div className="category-card__footer">
                          {/* <span className="category-card__eyebrow">
                            {cat.subcategories.length > 0
                              ? `${cat.subcategories.length} ${cat.subcategories.length === 1 ? 'collection' : 'collections'}`
                              : 'Coming soon'}
                          </span> */}
                          <span className="category-card__cta">
                            Explore
                            <span aria-hidden="true">→</span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
              <button
                className="carousel__btn carousel__btn--next"
                type="button"
                aria-label="Scroll categories right"
                onClick={() => scrollCategories('next')}
                onKeyDown={(e) => handleCategoryKeyDown(e, 'next')}
                disabled={!canScrollRight}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        </section>
      )}
      <section className="section offers-preview home-section--offers">
        <div className="container">
          {/* Hot Offers campaign header and promotion cards are intentionally hidden for now. */}
          {spotlightOfferProducts.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state__message">No live offers are available right now.</p>
            </div>
          ) : (
            <>
              <div className="section__header">
                <h3 className="section__title" style={{ fontSize: '1.3rem' }}>Products On Offer</h3>
              </div>
              <div className="products__grid products__grid--compact">
                {spotlightOfferProducts.map((product) => renderProductCard(product, 'deals'))}
              </div>
            </>
          )}
          <div className="featured-products__cta">
            <Link to="/offers" className="featured-products__link-cta">
              View All Offers
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products - social proof via best sellers */}
      <section className="section featured-products home-section--featured">
        <div className="container">
          <div className="section__header">
            <h2 className="section__title">Top Rated Products</h2>
          </div>
          {featuredProducts.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state__message">No top rated products available at the moment.</p>
            </div>
          ) : (
            <div className="products__grid">
              {featuredProducts.map((product) => renderProductCard(product, 'featured'))}
            </div>
          )}
        </div>
      </section>

      {/* Services Section */}
      <section className="hp-services">
        <div className="container">
          <div className="hp-services__shell">
            <div className="hp-services__intro">
              <h2 className="hp-services__title">Find the right support, faster</h2>
              <p className="hp-services__sub">
                Talk to a doctor, book pediatric care, upload a prescription, or arrange lab testing from one place.
              </p>
              <div className="hp-services__tags" aria-label="Service highlights">
                <span className="hp-services__tag">Doctor advice</span>
                <span className="hp-services__tag">Child health</span>
                <span className="hp-services__tag">Rx review</span>
                <span className="hp-services__tag">Lab bookings</span>
              </div>
            </div>

            <div className="hp-services__grid">
              <Link to="/doctor-consultation" className="hp-svc-card hp-svc-card--doctor" onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
                <div className="hp-svc-card__icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z"/>
                    <path d="M20 21a8 8 0 1 0-16 0"/>
                    <path d="M16 11v4M14 13h4"/>
                  </svg>
                </div>
                <div className="hp-svc-card__body">
                  <p className="hp-svc-card__eyebrow">Online doctor</p>
                  <h3 className="hp-svc-card__title">Doctor Consultation</h3>
                  <p className="hp-svc-card__desc">Speak to a licensed clinician today.</p>
                </div>
                <span className="hp-svc-card__arrow" aria-hidden="true">→</span>
              </Link>

              <Link to="/pediatric-consultation" className="hp-svc-card hp-svc-card--paed" onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
                <div className="hp-svc-card__icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="6" r="3"/>
                    <path d="M9 14c-3 0-5 1.5-5 3v1h16v-1c0-1.5-2-3-5-3"/>
                    <path d="M8 10c0 0-1 3 4 3s4-3 4-3"/>
                  </svg>
                </div>
                <div className="hp-svc-card__body">
                  <p className="hp-svc-card__eyebrow">Children&apos;s care</p>
                  <h3 className="hp-svc-card__title">Pediatric Services</h3>
                  <p className="hp-svc-card__desc">Specialist support for infants and teens.</p>
                </div>
                <span className="hp-svc-card__arrow" aria-hidden="true">→</span>
              </Link>

              <Link to="/prescriptions" className="hp-svc-card hp-svc-card--rx" onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
                <div className="hp-svc-card__icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="9" y1="13" x2="15" y2="13"/>
                    <line x1="9" y1="17" x2="13" y2="17"/>
                  </svg>
                </div>
                <div className="hp-svc-card__body">
                  <p className="hp-svc-card__eyebrow">Pharmacy review</p>
                  <h3 className="hp-svc-card__title">Prescription Upload</h3>
                  <p className="hp-svc-card__desc">Send your prescription for fast verification.</p>
                </div>
                <span className="hp-svc-card__arrow" aria-hidden="true">→</span>
              </Link>

              <Link to="/laboratory" className="hp-svc-card hp-svc-card--lab" onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
                <div className="hp-svc-card__icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11M3 9h18M3 9l3 9h12l3-9"/>
                    <circle cx="12" cy="16" r="1"/>
                  </svg>
                </div>
                <div className="hp-svc-card__body">
                  <p className="hp-svc-card__eyebrow">Testing</p>
                  <h3 className="hp-svc-card__title">Lab Tests</h3>
                  <p className="hp-svc-card__desc">Book diagnostics and sample collection.</p>
                </div>
                <span className="hp-svc-card__arrow" aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

      
        </div>
      </section>

      {/* New Products Section */}
      <section className="section new-products home-section--new">
        <div className="container">
          <div className="section__header">
            <h2 className="section__title">New Products</h2>
          </div>
          {newProducts.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state__message">No new products have been added yet.</p>
            </div>
          ) : (
            <div className="products__grid">
              {newProducts.map((product) => renderProductCard(product, 'new'))}
            </div>
          )}
          <div className="featured-products__cta">
            <Link to="/products" className="featured-products__link-cta">
              View All New Products
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>


      <SupportShortcuts />

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
