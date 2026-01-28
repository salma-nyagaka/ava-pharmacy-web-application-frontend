import { useState } from 'react'
import { Link } from 'react-router-dom'
import './CheckoutPage.css'

function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState(1)

  const cartItems = [
    {
      id: 1,
      name: 'Vitamin C 1000mg',
      quantity: 2,
      price: 1250,
    },
    {
      id: 2,
      name: 'Digital Blood Pressure Monitor',
      quantity: 1,
      price: 4500,
    },
  ]

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const delivery = 300
  const total = subtotal + delivery

  const formatPrice = (price: number) => `KSh ${price.toLocaleString()}`

  const steps = [
    { number: 1, title: 'Shipping', icon: 'truck' },
    { number: 2, title: 'Payment', icon: 'card' },
    { number: 3, title: 'Review', icon: 'check' },
  ]

  return (
    <div className="checkout">
      <div className="container">
        <h1 className="checkout__title">Checkout</h1>

        {/* Progress Steps */}
        <div className="checkout__steps">
          {steps.map((step) => (
            <div
              key={step.number}
              className={`checkout-step ${currentStep >= step.number ? 'checkout-step--active' : ''} ${currentStep > step.number ? 'checkout-step--completed' : ''}`}
            >
              <div className="checkout-step__number">{step.number}</div>
              <span className="checkout-step__title">{step.title}</span>
            </div>
          ))}
        </div>

        <div className="checkout__layout">
          {/* Forms */}
          <div className="checkout__main">
            {/* Step 1: Shipping */}
            {currentStep === 1 && (
              <div className="checkout-section">
                <h2>Shipping Information</h2>
                <form className="checkout-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name *</label>
                      <input type="text" required />
                    </div>
                    <div className="form-group">
                      <label>Last Name *</label>
                      <input type="text" required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input type="email" required />
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input type="tel" required />
                  </div>
                  <div className="form-group">
                    <label>Street Address *</label>
                    <input type="text" required />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>City *</label>
                      <input type="text" required />
                    </div>
                    <div className="form-group">
                      <label>Postal Code</label>
                      <input type="text" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>County *</label>
                    <select required>
                      <option value="">Select County</option>
                      <option value="nairobi">Nairobi</option>
                      <option value="mombasa">Mombasa</option>
                      <option value="kisumu">Kisumu</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Delivery Notes (Optional)</label>
                    <textarea rows={3} placeholder="Any special delivery instructions"></textarea>
                  </div>
                  <button type="button" onClick={() => setCurrentStep(2)} className="btn btn--primary btn--lg">
                    Continue to Payment
                  </button>
                </form>
              </div>
            )}

            {/* Step 2: Payment */}
            {currentStep === 2 && (
              <div className="checkout-section">
                <h2>Payment Method</h2>
                <div className="payment-methods">
                  <label className="payment-method">
                    <input type="radio" name="payment" defaultChecked />
                    <div className="payment-method__content">
                      <div className="payment-method__icon">💳</div>
                      <div>
                        <h4>M-Pesa</h4>
                        <p>Pay via M-Pesa mobile money</p>
                      </div>
                    </div>
                  </label>
                  <label className="payment-method">
                    <input type="radio" name="payment" />
                    <div className="payment-method__content">
                      <div className="payment-method__icon">💳</div>
                      <div>
                        <h4>Credit/Debit Card</h4>
                        <p>Visa, Mastercard accepted</p>
                      </div>
                    </div>
                  </label>
                  <label className="payment-method">
                    <input type="radio" name="payment" />
                    <div className="payment-method__content">
                      <div className="payment-method__icon">💵</div>
                      <div>
                        <h4>Cash on Delivery</h4>
                        <p>Pay when you receive</p>
                      </div>
                    </div>
                  </label>
                </div>
                <div className="checkout-actions">
                  <button onClick={() => setCurrentStep(1)} className="btn btn--outline">
                    Back
                  </button>
                  <button onClick={() => setCurrentStep(3)} className="btn btn--primary btn--lg">
                    Continue to Review
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="checkout-section">
                <h2>Review Your Order</h2>
                <div className="review-section">
                  <h3>Shipping Address</h3>
                  <p>John Doe<br />
                  123 Main Street<br />
                  Nairobi, 00100<br />
                  Kenya</p>
                </div>
                <div className="review-section">
                  <h3>Payment Method</h3>
                  <p>M-Pesa</p>
                </div>
                <div className="review-section">
                  <h3>Order Items</h3>
                  {cartItems.map((item) => (
                    <div key={item.id} className="review-item">
                      <span>{item.name} x {item.quantity}</span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="checkout-actions">
                  <button onClick={() => setCurrentStep(2)} className="btn btn--outline">
                    Back
                  </button>
                  <Link to="/order-success" className="btn btn--primary btn--lg">
                    Place Order
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="checkout__summary">
            <h2>Order Summary</h2>
            <div className="checkout-summary__items">
              {cartItems.map((item) => (
                <div key={item.id} className="summary-item">
                  <span>{item.name} x {item.quantity}</span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
