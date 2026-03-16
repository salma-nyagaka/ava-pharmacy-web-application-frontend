import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CartItem } from '../../data/cart'
import { kenyaCounties, kenyaCountyCities } from '../../data/kenyaLocations'
import { useAuth } from '../../context/AuthContext'
import { cartService } from '../../services/cartService'
import { fetchSavedAddresses, type SavedAddress } from '../../services/addressService'
import {
  createCheckoutDraft,
  createPaymentIntent,
  fetchOrder,
  fetchShippingMethods,
  finalizeCheckout,
  syncPaymentIntent,
  type Order,
  type PaymentIntent,
  type ShippingMethod,
} from '../../services/orderService'
import { fetchAvailability } from '../../services/productService'
import './CheckoutPage.css'

type PaymentStatus = 'idle' | 'waiting' | 'confirmed' | 'failed'
type DeliveryMethodOption = 'store_pickup' | 'doorstep_delivery'

const deliveryMethodLabels: Record<DeliveryMethodOption, string> = {
  store_pickup: 'Store Pickup',
  doorstep_delivery: 'Doorstep Delivery',
}

const matchesShippingMethod = (method: ShippingMethod, patterns: string[]) => {
  const haystack = `${method.code} ${method.name} ${method.description}`.toLowerCase()
  return patterns.some((pattern) => haystack.includes(pattern))
}

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
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card' | 'cash'>('mpesa')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle')
  const [paymentNotice, setPaymentNotice] = useState('')
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [county, setCounty] = useState('')
  const [validationError, setValidationError] = useState('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([])
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethodOption>('doorstep_delivery')
  const [draftOrder, setDraftOrder] = useState<Order | null>(null)
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null)
  const [availabilityErrors, setAvailabilityErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new')
  const [addressLabel, setAddressLabel] = useState('Home')
  const [saveAddress, setSaveAddress] = useState(false)
  const [setDefaultAddress, setSetDefaultAddress] = useState(false)
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true)

  useEffect(() => {
    const refresh = () => {
      void cartService.list().then((response) => setCartItems(response.data))
    }
    refresh()
    void fetchShippingMethods().then((methods) => {
      setShippingMethods(methods)
    }).catch(() => {})
    const unsubscribe = cartService.subscribe(refresh)
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!user) return
    const trimmedName = user.name.trim()
    const [givenName, ...rest] = trimmedName.split(/\s+/).filter(Boolean)
    if (!firstName && givenName) setFirstName(givenName)
    if (!lastName && rest.length) setLastName(rest.join(' '))
    if (!email && user.email) setEmail(user.email)
    if (!phone && user.phone) setPhone(user.phone)
    if (!mpesaPhone && user.phone) setMpesaPhone(user.phone)
  }, [user, firstName, lastName, email, phone, mpesaPhone])

  useEffect(() => {
    let active = true
    void fetchSavedAddresses()
      .then((addresses) => {
        if (!active) return
        setSavedAddresses(addresses)
        const initial = addresses.find((address) => address.is_default) ?? addresses[0] ?? null
        if (initial) {
          setSelectedAddressId(String(initial.id))
          setStreet(initial.street)
          setCity(initial.city)
          setCounty(initial.county)
          setAddressLabel(initial.label || 'Home')
          setSaveAddress(false)
          setSetDefaultAddress(initial.is_default)
        } else {
          setSelectedAddressId('new')
          setAddressLabel('Home')
          setSaveAddress(true)
          setSetDefaultAddress(true)
        }
      })
      .catch(() => {
        if (!active) return
        setSavedAddresses([])
        setSelectedAddressId('new')
        setSaveAddress(true)
        setSetDefaultAddress(true)
      })
      .finally(() => {
        if (active) setIsLoadingAddresses(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const hasCardCallback = !!searchParams.get('intent_id') && !!searchParams.get('transaction_id')
    if (hasCardCallback) return
    if (paymentMethod === 'cash') {
      setPaymentStatus('confirmed')
      setPaymentNotice(
        deliveryMethod === 'store_pickup'
          ? 'Cash selected. Payment will be collected when you pick up your order.'
          : 'Cash on delivery selected. Payment will be collected at delivery.',
      )
      return
    }
    setPaymentStatus('idle')
    setPaymentNotice('')
    setValidationError('')
  }, [deliveryMethod, paymentMethod, searchParams])

  useEffect(() => {
    const hasCardCallback = !!searchParams.get('intent_id') && !!searchParams.get('transaction_id')
    if (hasCardCallback) return
    if (paymentMethod !== 'mpesa') return
    setPaymentStatus('idle')
    setPaymentNotice('')
    setValidationError('')
  }, [paymentMethod, searchParams])

  useEffect(() => {
    let cancelled = false
    const intentId = searchParams.get('intent_id')
    const orderId = searchParams.get('order_id')
    const transactionId = searchParams.get('transaction_id')
    const status = searchParams.get('status')
    if (!intentId || !transactionId || status !== 'successful') return

    setCurrentStep(3)
    setPaymentMethod('card')
    setPaymentStatus('waiting')
    setPaymentNotice('Verifying card payment…')

    void syncPaymentIntent(Number(intentId), { transaction_id: transactionId })
      .then(async (intent) => {
        if (cancelled) return
        setPaymentIntent(intent)
        if (intent.status === 'succeeded') {
          setPaymentStatus('confirmed')
          setPaymentNotice('Card payment confirmed. You can now place your order.')
          if (orderId) {
            const order = await fetchOrder(Number(orderId))
            if (!cancelled) setDraftOrder(order)
          }
        } else {
          setPaymentStatus('failed')
          setValidationError(intent.last_error || 'Card payment could not be confirmed.')
        }
        setSearchParams({}, { replace: true })
      })
      .catch(() => {
        if (cancelled) return
        setPaymentStatus('failed')
        setValidationError('Card payment verification failed. Please try again.')
        setSearchParams({}, { replace: true })
      })

    return () => { cancelled = true }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!paymentIntent || paymentIntent.provider !== 'mpesa' || paymentStatus !== 'waiting') return
    const intervalId = window.setInterval(() => {
      void syncPaymentIntent(paymentIntent.id)
        .then((intent) => {
          setPaymentIntent(intent)
          if (intent.status === 'succeeded') {
            setPaymentStatus('confirmed')
            setPaymentNotice('M-Pesa payment confirmed. You can now place your order.')
            window.clearInterval(intervalId)
          } else if (intent.status === 'failed' || intent.status === 'cancelled') {
            setPaymentStatus('failed')
            setValidationError(intent.last_error || 'M-Pesa payment failed.')
            window.clearInterval(intervalId)
          }
        })
        .catch(() => {})
    }, 5000)
    return () => window.clearInterval(intervalId)
  }, [paymentIntent, paymentStatus])

  useEffect(() => {
    if (!cartItems.length) {
      setAvailabilityErrors([])
      return
    }
    let active = true
    const loadAvailability = () => {
      void fetchAvailability(cartItems.map((item) => item.id))
        .then((rows) => {
          if (!active) return
          const byId = new Map(rows.map((row) => [row.product_id, row]))
          const nextErrors = cartItems.flatMap((item) => {
            const availability = byId.get(item.id)
            if (!availability) return []
            if (availability.is_available && availability.quantity >= item.quantity) return []
            return [`${item.name} is no longer fully available.`]
          })
          setAvailabilityErrors(nextErrors)
        })
        .catch(() => {})
    }
    loadAvailability()
    const intervalId = window.setInterval(loadAvailability, 30000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [cartItems])

  const pickupShippingMethod = useMemo(
    () => shippingMethods.find((method) => matchesShippingMethod(method, ['pickup', 'collect'])) ?? null,
    [shippingMethods],
  )
  const cityOptions = useMemo(() => kenyaCountyCities[county] ?? [], [county])
  const doorstepShippingMethod = useMemo(
    () =>
      shippingMethods.find((method) => matchesShippingMethod(method, ['doorstep', 'delivery', 'standard', 'shipping', 'courier']))
      ?? shippingMethods[0]
      ?? null,
    [shippingMethods],
  )
  const selectedShippingMethod = useMemo(
    () => (deliveryMethod === 'store_pickup' ? pickupShippingMethod : doorstepShippingMethod),
    [deliveryMethod, doorstepShippingMethod, pickupShippingMethod],
  )
  const deliveryMethodLabel = deliveryMethodLabels[deliveryMethod]
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const delivery = deliveryMethod === 'store_pickup'
    ? 0
    : selectedShippingMethod
      ? Number(selectedShippingMethod.fee)
      : (subtotal >= 3000 || cartItems.length === 0 ? 0 : 300)
  const total = subtotal + delivery
  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0)

  const fmt = (price: number) => `KSh ${price.toLocaleString()}`

  useEffect(() => {
    if (!city) return
    if (cityOptions.includes(city)) return
    setCity('')
  }, [city, cityOptions])

  const validateCardDetails = () => {
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
    if (availabilityErrors.length > 0) {
      setValidationError(availabilityErrors[0])
      return false
    }
    setValidationError('')
    return true
  }

  const switchToManualAddress = () => {
    if (selectedAddressId === 'new') return
    setSelectedAddressId('new')
    setAddressLabel('')
    setSaveAddress(true)
    setSetDefaultAddress(savedAddresses.length === 0)
  }

  useEffect(() => {
    if (selectedAddressId !== 'new') return
    if (!saveAddress) {
      setSetDefaultAddress(false)
      return
    }
    if (savedAddresses.length === 0) {
      setSetDefaultAddress(true)
    }
  }, [saveAddress, savedAddresses.length, selectedAddressId])

  const handleContinueToPayment = () => {
    if (!validateStepOne()) return
    if (!mpesaPhone.trim() && phone.trim()) setMpesaPhone(phone.trim())
    setCurrentStep(2)
  }

  const buildCheckoutPayload = () => ({
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    email: email.trim(),
    phone: phone.trim(),
    street: street.trim(),
    city: city.trim(),
    county: county.trim(),
    address_id: selectedAddressId !== 'new' ? Number(selectedAddressId) : null,
    save_address: selectedAddressId === 'new' ? (savedAddresses.length === 0 || saveAddress) : false,
    address_label: selectedAddressId === 'new' ? addressLabel.trim() : '',
    set_default_address: selectedAddressId === 'new' ? (savedAddresses.length === 0 || setDefaultAddress) : false,
    payment_method:
      paymentMethod === 'card'
        ? 'card'
        : paymentMethod === 'cash'
          ? 'cash_on_delivery'
          : 'mpesa_stk',
    shipping_method_id: selectedShippingMethod?.id ?? null,
    delivery_method: deliveryMethod,
  } as const)

  const ensureDraftOrder = async () => {
    const order = await createCheckoutDraft(buildCheckoutPayload())
    setDraftOrder(order)
    return order
  }

  const handleInitiatePayment = async () => {
    if (paymentMethod === 'cash') return false
    if (paymentStatus === 'waiting' || isSubmitting) return false
    if (!validateStepOne()) return false
    if (paymentMethod === 'mpesa') {
      const normalized = mpesaPhone.trim().replace(/\s+/g, '')
      if (!/^(\+254|254|0)7\d{8}$/.test(normalized)) {
        setValidationError('Enter a valid M-Pesa number (e.g. 07XXXXXXXX or +2547XXXXXXXX).')
        return false
      }
    }
    if (paymentMethod === 'card' && !validateCardDetails()) return false
    setIsSubmitting(true)
    setValidationError('')
    try {
      const order = await ensureDraftOrder()
      if (paymentMethod === 'mpesa') {
        const intent = await createPaymentIntent({
          order_id: order.id,
          provider: 'mpesa',
          phone: mpesaPhone.trim(),
        })
        setPaymentIntent(intent)
        setPaymentNotice(intent.client_secret || `STK push sent to ${mpesaPhone.trim()}.`)
        setPaymentStatus('waiting')
        return true
      }
      const intent = await createPaymentIntent({
        order_id: order.id,
        provider: 'card',
        return_url: `${window.location.origin}/checkout`,
      })
      setPaymentIntent(intent)
      if (intent.next_action_url) {
        window.location.assign(intent.next_action_url)
        return true
      }
      setValidationError('Card checkout link was not returned.')
      setPaymentStatus('failed')
      return false
    } catch (error) {
      type ApiErr = { response?: { data?: { error?: { message?: string }; detail?: string } } }
      const message = (error as ApiErr)?.response?.data?.error?.message
        ?? (error as ApiErr)?.response?.data?.detail
        ?? 'Unable to initiate payment.'
      setValidationError(message)
      setPaymentStatus('failed')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStkFromPaymentStep = async () => { if (await handleInitiatePayment()) setCurrentStep(3) }
  const handleCardContinueToConfirm = async () => { if (await handleInitiatePayment()) setCurrentStep(3) }

  const handlePlaceOrder = async () => {
    if ((paymentMethod === 'mpesa' || paymentMethod === 'card') && paymentStatus !== 'confirmed') {
      setValidationError('Complete payment confirmation before placing the order.')
      return
    }
    if (!validateStepOne()) return
    setIsSubmitting(true)
    try {
      const order = draftOrder ?? await ensureDraftOrder()
      const finalized = await finalizeCheckout(order.id)
      setDraftOrder(finalized)
      navigate('/order-confirmation', { state: { orderId: finalized.id } })
    } catch (error) {
      type ApiErr = { response?: { data?: { error?: { message?: string }; detail?: string | string[] } } }
      const detail = (error as ApiErr)?.response?.data?.error?.message
        ?? (error as ApiErr)?.response?.data?.detail
      setValidationError(Array.isArray(detail) ? detail[0] : detail ?? 'Unable to place your order.')
    } finally {
      setIsSubmitting(false)
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
                  {savedAddresses.length > 0 && (
                    <div className="co-field">
                      <label className="co-field__label">Saved Address</label>
                      <select
                        className="co-field__input"
                        value={selectedAddressId}
                        onChange={(e) => {
                          const nextValue = e.target.value
                          setSelectedAddressId(nextValue)
                          if (nextValue === 'new') {
                            setStreet('')
                            setCity('')
                            setCounty('')
                            setAddressLabel('')
                            setSaveAddress(true)
                            setSetDefaultAddress(savedAddresses.length === 0)
                            return
                          }
                          const selected = savedAddresses.find((address) => String(address.id) === nextValue)
                          if (!selected) return
                          setStreet(selected.street)
                          setCity(selected.city)
                          setCounty(selected.county)
                          setAddressLabel(selected.label || 'Home')
                          setSaveAddress(false)
                          setSetDefaultAddress(selected.is_default)
                          setValidationError('')
                        }}
                        disabled={isLoadingAddresses}
                      >
                        <option value="new">Use a new address</option>
                        {savedAddresses.map((address) => (
                          <option key={address.id} value={address.id}>
                            {address.label || 'Saved address'} · {address.street}, {address.city}
                          </option>
                        ))}
                      </select>
                      <p className="co-note">Select a saved address or switch to a new address for this order.</p>
                    </div>
                  )}

                  {savedAddresses.length === 0 && !isLoadingAddresses && (
                    <p className="co-note co-note--strong">
                      You do not have a saved address yet. The address you enter below will be saved to your account.
                    </p>
                  )}

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
                    <input
                      className="co-field__input"
                      type="text"
                      required
                      value={street}
                      onChange={(e) => {
                        switchToManualAddress()
                        setStreet(e.target.value)
                      }}
                    />
                  </div>
                  <div className="co-form__row">
                    <div className="co-field">
                      <label className="co-field__label">County *</label>
                      <select
                        className="co-field__input"
                        required
                        value={county}
                        onChange={(e) => {
                          switchToManualAddress()
                          setCounty(e.target.value)
                        }}
                      >
                        <option value="">Select county</option>
                        {kenyaCounties.map((countyName) => (
                          <option key={countyName} value={countyName}>
                            {countyName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="co-field">
                      <label className="co-field__label">City *</label>
                      <select
                        className="co-field__input"
                        required
                        value={city}
                        onChange={(e) => {
                          switchToManualAddress()
                          setCity(e.target.value)
                        }}
                        disabled={cityOptions.length === 0}
                      >
                        <option value="">{county ? 'Select city' : 'Select county first'}</option>
                        {cityOptions.map((cityName) => (
                          <option key={cityName} value={cityName}>
                            {cityName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {selectedAddressId === 'new' && (
                    <>
                      <div className="co-field">
                        <label className="co-field__label">Address Label</label>
                        <input
                          className="co-field__input"
                          type="text"
                          value={addressLabel}
                          onChange={(e) => setAddressLabel(e.target.value)}
                          placeholder="e.g. Home, Office"
                        />
                      </div>
                      <div className="co-address-prefs">
                        <label className="co-check">
                          <input
                            type="checkbox"
                            checked={saveAddress}
                            onChange={(e) => setSaveAddress(e.target.checked)}
                          />
                          <span>Save this address to my account</span>
                        </label>
                        <label className="co-check">
                          <input
                            type="checkbox"
                            checked={setDefaultAddress}
                            onChange={(e) => setSetDefaultAddress(e.target.checked)}
                            disabled={!saveAddress || savedAddresses.length === 0}
                          />
                          <span>Set as default address</span>
                        </label>
                        {savedAddresses.length === 0 && (
                          <p className="co-note co-note--strong">
                            Your first saved address becomes the default address automatically.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  <div className="co-field">
                    <label className="co-field__label">Delivery Method</label>
                    <select
                      className="co-field__input"
                      value={deliveryMethod}
                      onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethodOption)}
                    >
                      <option value="store_pickup">Store Pickup</option>
                      <option value="doorstep_delivery">Doorstep Delivery</option>
                    </select>
                    <p className="co-note">
                      {deliveryMethod === 'store_pickup'
                        ? 'Pick up your order from the store. No delivery fee will be charged.'
                        : `Doorstep delivery fee: ${delivery === 0 ? 'Free' : fmt(delivery)}.`}
                    </p>
                  </div>
                  {availabilityErrors.length > 0 && <p className="co-error">{availabilityErrors[0]}</p>}
                  {validationError && <p className="co-error">{validationError}</p>}
                  <div className="co-form__actions">
                    <button type="button" onClick={handleContinueToPayment} className="btn btn--primary btn--lg" disabled={cartItems.length === 0 || isSubmitting}>
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
                  <div className="co-paybill-box" aria-live="polite">
                    <p className="co-paybill-box__label">M-Pesa STK Push</p>
                    <div className="co-paybill-box__rows">
                      <div className="co-paybill-box__row"><span>Flow</span><strong>Prompt sent to your phone</strong></div>
                      <div className="co-paybill-box__row"><span>Number</span><strong>{mpesaPhone || 'Enter M-Pesa number above'}</strong></div>
                      <div className="co-paybill-box__row"><span>Amount</span><strong>{fmt(total)}</strong></div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="co-paybill-box" aria-live="polite">
                    <p className="co-paybill-box__label">Secure Card Checkout</p>
                    <div className="co-paybill-box__rows">
                      <div className="co-paybill-box__row"><span>Provider</span><strong>Flutterwave</strong></div>
                      <div className="co-paybill-box__row"><span>Supported cards</span><strong>Visa / Mastercard</strong></div>
                      <div className="co-paybill-box__row"><span>Next step</span><strong>You will be redirected to a secure card page</strong></div>
                    </div>
                  </div>
                )}

                {validationError && <p className="co-error">{validationError}</p>}

                <div className="co-actions">
                  <button onClick={() => setCurrentStep(1)} className="btn btn--outline" type="button">Back</button>
                  {paymentMethod === 'mpesa' && (
                    <button onClick={handleStkFromPaymentStep} className="btn btn--primary btn--lg" type="button" disabled={isSubmitting}>{isSubmitting ? 'Starting…' : 'Initiate STK Push'}</button>
                  )}
                  {paymentMethod === 'card' && (
                    <button onClick={handleCardContinueToConfirm} className="btn btn--primary btn--lg" type="button" disabled={isSubmitting}>{isSubmitting ? 'Redirecting…' : 'Continue to Secure Card Payment'}</button>
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
                    <p className="co-review-block__meta">
                      {deliveryMethodLabel} {delivery === 0 ? '· Free' : `· ${fmt(delivery)}`}
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
                        {mpesaPhone || 'No number provided'} · STK Push
                      </p>
                    )}
                    {paymentMethod === 'card' && (
                      <p className="co-review-block__meta">
                        Secure hosted checkout via Flutterwave
                      </p>
                    )}
                  </div>
                </div>

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
                    <button className="btn btn--outline btn--lg" type="button" onClick={() => void handleInitiatePayment()} disabled={isSubmitting}>
                      {paymentMethod === 'card' ? (isSubmitting ? 'Redirecting…' : 'Continue to Secure Card Payment') : (isSubmitting ? 'Starting…' : 'Initiate STK Push')}
                    </button>
                  )}
                  <button
                    className="btn btn--primary btn--lg"
                    type="button"
                    onClick={() => void handlePlaceOrder()}
                    disabled={isSubmitting || cartItems.length === 0 || availabilityErrors.length > 0 || ((paymentMethod === 'mpesa' || paymentMethod === 'card') && paymentStatus !== 'confirmed')}
                  >
                    {isSubmitting ? 'Processing…' : paymentMethod === 'cash' ? 'Place Order' : 'Complete & Place Order'}
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
                <span>{deliveryMethodLabel}</span>
                <span className={delivery === 0 ? 'co-summary__free' : ''}>{delivery === 0 ? 'Free' : fmt(delivery)}</span>
              </div>
              <div className="co-summary__row co-summary__row--total">
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>
            {availabilityErrors.length > 0 && <p className="co-error">{availabilityErrors[0]}</p>}

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
