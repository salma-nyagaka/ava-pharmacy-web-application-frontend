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

function fmt(n: number) { return n.toLocaleString('en-KE') }
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
function delta(current: number, prev: number) {
  if (prev === 0) return { pct: 0, up: true }
  const pct = Math.round(((current - prev) / prev) * 100)
  return { pct: Math.abs(pct), up: pct >= 0 }
}
function DeltaBadge({ current, prev }: { current: number; prev: number }) {
  const { pct, up } = delta(current, prev)
  if (pct === 0) return null
  return <span className={`rpt-delta rpt-delta--${up ? 'up' : 'down'}`}>{up ? '↑' : '↓'} {pct}%</span>
}
function Skeleton({ w, h = 18 }: { w?: string | number; h?: number }) {
  return <span className="rpt-skeleton" style={{ width: w, height: h, display: 'inline-block' }} />
}

/* ─── Smooth SVG area chart ─── */
function SmoothAreaChart({ data }: { data: FullReports['daily_revenue'] }) {
  const [hovered, setHovered] = useState<number | null>(null)

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

  const W = 800, H = 220, PL = 68, PR = 56, PB = 32, PT = 16
  const cW = W - PL - PR
  const cH = H - PB - PT
  const maxRev = Math.max(...data.map((d) => d.revenue), 1)
  const maxOrd = Math.max(...data.map((d) => d.orders), 1)
  const n = data.length

  function xPos(i: number) { return PL + (n === 1 ? cW / 2 : (i / (n - 1)) * cW) }
  function revY(rev: number) { return PT + cH - (rev / maxRev) * cH }
  function ordY(ord: number) { return PT + cH - (ord / maxOrd) * cH }

  function cubicPath(pts: [number, number][]): string {
    if (pts.length < 2) return `M${pts[0][0]},${pts[0][1]}`
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1]
      const [cx2, cy2] = pts[i]
      const mx = (px + cx2) / 2
      d += ` C${mx.toFixed(1)},${py.toFixed(1)} ${mx.toFixed(1)},${cy2.toFixed(1)} ${cx2.toFixed(1)},${cy2.toFixed(1)}`
    }
    return d
  }

  const revPts: [number, number][] = data.map((d, i) => [xPos(i), revY(d.revenue)])
  const ordPts: [number, number][] = data.map((d, i) => [xPos(i), ordY(d.orders)])

  const revArea = cubicPath(revPts) + ` L${revPts[n - 1][0]},${PT + cH} L${PL},${PT + cH} Z`
  const ordArea = cubicPath(ordPts) + ` L${ordPts[n - 1][0]},${PT + cH} L${PL},${PT + cH} Z`

  const gridPcts = [0.25, 0.5, 0.75, 1.0]
  const xLabelEvery = n > 20 ? Math.ceil(n / 10) : n > 10 ? 2 : 1

  return (
    <div className="rpt-area-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="220" preserveAspectRatio="none" className="rpt-area-svg">
        <defs>
          <linearGradient id="rptRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="rptOrdGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Grid lines + Y axis labels */}
        {gridPcts.map((pct) => {
          const y = PT + cH - pct * cH
          return (
            <g key={pct}>
              <line x1={PL} y1={y} x2={PL + cW} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={PL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af" fontFamily="inherit">
                {fmtKsh(maxRev * pct)}
              </text>
              <text x={PL + cW + 6} y={y + 4} textAnchor="start" fontSize="10" fill="#a5b4fc" fontFamily="inherit">
                {Math.round(maxOrd * pct)}
              </text>
            </g>
          )
        })}

        {/* Baseline */}
        <line x1={PL} y1={PT + cH} x2={PL + cW} y2={PT + cH} stroke="#e5e7eb" strokeWidth="1" />

        {/* X axis labels */}
        {data.map((d, i) => {
          if (i % xLabelEvery !== 0) return null
          const x = xPos(i)
          const lbl = new Date(d.date + 'T00:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
          return (
            <text key={d.date} x={x} y={H - 6} textAnchor="middle" fontSize="9.5" fill="#9ca3af" fontFamily="inherit">
              {lbl}
            </text>
          )
        })}

        {/* Revenue area fill */}
        <path d={revArea} fill="url(#rptRevGrad)" />
        {/* Orders area fill */}
        <path d={ordArea} fill="url(#rptOrdGrad)" />

        {/* Revenue line */}
        <path d={cubicPath(revPts)} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Orders line (dashed) */}
        <path d={cubicPath(ordPts)} fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3" />

        {/* Hover interaction columns */}
        {data.map((d, i) => {
          const x = xPos(i)
          const ry = revY(d.revenue)
          const oy = ordY(d.orders)
          const isHov = hovered === i
          const lbl = new Date(d.date + 'T00:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
          const tipX = x > PL + cW * 0.65 ? x - 138 : x + 10
          return (
            <g key={d.date}>
              <rect
                x={x - cW / n / 2}
                y={PT}
                width={Math.max(cW / n, 6)}
                height={cH}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
              {isHov && (
                <>
                  <line x1={x} y1={PT} x2={x} y2={PT + cH} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 3" />
                  <rect x={tipX} y={PT + 4} width="132" height="72" rx="6" ry="6" fill="#0f172a" opacity="0.93" />
                  <text x={tipX + 10} y={PT + 20} fontSize="10.5" fontWeight="700" fill="#f1f5f9" fontFamily="inherit">{lbl}</text>
                  <text x={tipX + 10} y={PT + 36} fontSize="10" fill="#6ee7b7" fontFamily="inherit">{fmtKshFull(d.revenue)}</text>
                  <text x={tipX + 10} y={PT + 50} fontSize="10" fill="#c7d2fe" fontFamily="inherit">{fmt(d.orders)} orders</text>
                  <text x={tipX + 10} y={PT + 64} fontSize="9.5" fill="#94a3b8" fontFamily="inherit">
                    AOV: {d.orders > 0 ? fmtKsh(d.revenue / d.orders) : '—'}
                  </text>
                </>
              )}
              {/* Dots */}
              <circle cx={x} cy={ry} r={isHov ? 5 : 3} fill="#fff" stroke="#10b981" strokeWidth="2" />
              <circle cx={x} cy={oy} r={isHov ? 4 : 2.5} fill="#fff" stroke="#6366f1" strokeWidth="1.5" />
            </g>
          )
        })}
      </svg>

      <div className="rpt-area-legend">
        <span className="rpt-area-legend__item rpt-area-legend__item--rev">Revenue (KSh)</span>
        <span className="rpt-area-legend__item rpt-area-legend__item--ord">Order count</span>
        <span className="rpt-area-legend__axis-note">Left axis: revenue · Right axis: orders</span>
      </div>
    </div>
  )
}

/* ─── Donut chart ─── */
function DonutChart({
  data,
  size = 120,
  total,
}: {
  data: { label: string; value: number; color: string }[]
  size?: number
  total?: number
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const cx = size / 2, cy = size / 2
  const r = size * 0.33
  const sw = Math.max(10, size * 0.12)
  const circ = 2 * Math.PI * r
  const grandTotal = total ?? data.reduce((s, d) => s + d.value, 0)

  if (grandTotal === 0) {
    return (
      <div className="rpt-donut" style={{ width: size }}>
        <div className="rpt-donut__empty" style={{ width: size, height: size }}>—</div>
      </div>
    )
  }

  let acc = 0
  const segs = data.map((d, i) => {
    const segLen = (d.value / grandTotal) * circ
    const dashOff = circ - acc
    acc += segLen
    return { ...d, i, segLen, dashOff }
  })

  const hov = hovered !== null ? data[hovered] : null

  return (
    <div className="rpt-donut">
      <div className="rpt-donut__ring-wrap" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
          {segs.map((s) => (
            <circle
              key={s.label}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={hovered === s.i ? sw + 3 : sw}
              strokeDasharray={`${s.segLen.toFixed(2)} ${(circ - s.segLen).toFixed(2)}`}
              strokeDashoffset={s.dashOff.toFixed(2)}
              strokeLinecap="butt"
              style={{ transition: 'stroke-width 0.14s', cursor: 'pointer' }}
              onMouseEnter={() => setHovered(s.i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
        <div className="rpt-donut__center">
          <strong className="rpt-donut__center-val">
            {hov ? fmt(hov.value) : fmt(grandTotal)}
          </strong>
          <span className="rpt-donut__center-lbl">
            {hov ? hov.label.split(' ')[0] : 'total'}
          </span>
        </div>
      </div>
      <div className="rpt-donut__legend">
        {data.map((d, i) => (
          <div
            key={d.label}
            className={`rpt-donut__legend-item${hovered === i ? ' rpt-donut__legend-item--hov' : ''}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="rpt-donut__legend-dot" style={{ background: d.color }} />
            <span className="rpt-donut__legend-lbl">{d.label}</span>
            <span className="rpt-donut__legend-val">{fmt(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Pipeline row ─── */
function PipelineRow({ label, value, total, tone, icon }: {
  label: string; value: number; total: number; tone: string; icon?: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="rpt-pipe-row">
      <div className="rpt-pipe-row__top">
        {icon && <span className="rpt-pipe-row__icon">{icon}</span>}
        <span className="rpt-pipe-row__label">{label}</span>
        <span className={`rpt-pipe-row__badge rpt-pipe-row__badge--${tone}`}>{fmt(value)}</span>
        <span className="rpt-pipe-row__pct">{pct}%</span>
      </div>
      <div className="rpt-pipe-bar">
        <div className={`rpt-pipe-bar__fill rpt-pipe-bar__fill--${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/* ─── County bars ─── */
function CountyBars({ data }: { data: FullReports['orders_by_county'] }) {
  if (!data.length) return <div className="chart-empty"><p>No location data available.</p></div>
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const maxRev = Math.max(...data.map((d) => d.revenue), 1)
  return (
    <div className="rpt-county-bars">
      {data.map((d, i) => (
        <div key={d.county} className="rpt-county-row">
          <span className="rpt-county-row__rank">{i + 1}</span>
          <span className="rpt-county-row__label">{d.county}</span>
          <div className="rpt-county-row__tracks">
            <div className="rpt-county-row__track-wrap">
              <div className="rpt-county-row__fill rpt-county-row__fill--orders" style={{ width: `${(d.count / maxCount) * 100}%` }} />
            </div>
            <div className="rpt-county-row__track-wrap rpt-county-row__track-wrap--rev">
              <div className="rpt-county-row__fill rpt-county-row__fill--rev" style={{ width: `${(d.revenue / maxRev) * 100}%` }} />
            </div>
          </div>
          <span className="rpt-county-row__count">{fmt(d.count)}</span>
          <span className="rpt-county-row__rev">{fmtKsh(d.revenue)}</span>
        </div>
      ))}
      <div className="rpt-county-legend">
        <span className="rpt-county-legend__item rpt-county-legend__item--orders">Orders</span>
        <span className="rpt-county-legend__item rpt-county-legend__item--rev">Revenue</span>
      </div>
    </div>
  )
}

/* ─── Export dropdown ─── */
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
      <button className="rpt-export-btn" type="button" onClick={() => setOpen((o) => !o)} disabled={!!loading}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
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
              key={t} className="rpt-export-dropdown__item" type="button"
              disabled={loading === t} onClick={() => { onExport(t); setOpen(false) }}
            >
              {loading === t ? 'Exporting…' : `Export ${t.charAt(0).toUpperCase() + t.slice(1)}`}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Main component ─── */
function Reports() {
  const [range, setRange] = useState(30)
  const [data, setData] = useState<FullReports | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [productSort, setProductSort] = useState<'revenue' | 'units'>('revenue')
  const [productSearch, setProductSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setData(await adminDashboardService.getReports(range)) }
    catch { setError('Failed to load report data.') }
    finally { setLoading(false) }
  }, [range])

  useEffect(() => { void load() }, [load])

  const download = async (type: 'orders' | 'revenue' | 'products') => {
    setDownloading(type)
    try { await adminDashboardService.downloadReport(type, range) }
    finally { setDownloading(null) }
  }

  const ordersMap = Object.fromEntries((data?.orders_by_status ?? []).map((s) => [s.status, s.count]))
  const totalOrders = data?.total_orders ?? 0
  const rxTotal = (data?.prescriptions.pending ?? 0) + (data?.prescriptions.approved ?? 0) + (data?.prescriptions.clarification ?? 0) + (data?.prescriptions.rejected ?? 0)
  const labTotal = (data?.lab.awaiting ?? 0) + (data?.lab.processing ?? 0) + (data?.lab.results_ready ?? 0) + (data?.lab.completed ?? 0)
  const consultTotal = (data?.consultations.waiting ?? 0) + (data?.consultations.in_progress ?? 0) + (data?.consultations.completed ?? 0)

  const sortedProducts = [...(data?.top_products ?? [])].sort((a, b) =>
    productSort === 'revenue' ? b.revenue - a.revenue : b.quantity_sold - a.quantity_sold
  ).filter((p) =>
    productSearch.trim() === '' || p.product_name.toLowerCase().includes(productSearch.toLowerCase())
  )
  const totalProductRevenue = (data?.top_products ?? []).reduce((s, p) => s + p.revenue, 0)

  /* Donut data */
  const orderDonut = [
    { label: 'Pending', value: ordersMap['pending'] ?? 0, color: '#f59e0b' },
    { label: 'Processing', value: ordersMap['processing'] ?? 0, color: '#3b82f6' },
    { label: 'Shipped', value: ordersMap['shipped'] ?? 0, color: '#6366f1' },
    { label: 'Delivered', value: ordersMap['delivered'] ?? 0, color: '#10b981' },
    { label: 'Cancelled', value: ordersMap['cancelled'] ?? 0, color: '#ef4444' },
  ]
  const rxDonut = [
    { label: 'Pending review', value: data?.prescriptions.pending ?? 0, color: '#f59e0b' },
    { label: 'Approved', value: data?.prescriptions.approved ?? 0, color: '#10b981' },
    { label: 'Clarification', value: data?.prescriptions.clarification ?? 0, color: '#3b82f6' },
    { label: 'Rejected', value: data?.prescriptions.rejected ?? 0, color: '#ef4444' },
  ]
  const labDonut = [
    { label: 'Awaiting sample', value: data?.lab.awaiting ?? 0, color: '#f59e0b' },
    { label: 'Processing', value: data?.lab.processing ?? 0, color: '#3b82f6' },
    { label: 'Results ready', value: data?.lab.results_ready ?? 0, color: '#10b981' },
    { label: 'Completed', value: data?.lab.completed ?? 0, color: '#0d9488' },
  ]
  const paymentDonut = (data?.orders_by_payment ?? []).map((p, i) => ({
    label: statusLabel(p.payment_method || 'Unknown'),
    value: p.count,
    color: ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#ec4899', '#0d9488'][i % 6],
  }))

  return (
    <div className="reports">

      {/* ── Header ── */}
      <div className="reports__header">
        <div className="reports__title">
          <h1>Reports &amp; Analytics</h1>
          <p>Live operational insights — revenue, orders, customers, prescriptions &amp; payouts</p>
        </div>
        <div className="reports__controls">
          <div className="rpt-range-pills">
            {RANGE_OPTIONS.map((o) => (
              <button
                key={o.value} type="button"
                className={`rpt-range-pill${range === o.value ? ' rpt-range-pill--active' : ''}`}
                onClick={() => setRange(o.value)}
              >{o.label}</button>
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
            delta: null, color: 'purple',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
          },
          {
            label: 'Pending Orders', sub: `${fmt(data?.refund_requests ?? 0)} refund requests`,
            value: loading ? null : fmt(data?.pending_orders ?? 0),
            delta: null, color: 'amber',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="20" height="20"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
          },
          {
            label: 'Low Stock', sub: `${fmt(data?.out_of_stock_products ?? 0)} out of stock`,
            value: loading ? null : fmt(data?.low_stock_products ?? 0),
            delta: null, color: 'red',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="20" height="20"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
          },
          {
            label: 'New Customers', sub: `${fmt(data?.returning_customers_range ?? 0)} returning`,
            value: loading ? null : fmt(data?.new_customers_range ?? 0),
            delta: null, color: 'indigo',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="20" height="20"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
          },
        ].map((kpi) => (
          <div key={kpi.label} className={`rpt-kpi rpt-kpi--${kpi.color}`}>
            <div className={`rpt-kpi__icon rpt-kpi__icon--${kpi.color}`}>{kpi.icon}</div>
            <div className="rpt-kpi__body">
              <span className="rpt-kpi__label">{kpi.label}</span>
              <strong className="rpt-kpi__value">{kpi.value === null ? <Skeleton w={70} /> : kpi.value}</strong>
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

        {/* ── Area chart — full width ── */}
        <div className="rpt-card rpt-card--full">
          <div className="rpt-card__header">
            <div>
              <h2>Revenue &amp; Orders Trend</h2>
              <p>Smooth area chart · revenue (left axis) vs order count (right axis) · last {range} days</p>
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
            ? <div style={{ height: 220, background: 'linear-gradient(90deg,#f1f5f9 25%,#e9edf2 50%,#f1f5f9 75%)', borderRadius: 10, animation: 'rpt-shimmer 1.4s ease-in-out infinite', backgroundSize: '200% 100%' }} />
            : <SmoothAreaChart data={data?.daily_revenue ?? []} />
          }
        </div>

        {/* ── Order pipeline + donut ── */}
        <div className="rpt-card">
          <div className="rpt-card__header">
            <div><h2>Order Pipeline</h2><p>Status distribution</p></div>
            <Link to="/admin/orders" className="rpt-card__link">View all →</Link>
          </div>
          {loading ? (
            <div className="rpt-split-skeleton">
              <div className="rpt-skeleton" style={{ width: 120, height: 120, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="rpt-skeleton" style={{ height: 38, marginBottom: 8 }} />)}</div>
            </div>
          ) : (
            <div className="rpt-card__split">
              <DonutChart data={orderDonut} size={130} />
              <div className="rpt-pipes">
                <PipelineRow label="Pending" value={ordersMap['pending'] ?? 0} total={totalOrders} tone="warning" icon="⏳" />
                <PipelineRow label="Processing" value={ordersMap['processing'] ?? 0} total={totalOrders} tone="info" icon="⚙️" />
                <PipelineRow label="Shipped" value={ordersMap['shipped'] ?? 0} total={totalOrders} tone="neutral" icon="📦" />
                <PipelineRow label="Delivered" value={ordersMap['delivered'] ?? 0} total={totalOrders} tone="success" icon="✅" />
                <PipelineRow label="Cancelled" value={ordersMap['cancelled'] ?? 0} total={totalOrders} tone="danger" icon="✕" />
                {(data?.orders_by_shipping ?? []).length > 0 && (
                  <>
                    <div className="rpt-card__divider" />
                    <p className="rpt-card__section-label">By shipping method</p>
                    {(data?.orders_by_shipping ?? []).map((s) => (
                      <PipelineRow key={s.name} label={s.name} value={s.count} total={totalOrders} tone="neutral" />
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Prescription queue + donut ── */}
        <div className="rpt-card">
          <div className="rpt-card__header">
            <div><h2>Prescription Queue</h2><p>Approval status breakdown</p></div>
            <Link to="/admin/prescriptions" className="rpt-card__link">View all →</Link>
          </div>
          {loading ? (
            <div className="rpt-split-skeleton">
              <div className="rpt-skeleton" style={{ width: 120, height: 120, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="rpt-skeleton" style={{ height: 38, marginBottom: 8 }} />)}</div>
            </div>
          ) : (
            <div className="rpt-card__split">
              <DonutChart data={rxDonut} size={130} total={rxTotal} />
              <div className="rpt-pipes">
                <PipelineRow label="Pending review" value={data?.prescriptions.pending ?? 0} total={rxTotal} tone="warning" icon="📋" />
                <PipelineRow label="Approved" value={data?.prescriptions.approved ?? 0} total={rxTotal} tone="success" icon="✅" />
                <PipelineRow label="Needs clarification" value={data?.prescriptions.clarification ?? 0} total={rxTotal} tone="info" icon="💬" />
                <PipelineRow label="Rejected" value={data?.prescriptions.rejected ?? 0} total={rxTotal} tone="danger" icon="✕" />
              </div>
            </div>
          )}
        </div>

        {/* ── Lab operations + donut ── */}
        <div className="rpt-card">
          <div className="rpt-card__header">
            <div><h2>Lab Operations</h2><p>Test request pipeline</p></div>
            <Link to="/admin/lab-requests" className="rpt-card__link">View all →</Link>
          </div>
          {loading ? (
            <div className="rpt-split-skeleton">
              <div className="rpt-skeleton" style={{ width: 120, height: 120, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="rpt-skeleton" style={{ height: 38, marginBottom: 8 }} />)}</div>
            </div>
          ) : (
            <div className="rpt-card__split">
              <DonutChart data={labDonut} size={130} total={labTotal} />
              <div className="rpt-pipes">
                <PipelineRow label="Awaiting sample" value={data?.lab.awaiting ?? 0} total={labTotal} tone="warning" icon="🧪" />
                <PipelineRow label="Processing" value={data?.lab.processing ?? 0} total={labTotal} tone="info" icon="⚗️" />
                <PipelineRow label="Results ready" value={data?.lab.results_ready ?? 0} total={labTotal} tone="success" icon="📊" />
                <PipelineRow label="Completed" value={data?.lab.completed ?? 0} total={labTotal} tone="neutral" icon="✅" />
              </div>
            </div>
          )}
        </div>

        {/* ── Payment methods + donut ── */}
        <div className="rpt-card">
          <div className="rpt-card__header">
            <div><h2>Payment Methods</h2><p>How customers are paying</p></div>
          </div>
          {loading ? (
            <div className="rpt-split-skeleton">
              <div className="rpt-skeleton" style={{ width: 120, height: 120, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>{Array.from({ length: 3 }).map((_, i) => <div key={i} className="rpt-skeleton" style={{ height: 38, marginBottom: 8 }} />)}</div>
            </div>
          ) : (
            <div className="rpt-card__split">
              <DonutChart data={paymentDonut} size={130} total={totalOrders} />
              <div className="rpt-pipes">
                {(data?.orders_by_payment ?? []).map((p, i) => (
                  <PipelineRow
                    key={p.payment_method}
                    label={statusLabel(p.payment_method || 'Unknown')}
                    value={p.count}
                    total={totalOrders}
                    tone="neutral"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Consultations ── */}
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

        {/* ── Payout health ── */}
        <div className="rpt-card">
          <div className="rpt-card__header">
            <div><h2>Payout Health</h2><p>Settlement snapshot</p></div>
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

        {/* ── Support & stock ── */}
        <div className="rpt-card">
          <div className="rpt-card__header">
            <div><h2>Support &amp; Inventory</h2><p>Tickets and stock health</p></div>
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
                  <div className="rpt-card__divider" />
                  <PipelineRow label="Low stock products" value={data?.low_stock_products ?? 0} total={(data?.low_stock_products ?? 0) + (data?.out_of_stock_products ?? 0) + 1} tone="amber" icon="⚠️" />
                  <PipelineRow label="Out of stock" value={data?.out_of_stock_products ?? 0} total={(data?.low_stock_products ?? 0) + (data?.out_of_stock_products ?? 0) + 1} tone="danger" icon="🚫" />
                </>
              )
            }
          </div>
        </div>

        {/* ── Top products — full width ── */}
        <div className="rpt-card rpt-card--full">
          <div className="rpt-card__header">
            <div>
              <h2>Top Products</h2>
              <p>Best-selling products · last {range} days</p>
            </div>
            <div className="rpt-card__header-right">
              <div className="rpt-toggle-group">
                <button type="button" className={`rpt-toggle-btn${productSort === 'revenue' ? ' rpt-toggle-btn--active' : ''}`} onClick={() => setProductSort('revenue')}>By Revenue</button>
                <button type="button" className={`rpt-toggle-btn${productSort === 'units' ? ' rpt-toggle-btn--active' : ''}`} onClick={() => setProductSort('units')}>By Units</button>
              </div>
              <Link to="/admin/products" className="rpt-card__link">View products →</Link>
            </div>
          </div>
          <div className="rpt-products-toolbar">
            <input
              type="search" placeholder="Search products…"
              value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
              className="rpt-products-search"
            />
            {productSearch && <button type="button" className="rpt-products-clear" onClick={() => setProductSearch('')}>Clear</button>}
          </div>
          {loading ? (
            <div className="rpt-top-products">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="rpt-skeleton" style={{ height: 64 }} />)}
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="chart-empty"><p>No sales data for this period.</p></div>
          ) : (
            <div className="rpt-top-products rpt-top-products--expanded">
              <div className="rpt-top-header">
                <span style={{ width: 36 }}>#</span>
                <span style={{ flex: 1 }}>Product</span>
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
                  const barPct = productSort === 'revenue' ? (p.revenue / maxVal) * 100 : (p.quantity_sold / maxVal) * 100
                  return (
                    <div key={p.product_sku} className="rpt-top-row rpt-top-row--expanded">
                      <span className={`rpt-top-row__rank rpt-top-row__rank--${i < 3 ? ['gold', 'silver', 'bronze'][i] : 'default'}`}>{i + 1}</span>
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
              <h2>Customer Analytics</h2>
              <p>Acquisition split and top spenders · last {range} days</p>
            </div>
            <Link to="/admin/users?role=customer" className="rpt-card__link">View customers →</Link>
          </div>

          <div className="rpt-customer-split">
            <div className="rpt-customer-split__stat">
              <span className="rpt-customer-split__label">New customers</span>
              <strong className="rpt-customer-split__value">{loading ? <Skeleton w={60} /> : fmt(data?.new_customers_range ?? 0)}</strong>
            </div>
            <div className="rpt-customer-split__bar-wrap">
              {!loading && (
                <>
                  <div
                    className="rpt-customer-split__bar rpt-customer-split__bar--new"
                    style={{
                      width: `${(data?.new_customers_range ?? 0) + (data?.returning_customers_range ?? 0) > 0
                        ? ((data?.new_customers_range ?? 0) / ((data?.new_customers_range ?? 0) + (data?.returning_customers_range ?? 0))) * 100
                        : 50}%`,
                    }}
                  />
                  <div className="rpt-customer-split__bar rpt-customer-split__bar--return" style={{ flex: 1 }} />
                </>
              )}
            </div>
            <div className="rpt-customer-split__stat rpt-customer-split__stat--right">
              <span className="rpt-customer-split__label">Returning</span>
              <strong className="rpt-customer-split__value">{loading ? <Skeleton w={60} /> : fmt(data?.returning_customers_range ?? 0)}</strong>
            </div>
          </div>

          {loading ? (
            <div className="rpt-customer-table">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="rpt-skeleton" style={{ height: 44 }} />)}
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

        {/* ── Orders by location — full width ── */}
        <div className="rpt-card rpt-card--full">
          <div className="rpt-card__header">
            <div>
              <h2>Orders by Location</h2>
              <p>Top counties by order volume and revenue · last {range} days</p>
            </div>
          </div>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="rpt-skeleton" style={{ height: 40, marginBottom: 8 }} />)
            : <CountyBars data={data?.orders_by_county ?? []} />
          }
        </div>

      </div>
    </div>
  )
}

export default Reports
