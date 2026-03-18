import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminDashboardService, FullReports, PayoutByRole } from '../../services/adminDashboardService'
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

function delta(current: number, prev: number): { pct: number; up: boolean } {
  if (prev === 0) return { pct: 0, up: true }
  const pct = Math.round(((current - prev) / prev) * 100)
  return { pct: Math.abs(pct), up: pct >= 0 }
}

function DeltaBadge({ current, prev }: { current: number; prev: number }) {
  const { pct, up } = delta(current, prev)
  if (pct === 0) return null
  return (
    <span className={`rpt-delta rpt-delta--${up ? 'up' : 'down'}`}>
      {up ? '↑' : '↓'} {pct}%
    </span>
  )
}

function Skeleton({ w, h = 18 }: { w?: string | number; h?: number }) {
  return <span className="rpt-skeleton" style={{ width: w, height: h, display: 'inline-block' }} />
}

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

/* ── Dual-axis revenue + orders chart ── */
function DualChart({ data }: { data: FullReports['daily_revenue'] }) {
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

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)
  const maxOrders = Math.max(...data.map((d) => d.orders), 1)

  const chartWidth = 100
  const chartHeight = 100
  const points = data.map((d, i) => {
    const x = data.length === 1 ? 50 : (i / (data.length - 1)) * chartWidth
    const y = chartHeight - Math.max(2, (d.orders / maxOrders) * chartHeight)
    return `${x},${y}`
  })

  return (
    <div className="rpt-dual-chart">
      <div className="rpt-chart" style={{ paddingRight: 48 }}>
        <div className="rpt-chart__grid">
          {[75, 50, 25].map((pct) => (
            <div key={pct} className="rpt-chart__gridline" style={{ bottom: `${pct}%` }}>
              <span className="rpt-chart__gridlabel">{fmtKsh((maxRevenue * pct) / 100)}</span>
            </div>
          ))}
        </div>
        {/* Right axis labels for orders */}
        <div className="rpt-chart__right-axis">
          {[75, 50, 25].map((pct) => (
            <div key={pct} className="rpt-chart__right-label" style={{ bottom: `${pct}%` }}>
              {Math.round((maxOrders * pct) / 100)}
            </div>
          ))}
        </div>
        {/* Bars for revenue */}
        <div className="rpt-chart__bars">
          {data.map((d) => {
            const label = new Date(d.date + 'T00:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
            const heightPct = Math.max(2, (d.revenue / maxRevenue) * 100)
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
                    <span>Avg: {d.orders > 0 ? fmtKsh(d.revenue / d.orders) : '—'}</span>
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
        {/* SVG line overlay for orders */}
        <svg
          className="rpt-chart__line-overlay"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
        >
          <polyline
            points={points.join(' ')}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {data.map((d, i) => {
            const x = data.length === 1 ? 50 : (i / (data.length - 1)) * chartWidth
            const y = chartHeight - Math.max(2, (d.orders / maxOrders) * chartHeight)
            return (
              <circle
                key={d.date}
                cx={x} cy={y} r={hovered === d.date ? 3 : 1.5}
                fill={hovered === d.date ? '#6366f1' : '#818cf8'}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>
      </div>
      <div className="rpt-dual-chart__legend">
        <span className="rpt-dual-chart__legend-item rpt-dual-chart__legend-item--bar">Revenue (KSh)</span>
        <span className="rpt-dual-chart__legend-item rpt-dual-chart__legend-item--line">Orders</span>
      </div>
    </div>
  )
}

/* ── County horizontal bar chart ── */
function CountyBars({ data }: { data: FullReports['orders_by_county'] }) {
  if (!data.length) return <div className="chart-empty"><p>No location data available.</p></div>
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  return (
    <div className="rpt-county-bars">
      {data.map((d) => (
        <div key={d.county} className="rpt-county-row">
          <span className="rpt-county-row__label">{d.county}</span>
          <div className="rpt-county-row__track">
            <div className="rpt-county-row__fill" style={{ width: `${(d.count / maxCount) * 100}%` }} />
          </div>
          <span className="rpt-county-row__count">{fmt(d.count)}</span>
          <span className="rpt-county-row__rev">{fmtKsh(d.revenue)}</span>
        </div>
      ))}
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
  const [productSort, setProductSort] = useState<'revenue' | 'units'>('revenue')
  const [productSearch, setProductSearch] = useState('')

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

  const sortedProducts = [...(data?.top_products ?? [])].sort((a, b) =>
    productSort === 'revenue' ? b.revenue - a.revenue : b.quantity_sold - a.quantity_sold
  ).filter((p) =>
    productSearch.trim() === '' ||
    p.product_name.toLowerCase().includes(productSearch.toLowerCase())
  )

  const totalProductRevenue = (data?.top_products ?? []).reduce((s, p) => s + p.revenue, 0)

  return (
    <div className="reports">

      {/* ── Header ── */}
      <div className="reports__header">
        <div className="reports__title">
          <h1>Reports</h1>
          <p>Live operational insights — orders, revenue, customers, lab &amp; payouts.</p>
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

      {/* ── KPI strip (7 cards) ── */}
      <div className="rpt-kpi-strip">
        {[
          {
            label: 'Total Orders', sub: `${fmt(data?.today_orders ?? 0)} today`,
            value: loading ? null : fmt(totalOrders),
            delta: data ? <DeltaBadge current={data.range_orders} prev={data.prev_range_orders} /> : null,
            color: 'blue',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>,
          },
          {
            label: 'Total Revenue', sub: `${fmtKsh(data?.monthly_revenue ?? 0)} this month`,
            value: loading ? null : fmtKsh(data?.total_revenue ?? 0),
            delta: data ? <DeltaBadge current={data.range_revenue} prev={data.prev_range_revenue} /> : null,
            color: 'green',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="20" height="20"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
          },
          {
            label: 'Avg Order Value', sub: `Last ${range} days`,
            value: loading ? null : fmtKsh(data?.avg_order_value ?? 0),
            delta: data ? <DeltaBadge current={data.avg_order_value} prev={data.prev_avg_order_value} /> : null,
            color: 'teal',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="20" height="20"><path d="M4 20V8M12 20V4M20 20v-9"/></svg>,
          },
          {
            label: 'Customers', sub: `${fmt(data?.new_customers_month ?? 0)} new this month`,
            value: loading ? null : fmt(data?.total_customers ?? 0),
            delta: null,
            color: 'purple',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
          },
          {
            label: 'Pending Orders', sub: `${fmt(data?.refund_requests ?? 0)} refund requests`,
            value: loading ? null : fmt(data?.pending_orders ?? 0),
            delta: null,
            color: 'amber',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="20" height="20"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
          },
          {
            label: 'Low Stock', sub: `${fmt(data?.out_of_stock_products ?? 0)} out of stock`,
            value: loading ? null : fmt(data?.low_stock_products ?? 0),
            delta: null,
            color: 'red',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="20" height="20"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
          },
          {
            label: 'New Customers', sub: `${fmt(data?.returning_customers_range ?? 0)} returning`,
            value: loading ? null : fmt(data?.new_customers_range ?? 0),
            delta: null,
            color: 'indigo',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="20" height="20"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
          },
        ].map((kpi) => (
          <div key={kpi.label} className={`rpt-kpi rpt-kpi--${kpi.color}`}>
            <div className={`rpt-kpi__icon rpt-kpi__icon--${kpi.color}`}>{kpi.icon}</div>
            <div className="rpt-kpi__body">
              <span className="rpt-kpi__label">{kpi.label}</span>
              <strong className="rpt-kpi__value">
                {kpi.value === null ? <Skeleton w={70} /> : kpi.value}
              </strong>
              <div className="rpt-kpi__footer">
                <span className="rpt-kpi__sub">{loading ? <Skeleton w={80} h={12} /> : kpi.sub}</span>
                {!loading && kpi.delta}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="rpt-grid">

        {/* Dual revenue + orders chart — full width */}
        <div className="rpt-card rpt-card--full">
          <div className="rpt-card__header">
            <div>
              <h2>Revenue &amp; Orders trend</h2>
              <p>Bars = daily revenue (KSh) · Line = daily order count · last {range} days</p>
            </div>
            {!loading && data && (
              <div className="rpt-card__header-right">
                <span className="rpt-badge rpt-badge--green">{fmtKshFull(data.range_revenue)} total</span>
                <span className="rpt-badge rpt-badge--indigo">{fmt(data.range_orders)} orders</span>
                <span className="rpt-badge rpt-badge--neutral">{fmt(data.today_orders)} today</span>
              </div>
            )}
          </div>
          {loading
            ? <div className="rpt-chart"><div className="rpt-skeleton" style={{ height: '100%', borderRadius: 10 }} /></div>
            : <DualChart data={data?.daily_revenue ?? []} />
          }
        </div>

        {/* ── Three-column section: Orders | Prescriptions | Lab ── */}
        {/* Order pipeline */}
        <div className="rpt-card">
          <div className="rpt-card__header">
            <div><h2>Order pipeline</h2><p>Queue by status</p></div>
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
          {!loading && (data?.orders_by_shipping ?? []).length > 0 && (
            <>
              <div className="rpt-card__divider" />
              <p className="rpt-card__section-label">Shipping method</p>
              <div className="rpt-pipes">
                {(data?.orders_by_shipping ?? []).map((s) => (
                  <PipelineRow key={s.name} label={s.name} value={s.count} total={totalOrders} tone="neutral" />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Prescription queue */}
        <div className="rpt-card">
          <div className="rpt-card__header">
            <div><h2>Prescription queue</h2><p>Approval status</p></div>
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
            <div><h2>Lab operations</h2><p>Test request pipeline</p></div>
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
            <div><h2>Consultations</h2><p>Telemedicine activity</p></div>
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

        {/* Payout health — expanded with by_role */}
        <div className="rpt-card">
          <div className="rpt-card__header">
            <div><h2>Payout health</h2><p>Settlement snapshot</p></div>
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
                  {(data?.payouts.by_role ?? []).length > 0 && (
                    <>
                      <div className="rpt-card__divider" />
                      <p className="rpt-card__section-label">By role</p>
                      {(data?.payouts.by_role ?? []).map((r: PayoutByRole) => (
                        <div key={r.role} className="rpt-payout-role-row">
                          <span className="rpt-payout-role-row__label">{statusLabel(r.role)}</span>
                          <span className="rpt-payout-role-row__count">{fmt(r.count)}</span>
                          <span className="rpt-payout-role-row__amount">{fmtKsh(r.total_amount)}</span>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )
            }
          </div>
        </div>

        {/* Support & stock */}
        <div className="rpt-card">
          <div className="rpt-card__header">
            <div><h2>Support &amp; stock</h2><p>Tickets and inventory health</p></div>
            <Link to="/admin/support" className="rpt-card__link">Support →</Link>
          </div>
          <div className="rpt-pipes">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="rpt-skeleton" style={{ height: 44 }} />)
              : (
                <>
                  <PipelineRow label="Open tickets" value={data?.support.open ?? 0} total={(data?.support.open ?? 0) + (data?.support.in_progress ?? 0)} tone="warning" icon="🎫" />
                  <PipelineRow label="In-progress tickets" value={data?.support.in_progress ?? 0} total={(data?.support.open ?? 0) + (data?.support.in_progress ?? 0)} tone="info" icon="💬" />
                  <PipelineRow label="Resolved (period)" value={data?.support.closed_range ?? 0} total={(data?.support.closed_range ?? 0) + (data?.support.open ?? 0) + 1} tone="success" icon="✅" />
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
              <p>Best-selling products · last {range} days</p>
            </div>
            <div className="rpt-card__header-right">
              <div className="rpt-toggle-group">
                <button
                  type="button"
                  className={`rpt-toggle-btn${productSort === 'revenue' ? ' rpt-toggle-btn--active' : ''}`}
                  onClick={() => setProductSort('revenue')}
                >By Revenue</button>
                <button
                  type="button"
                  className={`rpt-toggle-btn${productSort === 'units' ? ' rpt-toggle-btn--active' : ''}`}
                  onClick={() => setProductSort('units')}
                >By Units</button>
              </div>
              <Link to="/admin/products" className="rpt-card__link">View products →</Link>
            </div>
          </div>
          <div className="rpt-products-toolbar">
            <input
              type="search"
              placeholder="Search products…"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="rpt-products-search"
            />
            {productSearch && (
              <button type="button" className="rpt-products-clear" onClick={() => setProductSearch('')}>Clear</button>
            )}
          </div>
          {loading ? (
            <div className="rpt-top-products">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rpt-skeleton" style={{ height: 64 }} />
              ))}
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="chart-empty"><p>No sales data for this period.</p></div>
          ) : (
            <div className="rpt-top-products rpt-top-products--expanded">
              <div className="rpt-top-header">
                <span style={{ width: 36 }}>#</span>
                <span style={{ flex: 1 }}>Product</span>
                <span className="rpt-top-header__col">Category</span>
                <span className="rpt-top-header__col">Units Sold</span>
                <span className="rpt-top-header__col">Revenue</span>
                <span className="rpt-top-header__col">% of Total</span>
              </div>
              {(() => {
                const maxVal = productSort === 'revenue'
                  ? Math.max(...sortedProducts.map((p) => p.revenue), 1)
                  : Math.max(...sortedProducts.map((p) => p.quantity_sold), 1)
                return sortedProducts.map((p, i) => {
                  const pct = totalProductRevenue > 0 ? (p.revenue / totalProductRevenue) * 100 : 0
                  const barPct = productSort === 'revenue'
                    ? (p.revenue / maxVal) * 100
                    : (p.quantity_sold / maxVal) * 100
                  return (
                    <div key={p.product_sku} className="rpt-top-row rpt-top-row--expanded">
                      <span className={`rpt-top-row__rank rpt-top-row__rank--${i < 3 ? ['gold', 'silver', 'bronze'][i] : 'default'}`}>
                        {i + 1}
                      </span>
                      <div className="rpt-top-row__info">
                        <span className="rpt-top-row__name">{p.product_name}</span>
                        <span className="rpt-top-row__sku">SKU: {p.product_sku}</span>
                        <div className="rpt-top-row__bar-track">
                          <div className="rpt-top-row__bar-fill" style={{ width: `${barPct}%` }} />
                        </div>
                      </div>
                      <span className="rpt-top-row__col rpt-top-row__units">{fmt(p.quantity_sold)} units</span>
                      <span className="rpt-top-row__revenue">{fmtKshFull(p.revenue)}</span>
                      <div className="rpt-top-row__pct-col">
                        <span className="rpt-top-row__pct-label">{pct.toFixed(1)}%</span>
                        <div className="rpt-top-row__pct-bar">
                          <div className="rpt-top-row__pct-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>

        {/* ── Customer analytics — full width ── */}
        <div className="rpt-card rpt-card--full">
          <div className="rpt-card__header">
            <div>
              <h2>Customer analytics</h2>
              <p>Top spenders and acquisition breakdown · last {range} days</p>
            </div>
            <Link to="/admin/users?role=customer" className="rpt-card__link">View customers →</Link>
          </div>

          {/* New vs returning */}
          <div className="rpt-customer-split">
            <div className="rpt-customer-split__stat">
              <span className="rpt-customer-split__label">New customers</span>
              <strong className="rpt-customer-split__value">
                {loading ? <Skeleton w={60} /> : fmt(data?.new_customers_range ?? 0)}
              </strong>
            </div>
            <div className="rpt-customer-split__bar-wrap">
              {!loading && (
                <>
                  <div
                    className="rpt-customer-split__bar rpt-customer-split__bar--new"
                    style={{
                      width: `${
                        (data?.new_customers_range ?? 0) + (data?.returning_customers_range ?? 0) > 0
                          ? ((data?.new_customers_range ?? 0) /
                              ((data?.new_customers_range ?? 0) + (data?.returning_customers_range ?? 0))) * 100
                          : 50
                      }%`,
                    }}
                  />
                  <div className="rpt-customer-split__bar rpt-customer-split__bar--return" style={{ flex: 1 }} />
                </>
              )}
            </div>
            <div className="rpt-customer-split__stat rpt-customer-split__stat--right">
              <span className="rpt-customer-split__label">Returning</span>
              <strong className="rpt-customer-split__value">
                {loading ? <Skeleton w={60} /> : fmt(data?.returning_customers_range ?? 0)}
              </strong>
            </div>
          </div>

          {/* Top customers table */}
          {loading ? (
            <div className="rpt-customer-table">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rpt-skeleton" style={{ height: 44 }} />
              ))}
            </div>
          ) : (data?.top_customers ?? []).length === 0 ? (
            <div className="chart-empty"><p>No customer spend data for this period.</p></div>
          ) : (
            <div className="rpt-customer-table">
              <div className="rpt-customer-header">
                <span style={{ width: 28 }}>#</span>
                <span style={{ flex: 1 }}>Customer</span>
                <span className="rpt-customer-col">Orders</span>
                <span className="rpt-customer-col">Total Spend</span>
              </div>
              {(data?.top_customers ?? []).map((c, i) => (
                <div key={c.id} className="rpt-customer-row">
                  <span className="rpt-customer-row__rank">{i + 1}</span>
                  <div className="rpt-customer-row__info">
                    <span className="rpt-customer-row__name">{c.name || 'Guest'}</span>
                    <span className="rpt-customer-row__email">{c.email}</span>
                  </div>
                  <span className="rpt-customer-col rpt-customer-row__orders">{c.order_count}</span>
                  <span className="rpt-customer-col rpt-customer-row__spend">{fmtKshFull(c.total_spend)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders by county — full width */}
        <div className="rpt-card rpt-card--full">
          <div className="rpt-card__header">
            <div>
              <h2>Orders by location</h2>
              <p>Top counties by order volume · last {range} days</p>
            </div>
          </div>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="rpt-skeleton" style={{ height: 32, marginBottom: 6 }} />)
            : <CountyBars data={data?.orders_by_county ?? []} />
          }
        </div>

      </div>
    </div>
  )
}

export default Reports
