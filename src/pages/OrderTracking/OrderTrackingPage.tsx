import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { formatPhoneHref, formatWhatsAppHref } from '../../services/siteSettingsService'
import '../../styles/pages/OrderTrackingPage.css'

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
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

function PillIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width={size} height={size}>
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
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

function MapPinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width={size} height={size}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function BellIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width={size} height={size}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
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

function LinkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width={size} height={size}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
      <polyline points="18 15 12 9 6 15" />
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

const STEP_ICONS: Record<string, React.ReactNode> = {
  'Order confirmed': <CheckIcon size={16} />,
  'Prescription verified': <PillIcon size={16} />,
  'Packed & ready': <PackageIcon size={16} />,
  'Out for delivery': <TruckIcon size={16} />,
  'Delivered': <MapPinIcon size={16} />,
}

const BANNER_CFG: Record<string, { cls: string; icon: React.ReactNode }> = {
  'Out for delivery': { cls: 'track-banner--transit', icon: <TruckIcon size={22} /> },
  'Delivered': { cls: 'track-banner--delivered', icon: <CheckIcon size={22} /> },
  'Processing': { cls: 'track-banner--processing', icon: <PackageIcon size={22} /> },
}

function OrderTrackingPage() {
  const { settings } = useSiteSettings()
  const normalizedSupportPhone = settings.supportPhone.replace(/\D/g, '')
  const normalizedWhatsappPhone = settings.whatsappPhone.replace(/\D/g, '')
  const hasDistinctWhatsapp = Boolean(normalizedWhatsappPhone) && normalizedWhatsappPhone !== normalizedSupportPhone
  const [orderId, setOrderId] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [isTracking, setIsTracking] = useState(false)
  const [resultReady, setResultReady] = useState(false)
  const [expandedStep, setExpandedStep] = useState<number | null>(null)
  const [copyStatus, setCopyStatus] = useState('')
  const [deliveryNote, setDeliveryNote] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [notifyPrefs, setNotifyPrefs] = useState({ sms: true, whatsapp: false, email: true })

  const sampleOrder = useMemo(() => ({
    id: 'ORD-007',
    status: 'Out for delivery',
    eta: 'Today, 5:00 PM – 7:00 PM',
    method: 'Same-day courier',
    rider: { name: 'Kevin Mutiso', phone: '+254701222444', displayPhone: '+254 701 222 444' },
    address: '24 Mombasa Road, Nairobi, Kenya',
    payment: 'M-Pesa',
    lastUpdated: '2 mins ago',
    steps: [
      { title: 'Order confirmed', body: 'Payment received and order approved by pharmacy.', time: '10:15 AM', status: 'done' as const },
      { title: 'Prescription verified', body: 'Pharmacist verified your prescription and dosage.', time: '11:00 AM', status: 'done' as const },
      { title: 'Packed & ready', body: 'Items packed at Nairobi CBD branch.', time: '11:30 AM', status: 'done' as const },
      { title: 'Out for delivery', body: 'Courier picked up your package and is heading to you.', time: '1:05 PM', status: 'current' as const },
      { title: 'Delivered', body: 'Order delivered to your doorstep.', time: 'Expected 6:10 PM', status: 'upcoming' as const },
    ],
    items: [
      { name: 'Digital Thermometer', qty: 1, price: 'KSh 950' },
      { name: 'Vitamin C 1000mg', qty: 1, price: 'KSh 1,200' },
      { name: 'Paracetamol 500mg', qty: 2, price: 'KSh 500' },
    ],
  }), [])

  const steps = sampleOrder.steps
  const currentStepIndex = steps.findIndex((s) => s.status === 'current')
  const bannerCfg = BANNER_CFG[sampleOrder.status] ?? { cls: 'track-banner--transit', icon: <TruckIcon size={22} /> }

  const handleTrack = () => {
    setError('')
    if (!orderId.trim() && !phone.trim()) {
      setError('Please enter your Order ID or the phone number you used when ordering.')
      return
    }
    setIsTracking(true)
    setResultReady(false)
    window.setTimeout(() => { setIsTracking(false); setResultReady(true) }, 900)
  }

  const applySample = () => { setOrderId(sampleOrder.id); setPhone('+254 700 000 000'); setError('') }

  const toggleStep = (index: number) => setExpandedStep((prev) => (prev === index ? null : index))

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/track-order?order=${sampleOrder.id}`)
      setCopyStatus('Copied!')
    } catch { setCopyStatus('Failed') }
    window.setTimeout(() => setCopyStatus(''), 2000)
  }

  const handleSaveNote = () => { setNoteSaved(true); window.setTimeout(() => setNoteSaved(false), 2000) }

  return (
    <div className="tracking-page">
      <section className="page">
        <div className="container">

          {/* Breadcrumbs */}
          <nav className="track-breadcrumbs">
            <Link to="/">Home</Link>
            <span>›</span>
            <Link to="/account/orders">Orders</Link>
            <span>›</span>
            <span>Track order</span>
          </nav>

          <div className="track-page-header">
            <h1>Track your order</h1>
            <p>See exactly where your medicines are_ from pharmacy shelf to your door.</p>
          </div>

          {/* ── Search card ─────────────────────────────── */}
          <div className="track-card track-card--hero">
            <div>
              <div className="track-card__head">
                <span className="track-card__icon">
                  <SearchIcon />
                </span>
                <h2 className="track-card__title">Where is my order?</h2>
              </div>
              <p className="track-card__subtitle">You only need <strong>one</strong> of the fields below_ your Order ID or phone number.</p>
            </div>

            <div className="track-form">
              <div className="track-form__row">
                <div className="form-group">
                  <label htmlFor="order-id">
                    <span className="form-label__main">Order ID</span>
                    <span className="form-label__hint">Looks like: ORD-2026-1042</span>
                  </label>
                  <input
                    id="order-id"
                    type="text"
                    placeholder="ORD-2026-1042"
                    value={orderId}
                    onChange={(e) => { setOrderId(e.target.value); setError('') }}
                  />
                </div>
                <div className="track-form__or"><span>or</span></div>
                <div className="form-group">
                  <label htmlFor="order-phone">
                    <span className="form-label__main">Phone number</span>
                    <span className="form-label__hint">Number used when ordering</span>
                  </label>
                  <input
                    id="order-phone"
                    type="tel"
                    placeholder="+254 700 000 000"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError('') }}
                  />
                </div>
              </div>
              {error && <p className="track-error">{error}</p>}
              <div className="track-actions">
                <button className="btn btn--primary track-btn--main" type="button" onClick={handleTrack} disabled={isTracking}>
                  {isTracking
                    ? 'Finding your order…'
                    : <><SearchIcon /> Track my order</>
                  }
                </button>
                <button className="btn btn--ghost btn--sm" type="button" onClick={applySample}>Try a demo</button>
                <button className="btn btn--ghost btn--sm" type="button">Need help?</button>
              </div>
            </div>

            {/* How it works */}
            <div className="track-how">
              <div className="track-how__step">
                <div className="track-how__num">1</div>
                <p>Enter your Order ID <em>or</em> phone number above</p>
              </div>
              <div className="track-how__line" />
              <div className="track-how__step">
                <div className="track-how__num">2</div>
                <p>Tap <strong>"Track my order"</strong></p>
              </div>
              <div className="track-how__line" />
              <div className="track-how__step">
                <div className="track-how__num">3</div>
                <p>See live updates and delivery info instantly</p>
              </div>
            </div>
          </div>

          {resultReady && (
            <>
              {/* ── Status banner ────────────────────── */}
              <div className={`track-banner ${bannerCfg.cls}`}>
                <div className="track-banner__icon">{bannerCfg.icon}</div>
                <div className="track-banner__info">
                  <p className="track-banner__status">{sampleOrder.status}</p>
                  <p className="track-banner__eta">{sampleOrder.eta}</p>
                  <p className="track-banner__meta">Updated {sampleOrder.lastUpdated} · {sampleOrder.payment}</p>
                </div>
                <div className="track-banner__courier">
                  <p className="track-banner__courier-label">Your courier</p>
                  <p className="track-banner__courier-name">{sampleOrder.rider.name}</p>
                  <a href={`tel:${sampleOrder.rider.phone}`} className="btn track-banner__call">
                    <PhoneIcon size={14} /> Call {sampleOrder.rider.name.split(' ')[0]}
                  </a>
                </div>
              </div>

              {/* ── Progress strip ───────────────────────── */}
              <div className="track-progress">
                {steps.map((step, index) => (
                  <div key={step.title} className={`track-progress__step track-progress__step--${step.status}`}>
                    <div className="track-progress__dot">
                      {step.status === 'done' ? '✓' : step.status === 'current' ? '●' : index + 1}
                    </div>
                    <div>
                      <p>{step.title}</p>
                      <span>{step.time}</span>
                    </div>
                  </div>
                ))}
                <div className="track-progress__bar">
                  <span style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }} />
                </div>
              </div>

              {/* ── Two-column layout ────────────────────── */}
              <div className="track-layout">
                <div className="track-left">

                  {/* Timeline */}
                  <div className="track-card">
                    <div className="track-card__head">
                      <span className="track-card__icon">
                        <TruckIcon />
                      </span>
                      <h2 className="track-card__title">Delivery timeline</h2>
                      <button className="btn btn--ghost btn--sm" type="button" onClick={handleCopy}>
                        <LinkIcon size={14} /> {copyStatus || 'Share link'}
                      </button>
                    </div>
                    <p className="track-card__subtitle">Tap any step to see more details.</p>
                    <div className="timeline">
                      {steps.map((step, index) => (
                        <button
                          key={step.title}
                          className={`timeline__item timeline__item--${step.status}`}
                          type="button"
                          onClick={() => toggleStep(index)}
                          aria-expanded={expandedStep === index}
                        >
                          <div className="timeline__icon">
                            {STEP_ICONS[step.title] ?? <PackageIcon />}
                          </div>
                          <div className="timeline__content">
                            <div className="timeline__title">{step.title}</div>
                            <div className="timeline__body">{step.body}</div>
                            <div className="timeline__time">{step.time}</div>
                            {expandedStep === index && (
                              <div className="timeline__detail">
                                Location: Nairobi CBD hub · Handler: {sampleOrder.rider.name}
                              </div>
                            )}
                          </div>
                          <span className="timeline__chevron">
                            {expandedStep === index ? <ChevronUpIcon /> : <ChevronDownIcon />}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Delivery notes */}
                  <div className="track-card">
                    <div className="track-card__head">
                      <span className="track-card__icon">
                        <ClipboardIcon />
                      </span>
                      <h3 className="track-card__title">Leave a note for your courier</h3>
                    </div>
                    <p className="track-card__subtitle">Gate locked? Prefer a specific time? Let them know here.</p>
                    <textarea
                      className="track-note"
                      rows={3}
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                      placeholder="e.g. Please call on arrival. Gate code is 1234. Leave with security if I'm not home."
                    />
                    <div className="track-actions" style={{ marginTop: '0.75rem' }}>
                      <button className="btn btn--outline btn--sm" type="button" onClick={handleSaveNote}>Save note</button>
                      {noteSaved && <span className="track-toast">Note saved!</span>}
                    </div>
                  </div>
                </div>

                <div className="track-right">

                  {/* Order summary */}
                  <div className="track-card">
                    <div className="track-card__head">
                      <span className="track-card__icon">
                        <PackageIcon />
                      </span>
                      <h3 className="track-card__title">What's in this order?</h3>
                    </div>
                    <div className="track-detail">
                      <div><span>Order ID</span><strong>{sampleOrder.id}</strong></div>
                      <div><span>Delivery address</span><strong>{sampleOrder.address}</strong></div>
                      <div><span>Payment method</span><strong>{sampleOrder.payment}</strong></div>
                    </div>
                    <div className="track-items">
                      {sampleOrder.items.map((item) => (
                        <div key={item.name} className="track-item">
                          <span className="track-item__name"><PillIcon size={13} /> {item.name}</span>
                          <span>{item.qty}× · {item.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notification toggles */}
                  <div className="track-card">
                    <div className="track-card__head">
                      <span className="track-card__icon">
                        <BellIcon />
                      </span>
                      <h3 className="track-card__title">Delivery alerts</h3>
                    </div>
                    <p className="track-card__subtitle">Choose how we notify you when your order moves.</p>
                    <div className="track-toggles">
                      {([
                        { key: 'sms', icon: <PhoneIcon size={15} />, label: 'SMS', desc: 'Text message' },
                        { key: 'whatsapp', icon: <MessageIcon size={15} />, label: 'WhatsApp', desc: 'Chat message' },
                        { key: 'email', icon: <MailIcon size={15} />, label: 'Email', desc: 'Email message' },
                      ] as const).map(({ key, icon, label, desc }) => (
                        <div key={key} className="track-toggle-row">
                          <div className="track-toggle-row__info">
                            <span className="track-toggle-row__icon">{icon}</span>
                            <div>
                              <p className="track-toggle-row__label">{label}</p>
                              <p className="track-toggle-row__desc">{desc}</p>
                            </div>
                          </div>
                          <button
                            role="switch"
                            aria-checked={notifyPrefs[key]}
                            className={`track-toggle-switch ${notifyPrefs[key] ? 'track-toggle-switch--on' : ''}`}
                            onClick={() => setNotifyPrefs((prev) => ({ ...prev, [key]: !prev[key] }))}
                            type="button"
                            aria-label={`${label} updates`}
                          >
                            <span className="track-toggle-switch__thumb" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="track-actions" style={{ marginTop: '1rem' }}>
                      <button className="btn btn--primary btn--sm" type="button">Save preferences</button>
                    </div>
                  </div>

                  {/* Help */}
                  <div className="track-card">
                    <div className="track-card__head">
                      <span className="track-card__icon track-card__icon--blue">
                        <PhoneIcon />
                      </span>
                      <h3 className="track-card__title">Need help?</h3>
                    </div>
                    <p className="track-card__subtitle">Our support team is here for you.</p>
                    <div className="track-help-links">
                      {hasDistinctWhatsapp && (
                        <a href={`tel:${formatPhoneHref(settings.supportPhone)}`} className="track-help-link">
                          <span className="track-help-link__icon"><PhoneIcon /></span>
                          <div>
                            <p className="track-help-link__label">Call us</p>
                            <p className="track-help-link__value">{settings.supportPhone}</p>
                          </div>
                          <span className="track-help-link__arrow"><ArrowRightIcon /></span>
                        </a>
                      )}
                      <a href={`https://wa.me/${formatWhatsAppHref(settings.whatsappPhone)}`} className="track-help-link" target="_blank" rel="noreferrer">
                        <span className="track-help-link__icon"><MessageIcon /></span>
                        <div>
                          <p className="track-help-link__label">WhatsApp</p>
                          <p className="track-help-link__value">Chat with us now</p>
                        </div>
                        <span className="track-help-link__arrow"><ArrowRightIcon /></span>
                      </a>
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
    </div>
  )
}

export default OrderTrackingPage
