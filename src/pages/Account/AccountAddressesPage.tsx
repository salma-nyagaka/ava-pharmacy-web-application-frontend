import { useEffect, useState } from 'react'
import {
  createSavedAddress,
  deleteSavedAddress,
  fetchSavedAddresses,
  updateSavedAddress,
  type SavedAddress,
} from '../../services/addressService'
import '../../styles/pages/AccountAddressesPage.css'

const EMPTY_FORM = { label: '', street: '', city: '', county: '' }

function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    void fetchSavedAddresses()
      .then((rows) => {
        if (!active) return
        setAddresses(rows)
      })
      .catch(() => {
        if (!active) return
        setError('Unable to load saved addresses.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowForm(true)
  }

  const openEdit = (addr: SavedAddress) => {
    setEditingId(addr.id)
    setForm({ label: addr.label, street: addr.street, city: addr.city, county: addr.county })
    setError('')
    setShowForm(true)
  }

  const cancel = () => { setShowForm(false); setEditingId(null); setError('') }

  const save = async () => {
    if (!form.label.trim() || !form.street.trim() || !form.city.trim() || !form.county.trim()) {
      setError('Label, street, city, and county are required.')
      return
    }

    const payload = {
      label: form.label.trim(),
      street: form.street.trim(),
      city: form.city.trim(),
      county: form.county.trim(),
      is_default: editingId ? addresses.find((a) => a.id === editingId)?.is_default ?? false : addresses.length === 0,
    }

    try {
      if (editingId) {
        const updated = await updateSavedAddress(editingId, payload)
        setAddresses((prev) => prev.map((a) => (a.id === editingId ? updated : a)))
      } else {
        const created = await createSavedAddress(payload)
        setAddresses((prev) => [created, ...prev.filter((a) => a.id !== created.id)])
      }
      setShowForm(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      setError('')
    } catch {
      setError('Unable to save address right now.')
    }
  }

  const remove = async (id: number) => {
    try {
      await deleteSavedAddress(id)
      setAddresses((prev) => {
        const next = prev.filter((a) => a.id !== id)
        if (next.length && !next.some((a) => a.is_default)) next[0] = { ...next[0], is_default: true }
        return [...next]
      })
    } catch {
      setError('Unable to delete address right now.')
    }
  }

  const setDefault = async (id: number) => {
    const target = addresses.find((a) => a.id === id)
    if (!target) return
    try {
      const updated = await updateSavedAddress(id, {
        label: target.label,
        street: target.street,
        city: target.city,
        county: target.county,
        is_default: true,
      })
      setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === updated.id })))
    } catch {
      setError('Unable to set the default address right now.')
    }
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
          {isLoading && <p className="addr-form-error">Loading saved addresses…</p>}
          {addresses.map(addr => (
            <div key={addr.id} className={`addr-card${addr.is_default ? ' addr-card--default' : ''}`}>
              <div className="addr-card__top">
                <div className="addr-card__label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  {addr.label}
                </div>
                {addr.is_default && <span className="addr-card__default-badge">Default</span>}
              </div>
              <div className="addr-card__detail">
                <p>{addr.street}</p>
                <p>
                  {addr.city}
                  {addr.county ? `, ${addr.county}` : ''}
                </p>
              </div>
              <div className="addr-card__actions">
                <button className="btn btn--outline btn--sm" type="button" onClick={() => openEdit(addr)}>Edit</button>
                {!addr.is_default && (
                  <button className="btn btn--outline btn--sm" type="button" onClick={() => void setDefault(addr.id)}>
                    Set default
                  </button>
                )}
                <button className="addr-card__delete" type="button" onClick={() => void remove(addr.id)} aria-label="Delete address">
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
