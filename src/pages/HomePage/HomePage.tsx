import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import ceraveImg from '../../assets/images/brands/cerave.png'
import panadolImg from '../../assets/images/brands/panadol.jpeg'
import larocheImg from '../../assets/images/brands/laroche.webp'
import uncoverImg from '../../assets/images/brands/uncover.webp'
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

type HeroDesign = 'split' | 'split-left' | 'feature'

type HeroSlide = {
  id: number
  eyebrow: string
  headline: string
  supporting: string
  cta: { label: string; link: string }
  image?: string
  badge?: string
  design?: HeroDesign
  theme: { from: string; to: string; accent: string }
  trust: string[]
}

const bannerSlides: HeroSlide[] = [
  {
    id: 1,
    eyebrow: 'Skincare bestseller',
    headline: 'CeraVe, loved by dermatologists',
    supporting: 'Daily moisturisers and cleansers with essential ceramides for every skin type.',
    cta: { label: 'Shop CeraVe', link: '/products?query=cerave' },
    image: ceraveImg,
    badge: 'Bestseller',
    design: 'split',
    theme: { from: '#EFF6FF', to: '#E0F2FE', accent: '#2563EB' },
    trust: ['Genuine stock', 'Same-day delivery', 'M-Pesa & card'],
  },
  {
    id: 2,
    eyebrow: 'Pain relief essentials',
    headline: 'Fast relief with Panadol',
    supporting: 'Tablets and syrup for headaches, fever and cold, for adults and kids.',
    cta: { label: 'Shop pain relief', link: '/products?query=panadol' },
    image: panadolImg,
    badge: 'Everyday essentials',
    design: 'split-left',
    theme: { from: '#ECFDF5', to: '#D1FAE5', accent: '#059669' },
    trust: ['Pharmacist-reviewed', 'Licensed pharmacy', 'Fast checkout'],
  },
  {
    id: 3,
    eyebrow: 'Dermatological care',
    headline: 'La Roche-Posay for sensitive skin',
    supporting: 'Effaclar and Cicaplast ranges, recommended by dermatologists worldwide.',
    cta: { label: 'Shop La Roche-Posay', link: '/products?query=la roche' },
    image: larocheImg,
    badge: 'Premium brand',
    design: 'split',
    theme: { from: '#F0F9FF', to: '#E0E7FF', accent: '#4F46E5' },
    trust: ['Genuine stock', 'Same-day delivery', 'Secure checkout'],
  },
  {
    id: 4,
    eyebrow: 'Beauty, new in',
    headline: 'Uncover skincare made for you',
    supporting: 'Lightweight foundations and skincare built for melanin-rich skin tones.',
    cta: { label: 'Discover Uncover', link: '/products?query=uncover' },
    image: uncoverImg,
    badge: 'New in',
    design: 'feature',
    theme: { from: '#FDF2F8', to: '#FCE7F3', accent: '#DB2777' },
    trust: ['Cruelty-free', 'Genuine products', 'Member savings'],
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
  const [isCarouselPaused, setIsCarouselPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const navigate = useNavigate()
  const { categories } = useCatalog()
  const { isLoggedIn, user } = useAuth()
  const [wishlist, setWishlist] = useState<Record<number, boolean>>({})

  const valueBannerItems = [
    { key: 'delivery', title: 'Free Delivery',       subtitle: `On orders over KSh 2500/-`, link: '/help', color: 'green'  },
    { key: 'support',  title: 'Expert Pharmacists',  subtitle: 'Professional guidance, 24/7',   link: '/doctor-consultation', color: 'blue'   },
    { key: 'quality',  title: 'Genuine Products',    subtitle: 'Certified & lab-verified stock', link: '/about',               color: 'purple' },
    { key: 'secure',   title: 'Flexible Payments',   subtitle: 'M-Pesa, card & cash on delivery',link: '/help',               color: 'amber'  },
  ]

  const { products: catalogProducts, loading: catalogLoading } = useProducts({ page_size: 48 })
  const { products: latestStockedProducts, loading: newLoading } = useProducts({
    page_size: 5,
    ordering: '-created_at',
    inventory_status: 'available',
  })
  const [featuredSeedProducts, setFeaturedSeedProducts] = useState<CatalogProduct[]>([])
  const [featuredLoading, setFeaturedLoading] = useState(true)
  const visibleCategories = categories.filter((category) => {
    const normalizedName = category.name.trim().toLowerCase()
    const normalizedSlug = category.slug.trim().toLowerCase()
    return normalizedName !== 'collections' && normalizedSlug !== 'collections'
  })

  const prescriptionPathFor = (product: Pick<CatalogProduct, 'id' | 'name' | 'variantId'>) => {
    const params = new URLSearchParams({
      product_id: String(product.id),
      product_name: product.name,
    })
    if (product.variantId) params.set('variant_id', String(product.variantId))
    return `/prescriptions?${params.toString()}`
  }

  const isDealProduct = (product: CatalogProduct) => product.originalPrice !== null && product.originalPrice > product.price
  const getDealSavings = (product: CatalogProduct) => (product.originalPrice ?? product.price) - product.price
  const getProductBadge = (product: CatalogProduct, section: 'deals' | 'featured' | 'new') => {
    if (section !== 'deals') return null
    if (product.badge?.trim()) return product.badge.trim()
    return null
  }

  const showToast = (message: string) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const submitLandingSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const query = searchInput.trim()
    navigate(query ? `/products?query=${encodeURIComponent(query)}` : '/products')
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
      .finally(() => {
        if (!isMounted) return
        setFeaturedLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const featuredProducts = useMemo(() => {
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
  }, [featuredSeedProducts, catalogProducts])

  const newProducts = useMemo(() => latestStockedProducts.slice(0, 5), [latestStockedProducts])

  const spotlightOfferProducts = useMemo(() => {
    return [...catalogProducts]
      .filter((product) => isAvailableProduct(product) && isDealProduct(product))
      .sort((a, b) => getDealSavings(b) - getDealSavings(a))
      .slice(0, 5)
  }, [catalogProducts])

  const productJsonLd = useMemo(() => {
    const items = [...spotlightOfferProducts, ...featuredProducts, ...newProducts]
      .filter((product, index, self) => self.findIndex((p) => p.id === product.id) === index)
      .slice(0, 12)
      .map((product) => ({
        '@type': 'Product',
        name: product.name,
        image: product.image ?? undefined,
        brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
        offers: {
          '@type': 'Offer',
          price: product.price,
          priceCurrency: 'KES',
          availability: product.stockSource === 'out'
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
        },
      }))
    return JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: items })
  }, [spotlightOfferProducts, featuredProducts, newProducts])
  const professionalDashboard =
    user?.role === 'doctor'
      ? { label: 'Doctor dashboard', path: '/doctor/dashboard' }
      : user?.role === 'pediatrician'
        ? { label: 'Pediatrician dashboard', path: '/pediatrician/dashboard' }
        : user?.role === 'pharmacist'
          ? { label: 'Pharmacist dashboard', path: '/pharmacist/dashboard' }
          : null

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

  const renderSkeletonCard = (key: string) => (
    <div className="product-card product-card--skeleton" aria-hidden="true" key={key}>
      <div className="product-card__image skeleton" />
      <div className="product-card__content">
        <div className="skeleton skeleton--text skeleton--text--sm" />
        <div className="skeleton skeleton--text" />
        <div className="skeleton skeleton--text skeleton--text--sm" />
        <div className="product-card__spacer" />
        <div className="skeleton skeleton--bar" />
      </div>
    </div>
  )

  const renderSkeletonGrid = (count: number, compact = false) => (
    <div className={`products__grid${compact ? ' products__grid--compact' : ''}`}>
      {Array.from({ length: count }, (_, i) => renderSkeletonCard(`sk-${i}`))}
    </div>
  )

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
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (event: MediaQueryListEvent) => setReducedMotion(event.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (bannerSlides.length <= 1 || reducedMotion || isCarouselPaused) return undefined
    const t = window.setInterval(() => {
      setCurrentSlide(s => (s + 1) % bannerSlides.length)
    }, 6000)
    return () => window.clearInterval(t)
  }, [bannerSlides.length, reducedMotion, isCarouselPaused])

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
      productId: product.productId,
      variantId: product.variantId,
      name: product.name,
      brand: product.brand,
      price: product.price,
      image: product.image,
      stockSource: product.stockSource === 'out' ? 'warehouse' : (product.stockSource ?? 'branch'),
    })
    setAddedId(product.id)
    showToast(`${product.name} added to cart`)
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
      productId: product.productId,
      variantId: product.variantId,
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

  const renderSectionIcon = (key: 'categories' | 'offers' | 'top' | 'new') => {
    const common = {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
      'aria-hidden': true,
    }
    if (key === 'categories') {
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      )
    }
    if (key === 'offers') {
      return (
        <svg {...common}>
          <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L3 13V3h10l7.59 7.59a2 2 0 0 1 0 2.82z" />
          <path d="M7 7h.01" />
        </svg>
      )
    }
    if (key === 'top') {
      return (
        <svg {...common}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )
    }
    return (
      <svg {...common}>
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
        <circle cx="12" cy="12" r="3.2" />
      </svg>
    )
  }

  const renderSectionHeader = (
    key: 'categories' | 'offers' | 'top' | 'new',
    eyebrow: string,
    title: string,
    subtitle?: string,
  ) => (
    <div className="section__header">
      <span className="section__eyebrow">
        {renderSectionIcon(key)}
        {eyebrow}
      </span>
      <h2 className="section__title">{title}</h2>
      {subtitle && <p className="section__subtitle">{subtitle}</p>}
    </div>
  )

  const renderProductCard = (product: CatalogProduct, section: 'deals' | 'featured' | 'new') => {
    const displayBadge = getProductBadge(product, section)
    const discountPercent =
      product.originalPrice && product.originalPrice > product.price
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : null
    const isOut = product.stockSource === 'out'
    const addLabel = isOut
      ? 'Out of stock'
      : product.requiresPrescription
        ? 'Add Prescription'
        : addedId === product.id
          ? 'Added'
          : 'Add to cart'

    return (
      <article key={product.id} className="product-card">
        <Link
          to={`/product/${product.id}`}
          className="product-card__stretched"
          tabIndex={-1}
          aria-label={`View ${product.name}`}
        />
        <div className="product-card__image">
          {discountPercent !== null ? (
            <span className="product-card__badge product-card__badge--sale">-{discountPercent}%</span>
          ) : displayBadge ? (
            <span className="product-card__badge">{displayBadge}</span>
          ) : null}
          {product.requiresPrescription && (
            <span className="product-card__flag product-card__flag--rx">Rx</span>
          )}
          {isOut && (
            <span className="product-card__flag product-card__flag--out">Out of stock</span>
          )}
          <ImageWithFallback src={product.image} alt={product.name} loading="lazy" />
          <div className="product-card__actions">
            <button
              className={`product-card__action ${wishlist[product.id] ? 'product-card__action--active' : ''}`}
              title={wishlist[product.id] ? 'Remove from favourites' : 'Save to favourites'}
              aria-label={wishlist[product.id] ? 'Remove from favourites' : 'Save to favourites'}
              aria-pressed={wishlist[product.id]}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleWishlist(product)
              }}
            >
              <svg viewBox="0 0 24 24" fill={wishlist[product.id] ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>
        </div>
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
            <button
              className={`product-card__add-to-cart${addedId === product.id ? ' product-card__add-to-cart--added' : ''}${isOut ? ' product-card__add-to-cart--disabled' : ''}`}
              type="button"
              disabled={isOut}
              title={product.requiresPrescription ? 'Upload prescription to request' : 'Add to cart'}
              onClick={() => void handleAddToCart(product)}
            >
              {isOut ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M5.6 5.6l12.8 12.8" />
                </svg>
              ) : product.requiresPrescription ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M9 13h6M9 17h4" />
                </svg>
              ) : addedId === product.id ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="9" cy="20" r="1.4" />
                  <circle cx="18" cy="20" r="1.4" />
                  <path d="M2 3h2.5l2.2 12.3a2 2 0 0 0 2 1.7h8.7a2 2 0 0 0 2-1.6L22 7H5.2" />
                </svg>
              )}
              <span className="product-card__add-to-cart-label">{addLabel}</span>
            </button>
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
      <section
        className="hero-carousel"
        id="main-content"
        aria-roledescription="carousel"
        aria-label="Promotional banners"
        onMouseEnter={() => setIsCarouselPaused(true)}
        onMouseLeave={() => setIsCarouselPaused(false)}
        onFocus={() => setIsCarouselPaused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsCarouselPaused(false)
        }}
      >
        <h1 className="hero-carousel__sr-title">
          Ava Pharmacy: online pharmacy, doctor consultations, lab tests and prescriptions delivered across Kenya
        </h1>
        <div
          className={`hero-carousel__track${reducedMotion ? ' hero-carousel__track--reduced' : ''}`}
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {bannerSlides.map((slide, index) => (
            <Link
              key={slide.id}
              to={slide.cta.link}
              className={`hero-carousel__slide hero-banner hero-banner--${slide.design ?? 'split'}`}
              style={{ '--hb-from': slide.theme.from, '--hb-to': slide.theme.to, '--hb-accent': slide.theme.accent } as CSSProperties}
              aria-label={slide.headline}
            >
              <div className="hero-banner__content">
                <span className="hero-banner__eyebrow">{slide.eyebrow}</span>
                <h2 className="hero-banner__headline">{slide.headline}</h2>
                <p className="hero-banner__supporting">{slide.supporting}</p>
                <span className="hero-banner__cta">
                  {slide.cta.label}
                  <span aria-hidden="true">→</span>
                </span>
                <ul className="hero-banner__trust">
                  {slide.trust.map((item) => (
                    <li key={item}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="hero-banner__visual">
                <span className="hero-banner__blob" aria-hidden="true" />
                {slide.badge && <span className="hero-banner__badge">{slide.badge}</span>}
                {slide.image && (
                  <ImageWithFallback
                    src={slide.image}
                    alt={slide.headline}
                    className="hero-banner__product"
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                )}
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

      <section className="home-search" aria-label="Search the store">
        <div className="container">
          <form className="home-search__form" role="search" onSubmit={submitLandingSearch}>
            <svg className="home-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              className="home-search__input"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search medicines, supplements, devices…"
              aria-label="Search products"
            />
            <button className="home-search__btn" type="submit">Search</button>
          </form>
        </div>
      </section>

      {professionalDashboard && (
        <section className="hero__quick-links hero__quick-links--professional" aria-label="Professional shortcuts">
          <div className="container">
            <span className="hero__quick-links-label">Your workspace</span>
            <div className="hero__quick-links-list">
              <Link to={professionalDashboard.path} className="hero__quick-link hero__quick-link--dashboard">
                {professionalDashboard.label}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      )}

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
            {renderSectionHeader('categories', 'Browse', 'Shop by Category', 'Find what you need by department, from everyday medicines to wellness.')}
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
          {renderSectionHeader('offers', 'Limited time', 'Products On Offer', 'Monthly deals on health essentials, while stocks last.')}
          {catalogLoading ? (
            renderSkeletonGrid(5, true)
          ) : spotlightOfferProducts.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state__message">No live offers are available right now.</p>
            </div>
          ) : (
            <div className="products__grid products__grid--compact">
              {spotlightOfferProducts.map((product) => renderProductCard(product, 'deals'))}
            </div>
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
          {renderSectionHeader('top', 'Customer favourites', 'Top Rated Products', 'Highly rated by shoppers like you.')}
          {featuredLoading && catalogLoading ? (
            renderSkeletonGrid(5)
          ) : featuredProducts.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state__message">No top rated products available at the moment.</p>
            </div>
          ) : (
            <div className="products__grid">
              {featuredProducts.map((product) => renderProductCard(product, 'featured'))}
            </div>
          )}
          <div className="featured-products__cta">
            <Link to="/products?sort=rating" className="featured-products__link-cta">
              View All Top Rated Products
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="hp-services">
        <div className="container">
          <div className="hp-services__shell">
            <div className="hp-services__intro">
              <h2 className="hp-services__title">Choose care faster</h2>
              <p className="hp-services__sub">
                Book a doctor, pediatric visit, prescription review, or lab test from one place.
              </p>
              <div className="hp-services__tags" aria-label="Service highlights">
                <span className="hp-services__tag">Doctor</span>
                <span className="hp-services__tag">Pediatrics</span>
                <span className="hp-services__tag">Prescriptions</span>
                <span className="hp-services__tag">Lab tests</span>
              </div>
            </div>

            <div className="hp-services__grid">
              <Link to="/doctor-consultation" className="hp-svc-card hp-svc-card--doctor">
                <div className="hp-svc-card__icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z"/>
                    <path d="M20 21a8 8 0 1 0-16 0"/>
                    <path d="M16 11v4M14 13h4"/>
                  </svg>
                </div>
                <div className="hp-svc-card__body">
                  <p className="hp-svc-card__eyebrow">Online care</p>
                  <h3 className="hp-svc-card__title">Speak to a Doctor</h3>
                  <p className="hp-svc-card__desc">Licensed clinician support online.</p>
                </div>
                <span className="hp-svc-card__arrow" aria-hidden="true">→</span>
              </Link>

              <Link to="/pediatric-consultation" className="hp-svc-card hp-svc-card--paed">
                <div className="hp-svc-card__icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="6" r="3"/>
                    <path d="M9 14c-3 0-5 1.5-5 3v1h16v-1c0-1.5-2-3-5-3"/>
                    <path d="M8 10c0 0-1 3 4 3s4-3 4-3"/>
                  </svg>
                </div>
                <div className="hp-svc-card__body">
                  <p className="hp-svc-card__eyebrow">Pediatrics</p>
                  <h3 className="hp-svc-card__title">Pediatric Care</h3>
                  <p className="hp-svc-card__desc">Care for infants, children, and teens.</p>
                </div>
                <span className="hp-svc-card__arrow" aria-hidden="true">→</span>
              </Link>

              <Link to="/prescriptions" className="hp-svc-card hp-svc-card--rx">
                <div className="hp-svc-card__icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="9" y1="13" x2="15" y2="13"/>
                    <line x1="9" y1="17" x2="13" y2="17"/>
                  </svg>
                </div>
                <div className="hp-svc-card__body">
                  <p className="hp-svc-card__eyebrow">Prescription</p>
                  <h3 className="hp-svc-card__title">Upload Prescription</h3>
                  <p className="hp-svc-card__desc">Send an Rx for pharmacist review.</p>
                </div>
                <span className="hp-svc-card__arrow" aria-hidden="true">→</span>
              </Link>

              <Link to="/laboratory" className="hp-svc-card hp-svc-card--lab">
                <div className="hp-svc-card__icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11M3 9h18M3 9l3 9h12l3-9"/>
                    <circle cx="12" cy="16" r="1"/>
                  </svg>
                </div>
                <div className="hp-svc-card__body">
                  <p className="hp-svc-card__eyebrow">Lab testing</p>
                  <h3 className="hp-svc-card__title">Book Lab Tests</h3>
                  <p className="hp-svc-card__desc">Schedule tests and sample collection.</p>
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
          {renderSectionHeader('new', 'Just in', 'New Products', 'Fresh stock added to our shelves.')}
          {newLoading ? (
            renderSkeletonGrid(5)
          ) : newProducts.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state__message">No new products have been added yet.</p>
            </div>
          ) : (
            <div className="products__grid">
              {newProducts.map((product) => renderProductCard(product, 'new'))}
            </div>
          )}
          <div className="featured-products__cta">
            <Link to="/products?sort=newest" className="featured-products__link-cta">
              View All New Products
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <SupportShortcuts />

      {toast && (
        <div className="home-toast" role="status" aria-live="polite">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>{toast}</span>
        </div>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd }} />
    </div>
  )
}

export default HomePage
