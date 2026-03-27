import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import { useAuth } from '../../context/AuthContext'
import type { StockSource } from '../../data/cart'
import { cartService } from '../../services/cartService'
import { favouritesService } from '../../services/favouritesService'
import {
  fetchAvailability,
  fetchProductById,
  fetchProductReviews,
  fetchProducts,
  submitProductReview,
  type ProductDetail,
  type ProductReview,
} from '../../services/productService'
import '../../styles/pages/ProductDetailPage.css'

type RelatedProduct = {
  id: number
  name: string
  price: number
  image: string
  rating: number
}

function normalizeFeatures(features: ProductDetail['features']) {
  if (Array.isArray(features)) return features.filter(Boolean)
  return String(features || '')
    .split(/\r?\n|•/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatPrice(price: number) {
  return `KSh ${price.toLocaleString()}`
}

function formatReviewDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'
  return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })
}

function ProductDetailPage() {
  const navigate = useNavigate()
  const { user, isLoggedIn } = useAuth()
  const { id: routeId } = useParams()
  const [searchParams] = useSearchParams()
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [restockEnabled, setRestockEnabled] = useState(false)
  const [cartMessage, setCartMessage] = useState('')
  const [isFavourite, setIsFavourite] = useState(false)
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([])
  const [liveAvailability, setLiveAvailability] = useState<{ is_available: boolean; stock_source: string; quantity: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  const parsedId = Number.parseInt(routeId ?? '0', 10) || 0

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [routeId])

  useEffect(() => {
    if (!parsedId) {
      setLoadError('Product not found.')
      setIsLoading(false)
      return
    }

    let active = true
    setIsLoading(true)
    setLoadError('')

    void Promise.all([fetchProductById(parsedId), fetchProductReviews(parsedId)])
      .then(async ([detail, productReviews]) => {
        if (!active) return
        setProduct(detail)
        setReviews(productReviews)

        if (detail.category?.slug) {
          try {
            const related = await fetchProducts({ category: detail.category.slug, page_size: 4 })
            if (!active) return
            setRelatedProducts(
              related.data
                .filter((item) => item.id !== parsedId)
                .slice(0, 3)
                .map((item) => ({
                  id: item.id,
                  name: item.name,
                  price: Number.parseFloat(item.final_price ?? item.price ?? '0'),
                  image: item.image ?? '',
                  rating: item.average_rating ?? 0,
                })),
            )
          } catch {
            if (active) setRelatedProducts([])
          }
        } else {
          setRelatedProducts([])
        }
      })
      .catch(() => {
        if (!active) return
        setLoadError('We could not load this product right now.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [parsedId])

  useEffect(() => {
    if (!parsedId) return
    let active = true

    const loadAvailability = () => {
      void fetchAvailability([parsedId])
        .then((rows) => {
          if (!active) return
          setLiveAvailability(rows[0] ?? null)
        })
        .catch(() => {})
    }

    loadAvailability()
    const intervalId = window.setInterval(loadAvailability, 30000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [parsedId])

  useEffect(() => {
    if (!parsedId) return

    const refreshWishlist = () => {
      void favouritesService.list().then((response) => {
        setIsFavourite(response.data.some((item) => item.id === parsedId))
      })
    }

    refreshWishlist()
    return favouritesService.subscribe(refreshWishlist)
  }, [parsedId])

  useEffect(() => {
    const currentUserReview = reviews.find((review) => review.user === user?.id)
    if (currentUserReview) {
      setReviewRating(currentUserReview.rating)
      setReviewComment(currentUserReview.comment)
    } else {
      setReviewRating(0)
      setReviewComment('')
    }
  }, [reviews, user?.id])

  useEffect(() => {
    if (!product || searchParams.get('review') !== '1') return
    document.getElementById('write-review')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [product, searchParams])

  const imageGallery = useMemo(() => {
    if (!product) return []
    const gallery = [product.image, ...(product.gallery ?? []).map((item) => item.image)].filter(Boolean) as string[]
    return Array.from(new Set(gallery))
  }, [product])

  const currentPrice = Number.parseFloat(product?.final_price ?? product?.price ?? '0')
  const originalPrice = product?.original_price ? Number.parseFloat(product.original_price) : null
  const averageRating = product?.average_rating ?? 0
  const reviewCount = product?.review_count ?? 0
  const featureList = normalizeFeatures(product?.features ?? [])

  const stockSource: StockSource = liveAvailability?.stock_source === 'warehouse'
    ? 'warehouse'
    : liveAvailability?.stock_source === 'out'
      ? 'out'
      : product?.inventory_status === 'backorder'
        ? 'warehouse'
        : product?.inventory_status === 'out_of_stock'
          ? 'out'
          : 'branch'
  const inStock = liveAvailability?.is_available ?? Boolean(product?.can_purchase)

  const prescriptionRedirectTarget = useMemo(
    () => `/prescriptions?product_id=${product?.id ?? 0}&product_name=${encodeURIComponent(product?.name ?? '')}`,
    [product?.id, product?.name],
  )
  const loginForPrescriptionPath = `/login?redirect=${encodeURIComponent(prescriptionRedirectTarget)}`
  const registerForPrescriptionPath = `/register?redirect=${encodeURIComponent(prescriptionRedirectTarget)}`

  const getStockLabel = () => {
    if (stockSource === 'branch') return 'In stock at branch. Ready for quick fulfilment.'
    if (stockSource === 'warehouse') return 'Available from warehouse stock. Delivery may take a little longer.'
    return 'Out of stock. Turn on a restock alert and we will let you know when it is back.'
  }

  const renderStars = (rating: number) => {
    const fullStars = Math.min(5, Math.max(0, Math.round(rating)))
    const stars = []
    for (let i = 0; i < fullStars; i += 1) {
      stars.push(
        <svg key={`full-${i}`} className="star star--filled" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>,
      )
    }
    for (let i = fullStars; i < 5; i += 1) {
      stars.push(
        <svg key={`empty-${i}`} className="star" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>,
      )
    }
    return stars
  }

  const handleAddToCart = async () => {
    if (!product) return
    if (product.requires_prescription) {
      setCartMessage('Upload a valid prescription first. Approved prescription items can then be requested from your prescription history.')
      return
    }
    if (!inStock) return

    await cartService.add(
      {
        id: product.id,
        name: product.name,
        brand: product.brand?.name ?? product.brand_name,
        price: currentPrice,
        image: imageGallery[0] ?? '',
        stockSource: stockSource === 'out' ? undefined : stockSource,
      },
      quantity,
    )
    setCartMessage('Added to cart.')
    window.setTimeout(() => setCartMessage(''), 1500)
  }

  const handleToggleWishlist = () => {
    if (!product) return
    if (!isLoggedIn) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      return
    }
    void favouritesService.toggle({
      id: product.id,
      name: product.name,
      brand: product.brand?.name ?? product.brand_name,
      price: currentPrice,
      originalPrice,
      image: imageGallery[0] ?? '',
      stockSource,
    })
  }

  const handleSubmitReview = async () => {
    if (!product) return
    if (!isLoggedIn) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + '?review=1')}`)
      return
    }
    if (!reviewRating) {
      setReviewError('Select a rating before submitting your review.')
      return
    }

    setIsSubmittingReview(true)
    setReviewError('')
    setReviewSuccess('')
    try {
      await submitProductReview(product.id, { rating: reviewRating, comment: reviewComment.trim() })
      const updatedReviews = await fetchProductReviews(product.id)
      setReviews(updatedReviews)
      setReviewSuccess('Your review has been saved.')
    } catch (error: unknown) {
      const message =
        typeof error === 'object'
        && error !== null
        && 'response' in error
        && typeof (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message === 'string'
          ? (error as { response?: { data?: { error?: { message?: string } } } }).response!.data!.error!.message!
          : 'We could not save your review right now.'
      setReviewError(message)
    } finally {
      setIsSubmittingReview(false)
    }
  }

  if (isLoading) {
    return (
      <div className="pdp">
        <div className="container">
          <p>Loading product…</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="pdp">
        <div className="container">
          <p>{loadError || 'Product not found.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pdp">
      <div className="container">
        <nav className="breadcrumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to={`/products?category=${product.category.slug}`}>{product.category.name}</Link>
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        <div className="pdp__main">
          <div className="pdp__gallery">
            <div className="pdp__main-image">
              <ImageWithFallback src={imageGallery[selectedImage] ?? product.image ?? ''} alt={product.name} />
            </div>
            <div className="pdp__thumbnails">
              {imageGallery.map((image, index) => (
                <button
                  key={image}
                  className={`pdp__thumbnail ${selectedImage === index ? 'pdp__thumbnail--active' : ''}`}
                  onClick={() => setSelectedImage(index)}
                  type="button"
                >
                  <ImageWithFallback src={image} alt={`${product.name} ${index + 1}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="pdp__info">
            <span className="pdp__brand">{product.brand?.name ?? product.brand_name}</span>
            <h1 className="pdp__title">{product.name}</h1>

            <div className="pdp__rating-section">
              <div className="pdp__stars">{renderStars(averageRating)}</div>
              <span className="pdp__rating-text">{averageRating.toFixed(1)} ({reviewCount} reviews)</span>
            </div>

            <div className="pdp__pricing">
              <span className="pdp__price">{formatPrice(currentPrice)}</span>
              {originalPrice && <span className="pdp__original-price">{formatPrice(originalPrice)}</span>}
              {originalPrice && (
                <span className="pdp__savings">Save {Math.round((1 - currentPrice / originalPrice) * 100)}%</span>
              )}
            </div>

            <p className="pdp__sku">SKU: {product.sku}</p>

            <div className="pdp__availability">
              {inStock ? (
                <span className="pdp__in-stock">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  {stockSource === 'warehouse' ? 'Warehouse Stock' : 'In Stock'}
                </span>
              ) : (
                <span className="pdp__out-of-stock">Out of Stock</span>
              )}
            </div>
            <p className="pdp__sku">{getStockLabel()}</p>

            <div className="pdp__description">
              <p>{product.description || product.short_description}</p>
            </div>

            {product.requires_prescription ? (
              <div className="pdp__rx-gate">
                <div className="pdp__rx-gate-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M7 7h6a4 4 0 0 1 0 8H7l10 7" />
                  </svg>
                  Prescription required
                </div>
                <p className="pdp__rx-gate-text">
                  This medicine cannot be added directly to cart. Upload a valid prescription so our pharmacists can review it and prepare your request safely.
                </p>
                <div className="pdp__rx-gate-actions">
                  {isLoggedIn ? (
                    <>
                      <Link to={prescriptionRedirectTarget} className="btn btn--primary btn--lg pdp__add-to-cart">
                        Upload Prescription to Request
                      </Link>
                      <Link to="/prescriptions/history" className="btn btn--outline btn--lg">
                        View Prescription History
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link to={loginForPrescriptionPath} className="btn btn--primary btn--lg pdp__add-to-cart">
                        Sign In to Upload Prescription
                      </Link>
                      <Link to={registerForPrescriptionPath} className="btn btn--outline btn--lg">
                        Create Account
                      </Link>
                    </>
                  )}
                </div>
                <p className="pdp__rx-gate-note">
                  Once your prescription is approved, your pharmacist will confirm the request and you can continue from your prescription history.
                </p>
              </div>
            ) : (
              <div className="pdp__actions">
                <div className="quantity-selector">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} type="button">-</button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(event) => setQuantity(Math.max(1, Number.parseInt(event.target.value, 10) || 1))}
                  />
                  <button onClick={() => setQuantity(quantity + 1)} type="button">+</button>
                </div>

                {inStock ? (
                  <button className="btn btn--primary btn--lg pdp__add-to-cart" type="button" onClick={() => void handleAddToCart()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                    Add to cart
                  </button>
                ) : (
                  <button className="btn btn--outline btn--lg pdp__add-to-cart" type="button" onClick={() => setRestockEnabled((prev) => !prev)}>
                    {restockEnabled ? 'Restock Alert Enabled' : 'Notify on Restock'}
                  </button>
                )}

                <button
                  className={`pdp__wishlist-btn ${isFavourite ? 'pdp__wishlist-btn--active' : ''}`}
                  type="button"
                  onClick={handleToggleWishlist}
                  title={isFavourite ? 'Remove from favourites' : 'Save to favourites'}
                >
                  <svg viewBox="0 0 24 24" fill={isFavourite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              </div>
            )}
            {cartMessage && <p className="pdp__sku">{cartMessage}</p>}

            <div className="pdp__trust-badges">
              <div className="trust-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>100% Genuine</span>
              </div>
              <div className="trust-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                <span>Fast Delivery</span>
              </div>
              <div className="trust-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Easy Returns</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pdp__tabs">
          <div className="tabs">
            <button className="tab tab--active" type="button">Description</button>
            <button className="tab" type="button">Features</button>
            <button className="tab" type="button">Reviews ({reviewCount})</button>
          </div>

          <div className="tab-content">
            <div className="tab-panel">
              <h3>Product Description</h3>
              <p>{product.description || product.short_description}</p>
              {featureList.length > 0 && (
                <>
                  <h4>Features</h4>
                  <ul>
                    {featureList.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </>
              )}
              {product.directions && (
                <>
                  <h4>Directions</h4>
                  <p>{product.directions}</p>
                </>
              )}
              {product.warnings && (
                <>
                  <h4>Warnings</h4>
                  <p>{product.warnings}</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="pdp__reviews">
          <h2>Customer Reviews</h2>
          <div className="reviews-summary">
            <div className="reviews-summary__score">
              <span className="reviews-summary__number">{averageRating.toFixed(1)}</span>
              <div className="reviews-summary__stars">{renderStars(averageRating)}</div>
              <span className="reviews-summary__count">Based on {reviewCount} reviews</span>
            </div>
          </div>

          <div id="write-review" className="review">
            <div className="review__header">
              <strong>{isLoggedIn ? 'Write or update your review' : 'Sign in to review this product'}</strong>
            </div>
            <div className="review__stars" style={{ marginBottom: '0.75rem' }}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  className="pdp__wishlist-btn"
                  type="button"
                  onClick={() => setReviewRating(value)}
                  aria-label={`Rate ${value} stars`}
                  style={{ width: 'auto', height: 'auto', border: 'none', background: 'transparent' }}
                >
                  {renderStars(value <= reviewRating ? 1 : 0)[0]}
                </button>
              ))}
            </div>
            <textarea
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              placeholder="Share your experience with this product."
              rows={4}
              style={{ width: '100%', borderRadius: '16px', padding: '1rem', border: '1px solid #dbe2ea', marginBottom: '0.75rem' }}
            />
            {reviewError && <p className="pdp__sku" style={{ color: '#b91c1c' }}>{reviewError}</p>}
            {reviewSuccess && <p className="pdp__sku" style={{ color: '#15803d' }}>{reviewSuccess}</p>}
            {isLoggedIn ? (
              <button className="btn btn--primary" type="button" onClick={() => void handleSubmitReview()} disabled={isSubmittingReview}>
                {isSubmittingReview ? 'Saving review…' : 'Save Review'}
              </button>
            ) : (
              <Link className="btn btn--primary" to={`/login?redirect=${encodeURIComponent(window.location.pathname + '?review=1')}`}>
                Sign In to Review
              </Link>
            )}
            <p className="pdp__sku" style={{ marginTop: '0.75rem' }}>
              Reviews are available after a delivered order for this product.
            </p>
          </div>

          <div className="reviews-list">
            {reviews.length === 0 ? (
              <div className="review">
                <p className="review__comment">No reviews yet. Be the first to share your experience.</p>
              </div>
            ) : reviews.map((review) => (
              <div key={review.id} className="review">
                <div className="review__header">
                  <div className="review__stars">{renderStars(review.rating)}</div>
                  <span className="review__date">{formatReviewDate(review.created_at)}</span>
                </div>
                <p className="review__author">
                  {review.user_name}
                  {review.is_verified_purchase && <span className="review__verified">Verified Purchase</span>}
                </p>
                <p className="review__comment">{review.comment || 'No written comment provided.'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="pdp__related">
          <h2>Related Products</h2>
          <div className="related-products">
            {relatedProducts.map((relatedProduct) => (
              <Link key={relatedProduct.id} to={`/product/${relatedProduct.id}`} className="related-product">
                <ImageWithFallback src={relatedProduct.image} alt={relatedProduct.name} />
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
