import { useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { apiClient } from '../../lib/apiClient'
import '../../styles/admin/StockRecordHistory.css'
import { type ApiStockMovement } from '../../services/adminProductService'

export default function StockRecordHistory({ stockRecordId, onClose }: { stockRecordId: number; onClose: () => void }) {
  const [params] = useSearchParams()
  const productId = params.get('product')
  const [rows, setRows] = useState<ApiStockMovement[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => { setPage(1) }, [productId, search, stockRecordId])
  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true); setError('')
      void apiClient.get('/admin/stock-history/', { params: { variant_inventory: stockRecordId, product_id: productId || undefined, search, page, page_size: 20 } }).then(response => {
        if (cancelled) return
        setRows(response.data?.data ?? response.data?.results ?? [])
        setTotal(response.data?.meta?.total ?? response.data?.count ?? 0)
      }).catch(() => { if (!cancelled) setError('Unable to load stock history. Please try again.') }).finally(() => { if (!cancelled) setLoading(false) })
    }, 200)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [productId, search, page, stockRecordId, retry])
  const totalPages = Math.max(1, Math.ceil(total / 20))
  return <section className="stock-history" aria-label="Stock changes" aria-busy={loading}>
    <div className="stock-history__header">
      <div><h3>Stock changes</h3><p>Track receipts, sales, and corrections for this batch.</p></div>
      <div className="stock-history__header-actions">
        <span className="stock-history__count">{loading ? 'Loading…' : `${total.toLocaleString()} movements`}</span>
        <button type="button" className="stock-history__close" onClick={onClose} aria-label="Close stock changes">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
          Close
        </button>
      </div>
    </div>
    <div className="stock-history__toolbar">
      <div className="stock-history__search">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg>
        <input aria-label="Search stock history" type="search" placeholder="Search product, SKU, or reference…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
      </div>
      <span>Newest changes first</span>
    </div>
    {error ? <div role="alert" className="stock-history__empty"><strong>Stock history couldn’t be loaded</strong><p>{error}</p><button type="button" className="btn btn--outline btn--sm" onClick={() => setRetry(value => value + 1)}>Try again</button></div> :
    <div className="stock-history__table" role="region" aria-label="Stock movement history" tabIndex={0}>
      <table><thead><tr><th>Date & time</th><th>Stock record</th><th>Movement</th><th>Quantity</th><th>Reason / reference</th><th>Changed by</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={6}><div className="stock-history__empty" role="status">Loading stock changes…</div></td></tr> : rows.length ? rows.map(row => {
          const direction = row.quantity_change > 0 ? 'increase' : row.quantity_change < 0 ? 'decrease' : 'neutral'
          const date = new Date(row.created_at)
          return <tr key={row.id}>
            <td><time dateTime={row.created_at}>{date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}<small>{date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</small></time></td>
            <td><strong>{row.product_name}</strong><small>{row.variant_sku}</small><small>{row.store_name || row.location} · Batch {row.batch_number || 'not recorded'}</small></td>
            <td><span className="stock-history__type">{row.movement_type.replace(/_/g, ' ')}</span></td>
            <td><strong className={`stock-history__delta stock-history__delta--${direction}`}>{row.quantity_change > 0 ? '+' : ''}{row.quantity_change.toLocaleString()} <span>units</span></strong><small className="stock-history__balance"><span>{row.quantity_before.toLocaleString()}</span><span aria-label="to">→</span><b>{row.quantity_after.toLocaleString()}</b></small></td>
            <td className="stock-history__reason">{row.reason || 'No reason provided'}{row.reference && <small>{row.reference}</small>}</td>
            <td><span className="stock-history__actor">{row.created_by_name || 'System'}</span></td>
          </tr>
        }) : <tr><td colSpan={6}><div className="stock-history__empty"><strong>{search ? 'No matching changes' : 'No stock changes yet'}</strong><p>{search ? 'Try a different product, SKU, or reference.' : 'Receipts, corrections, and sales will appear here.'}</p>{search && <button type="button" className="btn btn--outline btn--sm" onClick={() => setSearch('')}>Clear search</button>}</div></td></tr>}
      </tbody></table>
    </div>}
    {!error && total > 0 && <div className="stock-history__footer"><span>Page {page} of {totalPages}</span><nav aria-label="Stock history pagination"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</button><button type="button" disabled={page >= totalPages || loading} onClick={() => setPage(value => value + 1)}>Next</button></nav></div>}
  </section>
}
