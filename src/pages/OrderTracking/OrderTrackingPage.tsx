import { useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader/PageHeader'
import './OrderTrackingPage.css'

const STEP_ICONS: Record<string, string> = {
  'Order confirmed': '✅',
  'Prescription verified': '💊',
  'Packed & ready': '📦',
  'Out for delivery': '🚗',
  'Delivered': '🏠',
}

const BANNER_CFG: Record<string, { cls: string; icon: string }> = {
  'Out for delivery': { cls: 'track-banner--transit', icon: '🚗' },
  'Delivered': { cls: 'track-banner--delivered', icon: '✅' },
  'Processing': { cls: 'track-banner--processing', icon: '⚙️' },
}

function OrderTrackingPage() {
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
  const bannerCfg = BANNER_CFG[sampleOrder.status] ?? { cls: 'track-banner--transit', icon: '📦' }

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
      setCopyStatus('Link copied!')
    } catch { setCopyStatus('Copy failed') }
    window.setTimeout(() => setCopyStatus(''), 2000)
  }

  const handleSaveNote = () => { setNoteSaved(true); window.setTimeout(() => setNoteSaved(false), 2000) }

  return (
    <div className="tracking-page">
      <PageHeader
        title="Track your order"
        subtitle="See exactly where your medicines are — from pharmacy shelf to your door."
        badge="Order Tracking"
      />
      <section className="page">
        <div className="container">

          {/* ── Search card ─────────────────────────────── */}
          <div className="track-card track-card--hero">
            <div>
              <h2 className="card__title">Where is my order?</h2>
              <p className="card__subtitle">You only need <strong>one</strong> of the fields below — your Order ID or phone number.</p>
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
              {error && <p className="track-error">⚠️ {error}</p>}
              <div className="track-actions">
                <button className="btn btn--primary track-btn--main" type="button" onClick={handleTrack} disabled={isTracking}>
                  {isTracking ? 'Finding your order…' : '🔍  Track my order'}
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
              {/* ── Big status banner ────────────────────── */}
              <div className={`track-banner ${bannerCfg.cls}`}>
                <div className="track-banner__icon">{bannerCfg.icon}</div>
                <div className="track-banner__info">
                  <p className="track-banner__status">{sampleOrder.status}</p>
                  <p className="track-banner__eta">📅 {sampleOrder.eta}</p>
                  <p className="track-banner__meta">Updated {sampleOrder.lastUpdated} · {sampleOrder.payment}</p>
                </div>
                <div className="track-banner__courier">
                  <p className="track-banner__courier-label">Your courier</p>
                  <p className="track-banner__courier-name">{sampleOrder.rider.name}</p>
                  <a
                    href={`tel:${sampleOrder.rider.phone}`}
                    className="btn track-banner__call"
                  >
                    📞 Call {sampleOrder.rider.name.split(' ')[0]}
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
                    <div className="track-card__header">
                      <h2 className="card__title">Delivery timeline</h2>
                      <button className="btn btn--ghost btn--sm" type="button" onClick={handleCopy}>
                        {copyStatus || '🔗 Share link'}
                      </button>
                    </div>
                    <p className="card__subtitle">Tap any step to see more details.</p>
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
                            {STEP_ICONS[step.title] ?? '⭕'}
                          </div>
                          <div className="timeline__content">
                            <div className="timeline__title">{step.title}</div>
                            <div className="timeline__body">{step.body}</div>
                            <div className="card__meta">{step.time}</div>
                            {expandedStep === index && (
                              <div className="timeline__detail">
                                📍 Location: Nairobi CBD hub · Handler: {sampleOrder.rider.name}
                              </div>
                            )}
                          </div>
                          <span className="timeline__chevron">{expandedStep === index ? '▲' : '▼'}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Delivery notes */}
                  <div className="track-card">
                    <h3 className="card__title">📝 Leave a note for your courier</h3>
                    <p className="card__subtitle">Gate locked? Prefer a specific time? Let them know here.</p>
                    <textarea
                      className="track-note"
                      rows={3}
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                      placeholder="e.g. Please call on arrival. Gate code is 1234. Leave with security if I'm not home."
                    />
                    <div className="track-actions">
                      <button className="btn btn--outline btn--sm" type="button" onClick={handleSaveNote}>Save note</button>
                      {noteSaved && <span className="track-toast">✅ Note saved!</span>}
                    </div>
                  </div>
                </div>

                <div className="track-right">

                  {/* Order summary */}
                  <div className="track-card card--soft">
                    <h3 className="card__title">🧾 What's in this order?</h3>
                    <div className="track-detail">
                      <div><span>Order ID</span><strong>{sampleOrder.id}</strong></div>
                      <div><span>Delivery address</span><strong>{sampleOrder.address}</strong></div>
                      <div><span>Payment method</span><strong>{sampleOrder.payment}</strong></div>
                    </div>
                    <div className="track-items">
                      {sampleOrder.items.map((item) => (
                        <div key={item.name} className="track-item">
                          <span>💊 {item.name}</span>
                          <span>{item.qty}× · {item.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notification toggles */}
                  <div className="track-card">
                    <h3 className="card__title">🔔 Delivery alerts</h3>
                    <p className="card__subtitle">Choose how we notify you when your order moves.</p>
                    <div className="track-toggles">
                      {([
                        { key: 'sms', icon: '📱', label: 'SMS', desc: 'Text message' },
                        { key: 'whatsapp', icon: '💬', label: 'WhatsApp', desc: 'Chat message' },
                        { key: 'email', icon: '📧', label: 'Email', desc: 'Email message' },
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
                  <div className="track-card card--soft">
                    <h3 className="card__title">🙋 Need help?</h3>
                    <p className="card__subtitle">Our support team is here for you — reach us any way you prefer.</p>
                    <div className="track-help-links">
                      <a href="tel:+254700000000" className="track-help-link">
                        <span className="track-help-link__icon">📞</span>
                        <div>
                          <p className="track-help-link__label">Call us</p>
                          <p className="track-help-link__value">+254 700 000 000</p>
                        </div>
                        <span className="track-help-link__arrow">→</span>
                      </a>
                      <a href="https://wa.me/254700000000" className="track-help-link" target="_blank" rel="noreferrer">
                        <span className="track-help-link__icon">💬</span>
                        <div>
                          <p className="track-help-link__label">WhatsApp</p>
                          <p className="track-help-link__value">Chat with us now</p>
                        </div>
                        <span className="track-help-link__arrow">→</span>
                      </a>
                      <a href="mailto:support@avapharmacy.co.ke" className="track-help-link">
                        <span className="track-help-link__icon">📧</span>
                        <div>
                          <p className="track-help-link__label">Email us</p>
                          <p className="track-help-link__value">support@avapharmacy.co.ke</p>
                        </div>
                        <span className="track-help-link__arrow">→</span>
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
