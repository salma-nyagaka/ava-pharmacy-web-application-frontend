import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CartItem } from '../../data/cart'
import { cartService } from '../../services/cartService'
import './CheckoutPage.css'

type PaymentStatus = 'idle' | 'waiting' | 'confirmed'
type MpesaOption = 'stk' | 'paybill'

function CheckoutPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card' | 'cash'>('mpesa')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle')
  const [paymentNotice, setPaymentNotice] = useState('')
  const [mpesaOption, setMpesaOption] = useState<MpesaOption>('stk')
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [cardHolderName, setCardHolderName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [county, setCounty] = useState('')
  const [validationError, setValidationError] = useState('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  useEffect(() => {
    const refresh = () => {
      void cartService.list().then((response) => setCartItems(response.data))
    }
    refresh()
    const unsubscribe = cartService.subscribe(refresh)
    return unsubscribe
  }, [])

  useEffect(() => {
    if (paymentMethod === 'cash') {
      setPaymentStatus('confirmed')
      setPaymentNotice('Cash on delivery selected. Payment will be collected at delivery.')
      return
    }
    setPaymentStatus('idle')
    setPaymentNotice('')
    setValidationError('')
  }, [paymentMethod])

  useEffect(() => {
    if (paymentMethod !== 'mpesa') return
    setPaymentStatus('idle')
    setPaymentNotice('')
    setValidationError('')
  }, [paymentMethod, mpesaOption])

  useEffect(() => {
    if (paymentStatus !== 'waiting') return
    const timerId = window.setTimeout(() => {
      if (paymentMethod === 'mpesa') {
        if (mpesaOption === 'stk') {
          setPaymentNotice('M-Pesa STK payment confirmed. You can now complete your order.')
        } else {
          setPaymentNotice('M-Pesa Paybill payment confirmed. You can now complete your order.')
        }
      } else if (paymentMethod === 'card') {
        setPaymentNotice('Card payment authorized. You can now complete your order.')
      }
      setPaymentStatus('confirmed')
    }, 2600)
    return () => window.clearTimeout(timerId)
  }, [paymentStatus, paymentMethod, mpesaOption])

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const delivery = subtotal >= 3000 || cartItems.length === 0 ? 0 : 300
  const total = subtotal + delivery

  const formatPrice = (price: number) => `KSh ${price.toLocaleString()}`
  const paybillNumber = '522522'
  const paybillAccount = `AVA-${(phone || mpesaPhone || 'ORDER').replace(/\D/g, '').slice(-9) || 'ORDER'}`
  const maskedCard = cardNumber.replace(/\D/g, '').slice(-4)

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 19)
    return digits.replace(/(.{4})/g, '$1 ').trim()
  }

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    if (digits.length <= 2) return digits
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }

  const luhnCheck = (digits: string) => {
    let sum = 0
    let shouldDouble = false
    for (let i = digits.length - 1; i >= 0; i -= 1) {
      let digit = Number.parseInt(digits[i], 10)
      if (shouldDouble) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      sum += digit
      shouldDouble = !shouldDouble
    }
    return sum % 10 === 0
  }

  const validateCardDetails = () => {
    if (!cardHolderName.trim()) {
      setValidationError('Enter card holder name.')
      return false
    }

    const cardDigits = cardNumber.replace(/\D/g, '')
    if (cardDigits.length < 13 || cardDigits.length > 19 || !luhnCheck(cardDigits)) {
      setValidationError('Enter a valid card number.')
      return false
    }

    const expiryMatch = cardExpiry.match(/^(\d{2})\/(\d{2})$/)
    if (!expiryMatch) {
      setValidationError('Enter expiry date as MM/YY.')
      return false
    }

    const month = Number.parseInt(expiryMatch[1], 10)
    const year = Number.parseInt(`20${expiryMatch[2]}`, 10)
    if (month < 1 || month > 12) {
      setValidationError('Expiry month must be between 01 and 12.')
      return false
    }

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      setValidationError('Card is expired.')
      return false
    }

    const cvvDigits = cardCvv.replace(/\D/g, '')
    if (cvvDigits.length < 3 || cvvDigits.length > 4) {
      setValidationError('Enter a valid CVV.')
      return false
    }

    setValidationError('')
    return true
  }

  const steps = [
    { number: 1, title: 'Shipping' },
    { number: 2, title: 'Payment' },
    { number: 3, title: 'Confirm Order' },
  ]

  const validateStepOne = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !street.trim() || !city.trim() || !county.trim()) {
      setValidationError('Complete all required shipping fields to continue.')
      return false
    }
    setValidationError('')
    return true
  }

  const handleContinueToPayment = () => {
    if (!validateStepOne()) return
    if (!mpesaPhone.trim() && phone.trim()) {
      setMpesaPhone(phone.trim())
    }
    setCurrentStep(2)
  }

  const handleInitiatePayment = () => {
    if (paymentMethod === 'cash') return false
    if (paymentStatus === 'waiting') return false
    if (paymentMethod === 'mpesa') {
      const normalized = mpesaPhone.trim().replace(/\s+/g, '')
      const isValidMpesa = /^(\+254|254|0)7\d{8}$/.test(normalized)
      if (!isValidMpesa) {
        setValidationError('Enter a valid M-Pesa number (e.g. 07XXXXXXXX or +2547XXXXXXXX).')
        return false
      }
    }
    if (paymentMethod === 'card' && !validateCardDetails()) {
      return false
    }
    setValidationError('')
    if (paymentMethod === 'mpesa') {
      if (mpesaOption === 'stk') {
        setPaymentNotice(`STK push sent to ${mpesaPhone.trim()}. Enter M-Pesa PIN, then wait for confirmation...`)
      } else {
        setPaymentNotice('Payment initiation received. Waiting for M-Pesa Paybill confirmation...')
      }
    } else if (paymentMethod === 'card') {
      setPaymentNotice(`Card authorization started for card ending in ${maskedCard || 'XXXX'}. Waiting for confirmation...`)
    } else {
      setPaymentNotice('Waiting for card authorization...')
    }
    setPaymentStatus('waiting')
    return true
  }

  const handleStkFromPaymentStep = () => {
    const started = handleInitiatePayment()
    if (!started) return
    setCurrentStep(3)
  }

  const handlePaybillFromPaymentStep = () => {
    const started = handleInitiatePayment()
    if (!started) return
    setCurrentStep(3)
  }

  const handleCardContinueToConfirm = () => {
    if (!validateCardDetails()) return
    setCurrentStep(3)
  }

  const handlePlaceOrder = () => {
    if ((paymentMethod === 'mpesa' || paymentMethod === 'card') && paymentStatus !== 'confirmed') {
      setValidationError('Complete payment confirmation before placing the order.')
      return
    }
    void cartService.clear().then(() => {
      navigate('/order-confirmation')
    })
  }

  return (
    <div className="checkout">
      <div className="container">
        <h1 className="checkout__title">Checkout</h1>

        {cartItems.length === 0 && (
          <div className="checkout-section" style={{ marginBottom: '1.25rem' }}>
            <p>Your cart is empty. Add products before checkout.</p>
            <Link to="/products" className="btn btn--outline btn--sm">Back to products</Link>
          </div>
        )}

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
          <div className="checkout__main">
            {currentStep === 1 && (
              <div className="checkout-section">
                <h2>Shipping Information</h2>
                <p className="card__meta" style={{ marginBottom: '1rem' }}>
                  Account login is required in production; demo uses email + phone capture for order tracking.
                </p>
                <form className="checkout-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name *</label>
                      <input type="text" required value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Last Name *</label>
                      <input type="text" required value={lastName} onChange={(event) => setLastName(event.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Street Address *</label>
                    <input type="text" required value={street} onChange={(event) => setStreet(event.target.value)} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>City *</label>
                      <input type="text" required value={city} onChange={(event) => setCity(event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>County *</label>
                      <input type="text" required value={county} onChange={(event) => setCounty(event.target.value)} />
                    </div>
                  </div>
                  {validationError && <p className="card__meta" style={{ color: 'var(--color-error)' }}>{validationError}</p>}
                  <button type="button" onClick={handleContinueToPayment} className="btn btn--primary btn--lg" disabled={cartItems.length === 0}>
                    Continue to Payment
                  </button>
                </form>
              </div>
            )}

            {currentStep === 2 && (
              <div className="checkout-section">
                <h2>Payment Method</h2>
                <div className="payment-methods">
                  <label className="payment-method">
                    <input type="radio" name="payment" checked={paymentMethod === 'mpesa'} onChange={() => setPaymentMethod('mpesa')} />
                    <div className="payment-method__content">
                      <div className="payment-method__icon">💳</div>
                      <div>
                        <h4>M-Pesa</h4>
                        <p>Pay via M-Pesa mobile money</p>
                      </div>
                    </div>
                  </label>
                  <label className="payment-method">
                    <input type="radio" name="payment" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} />
                    <div className="payment-method__content">
                      <div className="payment-method__icon">💳</div>
                      <div>
                        <h4>Credit/Debit Card</h4>
                        <p>Visa, Mastercard accepted</p>
                      </div>
                    </div>
                  </label>
                  <label className="payment-method">
                    <input type="radio" name="payment" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} />
                    <div className="payment-method__content">
                      <div className="payment-method__icon">💵</div>
                      <div>
                        <h4>Cash on Delivery</h4>
                        <p>Pay when you receive</p>
                      </div>
                    </div>
                  </label>
                </div>
                {paymentMethod === 'mpesa' && (
                  <div className="payment-extra form-group">
                    <label htmlFor="mpesa-phone">M-Pesa Number *</label>
                    <input
                      id="mpesa-phone"
                      type="tel"
                      placeholder="e.g. 0712345678 or +254712345678"
                      value={mpesaPhone}
                      onChange={(event) => setMpesaPhone(event.target.value)}
                    />
                  </div>
                )}
                {paymentMethod === 'mpesa' && (
                  <div className="mpesa-options">
                    <label className={`mpesa-option ${mpesaOption === 'stk' ? 'mpesa-option--active' : ''}`}>
                      <input
                        type="radio"
                        name="mpesa-option"
                        checked={mpesaOption === 'stk'}
                        onChange={() => setMpesaOption('stk')}
                      />
                      <div>
                        <h4>Initiate STK Push</h4>
                        <p>We send a prompt to the phone number above for PIN entry.</p>
                      </div>
                    </label>
                    <label className={`mpesa-option ${mpesaOption === 'paybill' ? 'mpesa-option--active' : ''}`}>
                      <input
                        type="radio"
                        name="mpesa-option"
                        checked={mpesaOption === 'paybill'}
                        onChange={() => setMpesaOption('paybill')}
                      />
                      <div>
                        <h4>Pay via Paybill Number</h4>
                        <p>Pay from your M-Pesa menu, then confirm initiation here.</p>
                      </div>
                    </label>
                  </div>
                )}
                {paymentMethod === 'mpesa' && mpesaOption === 'paybill' && (
                  <div className="paybill-box" aria-live="polite">
                    <h4>Paybill Details</h4>
                    <p><strong>Business Number:</strong> {paybillNumber}</p>
                    <p><strong>Account Number:</strong> {paybillAccount}</p>
                    <p><strong>Amount:</strong> {formatPrice(total)}</p>
                  </div>
                )}
                {paymentMethod === 'card' && (
                  <div className="card-payment-grid">
                    <div className="form-group">
                      <label htmlFor="card-holder-name">Card Holder Name *</label>
                      <input
                        id="card-holder-name"
                        type="text"
                        placeholder="e.g. Mercy Otieno"
                        value={cardHolderName}
                        onChange={(event) => setCardHolderName(event.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="card-number">Card Number *</label>
                      <input
                        id="card-number"
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        maxLength={23}
                        value={cardNumber}
                        onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="card-expiry">Expiry (MM/YY) *</label>
                      <input
                        id="card-expiry"
                        type="text"
                        placeholder="08/28"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(event) => setCardExpiry(formatExpiry(event.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="card-cvv">CVV *</label>
                      <input
                        id="card-cvv"
                        type="password"
                        placeholder="123"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(event) => setCardCvv(event.target.value.replace(/\D/g, '').slice(0, 4))}
                      />
                    </div>
                    <p className="card__meta card-payment-note">Your card details are encrypted in production. Demo mode does not process real payments.</p>
                  </div>
                )}
                {validationError && <p className="card__meta" style={{ color: 'var(--color-error)' }}>{validationError}</p>}
                <div className="checkout-actions">
                  <button onClick={() => setCurrentStep(1)} className="btn btn--outline" type="button">
                    Back
                  </button>
                  {paymentMethod === 'mpesa' && mpesaOption === 'stk' && (
                    <button onClick={handleStkFromPaymentStep} className="btn btn--primary btn--lg" type="button">
                      Initiate STK Push
                    </button>
                  )}
                  {paymentMethod === 'mpesa' && mpesaOption === 'paybill' && (
                    <button onClick={handlePaybillFromPaymentStep} className="btn btn--primary btn--lg" type="button">
                      Payment has been initiated
                    </button>
                  )}
                  {paymentMethod === 'card' && (
                    <button onClick={handleCardContinueToConfirm} className="btn btn--primary btn--lg" type="button">
                      Proceed to Confirm Order
                    </button>
                  )}
                  {paymentMethod === 'cash' && (
                    <button onClick={() => setCurrentStep(3)} className="btn btn--primary btn--lg" type="button">
                      Proceed to Confirm Order
                    </button>
                  )}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="checkout-section">
                <h2>Confirm Your Order</h2>
                <div className="review-section">
                  <h3>Shipping Address</h3>
                  <p>{firstName} {lastName}<br />
                    {street}<br />
                    {city}, {county}<br />
                    Kenya</p>
                </div>
                <div className="review-section">
                  <h3>Payment Method</h3>
                  <p>{paymentMethod === 'mpesa' ? 'M-Pesa' : paymentMethod === 'card' ? 'Credit/Debit Card' : 'Cash on Delivery'}</p>
                  {paymentMethod === 'mpesa' && (
                    <>
                      <p className="card__meta">M-Pesa Number: {mpesaPhone || 'Not provided'}</p>
                      <p className="card__meta">M-Pesa Option: {mpesaOption === 'stk' ? 'Initiate STK Push' : 'Pay via Paybill Number'}</p>
                    </>
                  )}
                  {paymentMethod === 'card' && (
                    <>
                      <p className="card__meta">Card Holder: {cardHolderName || 'Not provided'}</p>
                      <p className="card__meta">Card: {maskedCard ? `**** **** **** ${maskedCard}` : 'Not provided'}</p>
                      <p className="card__meta">Expiry: {cardExpiry || 'Not provided'}</p>
                    </>
                  )}
                  {paymentMethod === 'mpesa' && mpesaOption === 'paybill' && (
                    <div className="paybill-box paybill-box--review">
                      <h4>Paybill Details</h4>
                      <p><strong>Business Number:</strong> {paybillNumber}</p>
                      <p><strong>Account Number:</strong> {paybillAccount}</p>
                      <p><strong>Amount:</strong> {formatPrice(total)}</p>
                    </div>
                  )}
                  {(paymentMethod === 'mpesa' || paymentMethod === 'card') && (
                    <p
                      className={`payment-status payment-status--${paymentStatus}`}
                      aria-live="polite"
                    >
                      {paymentStatus === 'idle' && 'Payment not started'}
                      {paymentStatus === 'waiting' && 'Waiting for confirmation...'}
                      {paymentStatus === 'confirmed' && 'Payment confirmed'}
                    </p>
                  )}
                  {paymentNotice && <p className="card__meta">{paymentNotice}</p>}
                </div>
                <div className="review-section">
                  <h3>Order Items</h3>
                  {cartItems.map((item) => (
                    <div key={`${item.id}-${item.prescriptionId ?? 'direct'}`} className="review-item">
                      <span>{item.name} x {item.quantity}</span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="checkout-actions">
                  <button onClick={() => setCurrentStep(2)} className="btn btn--outline" type="button">
                    Back
                  </button>
                  {(paymentMethod === 'mpesa' || paymentMethod === 'card') && paymentStatus === 'idle' && (
                    <button
                      className="btn btn--outline btn--lg"
                      type="button"
                      onClick={handleInitiatePayment}
                    >
                      {paymentMethod === 'card'
                        ? 'Initiate Card Payment'
                        : mpesaOption === 'stk'
                          ? 'Initiate STK Push'
                          : 'Payment has been initiated'}
                    </button>
                  )}
                  <button
                    className="btn btn--primary btn--lg"
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={cartItems.length === 0 || ((paymentMethod === 'mpesa' || paymentMethod === 'card') && paymentStatus !== 'confirmed')}
                  >
                    {paymentMethod === 'cash' ? 'Place Order' : 'Complete Payment & Place Order'}
                  </button>
                </div>
                {validationError && <p className="card__meta" style={{ color: 'var(--color-error)' }}>{validationError}</p>}
              </div>
            )}
          </div>

          <div className="checkout__summary">
            <h2>Order Summary</h2>
            <div className="checkout-summary__items">
              {cartItems.map((item) => (
                <div key={`${item.id}-${item.prescriptionId ?? 'direct'}`} className="summary-item">
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
              <span>{delivery === 0 ? 'Free' : formatPrice(delivery)}</span>
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
