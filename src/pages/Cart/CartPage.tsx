import { Link } from 'react-router-dom'
import './CartPage.css'

function CartPage() {
  const cartItems = [
    {
      id: 1,
      name: 'Vitamin C 1000mg',
      brand: 'HealthPlus',
      price: 1250,
      quantity: 2,
      image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&h=200&fit=crop',
    },
    {
      id: 2,
      name: 'Digital Blood Pressure Monitor',
      brand: 'MedTech',
      price: 4500,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=200&h=200&fit=crop',
    },
  ]

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const delivery = 300
  const total = subtotal + delivery

  const formatPrice = (price: number) => `KSh ${price.toLocaleString()}`

  return (
    <div className="cart-page">
      <div className="container">
        <h1 className="cart-page__title">Shopping Cart</h1>

        <div className="cart-page__layout">
          <div className="cart-page__items">
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} className="cart-item__image" />
                <div className="cart-item__details">
                  <h3 className="cart-item__name">{item.name}</h3>
                  <p className="cart-item__brand">{item.brand}</p>
                  <p className="cart-item__price">{formatPrice(item.price)}</p>
                </div>
                <div className="cart-item__quantity">
                  <button>-</button>
                  <span>{item.quantity}</span>
                  <button>+</button>
                </div>
                <div className="cart-item__total">{formatPrice(item.price * item.quantity)}</div>
                <button className="cart-item__remove">Remove</button>
              </div>
            ))}
          </div>

          <div className="cart-page__summary">
            <h2>Order Summary</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Delivery</span>
              <span>{formatPrice(delivery)}</span>
            </div>
            <div className="summary-row summary-row--total">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <Link to="/checkout" className="btn btn--primary btn--lg">Proceed to Checkout</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartPage
