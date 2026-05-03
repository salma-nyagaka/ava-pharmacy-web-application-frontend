import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import { useAuth } from '../../context/AuthContext'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { CartItem } from '../../data/cart'
import { cartService } from '../../services/cartService'
import '../../styles/pages/CartPage.css'

function CartPage() {
  const { isLoggedIn } = useAuth()
  const { settings } = useSiteSettings()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [movedId, setMovedId] = useState<number | null>(null)

  useEffect(() => {
    const refresh = () => { void cartService.list().then((r) => setCartItems(r.data)) }
    refresh()
    return cartService.subscribe(refresh)
  }, [])

  const subtotal = useMemo(() => cartItems.reduce((s, i) => s + i.price * i.quantity, 0), [cartItems])
  const delivery = subtotal >= settings.freeDeliveryThreshold || cartItems.length === 0 ? 0 : settings.baseDeliveryFee
  const total = subtotal + delivery
  const deliveryProgress = settings.freeDeliveryThreshold > 0
    ? Math.min(100, (subtotal / settings.freeDeliveryThreshold) * 100)
    : 100
  const amountToFree = Math.max(0, settings.freeDeliveryThreshold - subtotal)
  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0)
  const prescriptionItemCount = cartItems.filter((item) => !!item.prescriptionId).length

  const fmt = (n: number) => `KSh ${n.toLocaleString()}`

  const changeQty = (item: CartItem, next: number) =>
    void cartService.updateQuantity(item.serverItemId ?? item.id, next, item.prescriptionId).then((r) => setCartItems(r.data))

  const removeItem = (item: CartItem) =>
    void cartService.remove(item.serverItemId ?? item.id, item.prescriptionId).then((r) => setCartItems(r.data))

  const moveToWishlist = (item: CartItem) => {
    setMovedId(item.id)
    void cartService.moveToWishlist(item).then((r) => setCartItems(r.data))
    window.setTimeout(() => setMovedId(null), 1500)
  }

  return (
    <div className="cart-page">
      <div className="container">

        <nav className="cart-breadcrumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <span>Cart</span>
        </nav>

        <div className="cart-header">
          <h1 className="cart-header__title">
            Shopping Cart
            {itemCount > 0 && <span className="cart-header__count">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>}
          </h1>
          {cartItems.length > 0 && (
            <Link to="/products" className="cart-header__continue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Continue shopping
            </Link>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </div>
            <h2 className="cart-empty__title">Your cart is empty</h2>
            <p className="cart-empty__sub">Browse our products or upload a prescription to add items.</p>
            <div className="cart-empty__actions">
              <Link to="/products" className="btn btn--primary">Browse Products</Link>
              <Link to="/prescriptions" className="btn btn--outline">Upload Prescription</Link>
            </div>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-items">
              {prescriptionItemCount > 0 && (
                <div className="cart-rx-banner">
                  <div className="cart-rx-banner__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M7 7h6a4 4 0 0 1 0 8H7l10 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="cart-rx-banner__title">Prescription-linked items in cart</p>
                    <p className="cart-rx-banner__text">
                      These items were added from an approved prescription and stay tied to the prescription reference shown on each line item.
                    </p>
                  </div>
                </div>
              )}
              <div className="cart-items__head">
                <span>Product</span>
                <span>Qty</span>
                <span>Total</span>
              </div>

              {cartItems.map((item) => (
                <div key={`${item.serverItemId ?? item.id}-${item.prescriptionId ?? 'direct'}`} className="cart-item">
                  <Link to={`/product/${item.id}`} className="cart-item__img-wrap">
                    <ImageWithFallback src={item.image} alt={item.name} className="cart-item__image" />
                  </Link>

                  <div className="cart-item__details">
                    <Link to={`/product/${item.id}`} className="cart-item__name">{item.name}</Link>
                    <p className="cart-item__brand">{item.brand}</p>
                    <p className="cart-item__unit-price">{fmt(item.price)} / unit</p>
                    {item.stockSource && (
                      <span className={`cart-item__stock cart-item__stock--${item.stockSource}`}>
                        {item.stockSource === 'branch' ? 'Branch stock' : 'Central warehouse'}
                      </span>
                    )}
                    {item.prescriptionId && (
                      <span className="cart-item__rx">Rx #{item.prescriptionId}</span>
                    )}
                  </div>

                  <div className="cart-item__qty">
                    <button type="button" className="cart-item__qty-btn" onClick={() => changeQty(item, item.quantity - 1)} aria-label="Decrease">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    <span className="cart-item__qty-val">{item.quantity}</span>
                    <button type="button" className="cart-item__qty-btn" onClick={() => changeQty(item, item.quantity + 1)} aria-label="Increase">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                  </div>

                  <div className="cart-item__right">
                    <span className="cart-item__total">{fmt(item.price * item.quantity)}</span>
                    <div className="cart-item__action-row">
                      <button className={`cart-item__move ${movedId === item.id ? 'cart-item__move--done' : ''}`} type="button" onClick={() => moveToWishlist(item)}>
                        {movedId === item.id ? 'Moved' : 'Move to favourites'}
                      </button>
                      <button className="cart-item__remove" type="button" onClick={() => removeItem(item)} aria-label="Remove">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <h2 className="cart-summary__title">Order Summary</h2>

              <div className="cart-delivery-bar">
                {amountToFree > 0 ? (
                  <>
                    <p className="cart-delivery-bar__label">Add <strong>{fmt(amountToFree)}</strong> more for free delivery</p>
                    <div className="cart-delivery-bar__track">
                      <div className="cart-delivery-bar__fill" style={{ width: `${deliveryProgress}%` }} />
                    </div>
                  </>
                ) : (
                  <p className="cart-delivery-bar__free">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                    Free delivery applied!
                  </p>
                )}
              </div>

              <div className="cart-summary__rows">
                <div className="cart-summary__row">
                  <span>Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                <div className="cart-summary__row">
                  <span>Delivery</span>
                  <span className={delivery === 0 ? 'cart-summary__free' : ''}>{delivery === 0 ? 'Free' : fmt(delivery)}</span>
                </div>
                <div className="cart-summary__row cart-summary__row--total">
                  <span>Total</span>
                  <span>{fmt(total)}</span>
                </div>
              </div>

              {isLoggedIn ? (
                <Link to="/checkout" className="btn btn--primary btn--lg cart-summary__cta">
                  Proceed to Checkout
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
              ) : (
                <div className="cart-auth-gate">
                  <p className="cart-auth-gate__title">Sign in to continue to checkout</p>
                  <p className="cart-auth-gate__text">Use your AVA Health account or create one to continue with delivery and payment.</p>
                  <div className="cart-auth-gate__actions">
                    <Link to="/login?redirect=%2Fcheckout" className="btn btn--primary btn--lg cart-summary__cta">
                      Sign In
                    </Link>
                    <Link to="/register?redirect=%2Fcheckout" className="btn btn--outline btn--lg">
                      Create Account
                    </Link>
                  </div>
                </div>
              )}

              <p className="cart-summary__note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Items reserved for 30 minutes during checkout
              </p>
              <p className="cart-summary__note cart-summary__note--rx">
                Need a prescription medicine? Upload your prescription first, then continue once it has been approved.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CartPage
