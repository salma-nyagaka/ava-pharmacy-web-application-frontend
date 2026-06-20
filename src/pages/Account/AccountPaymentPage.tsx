import { useEffect, useState } from 'react'
import {
  createSavedPaymentMethod,
  deleteSavedPaymentMethod,
  fetchSavedPaymentMethods,
  updateSavedPaymentMethod,
  type SavedPaymentMethod,
} from '../../services/paymentMethodService'
import '../../styles/pages/AccountPaymentPage.css'

type CardType = 'visa' | 'mastercard' | 'unknown'
type PayType = 'card' | 'mpesa'

const EMPTY_FORM = { cardNumber: '', expiry: '', cvv: '', cardName: '', phone: '' }

function detectCardType(num: string): CardType {
  const clean = num.replace(/\s/g, '')
  if (/^4/.test(clean)) return 'visa'
  if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'mastercard'
  return 'unknown'
}

function formatCardNumber(val: string) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return digits
}

function formatStoredExpiry(method: SavedPaymentMethod) {
  return `${String(method.expiry_month).padStart(2, '0')}/${String(method.expiry_year).slice(-2)}`
}

function brandClass(brand: string): CardType {
  return brand === 'visa' || brand === 'mastercard' ? brand : 'unknown'
}

function formatPhone(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 12)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}

function AccountPaymentPage() {
  const [cards, setCards] = useState<SavedPaymentMethod[]>([])
  const [showForm, setShowForm] = useState(false)
  const [payType, setPayType] = useState<PayType>('card')
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let active = true
    void fetchSavedPaymentMethods()
      .then((rows) => {
        if (!active) return
        setCards(rows)
      })
      .catch(() => {
        if (!active) return
        setError('Unable to load saved payment methods.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const cancel = () => {
    setShowForm(false)
    setPayType('card')
    setForm(EMPTY_FORM)
    setError('')
  }

  const save = async () => {
    if (payType === 'mpesa') {
      const phoneDigits = form.phone.replace(/\s/g, '')
      if (phoneDigits.length < 9) {
        setError('Enter a valid Safaricom M-Pesa phone number.')
        return
      }
      if (!form.cardName.trim()) {
        setError('Account name is required.')
        return
      }

      setIsSaving(true)
      setError('')
      try {
        await createSavedPaymentMethod({
          brand: 'mpesa',
          last4: phoneDigits.slice(-4),
          expiry_month: 0,
          expiry_year: 0,
          cardholder_name: form.cardName.trim(),
          is_default: cards.length === 0,
        })
        setCards(await fetchSavedPaymentMethods())
        setShowForm(false)
        setPayType('card')
        setForm(EMPTY_FORM)
      } catch {
        setError('Unable to save this payment method right now.')
      } finally {
        setIsSaving(false)
      }
      return
    }

    const clean = form.cardNumber.replace(/\s/g, '')
    if (clean.length < 16) {
      setError('Enter a valid 16-digit card number.')
      return
    }
    if (!form.expiry || form.expiry.length < 5) {
      setError('Enter a valid expiry date (MM/YY).')
      return
    }
    if (!form.cardName.trim()) {
      setError('Cardholder name is required.')
      return
    }

    const [monthRaw, yearRaw] = form.expiry.split('/')
    const expiryMonth = Number.parseInt(monthRaw, 10)
    const expiryYear = 2000 + Number.parseInt(yearRaw, 10)
    if (!Number.isFinite(expiryMonth) || !Number.isFinite(expiryYear)) {
      setError('Enter a valid expiry date (MM/YY).')
      return
    }

    setIsSaving(true)
    setError('')
    try {
      await createSavedPaymentMethod({
        brand: detectCardType(clean),
        last4: clean.slice(-4),
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        cardholder_name: form.cardName.trim(),
        is_default: cards.length === 0,
      })
      setCards(await fetchSavedPaymentMethods())
      setShowForm(false)
      setPayType('card')
      setForm(EMPTY_FORM)
    } catch {
      setError('Unable to save this payment method right now.')
    } finally {
      setIsSaving(false)
    }
  }

  const remove = async (id: number) => {
    setError('')
    try {
      await deleteSavedPaymentMethod(id)
      setCards((prev) => prev.filter((card) => card.id !== id))
      const refreshed = await fetchSavedPaymentMethods()
      setCards(refreshed)
    } catch {
      setError('Unable to remove this payment method right now.')
    }
  }

  const setDefault = async (id: number) => {
    setError('')
    try {
      const updated = await updateSavedPaymentMethod(id, { is_default: true })
      setCards((prev) => prev.map((card) => ({ ...card, is_default: card.id === updated.id })))
    } catch {
      setError('Unable to update the default payment method right now.')
    }
  }

  const previewType = detectCardType(form.cardNumber)

  return (
    <div className="pay-page">
        <div className="pay-header">
          <div>
            <p className="pay-header__eyebrow">My Account</p>
            <h1 className="pay-header__title">Payment Methods</h1>
            <p className="pay-header__sub">Securely manage the cards and M-Pesa accounts you use at checkout</p>
          </div>
        </div>

        <div className="pay-layout">
          <div className="pay-cards-col">
            {isLoading && <p className="pay-form-error">Loading saved payment methods…</p>}
            {error && <p className="pay-form-error">{error}</p>}

            {cards.map((card) => (
              <div
                key={card.id}
                className={`pay-card pay-card--${card.brand === 'mpesa' ? 'mpesa' : brandClass(card.brand)}${card.is_default ? ' pay-card--default' : ''}`}
              >
                <div className="pay-card__top">
                  <div className="pay-card__chip" />
                  {card.is_default && <span className="pay-card__default-badge">Default</span>}
                </div>
                <div className="pay-card__number">
                  {card.brand === 'mpesa' ? `••• ••• ${card.last4}` : `•••• •••• •••• ${card.last4}`}
                </div>
                <div className="pay-card__bottom">
                  <div className="pay-card__meta">
                    <span className="pay-card__meta-label">{card.brand === 'mpesa' ? 'Account' : 'Cardholder'}</span>
                    <span className="pay-card__meta-value">{card.cardholder_name}</span>
                  </div>
                  <div className="pay-card__meta">
                    <span className="pay-card__meta-label">{card.brand === 'mpesa' ? 'Number' : 'Expires'}</span>
                    <span className="pay-card__meta-value">
                      {card.brand === 'mpesa' ? `•••• ${card.last4}` : formatStoredExpiry(card)}
                    </span>
                  </div>
                  <div className="pay-card__brand">
                    {card.brand === 'visa' && <span className="pay-card__visa">VISA</span>}
                    {card.brand === 'mastercard' && (
                      <span className="pay-card__mc">
                        <span className="pay-card__mc-l" />
                        <span className="pay-card__mc-r" />
                      </span>
                    )}
                    {card.brand === 'mpesa' && <span className="pay-card__mpesa">M-PESA</span>}
                  </div>
                </div>
                <div className="pay-card__actions">
                  {!card.is_default && (
                    <button className="btn btn--outline btn--sm pay-card__action-btn" type="button" onClick={() => void setDefault(card.id)}>
                      Set default
                    </button>
                  )}
                  <button className="pay-card__remove" type="button" onClick={() => void remove(card.id)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {!showForm && (
              <button className="pay-add-btn" type="button" onClick={() => setShowForm(true)}>
                <span className="pay-add-btn__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
                Add payment method
              </button>
            )}
          </div>

          {showForm && (
            <div className="pay-form-card">
              <h3 className="pay-form-card__title">Add Payment Method</h3>

              <div className="pay-form-type" role="tablist" aria-label="Payment type">
                <button
                  type="button"
                  role="tab"
                  aria-selected={payType === 'card'}
                  className={`pay-form-type__btn${payType === 'card' ? ' pay-form-type__btn--active' : ''}`}
                  onClick={() => { setPayType('card'); setError('') }}
                >
                  Card
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={payType === 'mpesa'}
                  className={`pay-form-type__btn${payType === 'mpesa' ? ' pay-form-type__btn--active' : ''}`}
                  onClick={() => { setPayType('mpesa'); setError('') }}
                >
                  M-Pesa
                </button>
              </div>

              <p className="pay-form-notice">
                Demo only — card details are not sent to a real payment gateway. Only the last 4 digits are stored.
              </p>

              {payType === 'card' ? (
                <>
                  <div className={`pay-preview pay-preview--${previewType}`}>
                    <div className="pay-preview__top">
                      <div className="pay-preview__chip" />
                    </div>
                    <div className="pay-preview__number">
                      {form.cardNumber || '•••• •••• •••• ••••'}
                    </div>
                    <div className="pay-preview__bottom">
                      <div>
                        <div className="pay-preview__label">Cardholder</div>
                        <div className="pay-preview__value">{form.cardName || '-'}</div>
                      </div>
                      <div>
                        <div className="pay-preview__label">Expires</div>
                        <div className="pay-preview__value">{form.expiry || 'MM/YY'}</div>
                      </div>
                      <div className="pay-preview__brand">
                        {previewType === 'visa' && <span className="pay-preview__visa">VISA</span>}
                        {previewType === 'mastercard' && (
                          <span className="pay-preview__mc">
                            <span /><span />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pay-form-group">
                    <label>Card number</label>
                    <input
                      value={form.cardNumber}
                      onChange={(event) => setForm((prev) => ({ ...prev, cardNumber: formatCardNumber(event.target.value) }))}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                    />
                  </div>
                  <div className="pay-form-row">
                    <div className="pay-form-group">
                      <label>Expiry date</label>
                      <input
                        value={form.expiry}
                        onChange={(event) => setForm((prev) => ({ ...prev, expiry: formatExpiry(event.target.value) }))}
                        placeholder="MM/YY"
                        maxLength={5}
                      />
                    </div>
                    <div className="pay-form-group">
                      <label>CVV</label>
                      <input
                        value={form.cvv}
                        onChange={(event) => setForm((prev) => ({ ...prev, cvv: event.target.value.replace(/\D/g, '').slice(0, 4) }))}
                        placeholder="•••"
                        maxLength={4}
                        type="password"
                      />
                      <p className="pay-form-error" style={{ marginTop: '0.35rem', color: '#64748b' }}>
                        CVV is used for validation only and is not stored.
                      </p>
                    </div>
                  </div>
                  <div className="pay-form-group">
                    <label>Cardholder name</label>
                    <input
                      value={form.cardName}
                      onChange={(event) => setForm((prev) => ({ ...prev, cardName: event.target.value }))}
                      placeholder="John Doe"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="pay-preview pay-preview--mpesa">
                    <div className="pay-preview__top">
                      <span className="pay-preview__mpesa">M-PESA</span>
                    </div>
                    <div className="pay-preview__number">
                      {form.phone ? `••• ••• ${form.phone.replace(/\s/g, '').slice(-4)}` : '••• ••• ••••'}
                    </div>
                    <div className="pay-preview__bottom">
                      <div>
                        <div className="pay-preview__label">Account name</div>
                        <div className="pay-preview__value">{form.cardName || '-'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pay-form-group">
                    <label>M-Pesa phone number</label>
                    <input
                      value={form.phone}
                      onChange={(event) => setForm((prev) => ({ ...prev, phone: formatPhone(event.target.value) }))}
                      placeholder="0712 345 678"
                      maxLength={14}
                      inputMode="tel"
                    />
                  </div>
                  <div className="pay-form-group">
                    <label>Account name</label>
                    <input
                      value={form.cardName}
                      onChange={(event) => setForm((prev) => ({ ...prev, cardName: event.target.value }))}
                      placeholder="John Doe"
                    />
                  </div>
                </>
              )}
              {error && <p className="pay-form-error">{error}</p>}
              <div className="pay-form-actions">
                <button className="btn btn--primary btn--sm" type="button" onClick={() => void save()} disabled={isSaving}>
                  {isSaving ? 'Saving…' : payType === 'mpesa' ? 'Save M-Pesa' : 'Save card'}
                </button>
                <button className="btn btn--outline btn--sm" type="button" onClick={cancel}>Cancel</button>
              </div>
            </div>
          )}
        </div>
    </div>
  )
}

export default AccountPaymentPage
