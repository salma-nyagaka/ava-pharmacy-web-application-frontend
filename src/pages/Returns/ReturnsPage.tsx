import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import '../../styles/pages/ReturnsPage.css'
import { formatPhoneHref } from '../../services/siteSettingsService'
import { useAuth } from '../../context/AuthContext'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { apiClient } from '../../lib/apiClient'

type Row = { id: number; order_number?: string; order?: number; reason?: string; status?: string }
const unwrap = (value: any) => value?.data ?? value
const rows = (value: any): Row[] => { const v = unwrap(value); return Array.isArray(v) ? v : v?.results ?? [] }
export default function ReturnsPage() {
  const { user } = useAuth()
  const { settings } = useSiteSettings()
  const [orders, setOrders] = useState<Row[]>([])
  const [loadedFor, setLoadedFor] = useState<number | null>(null)
  const [requests, setRequests] = useState<Row[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const load = async () => { const [o, r] = await Promise.all([apiClient.get('/orders/'), apiClient.get('/returns/')]); setOrders(rows(o.data).filter(order => order.status === 'delivered')); setRequests(rows(r.data)); setLoadedFor(user?.id ?? null) }
  useEffect(() => { if (user) void load().catch(() => setMessage('Unable to load your records. Please try again.')) }, [user?.id])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); if (!orders.some(order => order.id === Number(data.get('order')) && order.status === 'delivered')) { setSaved(false); setMessage('Select a delivered order to request a return.'); return } setBusy(true); setMessage(''); setSaved(false)
    try { await apiClient.post('/returns/', { order_id: Number(data.get('order')), reason: String(data.get('reason')).trim(), request_type: 'return' }); await load(); form.reset(); setSaved(true); setMessage('Your return request is saved. The pharmacy will assess it; no refund has been executed.') }
    catch { setMessage('Request could not be saved. Check the order and reason, then try again.') }
    finally { setBusy(false) }
  }
  const visibleRequests = loadedFor === user?.id ? requests : []
  return <div className="returns-page">
    <div className="container">
      <nav className="returns-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span><span>Returns & refunds</span></nav>
      <header className="returns-header"><span>Customer support</span><h1>Returns & refunds</h1><p>Request a review of your order and track the outcome.</p></header>
      <div className="returns-layout">
        <div className="returns-main">
          <section className="returns-card" aria-labelledby="return-request-title">
            <div className="returns-card__heading"><h2 id="return-request-title">New return request</h2><p>Select a delivered order and tell us which items need attention.</p></div>
            {!user ? <div className="returns-signin"><p>Sign in to submit a return request and view your history.</p><Link className="btn btn--primary btn--sm" to="/login">Sign in</Link></div> : <form className="returns-form" onSubmit={submit}>
              <div className="returns-field"><label htmlFor="return-order">Order <span>*</span></label><select id="return-order" name="order" required defaultValue="" disabled={busy}><option value="">Select a delivered order</option>{(loadedFor === user.id ? orders : []).map(o => <option key={o.id} value={o.id}>{o.order_number} — {o.status?.replace(/_/g, ' ')}</option>)}</select></div>
              {loadedFor === user.id && orders.length === 0 && <p className="returns-no-orders">No delivered orders are available for a return request.</p>}
              <div className="returns-field"><label htmlFor="return-reason">Reason & affected items <span>*</span></label><textarea id="return-reason" name="reason" required minLength={5} maxLength={3000} rows={4} disabled={busy} placeholder="Include the item names, what happened, and any relevant batch details." aria-describedby="return-reason-hint"/><small id="return-reason-hint">Give enough detail for the pharmacy to review your request.</small></div>
              <div className="returns-form__footer"><span>Requests are reviewed before any refund is confirmed.</span><button type="submit" className="btn btn--primary btn--sm" disabled={busy || loadedFor !== user.id || orders.length === 0}>{busy ? 'Submitting…' : 'Submit request'}</button></div>
            </form>}
            {message && <p className={`returns-message${saved ? ' returns-message--success' : ''}`} role={saved ? 'status' : 'alert'}>{message}</p>}
          </section>
          <section className="returns-card" aria-labelledby="return-history-title">
            <div className="returns-card__heading returns-card__heading--row"><h2 id="return-history-title">Your requests</h2><span className="returns-count">{visibleRequests.length}</span></div>
            {!user ? <p className="returns-empty">Sign in to view your return requests.</p> : loadedFor !== user.id ? <p className="returns-empty" role="status">Loading your requests…</p> : visibleRequests.length === 0 ? <div className="returns-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M8 3H5v18h14V3h-3M8 2h8v4H8zM8 11h8M8 15h5"/></svg><strong>No return requests yet</strong><p>Submitted requests and their status will appear here.</p></div> : <ul className="returns-requests">{visibleRequests.map(r => <li key={r.id}><div className="returns-request__top"><strong>Request #{r.id}</strong><span className="returns-status">{r.status?.replace(/_/g, ' ') || 'Submitted'}</span></div>{r.order_number && <small>{r.order_number}</small>}<p>{r.reason}</p></li>)}</ul>}
          </section>
        </div>
        <aside className="returns-sidebar">
          <section className="returns-card returns-safety"><div className="returns-card__heading"><h2>Medicine returns & safety</h2></div>
            <p>Contact the pharmacist promptly about damaged, incorrect, recalled or temperature-affected medicines. Keep packaging and batch details.</p>
            <p>Do not use a suspect medicine or return it to saleable stock. The pharmacy will explain safe return or disposal arrangements.</p>
            <div className="returns-safety__note">Returned medicines are quarantined and cannot be resold. Refund eligibility and the payment route require review; a submitted or approved request is not confirmation that money has been returned.</div>
          </section>
          <section className="returns-card returns-contact"><h2>Need help?</h2><p>For counselling, delivery failures, or complaints, contact our support team.</p><a href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a><a href={`tel:${formatPhoneHref(settings.supportPhone)}`}>{settings.supportPhone}</a><Link to="/account/support" className="returns-contact__ticket">Open a support request →</Link></section>
        </aside>
      </div>
    </div>
  </div>
}
