import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminShared.css'
import './Reports.css'

function Reports() {
  const navigate = useNavigate()
  const [timeRange, setTimeRange] = useState('7days')

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/admin')
  }

  const revenueData = [
    { day: 'Mon', value: 12500 },
    { day: 'Tue', value: 15200 },
    { day: 'Wed', value: 18600 },
    { day: 'Thu', value: 14300 },
    { day: 'Fri', value: 21400 },
    { day: 'Sat', value: 25800 },
    { day: 'Sun', value: 19200 },
  ]

  const maxRevenue = Math.max(...revenueData.map((d) => d.value))

  const doctorPerformance = [
    { name: 'Dr. Sarah Johnson', consults: 42, rating: 4.8 },
    { name: 'Dr. Michael Chen', consults: 35, rating: 4.6 },
    { name: 'Dr. Mercy Otieno', consults: 28, rating: 4.7 },
  ]

  const orderPipeline = [
    { label: 'Pending', value: 18, tone: 'warning' },
    { label: 'Processing', value: 24, tone: 'info' },
    { label: 'Shipped', value: 12, tone: 'neutral' },
    { label: 'Delivered', value: 46, tone: 'success' },
  ]

  const prescriptionPipeline = [
    { label: 'Pending review', value: 22, tone: 'warning' },
    { label: 'Approved', value: 128, tone: 'success' },
    { label: 'Clarification', value: 9, tone: 'info' },
    { label: 'Rejected', value: 6, tone: 'danger' },
  ]

  const labPipeline = [
    { label: 'Awaiting pickup', value: 14, tone: 'warning' },
    { label: 'In progress', value: 19, tone: 'info' },
    { label: 'Results published', value: 33, tone: 'success' },
  ]

  const payoutHealth = [
    { label: 'Pending payouts', value: 'KSh 224,500', detail: '24 requests', tone: 'warning' },
    { label: 'Paid this period', value: 'KSh 612,800', detail: '178 payouts', tone: 'success' },
    { label: 'Failed payouts', value: '4', detail: 'Needs retry', tone: 'danger' },
  ]

  const kpis = useMemo(
    () => [
      { label: 'Revenue', value: 'KSh 818,000', change: '+12.5%', tone: 'positive' },
      { label: 'Orders processed', value: '1,247', change: '+8.3%', tone: 'positive' },
      { label: 'Prescriptions dispensed', value: '612', change: '+5.4%', tone: 'positive' },
      { label: 'Lab results published', value: '284', change: '+9.1%', tone: 'positive' },
      { label: 'Payouts pending', value: '24', change: '-3.2%', tone: 'negative' },
    ],
    []
  )

  return (
    <div className="reports">
      <div className="reports__header">
        <div className="admin-page__title">
          <button className="pm-back-btn" type="button" onClick={handleBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back
          </button>
          <div className="reports__title">
            <h1>Reports</h1>
            <p>Operational insights for orders, prescriptions, lab tasks, and payouts.</p>
          </div>
        </div>
        <div className="reports__header-actions">
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="year">This Year</option>
          </select>
          <button className="btn btn--outline">Export to Excel</button>
          <button className="btn btn--outline">Export to PDF</button>
          <button className="btn btn--primary">Generate report</button>
        </div>
      </div>

      <div className="reports__overview">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="stat-card">
          <div className="stat-card__label">{kpi.label}</div>
          <div className="stat-card__value">{kpi.value}</div>
        </div>
      ))}
    </div>

      <div className="reports__grid">
        <div className="report-card">
          <div className="report-card__header">
            <div>
              <h2>Revenue trend</h2>
              <p>Daily revenue performance for the selected period.</p>
            </div>
            <span className="report-card__badge">KSh 818,000 total</span>
          </div>
          <div className="chart">
            <div className="chart__bars">
              {revenueData.map((data) => (
                <div key={data.day} className="chart__bar-wrapper">
                  <div
                    className="chart__bar"
                    style={{ height: `${(data.value / maxRevenue) * 100}%` }}
                  >
                    <span className="chart__value">
                      {(data.value / 1000).toFixed(1)}k
                    </span>
                  </div>
                  <span className="chart__label">{data.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="report-card">
          <div className="report-card__header">
            <div>
              <h2>Order pipeline</h2>
              <p>Track the current order queue by status.</p>
            </div>
            <button className="report-card__link" type="button">View orders</button>
          </div>
          <div className="insights">
            {orderPipeline.map((item) => (
              <div key={item.label} className="insight-row">
                <span className="insight-label">{item.label}</span>
                <span className={`insight-value insight-value--${item.tone}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="report-card">
          <div className="report-card__header">
            <div>
              <h2>Prescription queue</h2>
              <p>Keep prescription approvals and clarifications on track.</p>
            </div>
            <button className="report-card__link" type="button">View prescriptions</button>
          </div>
          <div className="insights">
            {prescriptionPipeline.map((item) => (
              <div key={item.label} className="insight-row">
                <span className="insight-label">{item.label}</span>
                <span className={`insight-value insight-value--${item.tone}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="report-card">
          <div className="report-card__header">
            <div>
              <h2>Lab operations</h2>
              <p>Work in progress and results published.</p>
            </div>
            <button className="report-card__link" type="button">View lab requests</button>
          </div>
          <div className="insights">
            {labPipeline.map((item) => (
              <div key={item.label} className="insight-row">
                <span className="insight-label">{item.label}</span>
                <span className={`insight-value insight-value--${item.tone}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="report-card">
          <div className="report-card__header">
            <div>
              <h2>Payout health</h2>
              <p>Settlement snapshot for the finance team.</p>
            </div>
            <button className="report-card__link" type="button">View payouts</button>
          </div>
          <div className="payout-health">
            {payoutHealth.map((item) => (
              <div key={item.label} className={`payout-health__item payout-health__item--${item.tone}`}>
                <span className="payout-health__label">{item.label}</span>
                <strong className="payout-health__value">{item.value}</strong>
                <span className="payout-health__detail">{item.detail}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="report-card">
          <div className="report-card__header">
            <div>
              <h2>Clinical performance</h2>
              <p>Doctor activity and consultation quality.</p>
            </div>
            <button className="report-card__link" type="button">View doctors</button>
          </div>
          <div className="top-products">
            {doctorPerformance.map((doctor) => (
              <div key={doctor.name} className="top-product">
                <div className="top-product__rank">{doctor.rating.toFixed(1)}</div>
                <div className="top-product__info">
                  <div className="top-product__name">{doctor.name}</div>
                  <div className="top-product__stats">{doctor.consults} consultations</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports
