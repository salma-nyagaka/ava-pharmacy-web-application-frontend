import { useEffect, useState } from 'react'
import { createSavedPaymentMethod, deleteSavedPaymentMethod, fetchSavedPaymentMethods, updateSavedPaymentMethod, type SavedPaymentMethod } from '../../services/paymentMethodService'
import '../../styles/pages/AccountPaymentPage.css'

function AccountPaymentPage() {
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const refresh = async () => setMethods((await fetchSavedPaymentMethods()).filter((method) => method.brand === 'mpesa'))
  useEffect(() => { void refresh().catch(() => setError('Unable to load M-Pesa numbers.')).finally(() => setLoading(false)) }, [])
  const close = () => { setShowForm(false); setEditingId(null); setName(''); setPhone(''); setError('') }
  const save = async () => {
    const digits = phone.replace(/\D/g, '')
    if (!name.trim() || (editingId ? !/^\d{4}$/.test(digits) : !/^(?:0[17]\d{8}|254[17]\d{8})$/.test(digits))) {
      setError(editingId ? 'Enter an account name and four ending digits.' : 'Enter an account name and a valid M-Pesa number.')
      return
    }
    setSaving(true); setError('')
    try {
      const payload = { brand: 'mpesa', last4: digits.slice(-4), expiry_month: 0, expiry_year: 0, cardholder_name: name.trim(), is_default: editingId ? methods.find((method) => method.id === editingId)?.is_default ?? false : methods.length === 0 }
      if (editingId) await updateSavedPaymentMethod(editingId, payload)
      else await createSavedPaymentMethod(payload)
      await refresh(); close()
    } catch { setError('Unable to save this M-Pesa number.') } finally { setSaving(false) }
  }
  const remove = async (id: number) => {
    try { await deleteSavedPaymentMethod(id); await refresh() } catch { setError('Unable to remove this M-Pesa number.') }
  }
  const makeDefault = async (id: number) => {
    try { await updateSavedPaymentMethod(id, { is_default: true }); await refresh() } catch { setError('Unable to change your default M-Pesa number.') }
  }
  return <div className="ac-card pay-page">
    <div className="pay-header"><h1 className="pay-header__title">Payment methods</h1><p className="pay-header__sub">Manage your M-Pesa numbers. Checkout supports M-Pesa STK Push and Paybill.</p></div>
    {error && <p role="alert" className="pay-form-error">{error}</p>}
    {loading ? <p role="status">Loading M-Pesa numbers…</p> : <div className="pay-cards-col">
      {methods.length === 0 && <p>No saved M-Pesa numbers.</p>}
      {methods.map((method) => <div key={method.id} className="pay-card pay-card--mpesa">
        <strong>M-Pesa {method.is_default && <span className="pay-card__default-badge">Default</span>}</strong>
        <p>{method.cardholder_name} · Ending {method.last4}</p>
        <button type="button" onClick={() => { setEditingId(method.id); setName(method.cardholder_name); setPhone(method.last4); setShowForm(true); setError('') }}>Edit</button>
        {!method.is_default && <button type="button" onClick={() => void makeDefault(method.id)}>Set as default</button>}
        <button type="button" onClick={() => void remove(method.id)}>Remove</button>
      </div>)}
    </div>}
    {!showForm && <button type="button" className="pay-add-btn" onClick={() => setShowForm(true)}>Add M-Pesa number</button>}
    {showForm && <form className="pay-form-card" onSubmit={(event) => { event.preventDefault(); void save() }}>
      <h3 className="pay-form-card__title">{editingId ? 'Edit M-Pesa number' : 'Add M-Pesa number'}</h3>
      <div className="pay-form-group"><label htmlFor="mpesa-account-name">Account name</label><input id="mpesa-account-name" required value={name} onChange={(event) => setName(event.target.value)} /></div>
      <div className="pay-form-group"><label htmlFor="mpesa-phone">{editingId ? 'Last four digits' : 'M-Pesa phone number'}</label><input id="mpesa-phone" required inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
      <p>Only the ending digits are saved for identification. Enter the full number when making an STK payment.</p>
      <div className="pay-form-actions"><button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save M-Pesa number'}</button>
      <button type="button" className="btn btn--outline" onClick={close} disabled={saving}>Cancel</button></div>
    </form>}
  </div>
}
export default AccountPaymentPage
