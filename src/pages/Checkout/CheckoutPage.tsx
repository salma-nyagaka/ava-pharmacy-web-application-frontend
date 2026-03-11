import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CartItem } from '../../data/cart'
import { cartService } from '../../services/cartService'
import { createOrder } from '../../services/orderService'
import './CheckoutPage.css'

type PaymentStatus = 'idle' | 'waiting' | 'confirmed'
type MpesaOption = 'stk' | 'paybill'

const MpesaIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <path d="M2 10h20"/>
    <path d="M6 15h4"/>
  </svg>
)

const CardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <path d="M2 10h20"/>
    <circle cx="17" cy="15" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="20" cy="15" r="1.5" fill="currentColor" stroke="none" opacity=".5"/>
  </svg>
)

const CashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    <circle cx="12" cy="14" r="2"/>
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="14" height="14">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

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
  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0)

  const fmt = (price: number) => `KSh ${price.toLocaleString()}`
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
    if (!cardHolderName.trim()) { setValidationError('Enter card holder name.'); return false }
    const cardDigits = cardNumber.replace(/\D/g, '')
    if (cardDigits.length < 13 || cardDigits.length > 19 || !luhnCheck(cardDigits)) { setValidationError('Enter a valid card number.'); return false }
    const expiryMatch = cardExpiry.match(/^(\d{2})\/(\d{2})$/)
    if (!expiryMatch) { setValidationError('Enter expiry date as MM/YY.'); return false }
    const month = Number.parseInt(expiryMatch[1], 10)
    const year = Number.parseInt(`20${expiryMatch[2]}`, 10)
    if (month < 1 || month > 12) { setValidationError('Expiry month must be between 01 and 12.'); return false }
    const now = new Date()
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) { setValidationError('Card is expired.'); return false }
    const cvvDigits = cardCvv.replace(/\D/g, '')
    if (cvvDigits.length < 3 || cvvDigits.length > 4) { setValidationError('Enter a valid CVV.'); return false }
    setValidationError('')
    return true
  }

  const steps = [
    { number: 1, title: 'Shipping' },
    { number: 2, title: 'Payment' },
    { number: 3, title: 'Review' },
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
    if (!mpesaPhone.trim() && phone.trim()) setMpesaPhone(phone.trim())
    setCurrentStep(2)
  }

  const handleInitiatePayment = () => {
    if (paymentMethod === 'cash') return false
    if (paymentStatus === 'waiting') return false
    if (paymentMethod === 'mpesa') {
      const normalized = mpesaPhone.trim().replace(/\s+/g, '')
      if (!/^(\+254|254|0)7\d{8}$/.test(normalized)) {
        setValidationError('Enter a valid M-Pesa number (e.g. 07XXXXXXXX or +2547XXXXXXXX).')
        return false
      }
    }
    if (paymentMethod === 'card' && !validateCardDetails()) return false
    setValidationError('')
    if (paymentMethod === 'mpesa') {
      setPaymentNotice(mpesaOption === 'stk'
        ? `STK push sent to ${mpesaPhone.trim()}. Enter M-Pesa PIN, then wait for confirmation...`
        : 'Payment initiation received. Waiting for M-Pesa Paybill confirmation...')
    } else if (paymentMethod === 'card') {
      setPaymentNotice(`Card authorization started for card ending in ${maskedCard || 'XXXX'}. Waiting for confirmation...`)
    }
    setPaymentStatus('waiting')
    return true
  }

  const handleStkFromPaymentStep = () => { if (handleInitiatePayment()) setCurrentStep(3) }
  const handlePaybillFromPaymentStep = () => { if (handleInitiatePayment()) setCurrentStep(3) }
  const handleCardContinueToConfirm = () => { if (validateCardDetails()) setCurrentStep(3) }

  const handlePlaceOrder = () => {
    if ((paymentMethod === 'mpesa' || paymentMethod === 'card') && paymentStatus !== 'confirmed') {
      setValidationError('Complete payment confirmation before placing the order.')
      return
    }
    const isAuth = !!localStorage.getItem('ava_access_token')
    if (isAuth) {
      createOrder({ payment_method: paymentMethod, notes: '' })
        .then(() => cartService.clear())
        .then(() => navigate('/order-confirmation'))
        .catch(() => cartService.clear().then(() => navigate('/order-confirmation')))
    } else {
      void cartService.clear().then(() => { navigate('/order-confirmation') })
    }
  }

  return (
    <div className="co-page">
      <div className="container">

        <nav className="co-breadcrumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/cart">Cart</Link>
          <span>/</span>
          <span>Checkout</span>
        </nav>

        <div className="co-header">
          <h1 className="co-header__title">Checkout</h1>
          {itemCount > 0 && <span className="co-header__count">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>}
        </div>

        {/* Step indicator */}
        <div className="co-steps">
          <div className="co-steps__track" />
          {steps.map((step) => (
            <div
              key={step.number}
              className={`co-step ${currentStep >= step.number ? 'co-step--active' : ''} ${currentStep > step.number ? 'co-step--done' : ''}`}
            >
              <div className="co-step__bubble">
                {currentStep > step.number ? <CheckIcon /> : step.number}
              </div>
              <span className="co-step__label">{step.title}</span>
            </div>
          ))}
        </div>

        {cartItems.length === 0 && (
          <div className="co-empty">
            <p>Your cart is empty.</p>
            <Link to="/products" className="btn btn--outline btn--sm">Browse Products</Link>
          </div>
        )}

        <div className="co-layout">

          {/* ── Main column ── */}
          <div className="co-main">

            {/* Step 1: Shipping */}
            {currentStep === 1 && (
              <div className="co-section">
                <div className="co-section__head">
                  <div className="co-section__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </div>
                  <h2 className="co-section__title">Shipping Information</h2>
                </div>
                <form className="co-form">
                  <div className="co-form__row">
                    <div className="co-field">
                      <label className="co-field__label">First Name *</label>
                      <input className="co-field__input" type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div className="co-field">
                      <label className="co-field__label">Last Name *</label>
                      <input className="co-field__input" type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                  </div>
                  <div className="co-field">
                    <label className="co-field__label">Email Address *</label>
                    <input className="co-field__input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="co-field">
                    <label className="co-field__label">Phone Number *</label>
                    <input className="co-field__input" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="co-field">
                    <label className="co-field__label">Street Address *</label>
                    <input className="co-field__input" type="text" required value={street} onChange={(e) => setStreet(e.target.value)} />
                  </div>
                  <div className="co-form__row">
                    <div className="co-field">
                      <label className="co-field__label">City *</label>
                      <input className="co-field__input" type="text" required value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div className="co-field">
                      <label className="co-field__label">County *</label>
                      <input className="co-field__input" type="text" required value={county} onChange={(e) => setCounty(e.target.value)} />
                    </div>
                  </div>
                  {validationError && <p className="co-error">{validationError}</p>}
                  <div className="co-form__actions">
                    <button type="button" onClick={handleContinueToPayment} className="btn btn--primary btn--lg" disabled={cartItems.length === 0}>
                      Continue to Payment
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 2: Payment */}
            {currentStep === 2 && (
              <div className="co-section">
                <div className="co-section__head">
                  <div className="co-section__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                  </div>
                  <h2 className="co-section__title">Payment Method</h2>
                </div>

                <div className="co-payment-methods">
                  <label className={`co-pm ${paymentMethod === 'mpesa' ? 'co-pm--selected' : ''}`}>
                    <input type="radio" name="payment" checked={paymentMethod === 'mpesa'} onChange={() => setPaymentMethod('mpesa')} />
                    <div className="co-pm__icon co-pm__icon--mpesa"><MpesaIcon /></div>
                    <div className="co-pm__text">
                      <strong>M-Pesa</strong>
                      <span>Pay via M-Pesa mobile money</span>
                    </div>
                    <div className="co-pm__radio" />
                  </label>

                  <label className={`co-pm ${paymentMethod === 'card' ? 'co-pm--selected' : ''}`}>
                    <input type="radio" name="payment" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} />
                    <div className="co-pm__icon co-pm__icon--card"><CardIcon /></div>
                    <div className="co-pm__text">
                      <strong>Credit / Debit Card</strong>
                      <span>Visa, Mastercard accepted</span>
                    </div>
                    <div className="co-pm__radio" />
                  </label>

                  <label className={`co-pm ${paymentMethod === 'cash' ? 'co-pm--selected' : ''}`}>
                    <input type="radio" name="payment" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} />
                    <div className="co-pm__icon co-pm__icon--cash"><CashIcon /></div>
                    <div className="co-pm__text">
                      <strong>Cash on Delivery</strong>
                      <span>Pay when you receive</span>
                    </div>
                    <div className="co-pm__radio" />
                  </label>
                </div>

                {paymentMethod === 'mpesa' && (
                  <div className="co-field co-payment-extra">
                    <label className="co-field__label">M-Pesa Number *</label>
                    <input className="co-field__input" type="tel" placeholder="e.g. 0712345678 or +254712345678" value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} />
                  </div>
                )}

                {paymentMethod === 'mpesa' && (
                  <div className="co-mpesa-opts">
                    <label className={`co-mpesa-opt ${mpesaOption === 'stk' ? 'co-mpesa-opt--active' : ''}`}>
                      <input type="radio" name="mpesa-option" checked={mpesaOption === 'stk'} onChange={() => setMpesaOption('stk')} />
                      <div>
                        <strong>Initiate STK Push</strong>
                        <p>We send a prompt to your phone for PIN entry.</p>
                      </div>
                    </label>
                    <label className={`co-mpesa-opt ${mpesaOption === 'paybill' ? 'co-mpesa-opt--active' : ''}`}>
                      <input type="radio" name="mpesa-option" checked={mpesaOption === 'paybill'} onChange={() => setMpesaOption('paybill')} />
                      <div>
                        <strong>Pay via Paybill</strong>
                        <p>Pay from your M-Pesa menu, then confirm here.</p>
                      </div>
                    </label>
                  </div>
                )}

                {paymentMethod === 'mpesa' && mpesaOption === 'paybill' && (
                  <div className="co-paybill-box" aria-live="polite">
                    <p className="co-paybill-box__label">Paybill Details</p>
                    <div className="co-paybill-box__rows">
                      <div className="co-paybill-box__row"><span>Business Number</span><strong>{paybillNumber}</strong></div>
                      <div className="co-paybill-box__row"><span>Account Number</span><strong>{paybillAccount}</strong></div>
                      <div className="co-paybill-box__row"><span>Amount</span><strong>{fmt(total)}</strong></div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="co-card-grid">
                    <div className="co-field co-field--full">
                      <label className="co-field__label">Card Holder Name *</label>
                      <input className="co-field__input" type="text" placeholder="e.g. Mercy Otieno" value={cardHolderName} onChange={(e) => setCardHolderName(e.target.value)} />
                    </div>
                    <div className="co-field co-field--full">
                      <label className="co-field__label">Card Number *</label>
                      <input className="co-field__input" type="text" placeholder="1234 5678 9012 3456" inputMode="numeric" autoComplete="cc-number" maxLength={23} value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} />
                    </div>
                    <div className="co-field">
                      <label className="co-field__label">Expiry (MM/YY) *</label>
                      <input className="co-field__input" type="text" placeholder="08/28" inputMode="numeric" autoComplete="cc-exp" maxLength={5} value={cardExpiry} onChange={(e) => setCardExpiry(formatExpiry(e.target.value))} />
                    </div>
                    <div className="co-field">
                      <label className="co-field__label">CVV *</label>
                      <input className="co-field__input" type="password" placeholder="123" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} />
                    </div>
                    <p className="co-note co-field--full">Your card details are encrypted in production. Demo mode does not process real payments.</p>
                  </div>
                )}

                {validationError && <p className="co-error">{validationError}</p>}

                <div className="co-actions">
                  <button onClick={() => setCurrentStep(1)} className="btn btn--outline" type="button">Back</button>
                  {paymentMethod === 'mpesa' && mpesaOption === 'stk' && (
                    <button onClick={handleStkFromPaymentStep} className="btn btn--primary btn--lg" type="button">Initiate STK Push</button>
                  )}
                  {paymentMethod === 'mpesa' && mpesaOption === 'paybill' && (
                    <button onClick={handlePaybillFromPaymentStep} className="btn btn--primary btn--lg" type="button">Payment has been initiated</button>
                  )}
                  {paymentMethod === 'card' && (
                    <button onClick={handleCardContinueToConfirm} className="btn btn--primary btn--lg" type="button">Proceed to Review</button>
                  )}
                  {paymentMethod === 'cash' && (
                    <button onClick={() => setCurrentStep(3)} className="btn btn--primary btn--lg" type="button">Proceed to Review</button>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="co-section">
                <div className="co-section__head">
                  <div className="co-section__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  </div>
                  <h2 className="co-section__title">Review Your Order</h2>
                </div>

                <div className="co-review-grid">
                  <div className="co-review-block">
                    <h3 className="co-review-block__title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                      Shipping Address
                    </h3>
                    <p className="co-review-block__text">
                      {firstName} {lastName}<br />
                      {street}<br />
                      {city}, {county}<br />
                      Kenya
                    </p>
                  </div>

                  <div className="co-review-block">
                    <h3 className="co-review-block__title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                      Payment
                    </h3>
                    <p className="co-review-block__text">
                      {paymentMethod === 'mpesa' ? 'M-Pesa' : paymentMethod === 'card' ? 'Credit/Debit Card' : 'Cash on Delivery'}
                    </p>
                    {paymentMethod === 'mpesa' && (
                      <p className="co-review-block__meta">
                        {mpesaPhone || 'No number provided'} · {mpesaOption === 'stk' ? 'STK Push' : 'Paybill'}
                      </p>
                    )}
                    {paymentMethod === 'card' && (
                      <p className="co-review-block__meta">
                        {cardHolderName || '–'} · {maskedCard ? `**** ${maskedCard}` : '–'} · {cardExpiry || '–'}
                      </p>
                    )}
                  </div>
                </div>

                {paymentMethod === 'mpesa' && mpesaOption === 'paybill' && (
                  <div className="co-paybill-box" aria-live="polite">
                    <p className="co-paybill-box__label">Paybill Details</p>
                    <div className="co-paybill-box__rows">
                      <div className="co-paybill-box__row"><span>Business Number</span><strong>{paybillNumber}</strong></div>
                      <div className="co-paybill-box__row"><span>Account Number</span><strong>{paybillAccount}</strong></div>
                      <div className="co-paybill-box__row"><span>Amount</span><strong>{fmt(total)}</strong></div>
                    </div>
                  </div>
                )}

                {(paymentMethod === 'mpesa' || paymentMethod === 'card') && (
                  <div className={`co-payment-status co-payment-status--${paymentStatus}`} aria-live="polite">
                    {paymentStatus === 'idle' && (
                      <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Payment not started</>
                    )}
                    {paymentStatus === 'waiting' && (
                      <><span className="co-payment-status__spinner" />Waiting for confirmation…</>
                    )}
                    {paymentStatus === 'confirmed' && (
                      <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Payment confirmed</>
                    )}
                  </div>
                )}

                {paymentNotice && <p className="co-payment-notice">{paymentNotice}</p>}

                <div className="co-review-items">
                  <h3 className="co-review-items__title">Order Items</h3>
                  {cartItems.map((item) => (
                    <div key={`${item.id}-${item.prescriptionId ?? 'direct'}`} className="co-review-item">
                      <span className="co-review-item__name">{item.name} <em>×{item.quantity}</em></span>
                      <span className="co-review-item__price">{fmt(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {validationError && <p className="co-error">{validationError}</p>}

                <div className="co-actions">
                  <button onClick={() => setCurrentStep(2)} className="btn btn--outline" type="button">Back</button>
                  {(paymentMethod === 'mpesa' || paymentMethod === 'card') && paymentStatus === 'idle' && (
                    <button className="btn btn--outline btn--lg" type="button" onClick={handleInitiatePayment}>
                      {paymentMethod === 'card' ? 'Initiate Card Payment' : mpesaOption === 'stk' ? 'Initiate STK Push' : 'Payment has been initiated'}
                    </button>
                  )}
                  <button
                    className="btn btn--primary btn--lg"
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={cartItems.length === 0 || ((paymentMethod === 'mpesa' || paymentMethod === 'card') && paymentStatus !== 'confirmed')}
                  >
                    {paymentMethod === 'cash' ? 'Place Order' : 'Complete & Place Order'}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Summary sidebar ── */}
          <aside className="co-summary">
            <h2 className="co-summary__title">Order Summary</h2>

            <div className="co-summary__items">
              {cartItems.map((item) => (
                <div key={`${item.id}-${item.prescriptionId ?? 'direct'}`} className="co-summary__item">
                  <span className="co-summary__item-name">{item.name} <em>×{item.quantity}</em></span>
                  <span className="co-summary__item-price">{fmt(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="co-summary__rows">
              <div className="co-summary__row">
                <span>Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className="co-summary__row">
                <span>Delivery</span>
                <span className={delivery === 0 ? 'co-summary__free' : ''}>{delivery === 0 ? 'Free' : fmt(delivery)}</span>
              </div>
              <div className="co-summary__row co-summary__row--total">
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>

            <p className="co-summary__note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Secure checkout · SSL encrypted
            </p>
          </aside>

        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
