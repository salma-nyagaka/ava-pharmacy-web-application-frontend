import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import backgroundBanner from '../../assets/images/banner/background.jpg'

// import easterBanner from '../../assets/images/banner/easter.png'
// import easterBannerMobile from '../../assets/images/banner/easter2.png'
// import uncoverBanner from '../../assets/images/banner/uncover.png'
// import uncoverBannerMobile from '../../assets/images/banner/uncover2.png'
import { cartService } from '../../services/cartService'
import { favouritesService } from '../../services/favouritesService'
import { fetchFeaturedProducts } from '../../services/productService'
import { mapApiProduct } from '../../hooks/useProducts'
import { useInventoryItems } from '../../hooks/useInventoryItems'
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
    image: backgroundBanner,
    mobileImage: backgroundBanner,
    alt: 'Coming Soon',
    link: '/',
    background: '#d8f3fb',
  },
  // {
  //   id: 2,
  //   image: uncoverBanner,
  //   mobileImage: uncoverBannerMobile,
  //   alt: 'Ava Pharmacy uncover skincare banner',
  //   link: '/products',
  //   background: '#e7d3be',
  // },
]

const FEATURED_PRODUCTS_LIMIT = 5
const isAvailableProduct = (product: CatalogProduct) => product.stockSource !== 'out'
const isEligibleFeaturedProduct = (product: CatalogProduct) => isAvailableProduct(product) && !product.requiresPrescription
const getInventoryKey = (product: CatalogProduct) => product.variantId ?? product.id
const getProductDetailId = (product: CatalogProduct) => product.productId ?? product.id

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
  const quickActionItems = [
    { title: 'Doctor consultation', description: 'Speak with a licensed clinician online', link: '/doctor-consultation' },
    { title: 'Pediatric consultation', description: 'Get care for infants, children, and teens', link: '/pediatric-consultation' },
    { title: 'Prescription review', description: 'Upload your Rx for pharmacist guidance', link: '/prescriptions' },
  ]

  const { products: catalogProducts } = useInventoryItems({ page_size: 200 }, { loadAllPages: true })
  const [featuredSeedProducts, setFeaturedSeedProducts] = useState<CatalogProduct[]>([])
  const visibleCategories = categories.filter((category) => {
    const normalizedName = category.name.trim().toLowerCase()
    const normalizedSlug = category.slug.trim().toLowerCase()
    return normalizedName !== 'collections' && normalizedSlug !== 'collections'
  })

  const prescriptionPathFor = (product: CatalogProduct) =>
    `/prescriptions?product_id=${getProductDetailId(product)}&product_name=${encodeURIComponent(product.name)}`

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
        const inventoryKey = getInventoryKey(product)
        if (seen.has(inventoryKey) || !isEligibleFeaturedProduct(product)) return
        seen.add(inventoryKey)
        merged.push(product)
      })
    }

    appendUnique(featuredSeedProducts)
    appendUnique(catalogProducts)

    return merged.slice(0, FEATURED_PRODUCTS_LIMIT)
  })()

  const featuredProductIds = new Set(featuredProducts.map((product) => getInventoryKey(product)))

  const newProducts = catalogProducts
    .filter((product) => isAvailableProduct(product) && !featuredProductIds.has(getInventoryKey(product)) && !isDealProduct(product))
    .slice(0, 5)

  const offerDeals = [...catalogProducts]
    .filter((product) => isAvailableProduct(product) && isDealProduct(product))
    .sort((a, b) => getDealSavings(b) - getDealSavings(a))
  const spotlightOfferProducts = offerDeals.slice(0, 5)

  const formatPrice = (price: number) => {
    return `KSh ${price.toLocaleString()}`
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
      id: getInventoryKey(product),
      productId: getProductDetailId(product),
      variantId: product.variantId,
      name: product.name,
      brand: product.brand,
      price: product.price,
      image: product.image,
      stockSource: product.stockSource === 'out' ? 'warehouse' : (product.stockSource ?? 'branch'),
    })
    setAddedId(getInventoryKey(product))
    window.setTimeout(() => {
      setAddedId((prev) => (prev === getInventoryKey(product) ? null : prev))
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
      <article key={getInventoryKey(product)} className="product-card">
        <Link to={`/product/${getProductDetailId(product)}`} className="product-card__image">
          {displayBadge && (
            <span className={`product-card__badge ${section === 'deals' ? 'product-card__badge--sale' : ''}`}>
              {displayBadge}
            </span>
          )}
          <ImageWithFallback src={product.image} alt={product.name} loading="lazy" />
          <div className="product-card__actions">
            <button
              className={`product-card__action ${wishlist[getInventoryKey(product)] ? 'product-card__action--active' : ''}`}
              title={wishlist[getInventoryKey(product)] ? 'Remove from favourites' : 'Save to favourites'}
              onClick={(e) => {
                e.preventDefault()
                toggleWishlist(product)
              }}
            >
              <svg viewBox="0 0 24 24" fill={wishlist[getInventoryKey(product)] ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>
        </Link>
        <div className="product-card__content">
          {product.brand && <span className="product-card__brand">{product.brand}</span>}
          <h3 className="product-card__name">
            <Link to={`/product/${getProductDetailId(product)}`}>{product.name}</Link>
          </h3>
          <div className="product-card__spacer" />
          <div className="product-card__footer">
            <div className="product-card__pricing">
              <span className="product-card__price">{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <span className="product-card__original-price">{formatPrice(product.originalPrice)}</span>
              )}
            </div>
            <div className="product-card__buttons">
              <button
                className={`product-card__add-to-cart${addedId === getInventoryKey(product) ? ' product-card__add-to-cart--added' : ''}`}
                type="button"
                title={product.requiresPrescription ? 'Upload prescription to request' : 'Add to cart'}
                onClick={() => void handleAddToCart(product)}
              >
                {product.requiresPrescription ? 'Add Prescription' : addedId === getInventoryKey(product) ? 'Added!' : 'Add to cart'}
              </button>
              <Link
                to={`/product/${getProductDetailId(product)}`}
                className="product-card__view-details"
              >
                View details
              </Link>
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
              <div className="hero-carousel__overlay">
                <span className="hero-carousel__eyebrow">Announcement</span>
                <h1 className="hero-carousel__headline">Coming Soon</h1>
              </div>
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
                        <p className="category-card__description">
                          {cat.description || `Explore trusted ${cat.name.toLowerCase()} picks for everyday care.`}
                        </p>
                        <div className="category-card__footer">
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
          {spotlightOfferProducts.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state__message">No live offers are available right now.</p>
            </div>
          ) : (
            <>
              <div className="section__header section__header--split">
                <div>
                  <h2 className="section__title">Products On Offer</h2>
                </div>
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

      <section className="section home-hub">
        <div className="container">
          <div className="section__header section__header--split">
            <div>
              <h2 className="section__title">Care & Prescriptions</h2>
            </div>
            <p className="section__subtitle">Prescriptions, consultations, and lab services in one place.</p>
          </div>
          <div className="home-hub__grid">
            <div className="home-hub__primary">
              <div className="home-hub__lead">
                <h3 className="home-hub__lead-title">Want to talk to an expert?</h3>
                <p className="home-hub__lead-copy">Choose the consultation or prescription support you need and get started online.</p>
              </div>
              <div className="home-hub__actions" aria-label="Primary care actions">
                {quickActionItems.map((item) => (
                  <Link key={item.title} to={item.link} className="home-hub__action">
                    <span className="home-hub__action-title">{item.title}</span>
                    <span className="home-hub__action-copy">{item.description}</span>
                    <span className="home-hub__action-link">Explore <span aria-hidden="true">→</span></span>
                  </Link>
                ))}
              </div>
            </div>
            <aside className="home-hub__aside">
              <div className="home-hub__feature-tile home-hub__feature-tile--primary">
                <span className="home-hub__feature-label">Need a prescription item?</span>
                <strong className="home-hub__feature-title">Upload your prescription and get pharmacist guidance.</strong>
                <Link to="/prescriptions" className="home-hub__feature-link">Start now <span aria-hidden="true">→</span></Link>
              </div>
              <Link to="/laboratory" className="home-hub__feature-tile">
                <span className="home-hub__feature-label">Lab tests</span>
                <strong className="home-hub__feature-title">Book lab tests with an option for home sample pickup.</strong>
              </Link>
            </aside>
          </div>
        </div>
      </section>

      <section className="section featured-products home-section--featured">
        <div className="container">
          <div className="section__header section__header--split">
            <div>
              <h2 className="section__title">New Products</h2>
            </div>
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

      <section className="section new-products home-section--new">
        <div className="container">
          <div className="section__header section__header--split">
            <div>
              <h2 className="section__title">Top Rated Products</h2>
            </div>
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


      <SupportShortcuts />
    </div>
  )
}

export default HomePage
