import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import SupportShortcuts from '../../components/SupportShortcuts/SupportShortcuts'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { useInterval } from '../../hooks/useInterval'
import { type OrderTrackingResult, lookupOrderTracking } from '../../services/orderService'
import { formatPhoneHref, formatWhatsAppHref } from '../../services/siteSettingsService'
import '../../styles/pages/OrderTrackingPage.css'

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function PackageIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width={size} height={size}>
      <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width={size} height={size}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function TruckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width={size} height={size}>
      <rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 5v4h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}

function MapPinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width={size} height={size}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function ClipboardIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width={size} height={size}>
      <rect x="9" y="2" width="6" height="4" rx="1" /><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
    </svg>
  )
}

function PhoneIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width={size} height={size}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.1a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 15.92z" />
    </svg>
  )
}

function MessageIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width={size} height={size}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function MailIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width={size} height={size}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

const HERO_TIPS = [
  'Use the order number from your confirmation email or SMS.',
  'Enter the phone number or email address used at checkout.',
  'We refresh active orders automatically while this page is open.',
]

function getBannerConfig(status: string) {
  if (status === 'delivered') {
    return { className: 'track-banner--delivered', icon: <CheckIcon size={22} /> }
  }
  if (status === 'cancelled' || status === 'refunded') {
    return { className: 'track-banner--cancelled', icon: <ClipboardIcon size={22} /> }
  }
  if (status === 'processing' || status === 'paid') {
    return { className: 'track-banner--processing', icon: <PackageIcon size={22} /> }
  }
  return { className: 'track-banner--transit', icon: <TruckIcon size={22} /> }
}

function isTerminalStatus(status: string) {
  return status === 'delivered' || status === 'cancelled' || status === 'refunded'
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatMoney(value: string | null | undefined) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return value ? `KSh ${value}` : 'KSh 0'
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 2,
  }).format(amount)
}

function fallbackTimelineLabel(eventType: string) {
  return eventType
    .replace(/^status_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function OrderTrackingPage() {
  const { settings } = useSiteSettings()
  const normalizedSupportPhone = settings.supportPhone.replace(/\D/g, '')
  const normalizedWhatsappPhone = settings.whatsappPhone.replace(/\D/g, '')
  const hasDistinctWhatsapp = Boolean(normalizedWhatsappPhone) && normalizedWhatsappPhone !== normalizedSupportPhone
  const [searchParams] = useSearchParams()
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') ?? '')
  const [contact, setContact] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tracking, setTracking] = useState<OrderTrackingResult | null>(null)
  const [activeLookup, setActiveLookup] = useState<{ order_number: string; contact: string } | null>(null)
  const [copyStatus, setCopyStatus] = useState('')

  useEffect(() => {
    const presetOrder = searchParams.get('order')
    if (presetOrder && !orderNumber) {
      setOrderNumber(presetOrder)
    }
  }, [searchParams, orderNumber])

  async function runLookup(payload: { order_number: string; contact: string }, options?: { silent?: boolean }) {
    const silent = options?.silent ?? false
    if (!silent) {
      setIsSubmitting(true)
      setError('')
    }

    try {
      const result = await lookupOrderTracking(payload)
      setTracking(result)
      setActiveLookup(payload)
      if (!silent) setError('')
    } catch (lookupError: any) {
      if (silent) return
      setTracking(null)
      setActiveLookup(null)
      const message = lookupError?.response?.data?.error?.message || 'We could not find an order matching those details.'
      setError(message)
    } finally {
      if (!silent) setIsSubmitting(false)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextOrderNumber = orderNumber.trim()
    const nextContact = contact.trim()
    if (!nextOrderNumber || !nextContact) {
      setError('Enter your order number and the phone number or email address used at checkout.')
      return
    }
    void runLookup({ order_number: nextOrderNumber, contact: nextContact })
  }

  async function handleCopyLink() {
    if (!tracking) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/track-order?order=${tracking.order_number}`)
      setCopyStatus('Copied')
    } catch {
      setCopyStatus('Copy failed')
    }
    window.setTimeout(() => setCopyStatus(''), 2000)
  }

  useInterval(
    () => {
      if (activeLookup) {
        void runLookup(activeLookup, { silent: true })
      }
    },
    activeLookup && tracking && !isTerminalStatus(tracking.current_status) ? 30000 : null,
  )

  const banner = getBannerConfig(tracking?.current_status ?? '')
  const trackingSteps = tracking?.tracking_steps ?? []
  const completedSteps = trackingSteps.filter((step) => step.is_done).length
  const progressRatio = trackingSteps.length > 0
    ? Math.max(1, completedSteps + (trackingSteps.some((step) => step.is_current) ? 1 : 0)) / trackingSteps.length
    : 0
  const order = tracking?.order ?? null

  return (
    <div className="tracking-page">
      <section className="page">
        <div className="container">
          <nav className="track-breadcrumbs">
            <Link to="/">Home</Link>
            <span>›</span>
            <span>Track order</span>
          </nav>

          <div className="track-page-header">
            <h1>Track your order</h1>
            <p>Check your order status, item summary, and delivery progress from one place.</p>
          </div>

          <div className="track-card track-hero">
            <div className="track-hero__intro">
              <span className="track-chip">Live order updates</span>
              <h2>Find an order using the same details used at checkout</h2>
              <p>Enter your order number together with your phone number or email address. We use both details to show the correct order without forcing sign-in.</p>
              {searchParams.get('order') && (
                <p className="track-inline-help">Your order number was pre-filled from the confirmation page.</p>
              )}
              <div className="track-hero__tips">
                {HERO_TIPS.map((tip, index) => (
                  <div key={tip} className="track-tip">
                    <span className="track-tip__num">{index + 1}</span>
                    <p>{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            <form className="track-form" onSubmit={handleSubmit}>
              <div className="track-form__grid">
                <div className="form-group">
                  <label htmlFor="order-number">
                    <span className="form-label__main">Order number</span>
                    <span className="form-label__hint">Example: ORD-1A2B3C4D</span>
                  </label>
                  <input
                    id="order-number"
                    type="text"
                    placeholder="ORD-1A2B3C4D"
                    value={orderNumber}
                    onChange={(event) => {
                      setOrderNumber(event.target.value)
                      setError('')
                    }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="order-contact">
                    <span className="form-label__main">Phone number or email</span>
                    <span className="form-label__hint">Use the same contact detail entered during checkout</span>
                  </label>
                  <input
                    id="order-contact"
                    type="text"
                    placeholder="+254 700 000 000 or customer@email.com"
                    value={contact}
                    onChange={(event) => {
                      setContact(event.target.value)
                      setError('')
                    }}
                  />
                </div>
              </div>

              {error && <p className="track-error">{error}</p>}

              <div className="track-actions">
                <button className="btn btn--primary track-btn--main" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Checking order...' : <><SearchIcon /> Track order</>}
                </button>
                <Link to="/contact" className="btn btn--ghost btn--sm">Need help?</Link>
              </div>
            </form>
          </div>

          {!tracking && (
            <div className="track-card track-empty">
              <div className="track-card__head">
                <span className="track-card__icon">
                  <ClipboardIcon />
                </span>
                <h2 className="track-card__title">Where to find your order number</h2>
              </div>
              <p className="track-card__subtitle">Check your confirmation email, SMS, or the order confirmation screen after checkout. If you still cannot find it, use the contact page and support can help you locate the order.</p>
              <Link to="/contact" className="btn btn--outline btn--sm">Go to Contact Us</Link>
            </div>
          )}

          {tracking && order && (
            <>
              <div className={`track-banner ${banner.className}`}>
                <div className="track-banner__icon">{banner.icon}</div>
                <div className="track-banner__info">
                  <p className="track-banner__status">{tracking.current_status_label}</p>
                  <p className="track-banner__eta">
                    {tracking.estimated_delivery || `Delivery method: ${order.delivery_method.replace(/_/g, ' ')}`}
                  </p>
                  <p className="track-banner__meta">
                    Order {tracking.order_number} · Updated {formatDateTime(order.updated_at)}
                  </p>
                </div>
                <div className="track-banner__actions">
                  <button className="btn btn--ghost btn--sm" type="button" onClick={handleCopyLink}>
                    {copyStatus || 'Copy tracking link'}
                  </button>
                  <Link to="/contact" className="btn btn--outline btn--sm">Contact support</Link>
                </div>
              </div>

              {trackingSteps.length > 0 && (
                <div className="track-progress">
                  {trackingSteps.map((step, index) => (
                    <div
                      key={`${step.status}-${index}`}
                      className={[
                        'track-progress__step',
                        step.is_done ? 'track-progress__step--done' : '',
                        step.is_current ? 'track-progress__step--current' : '',
                      ].join(' ').trim()}
                    >
                      <div className="track-progress__dot">
                        {step.is_done ? '✓' : step.is_current ? '●' : index + 1}
                      </div>
                      <div>
                        <p>{step.label}</p>
                        <span>{step.completed_at ? formatDateTime(step.completed_at) : 'Pending'}</span>
                      </div>
                    </div>
                  ))}
                  <div className="track-progress__bar">
                    <span style={{ width: `${Math.min(progressRatio * 100, 100)}%` }} />
                  </div>
                </div>
              )}

              <div className="track-layout">
                <div className="track-left">
                  <div className="track-card">
                    <div className="track-card__head">
                      <span className="track-card__icon">
                        <TruckIcon />
                      </span>
                      <h2 className="track-card__title">Tracking timeline</h2>
                    </div>
                    <p className="track-card__subtitle">Latest events from your order appear here.</p>
                    <div className="timeline">
                      {(tracking.events.length > 0 ? tracking.events : trackingSteps).map((entry, index) => {
                        const isEvent = 'event_type' in entry
                        const title = isEvent
                          ? fallbackTimelineLabel(entry.event_type)
                          : entry.label
                        const body = isEvent
                          ? entry.message || 'Order activity recorded.'
                          : entry.completed_at
                            ? 'Step completed.'
                            : 'Waiting for this step.'
                        const createdAt = isEvent
                          ? entry.created_at
                          : entry.completed_at
                        const state = isEvent
                          ? index === 0 ? 'current' : 'done'
                          : entry.is_current ? 'current' : entry.is_done ? 'done' : 'upcoming'

                        return (
                          <div key={`${title}-${index}`} className={`timeline__item timeline__item--${state}`}>
                            <div className="timeline__icon">
                              {state === 'done' ? <CheckIcon size={16} /> : state === 'current' ? <TruckIcon size={16} /> : <PackageIcon size={16} />}
                            </div>
                            <div className="timeline__content">
                              <div className="timeline__title">{title}</div>
                              <div className="timeline__body">{body}</div>
                              <div className="timeline__time">{createdAt ? formatDateTime(createdAt) : 'Awaiting update'}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="track-card">
                    <div className="track-card__head">
                      <span className="track-card__icon">
                        <MapPinIcon />
                      </span>
                      <h3 className="track-card__title">Delivery details</h3>
                    </div>
                    <div className="track-detail-list">
                      <div>
                        <span>Recipient</span>
                        <strong>{`${order.shipping_first_name} ${order.shipping_last_name}`.trim() || 'Customer'}</strong>
                      </div>
                      <div>
                        <span>Address</span>
                        <strong>{order.shipping_address || 'Not available'}</strong>
                      </div>
                      <div>
                        <span>Placed</span>
                        <strong>{formatDateTime(order.placed_at)}</strong>
                      </div>
                      <div>
                        <span>Delivery note</span>
                        <strong>{order.delivery_notes || 'No delivery note was added for this order.'}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="track-right">
                  <div className="track-card">
                    <div className="track-card__head">
                      <span className="track-card__icon">
                        <PackageIcon />
                      </span>
                      <h3 className="track-card__title">Order summary</h3>
                    </div>
                    <div className="track-summary-grid">
                      <div className="track-summary-row">
                        <span>Order number</span>
                        <strong>{order.order_number}</strong>
                      </div>
                      <div className="track-summary-row">
                        <span>Payment</span>
                        <strong>{order.payment_method_label} · {order.payment_status_label}</strong>
                      </div>
                      <div className="track-summary-row">
                        <span>Subtotal</span>
                        <strong>{formatMoney(order.subtotal)}</strong>
                      </div>
                      <div className="track-summary-row">
                        <span>Shipping</span>
                        <strong>{formatMoney(order.shipping_fee)}</strong>
                      </div>
                      <div className="track-summary-row track-summary-row--total">
                        <span>Total</span>
                        <strong>{formatMoney(order.total)}</strong>
                      </div>
                    </div>

                    <div className="track-items">
                      <div className="track-items__header">
                        <span>Items</span>
                        <strong>{order.items.length}</strong>
                      </div>
                      {order.items.map((item) => (
                        <div key={item.id} className="track-item">
                          <div className="track-item__copy">
                            <span className="track-item__name">{item.product_name}</span>
                            {item.variant_name && <span className="track-item__variant">{item.variant_name}</span>}
                          </div>
                          <span>{item.quantity} x {formatMoney(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="track-card">
                    <div className="track-card__head">
                      <span className="track-card__icon track-card__icon--blue">
                        <PhoneIcon />
                      </span>
                      <h3 className="track-card__title">Need help?</h3>
                    </div>
                    <p className="track-card__subtitle">If the details here do not look right, or you need help with delivery, use any of the support options below.</p>
                    <div className="track-help-links">
                      <Link to="/contact" className="track-help-link">
                        <span className="track-help-link__icon"><ClipboardIcon /></span>
                        <div>
                          <p className="track-help-link__label">Contact us</p>
                          <p className="track-help-link__value">Open the support page</p>
                        </div>
                        <span className="track-help-link__arrow"><ArrowRightIcon /></span>
                      </Link>
                      <a href={`tel:${formatPhoneHref(settings.supportPhone)}`} className="track-help-link">
                        <span className="track-help-link__icon"><PhoneIcon /></span>
                        <div>
                          <p className="track-help-link__label">Call us</p>
                          <p className="track-help-link__value">{settings.supportPhone}</p>
                        </div>
                        <span className="track-help-link__arrow"><ArrowRightIcon /></span>
                      </a>
                      {hasDistinctWhatsapp && (
                        <a href={`https://wa.me/${formatWhatsAppHref(settings.whatsappPhone)}`} className="track-help-link" target="_blank" rel="noreferrer">
                          <span className="track-help-link__icon"><MessageIcon /></span>
                          <div>
                            <p className="track-help-link__label">WhatsApp</p>
                            <p className="track-help-link__value">{settings.whatsappPhone}</p>
                          </div>
                          <span className="track-help-link__arrow"><ArrowRightIcon /></span>
                        </a>
                      )}
                      <a href={`mailto:${settings.supportEmail}`} className="track-help-link">
                        <span className="track-help-link__icon"><MailIcon /></span>
                        <div>
                          <p className="track-help-link__label">Email us</p>
                          <p className="track-help-link__value">{settings.supportEmail}</p>
                        </div>
                        <span className="track-help-link__arrow"><ArrowRightIcon /></span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <SupportShortcuts />
    </div>
  )
}

export default OrderTrackingPage
