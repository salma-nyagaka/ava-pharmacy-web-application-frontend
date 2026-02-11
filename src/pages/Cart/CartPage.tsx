import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import { CartItem } from '../../data/cart'
import { cartService } from '../../services/cartService'
import './CartPage.css'

function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  useEffect(() => {
    const refresh = () => {
      void cartService.list().then((response) => setCartItems(response.data))
    }
    refresh()
    const unsubscribe = cartService.subscribe(() => {
      refresh()
    })
    return unsubscribe
  }, [])

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  )
  const delivery = subtotal >= 3000 || cartItems.length === 0 ? 0 : 300
  const total = subtotal + delivery

  const formatPrice = (price: number) => `KSh ${price.toLocaleString()}`

  const changeQty = (item: CartItem, next: number) => {
    void cartService.updateQuantity(item.id, next, item.prescriptionId).then((response) => {
      setCartItems(response.data)
    })
  }

  const removeItem = (item: CartItem) => {
    void cartService.remove(item.id, item.prescriptionId).then((response) => {
      setCartItems(response.data)
    })
  }

  return (
    <div className="cart-page">
      <div className="container">
        <h1 className="cart-page__title">Shopping Cart</h1>

        <div className="cart-page__layout">
          <div className="cart-page__items">
            {cartItems.map((item) => (
              <div key={`${item.id}-${item.prescriptionId ?? 'direct'}`} className="cart-item">
                <ImageWithFallback src={item.image} alt={item.name} className="cart-item__image" />
                <div className="cart-item__details">
                  <h3 className="cart-item__name">{item.name}</h3>
                  <p className="cart-item__brand">{item.brand}</p>
                  <p className="cart-item__price">{formatPrice(item.price)}</p>
                  {item.stockSource && (
                    <p className="cart-item__brand">
                      {item.stockSource === 'branch' ? 'Branch stock' : 'Central warehouse'}
                    </p>
                  )}
                  {item.prescriptionId && (
                    <p className="cart-item__brand">From prescription {item.prescriptionId}</p>
                  )}
                </div>
                <div className="cart-item__quantity">
                  <button type="button" onClick={() => changeQty(item, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => changeQty(item, item.quantity + 1)}>+</button>
                </div>
                <div className="cart-item__total">{formatPrice(item.price * item.quantity)}</div>
                <button className="cart-item__remove" type="button" onClick={() => removeItem(item)}>Remove</button>
              </div>
            ))}
            {cartItems.length === 0 && (
              <div className="cart-item">
                <div className="cart-item__details">
                  <h3 className="cart-item__name">Your cart is empty.</h3>
                  <p className="cart-item__brand">Browse products or upload a prescription to add items.</p>
                  <div style={{ marginTop: '0.75rem' }}>
                    <Link to="/products" className="btn btn--outline btn--sm">Continue shopping</Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="cart-page__summary">
            <h2>Order Summary</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Delivery</span>
              <span>{delivery === 0 ? 'Free' : formatPrice(delivery)}</span>
            </div>
            <div className="summary-row summary-row--total">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <p className="cart-item__brand">Cart items are reserved for 30 minutes during checkout.</p>
            <Link to="/checkout" className="btn btn--primary btn--lg">Proceed to Checkout</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartPage
