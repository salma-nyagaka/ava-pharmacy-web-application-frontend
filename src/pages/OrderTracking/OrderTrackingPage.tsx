import { useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader/PageHeader'
import './OrderTrackingPage.css'

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
  const [notifyPrefs, setNotifyPrefs] = useState({
    sms: true,
    whatsapp: false,
    email: true,
  })

  const sampleOrder = useMemo(() => ({
    id: 'ORD-007',
    status: 'Out for delivery',
    eta: 'Today, 5:00 PM - 7:00 PM',
    method: 'Same-day courier',
    rider: { name: 'Kevin Mutiso', phone: '+254 701 222 444' },
    address: '24 Mombasa Road, Nairobi, Kenya',
    payment: 'M-Pesa',
    lastUpdated: '2 mins ago',
    steps: [
      { title: 'Order confirmed', body: 'Payment received and order approved by pharmacy.', time: '10:15 AM', status: 'done' as const },
      { title: 'Prescription verified', body: 'Pharmacist verified your prescription and dosage.', time: '11:00 AM', status: 'done' as const },
      { title: 'Packed & ready', body: 'Items packed at Nairobi CBD branch.', time: '11:30 AM', status: 'done' as const },
      { title: 'Out for delivery', body: 'Courier picked up the package.', time: '1:05 PM', status: 'current' as const },
      { title: 'Delivered', body: 'Order delivered to your doorstep.', time: 'Expected 6:10 PM', status: 'upcoming' as const },
    ],
    items: [
      { name: 'Digital Thermometer', qty: 1, price: 'KSh 950' },
      { name: 'Vitamin C 1000mg', qty: 1, price: 'KSh 1,200' },
      { name: 'Paracetamol 500mg', qty: 2, price: 'KSh 500' },
    ],
  }), [])

  const steps = sampleOrder.steps
  const currentStepIndex = steps.findIndex((step) => step.status === 'current')

  const handleTrack = () => {
    setError('')
    if (!orderId.trim() && !phone.trim()) {
      setError('Enter an order ID or phone number to continue.')
      return
    }
    setIsTracking(true)
    setResultReady(false)
    window.setTimeout(() => {
      setIsTracking(false)
      setResultReady(true)
    }, 900)
  }

  const applySample = () => {
    setOrderId(sampleOrder.id)
    setPhone('+254 700 000 000')
    setError('')
  }

  const toggleStep = (index: number) => {
    setExpandedStep((prev) => (prev === index ? null : index))
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/track-order?order=${sampleOrder.id}`)
      setCopyStatus('Link copied')
    } catch {
      setCopyStatus('Copy failed')
    }
    window.setTimeout(() => setCopyStatus(''), 2000)
  }

  const handleSaveNote = () => {
    setNoteSaved(true)
    window.setTimeout(() => setNoteSaved(false), 2000)
  }

  return (
    <div className="tracking-page">
      <PageHeader
        title="Track your order"
        subtitle="Follow every step from prescription approval to delivery in real time."
        badge="Order Tracking"
      />
      <section className="page">
        <div className="container">
          <div className="track-card track-card--hero">
            <div>
              <h2 className="card__title">Find your order</h2>
              <p className="card__subtitle">Enter an order ID or phone number to see live updates.</p>
            </div>
            <div className="track-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="order-id">Order ID</label>
                  <input
                    id="order-id"
                    type="text"
                    placeholder="ORD-2026-1042"
                    value={orderId}
                    onChange={(event) => { setOrderId(event.target.value); setError('') }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="order-phone">Phone number</label>
                  <input
                    id="order-phone"
                    type="tel"
                    placeholder="+254 700 000 000"
                    value={phone}
                    onChange={(event) => { setPhone(event.target.value); setError('') }}
                  />
                </div>
              </div>
              {error && <p className="track-error">{error}</p>}
              <div className="track-actions">
                <button className="btn btn--primary" type="button" onClick={handleTrack} disabled={isTracking}>
                  {isTracking ? 'Tracking...' : 'Track order'}
                </button>
                <button className="btn btn--outline" type="button" onClick={applySample}>
                  Use sample order
                </button>
                <button className="btn btn--ghost" type="button">
                  Need help?
                </button>
              </div>
            </div>
          </div>

          {resultReady && (
            <>
              <div className="tracking-summary">
                <div className="tracking-summary__item">
                  <p className="tracking-summary__label">Order status</p>
                  <p className="tracking-summary__value">
                    <span className="track-status">{sampleOrder.status}</span>
                  </p>
                  <span className="tracking-summary__meta">Updated {sampleOrder.lastUpdated}</span>
                </div>
                <div className="tracking-summary__item">
                  <p className="tracking-summary__label">Estimated delivery</p>
                  <p className="tracking-summary__value">{sampleOrder.eta}</p>
                  <span className="tracking-summary__meta">{sampleOrder.method}</span>
                </div>
                <div className="tracking-summary__item">
                  <p className="tracking-summary__label">Courier</p>
                  <p className="tracking-summary__value">{sampleOrder.rider.name}</p>
                  <span className="tracking-summary__meta">{sampleOrder.rider.phone}</span>
                </div>
              </div>

              <div className="track-progress">
                {steps.map((step, index) => (
                  <div
                    key={step.title}
                    className={`track-progress__step track-progress__step--${step.status}`}
                  >
                    <div className="track-progress__dot">{index + 1}</div>
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

              <div className="track-layout">
                <div className="track-left">
                  <div className="track-card">
                    <div className="track-card__header">
                      <h2 className="card__title">Timeline</h2>
                      <button className="btn btn--ghost btn--sm" type="button" onClick={handleCopy}>
                        Copy tracking link
                      </button>
                      {copyStatus && <span className="track-toast">{copyStatus}</span>}
                    </div>
                    <div className="timeline">
                      {steps.map((step, index) => (
                        <button
                          key={step.title}
                          className={`timeline__item timeline__item--${step.status}`}
                          type="button"
                          onClick={() => toggleStep(index)}
                        >
                          <div className="timeline__title">{step.title}</div>
                          <div className="timeline__body">{step.body}</div>
                          <div className="card__meta">{step.time}</div>
                          {expandedStep === index && (
                            <div className="timeline__detail">
                              Location: Nairobi CBD hub · Handler: {sampleOrder.rider.name}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="track-card">
                    <h3 className="card__title">Delivery notes</h3>
                    <p className="card__subtitle">Add instructions for the courier (gate code, preferred time, etc.).</p>
                    <textarea
                      className="track-note"
                      rows={3}
                      value={deliveryNote}
                      onChange={(event) => setDeliveryNote(event.target.value)}
                      placeholder="e.g. Call on arrival, leave with security at Gate A."
                    />
                    <div className="track-actions">
                      <button className="btn btn--outline btn--sm" type="button" onClick={handleSaveNote}>
                        Save note
                      </button>
                      {noteSaved && <span className="track-toast">Saved</span>}
                    </div>
                  </div>
                </div>

                <div className="track-right">
                  <div className="track-card card--soft">
                    <h3 className="card__title">Order details</h3>
                    <div className="track-detail">
                      <div>
                        <span>Order ID</span>
                        <strong>{sampleOrder.id}</strong>
                      </div>
                      <div>
                        <span>Delivery address</span>
                        <strong>{sampleOrder.address}</strong>
                      </div>
                      <div>
                        <span>Payment</span>
                        <strong>{sampleOrder.payment}</strong>
                      </div>
                    </div>
                    <div className="track-items">
                      {sampleOrder.items.map((item) => (
                        <div key={item.name} className="track-item">
                          <span>{item.name}</span>
                          <span>{item.qty}x · {item.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="track-card">
                    <h3 className="card__title">Live updates</h3>
                    <p className="card__subtitle">Choose how you want to receive tracking alerts.</p>
                    <div className="track-toggle">
                      <label>
                        <input
                          type="checkbox"
                          checked={notifyPrefs.sms}
                          onChange={(event) => setNotifyPrefs((prev) => ({ ...prev, sms: event.target.checked }))}
                        />
                        SMS updates
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={notifyPrefs.whatsapp}
                          onChange={(event) => setNotifyPrefs((prev) => ({ ...prev, whatsapp: event.target.checked }))}
                        />
                        WhatsApp updates
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={notifyPrefs.email}
                          onChange={(event) => setNotifyPrefs((prev) => ({ ...prev, email: event.target.checked }))}
                        />
                        Email updates
                      </label>
                    </div>
                    <div className="track-actions">
                      <button className="btn btn--primary btn--sm" type="button">
                        Save preferences
                      </button>
                    </div>
                  </div>

                  <div className="track-card card--soft">
                    <h3 className="card__title">Need assistance?</h3>
                    <p className="card__subtitle">Our support team can update delivery instructions.</p>
                    <ul className="card__list">
                      <li>📞 Call +254 700 000 000</li>
                      <li>💬 WhatsApp chat available</li>
                      <li>📧 support@avapharmacy.co.ke</li>
                    </ul>
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
