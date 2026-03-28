import { useCallback, useEffect, useRef, useState } from 'react'
import { adminDashboardService, ApiInvoice } from '../../services/adminDashboardService'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/admin/Invoices.css'

const PAGE_SIZE = 20

const STATUS_OPTIONS = ['', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
const PAYMENT_STATUS_OPTIONS = ['', 'unpaid', 'paid', 'partially_refunded', 'refunded', 'failed']

function fmtKsh(v: string | number) {
  return `KSh ${Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function statusClass(s: string) {
  if (s === 'paid' || s === 'delivered') return 'inv-badge inv-badge--success'
  if (s === 'pending') return 'inv-badge inv-badge--warning'
  if (s === 'cancelled' || s === 'refunded') return 'inv-badge inv-badge--danger'
  if (s === 'shipped' || s === 'processing') return 'inv-badge inv-badge--info'
  return 'inv-badge inv-badge--neutral'
}

function paymentStatusClass(s: string) {
  if (s === 'paid') return 'inv-badge inv-badge--success'
  if (s === 'unpaid') return 'inv-badge inv-badge--warning'
  if (s === 'failed') return 'inv-badge inv-badge--danger'
  return 'inv-badge inv-badge--neutral'
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function InvoiceModal({ invoice, onClose }: { invoice: ApiInvoice; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=800,height=900')
    if (!w || !printRef.current) return
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.order_number}</title>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #111; padding: 2rem; }
            .inv-print__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; border-bottom: 2px solid #10b981; padding-bottom: 1rem; }
            .inv-print__brand { font-size: 1.5rem; font-weight: 800; color: #10b981; }
            .inv-print__meta { text-align: right; }
            .inv-print__meta h2 { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem; }
            .inv-print__meta p { font-size: 0.85rem; color: #555; }
            .inv-print__body { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
            .inv-print__section h4 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin-bottom: 0.5rem; }
            .inv-print__section p { margin-bottom: 0.2rem; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
            th { background: #f9fafb; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb; }
            td { padding: 0.6rem 0.75rem; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
            .inv-print__totals { width: 280px; margin-left: auto; }
            .inv-print__totals tr td { border: none; padding: 0.3rem 0.75rem; }
            .inv-print__totals tr:last-child td { font-size: 1rem; font-weight: 800; border-top: 2px solid #111; padding-top: 0.6rem; }
            .inv-print__footer { margin-top: 2rem; text-align: center; font-size: 0.78rem; color: #888; border-top: 1px solid #e5e7eb; padding-top: 1rem; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `)
    w.document.close()
    w.focus()
    w.print()
  }

  return (
    <div className="inv-modal-overlay" onClick={onClose}>
      <div className="inv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="inv-modal__toolbar">
          <span className="inv-modal__title">Invoice #{invoice.order_number}</span>
          <div className="inv-modal__actions">
            <button className="btn btn--outline" type="button" onClick={handlePrint}>Print / Download PDF</button>
            <button className="btn btn--ghost inv-modal__close" type="button" onClick={onClose}>✕ Close</button>
          </div>
        </div>

        <div className="inv-modal__body" ref={printRef}>
          {/* Header */}
          <div className="inv-print__header">
            <div className="inv-print__brand">AvaPharma</div>
            <div className="inv-print__meta">
              <h2>INVOICE</h2>
              <p>#{invoice.order_number}</p>
              <p>{fmtDate(invoice.created_at)}</p>
              <p><span className={statusClass(invoice.payment_status)}>Payment: {invoice.payment_status}</span></p>
            </div>
          </div>

          {/* Bill to / Ship to */}
          <div className="inv-print__body">
            <div className="inv-print__section">
              <h4>Bill To</h4>
              <p><strong>{invoice.customer_name}</strong></p>
              <p>{invoice.customer_email}</p>
              <p>{invoice.customer_phone}</p>
            </div>
            <div className="inv-print__section">
              <h4>Ship To</h4>
              <p>{invoice.shipping_street}</p>
              <p>{invoice.shipping_city}, {invoice.shipping_county}</p>
              <p>{invoice.delivery_method}</p>
            </div>
            <div className="inv-print__section">
              <h4>Payment</h4>
              <p>Method: {invoice.payment_method}</p>
              {invoice.payment_reference && <p>Ref: {invoice.payment_reference}</p>}
              <p>Status: <span className={paymentStatusClass(invoice.payment_status)}>{invoice.payment_status}</span></p>
            </div>
            <div className="inv-print__section">
              <h4>Order Details</h4>
              <p>Order: {invoice.order_number}</p>
              <p>Status: <span className={statusClass(invoice.status)}>{invoice.status}</span></p>
              {invoice.coupon_code && <p>Coupon: {invoice.coupon_code}</p>}
              {invoice.delivery_notes && <p>Notes: {invoice.delivery_notes}</p>}
            </div>
          </div>

          {/* Items table */}
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>SKU</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Unit Price</th>
                <th style={{ textAlign: 'right' }}>Discount</th>
                <th style={{ textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={item.id}>
                  <td>{i + 1}</td>
                  <td>{item.product_name}</td>
                  <td style={{ color: '#6b7280', fontSize: '0.8rem' }}>{item.product_sku}</td>
                  <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{fmtKsh(item.unit_price)}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>{Number(item.discount_total) > 0 ? `-${fmtKsh(item.discount_total)}` : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtKsh(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <table className="inv-print__totals">
            <tbody>
              <tr><td>Subtotal</td><td style={{ textAlign: 'right' }}>{fmtKsh(invoice.subtotal)}</td></tr>
              {Number(invoice.discount_total) > 0 && (
                <tr><td style={{ color: '#dc2626' }}>Discount</td><td style={{ textAlign: 'right', color: '#dc2626' }}>-{fmtKsh(invoice.discount_total)}</td></tr>
              )}
              <tr><td>Shipping</td><td style={{ textAlign: 'right' }}>{Number(invoice.shipping_fee) === 0 ? 'Free' : fmtKsh(invoice.shipping_fee)}</td></tr>
              <tr><td>Total</td><td style={{ textAlign: 'right' }}>{fmtKsh(invoice.total)}</td></tr>
            </tbody>
          </table>

          <div className="inv-print__footer">
            Thank you for choosing AvaPharma · support@avapharmacy.com
          </div>
        </div>
      </div>
    </div>
  )
}

function Invoices() {
  const [invoices, setInvoices] = useState<ApiInvoice[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ApiInvoice | null>(null)
  const [downloading, setDownloading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {
        page: String(page),
        page_size: String(PAGE_SIZE),
      }
      if (search.trim()) params.search = search.trim()
      if (statusFilter) params.status = statusFilter
      if (paymentStatusFilter) params.payment_status = paymentStatusFilter
      const res = await adminDashboardService.listInvoices(params)
      setInvoices(res.results)
      setTotal(res.count)
    } catch {
      // fail silently
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, paymentStatusFilter])

  useEffect(() => { void load() }, [load])
  useEffect(() => { setPage(1) }, [search, statusFilter, paymentStatusFilter])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await adminDashboardService.downloadReport('orders', 365)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="admin-page invoices-page">
      <div className="admin-page__header">
        <div>
          <h1>Invoices</h1>
          <p className="admin-page__subtitle">View, search, and download invoices for all placed orders.</p>
        </div>
        <button
          className="btn btn--primary"
          type="button"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? 'Exporting…' : 'Export All (CSV)'}
        </button>
      </div>

      {/* KPI bar */}
      <div className="cm-kpi-grid">
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Total Invoices</span>
            <strong className="cm-kpi-card__value">{total.toLocaleString()}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Shown (this page)</span>
            <strong className="cm-kpi-card__value">{invoices.length}</strong>
          </div>
        </div>
        <div className="cm-kpi-card">
          <div className="cm-kpi-card__icon cm-kpi-card__icon--amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="cm-kpi-card__body">
            <span className="cm-kpi-card__label">Page</span>
            <strong className="cm-kpi-card__value">{page} / {totalPages}</strong>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-page__filters" style={{ marginBottom: '1rem' }}>
        <input
          type="search"
          placeholder="Search by order #, customer, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All order statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}>
          <option value="">All payment statuses</option>
          {PAYMENT_STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')}</option>
          ))}
        </select>
        {(search || statusFilter || paymentStatusFilter) && (
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => { setSearch(''); setStatusFilter(''); setPaymentStatusFilter('') }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Email</th>
              <th>Date</th>
              <th>Order Status</th>
              <th>Payment</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j}><div className="admin-skeleton" style={{ height: 16 }} /></td>
                  ))}
                </tr>
              ))
            ) : invoices.length === 0 ? (
              <tr><td colSpan={8} className="admin-table__empty">No invoices found.</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="admin-table__row inv-row" onClick={() => setSelected(inv)}>
                  <td className="inv-row__number">{inv.order_number}</td>
                  <td>{inv.customer_name}</td>
                  <td className="inv-row__email">{inv.customer_email}</td>
                  <td className="inv-row__date">{fmtDate(inv.created_at)}</td>
                  <td><span className={statusClass(inv.status)}>{inv.status}</span></td>
                  <td><span className={paymentStatusClass(inv.payment_status)}>{inv.payment_status}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtKsh(inv.total)}</td>
                  <td>
                    <button
                      className="inv-row__view"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelected(inv) }}
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && total > PAGE_SIZE && (
        <div className="admin-pagination">
          <span className="admin-pagination__info">
            {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
          </span>
          <div className="admin-pagination__controls">
            <button
              className="admin-pagination__btn"
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >Prev</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = page <= 4 ? i + 1 : page - 3 + i
              if (p < 1 || p > totalPages) return null
              return (
                <button
                  key={p}
                  className={`admin-pagination__btn${p === page ? ' admin-pagination__btn--active' : ''}`}
                  type="button"
                  onClick={() => setPage(p)}
                >{p}</button>
              )
            })}
            <button
              className="admin-pagination__btn"
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >Next</button>
          </div>
        </div>
      )}

      {/* Invoice modal */}
      {selected && <InvoiceModal invoice={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

export default Invoices
