import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminDashboardService, FullReports } from '../../services/adminDashboardService'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/shared/AdminEntityManagement.css'
import '../../styles/admin/Reports.css'

const RANGE_OPTIONS = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: '1y', value: 365 },
]

function fmt(n: number) {
  return n.toLocaleString('en-KE')
}

function fmtKsh(n: number) {
  if (n >= 1_000_000) return `KSh ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `KSh ${(n / 1_000).toFixed(1)}k`
  return `KSh ${n.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtKshFull(n: number) {
  return `KSh ${n.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ── Skeleton shimmer ── */
function Skeleton({ w, h = 18 }: { w?: string | number; h?: number }) {
  return <span className="rpt-skeleton" style={{ width: w, height: h, display: 'inline-block' }} />
}

/* ── Pipeline row with proportional bar ── */
function PipelineRow({
  label, value, total, tone, icon,
}: {
  label: string; value: number; total: number; tone: string; icon?: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="rpt-pipe-row">
      <div className="rpt-pipe-row__top">
        {icon && <span className="rpt-pipe-row__icon">{icon}</span>}
        <span className="rpt-pipe-row__label">{label}</span>
        <span className={`rpt-pipe-row__badge rpt-pipe-row__badge--${tone}`}>{fmt(value)}</span>
      </div>
      <div className="rpt-pipe-bar">
        <div className={`rpt-pipe-bar__fill rpt-pipe-bar__fill--${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/* ── Revenue bar chart ── */
function RevenueChart({ data }: { data: FullReports['daily_revenue'] }) {
  const [hovered, setHovered] = useState<string | null>(null)

  if (!data.length) {
    return (
      <div className="chart-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
          <path d="M4 20V8M12 20V4M20 20v-9" />
        </svg>
        <p>No revenue data for this period.</p>
      </div>
    )
  }

  const max = Math.max(...data.map((d) => d.revenue), 1)

  return (
    <div className="rpt-chart">
      <div className="rpt-chart__grid">
        {[75, 50, 25].map((pct) => (
          <div key={pct} className="rpt-chart__gridline" style={{ bottom: `${pct}%` }}>
            <span className="rpt-chart__gridlabel">
              {fmtKsh((max * pct) / 100)}
            </span>
          </div>
        ))}
      </div>
      <div className="rpt-chart__bars">
        {data.map((d) => {
          const label = new Date(d.date + 'T00:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
          const heightPct = Math.max(2, (d.revenue / max) * 100)
          const isHovered = hovered === d.date
          return (
            <div
              key={d.date}
              className="rpt-chart__bar-col"
              onMouseEnter={() => setHovered(d.date)}
              onMouseLeave={() => setHovered(null)}
            >
              {isHovered && (
                <div className="rpt-chart__tooltip">
                  <strong>{label}</strong>
                  <span>{fmtKshFull(d.revenue)}</span>
                  <span>{fmt(d.orders)} order{d.orders !== 1 ? 's' : ''}</span>
                </div>
              )}
              <div className="rpt-chart__bar-track">
                <div
                  className={`rpt-chart__bar${isHovered ? ' rpt-chart__bar--hover' : ''}`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="rpt-chart__x-label">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Export dropdown ── */
function ExportMenu({ onExport, loading }: {
  onExport: (t: 'orders' | 'revenue' | 'products') => void
  loading: string | null
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="rpt-export-menu" ref={ref}>
      <button
        className="rpt-export-btn"
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={!!loading}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {loading ? 'Exporting…' : 'Export CSV'}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12" style={{ marginLeft: 2 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="rpt-export-dropdown">
          {(['orders', 'revenue', 'products'] as const).map((t) => (
            <button
              key={t}
              className="rpt-export-dropdown__item"
              type="button"
              disabled={loading === t}
              onClick={() => { onExport(t); setOpen(false) }}
            >
              {loading === t ? 'Exporting…' : `Export ${t.charAt(0).toUpperCase() + t.slice(1)}`}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main component ── */
function Reports() {
  const [range, setRange] = useState(30)
  const [data, setData] = useState<FullReports | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await adminDashboardService.getReports(range))
    } catch {
      setError('Failed to load report data.')
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => { void load() }, [load])

  const download = async (type: 'orders' | 'revenue' | 'products') => {
    setDownloading(type)
    try { await adminDashboardService.downloadReport(type, range) }
    finally { setDownloading(null) }
  }

  const ordersMap = Object.fromEntries((data?.orders_by_status ?? []).map((s) => [s.status, s.count]))
  const totalOrders = data?.total_orders ?? 0

  const rxTotal = (data?.prescriptions.pending ?? 0)
    + (data?.prescriptions.approved ?? 0)
    + (data?.prescriptions.clarification ?? 0)
    + (data?.prescriptions.rejected ?? 0)

  const labTotal = (data?.lab.awaiting ?? 0)
    + (data?.lab.processing ?? 0)
    + (data?.lab.results_ready ?? 0)
    + (data?.lab.completed ?? 0)

  const consultTotal = (data?.consultations.waiting ?? 0)
    + (data?.consultations.in_progress ?? 0)
    + (data?.consultations.completed ?? 0)

  return (
    <div className="reports">

      {/* ── Header ── */}
      <div className="reports__header">
        <div className="reports__title">
          <h1>Reports</h1>
          <p>Live operational insights — orders, revenue, prescriptions, lab &amp; payouts.</p>
        </div>
        <div className="reports__controls">
          <div className="rpt-range-pills">
            {RANGE_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`rpt-range-pill${range === o.value ? ' rpt-range-pill--active' : ''}`}
                onClick={() => setRange(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <ExportMenu onExport={download} loading={downloading} />
          <Link to="/admin/invoices" className="rpt-invoices-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M9 3h11a1 1 0 0 1 1 1v17l-4-3-4 3-4-3-4 3V4a1 1 0 0 1 1-1h3"/>
              <path d="M8 12h8M8 16h5"/>
            </svg>
            Invoices
          </Link>
        </div>
      </div>

      {error && (
        <div className="rpt-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
          <button type="button" onClick={load} className="rpt-error__retry">Retry</button>
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="rpt-kpi-strip">
        {[
          {
            label: 'Total Orders', sub: `${fmt(data?.today_orders ?? 0)} today`,
            value: loading ? null : fmt(totalOrders),
            color: 'blue',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>,
          },
          {
            label: 'Total Revenue', sub: `${fmtKsh(data?.monthly_revenue ?? 0)} this month`,
            value: loading ? null : fmtKsh(data?.total_revenue ?? 0),
            color: 'green',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="20" height="20"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
          },
          {
            label: 'Period Revenue', sub: `Last ${range} days`,
            value: loading ? null : fmtKsh(data?.range_revenue ?? 0),
            color: 'teal',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="20" height="20"><path d="M4 20V8M12 20V4M20 20v-9"/></svg>,
          },
          {
            label: 'Customers', sub: `${fmt(data?.new_customers_month ?? 0)} new this month`,
            value: loading ? null : fmt(data?.total_customers ?? 0),
            color: 'purple',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
          },
          {
            label: 'Pending Orders', sub: `${fmt(data?.refund_requests ?? 0)} refund requests`,
            value: loading ? null : fmt(data?.pending_orders ?? 0),
            color: 'amber',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="20" height="20"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
          },
          {
            label: 'Low Stock', sub: `${fmt(data?.out_of_stock_products ?? 0)} out of stock`,
            value: loading ? null : fmt(data?.low_stock_products ?? 0),
            color: 'red',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="20" height="20"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
          },
        ].map((kpi) => (
          <div key={kpi.label} className={`rpt-kpi rpt-kpi--${kpi.color}`}>
            <div className={`rpt-kpi__icon rpt-kpi__icon--${kpi.color}`}>{kpi.icon}</div>
            <div className="rpt-kpi__body">
              <span className="rpt-kpi__label">{kpi.label}</span>
              <strong className="rpt-kpi__value">
                {kpi.value === null ? <Skeleton w={70} /> : kpi.value}
              </strong>
              <span className="rpt-kpi__sub">{loading ? <Skeleton w={80} h={12} /> : kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="rpt-grid">

        {/* Revenue chart — full width */}
        <div className="rpt-card rpt-card--full">
          <div className="rpt-card__header">
            <div>
              <h2>Revenue trend</h2>
              <p>Daily paid-order revenue · last {range} days</p>
            </div>
            {!loading && data && (
              <div className="rpt-card__header-right">
                <span className="rpt-badge rpt-badge--green">{fmtKshFull(data.range_revenue)} total</span>
                <span className="rpt-badge rpt-badge--neutral">{fmt(data.today_orders)} orders today</span>
              </div>
            )}
          </div>
          {loading
            ? <div className="rpt-chart"><div className="rpt-skeleton" style={{ height: '100%', borderRadius: 10 }} /></div>
            : <RevenueChart data={data?.daily_revenue ?? []} />
          }
        </div>

        {/* Order pipeline */}
        <div className="rpt-card">
          <div className="rpt-card__header">
            <div>
              <h2>Order pipeline</h2>
              <p>Queue by status</p>
            </div>
            <Link to="/admin/orders" className="rpt-card__link">View all →</Link>
          </div>
          <div className="rpt-pipes">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="rpt-skeleton" style={{ height: 44 }} />)
              : (
                <>
                  <PipelineRow label="Pending" value={ordersMap['pending'] ?? 0} total={totalOrders} tone="warning" icon="⏳" />
                  <PipelineRow label="Processing" value={ordersMap['processing'] ?? 0} total={totalOrders} tone="info" icon="⚙️" />
                  <PipelineRow label="Shipped" value={ordersMap['shipped'] ?? 0} total={totalOrders} tone="neutral" icon="📦" />
                  <PipelineRow label="Delivered" value={ordersMap['delivered'] ?? 0} total={totalOrders} tone="success" icon="✅" />
                  <PipelineRow label="Cancelled" value={ordersMap['cancelled'] ?? 0} total={totalOrders} tone="danger" icon="✕" />
                </>
              )
            }
          </div>
        </div>

        {/* Prescription queue */}
        <div className="rpt-card">
          <div className="rpt-card__header">
            <div>
              <h2>Prescription queue</h2>
              <p>Approval status</p>
            </div>
            <Link to="/admin/prescriptions" className="rpt-card__link">View all →</Link>
          </div>
          <div className="rpt-pipes">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="rpt-skeleton" style={{ height: 44 }} />)
              : (
                <>
                  <PipelineRow label="Pending review" value={data?.prescriptions.pending ?? 0} total={rxTotal} tone="warning" icon="📋" />
                  <PipelineRow label="Approved" value={data?.prescriptions.approved ?? 0} total={rxTotal} tone="success" icon="✅" />
                  <PipelineRow label="Clarification" value={data?.prescriptions.clarification ?? 0} total={rxTotal} tone="info" icon="💬" />
                  <PipelineRow label="Rejected" value={data?.prescriptions.rejected ?? 0} total={rxTotal} tone="danger" icon="✕" />
                </>
              )
            }
          </div>
        </div>

        {/* Lab operations */}
        <div className="rpt-card">
          <div className="rpt-card__header">
            <div>
              <h2>Lab operations</h2>
              <p>Test request pipeline</p>
            </div>
            <Link to="/admin/lab-requests" className="rpt-card__link">View all →</Link>
          </div>
          <div className="rpt-pipes">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="rpt-skeleton" style={{ height: 44 }} />)
              : (
                <>
                  <PipelineRow label="Awaiting sample" value={data?.lab.awaiting ?? 0} total={labTotal} tone="warning" icon="🧪" />
                  <PipelineRow label="Processing" value={data?.lab.processing ?? 0} total={labTotal} tone="info" icon="⚗️" />
                  <PipelineRow label="Results ready" value={data?.lab.results_ready ?? 0} total={labTotal} tone="success" icon="📊" />
                  <PipelineRow label="Completed" value={data?.lab.completed ?? 0} total={labTotal} tone="neutral" icon="✅" />
                </>
              )
            }
          </div>
        </div>

        {/* Consultations */}
        <div className="rpt-card">
          <div className="rpt-card__header">
            <div>
              <h2>Consultations</h2>
              <p>Telemedicine activity</p>
            </div>
            <Link to="/admin/doctors" className="rpt-card__link">View doctors →</Link>
          </div>
          <div className="rpt-pipes">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="rpt-skeleton" style={{ height: 44 }} />)
              : (
                <>
                  <PipelineRow label="Waiting" value={data?.consultations.waiting ?? 0} total={consultTotal} tone="warning" icon="⏳" />
                  <PipelineRow label="In progress" value={data?.consultations.in_progress ?? 0} total={consultTotal} tone="info" icon="💬" />
                  <PipelineRow label="Completed (period)" value={data?.consultations.completed_range ?? 0} total={data?.consultations.completed ?? 1} tone="success" icon="✅" />
                </>
              )
            }
          </div>
        </div>

        {/* Payout health */}
        <div className="rpt-card">
          <div className="rpt-card__header">
            <div>
              <h2>Payout health</h2>
              <p>Settlement snapshot</p>
            </div>
            <Link to="/admin/payouts" className="rpt-card__link">Manage →</Link>
          </div>
          <div className="rpt-payouts">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="rpt-skeleton" style={{ height: 68 }} />)
              : (
                <>
                  <div className="rpt-payout rpt-payout--warning">
                    <div className="rpt-payout__top">
                      <span className="rpt-payout__label">Pending</span>
                      <span className="rpt-payout__count">{fmt(data?.payouts.pending_count ?? 0)} requests</span>
                    </div>
                    <strong className="rpt-payout__amount">{fmtKshFull(data?.payouts.pending_amount ?? 0)}</strong>
                  </div>
                  <div className="rpt-payout rpt-payout--success">
                    <div className="rpt-payout__top">
                      <span className="rpt-payout__label">Paid this month</span>
                      <span className="rpt-payout__count">{fmt(data?.payouts.paid_month_count ?? 0)} payouts</span>
                    </div>
                    <strong className="rpt-payout__amount">{fmtKshFull(data?.payouts.paid_month_amount ?? 0)}</strong>
                  </div>
                  {(data?.payouts.failed_count ?? 0) > 0 && (
                    <div className="rpt-payout rpt-payout--danger">
                      <div className="rpt-payout__top">
                        <span className="rpt-payout__label">Failed</span>
                        <span className="rpt-payout__count">Needs retry</span>
                      </div>
                      <strong className="rpt-payout__amount">{fmt(data?.payouts.failed_count ?? 0)} payouts</strong>
                    </div>
                  )}
                </>
              )
            }
          </div>
        </div>

        {/* Support + Inventory row */}
        <div className="rpt-card">
          <div className="rpt-card__header">
            <div><h2>Support &amp; stock</h2><p>Tickets and inventory health</p></div>
            <Link to="/admin/support" className="rpt-card__link">Support →</Link>
          </div>
          <div className="rpt-pipes">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="rpt-skeleton" style={{ height: 44 }} />)
              : (
                <>
                  <PipelineRow label="Open tickets" value={data?.support.open ?? 0} total={(data?.support.open ?? 0) + (data?.support.in_progress ?? 0)} tone="warning" icon="🎫" />
                  <PipelineRow label="In-progress tickets" value={data?.support.in_progress ?? 0} total={(data?.support.open ?? 0) + (data?.support.in_progress ?? 0)} tone="info" icon="💬" />
                  <PipelineRow label="Low stock products" value={data?.low_stock_products ?? 0} total={(data?.low_stock_products ?? 0) + (data?.out_of_stock_products ?? 0) + 1} tone="amber" icon="⚠️" />
                  <PipelineRow label="Out of stock" value={data?.out_of_stock_products ?? 0} total={(data?.low_stock_products ?? 0) + (data?.out_of_stock_products ?? 0) + 1} tone="danger" icon="🚫" />
                </>
              )
            }
          </div>
        </div>

        {/* Payment methods */}
        <div className="rpt-card">
          <div className="rpt-card__header">
            <div><h2>Payment methods</h2><p>How customers are paying</p></div>
          </div>
          <div className="rpt-pipes">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="rpt-skeleton" style={{ height: 44 }} />)
              : (data?.orders_by_payment ?? []).map((p) => (
                <PipelineRow
                  key={p.payment_method}
                  label={statusLabel(p.payment_method || 'Unknown')}
                  value={p.count}
                  total={totalOrders}
                  tone="neutral"
                />
              ))
            }
          </div>
        </div>

        {/* Top products — full width */}
        <div className="rpt-card rpt-card--full">
          <div className="rpt-card__header">
            <div>
              <h2>Top products</h2>
              <p>Best-selling products by revenue · last {range} days</p>
            </div>
            <Link to="/admin/products" className="rpt-card__link">View products →</Link>
          </div>
          {loading ? (
            <div className="rpt-top-products">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rpt-skeleton" style={{ height: 52 }} />
              ))}
            </div>
          ) : (data?.top_products ?? []).length === 0 ? (
            <div className="chart-empty"><p>No sales data for this period.</p></div>
          ) : (
            <div className="rpt-top-products">
              {(() => {
                const maxRev = Math.max(...(data?.top_products ?? []).map((p) => p.revenue), 1)
                return (data?.top_products ?? []).map((p, i) => (
                  <div key={p.product_sku} className="rpt-top-row">
                    <span className={`rpt-top-row__rank rpt-top-row__rank--${i < 3 ? ['gold', 'silver', 'bronze'][i] : 'default'}`}>
                      {i + 1}
                    </span>
                    <div className="rpt-top-row__info">
                      <span className="rpt-top-row__name">{p.product_name}</span>
                      <span className="rpt-top-row__sku">SKU: {p.product_sku} · {fmt(p.quantity_sold)} units sold</span>
                      <div className="rpt-top-row__bar-track">
                        <div className="rpt-top-row__bar-fill" style={{ width: `${(p.revenue / maxRev) * 100}%` }} />
                      </div>
                    </div>
                    <span className="rpt-top-row__revenue">{fmtKshFull(p.revenue)}</span>
                  </div>
                ))
              })()}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default Reports
