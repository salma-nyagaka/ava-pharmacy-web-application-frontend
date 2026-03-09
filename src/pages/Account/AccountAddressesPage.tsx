import { useState } from 'react'
import './AccountAddressesPage.css'

interface Address {
  id: string
  label: string
  street: string
  city: string
  county: string
  postcode: string
  isDefault: boolean
}

const INITIAL: Address[] = [
  { id: '1', label: 'Home', street: '14 Westlands Road', city: 'Nairobi', county: 'Nairobi', postcode: '00100', isDefault: true },
  { id: '2', label: 'Office', street: '5th Floor, Upper Hill Close', city: 'Nairobi', county: 'Nairobi', postcode: '00200', isDefault: false },
]

const EMPTY_FORM = { label: '', street: '', city: '', county: '', postcode: '' }

function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>(INITIAL)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowForm(true)
  }

  const openEdit = (addr: Address) => {
    setEditingId(addr.id)
    setForm({ label: addr.label, street: addr.street, city: addr.city, county: addr.county, postcode: addr.postcode })
    setError('')
    setShowForm(true)
  }

  const cancel = () => { setShowForm(false); setEditingId(null); setError('') }

  const save = () => {
    if (!form.label.trim() || !form.street.trim() || !form.city.trim()) {
      setError('Label, street and city are required.')
      return
    }
    if (editingId) {
      setAddresses(prev => prev.map(a => a.id === editingId ? { ...a, ...form } : a))
    } else {
      const newAddr: Address = { id: Date.now().toString(), ...form, isDefault: addresses.length === 0 }
      setAddresses(prev => [...prev, newAddr])
    }
    setShowForm(false)
    setEditingId(null)
    setError('')
  }

  const remove = (id: string) => {
    setAddresses(prev => {
      const next = prev.filter(a => a.id !== id)
      if (next.length && !next.some(a => a.isDefault)) next[0] = { ...next[0], isDefault: true }
      return next
    })
  }

  const setDefault = (id: string) => {
    setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })))
  }

  return (
    <div className="addr-page">
      <div className="container">
        <div className="addr-header">
          <div>
            <p className="addr-header__eyebrow">My Account</p>
            <h1 className="addr-header__title">Saved Addresses</h1>
            <p className="addr-header__sub">Manage delivery addresses for faster checkout</p>
          </div>
        </div>

        {showForm && (
          <div className="addr-form-card">
            <h3 className="addr-form-card__title">{editingId ? 'Edit Address' : 'Add New Address'}</h3>
            <div className="addr-form-grid">
              <div className="addr-form-group">
                <label>Label</label>
                <input
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Home, Office"
                />
              </div>
              <div className="addr-form-group addr-form-group--full">
                <label>Street / Area</label>
                <input
                  value={form.street}
                  onChange={e => setForm(f => ({ ...f, street: e.target.value }))}
                  placeholder="14 Westlands Road"
                />
              </div>
              <div className="addr-form-group">
                <label>City / Town</label>
                <input
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="Nairobi"
                />
              </div>
              <div className="addr-form-group">
                <label>County</label>
                <input
                  value={form.county}
                  onChange={e => setForm(f => ({ ...f, county: e.target.value }))}
                  placeholder="Nairobi"
                />
              </div>
              <div className="addr-form-group">
                <label>Postcode</label>
                <input
                  value={form.postcode}
                  onChange={e => setForm(f => ({ ...f, postcode: e.target.value }))}
                  placeholder="00100"
                />
              </div>
            </div>
            {error && <p className="addr-form-error">{error}</p>}
            <div className="addr-form-actions">
              <button className="btn btn--primary btn--sm" type="button" onClick={save}>
                {editingId ? 'Save changes' : 'Add address'}
              </button>
              <button className="btn btn--outline btn--sm" type="button" onClick={cancel}>Cancel</button>
            </div>
          </div>
        )}

        <div className="addr-grid">
          {addresses.map(addr => (
            <div key={addr.id} className={`addr-card${addr.isDefault ? ' addr-card--default' : ''}`}>
              <div className="addr-card__top">
                <div className="addr-card__label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  {addr.label}
                </div>
                {addr.isDefault && <span className="addr-card__default-badge">Default</span>}
              </div>
              <div className="addr-card__detail">
                <p>{addr.street}</p>
                <p>
                  {addr.city}
                  {addr.county ? `, ${addr.county}` : ''}
                  {addr.postcode ? ` ${addr.postcode}` : ''}
                </p>
              </div>
              <div className="addr-card__actions">
                <button className="btn btn--outline btn--sm" type="button" onClick={() => openEdit(addr)}>Edit</button>
                {!addr.isDefault && (
                  <button className="btn btn--outline btn--sm" type="button" onClick={() => setDefault(addr.id)}>
                    Set default
                  </button>
                )}
                <button className="addr-card__delete" type="button" onClick={() => remove(addr.id)} aria-label="Delete address">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {!showForm && (
            <button className="addr-add-btn" type="button" onClick={openAdd}>
              <span className="addr-add-btn__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </span>
              Add new address
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default AccountAddressesPage
