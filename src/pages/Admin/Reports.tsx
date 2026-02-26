import { useState } from 'react'
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

  const salesData = [
    { day: 'Mon', sales: 12500 },
    { day: 'Tue', sales: 15200 },
    { day: 'Wed', sales: 18600 },
    { day: 'Thu', sales: 14300 },
    { day: 'Fri', sales: 21400 },
    { day: 'Sat', sales: 25800 },
    { day: 'Sun', sales: 19200 },
  ]

  const maxSales = Math.max(...salesData.map(d => d.sales))

  const topProducts = [
    { name: 'Paracetamol 500mg', sales: 245, revenue: 61250 },
    { name: 'Vitamin C 1000mg', sales: 198, revenue: 158400 },
    { name: 'Ibuprofen 400mg', sales: 176, revenue: 61600 },
    { name: 'Amoxicillin 250mg', sales: 143, revenue: 171600 },
    { name: 'Cetrizine 10mg', sales: 132, revenue: 59400 },
  ]

  const categoryRevenue = [
    { category: 'Pain Relief', revenue: 285000, percentage: 35 },
    { category: 'Supplements', revenue: 230000, percentage: 28 },
    { category: 'Antibiotics', revenue: 180000, percentage: 22 },
    { category: 'Allergy', revenue: 82000, percentage: 10 },
    { category: 'Digestive', revenue: 41000, percentage: 5 },
  ]

  const inventoryPerformance = [
    { label: 'Low-stock items', value: 18 },
    { label: 'Out of stock', value: 6 },
    { label: 'Fast movers', value: 12 },
    { label: 'Slow movers', value: 9 },
  ]

  const doctorPerformance = [
    { name: 'Dr. Sarah Johnson', consults: 42, rating: 4.8 },
    { name: 'Dr. Michael Chen', consults: 35, rating: 4.6 },
    { name: 'Dr. Mercy Otieno', consults: 28, rating: 4.7 },
  ]

  const prescriptionStats = [
    { label: 'Approved', value: 128 },
    { label: 'Pending', value: 22 },
    { label: 'Clarification', value: 9 },
    { label: 'Rejected', value: 6 },
  ]

  return (
    <div className="reports">
      <div className="reports__header">
        <div className="admin-page__title">
          <button className="pm-back-btn" type="button" onClick={handleBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back
          </button>
          <h1>Reports & Analytics</h1>
        </div>
        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="reports__overview">
        <div className="stat-card">
          <div className="stat-card__label">Total Revenue</div>
          <div className="stat-card__value">KSh 818,000</div>
          <div className="stat-card__change stat-card__change--positive">+12.5%</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Total Orders</div>
          <div className="stat-card__value">1,247</div>
          <div className="stat-card__change stat-card__change--positive">+8.3%</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Average Order Value</div>
          <div className="stat-card__value">KSh 656</div>
          <div className="stat-card__change stat-card__change--negative">-2.1%</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">New Customers</div>
          <div className="stat-card__value">342</div>
          <div className="stat-card__change stat-card__change--positive">+15.7%</div>
        </div>
      </div>

      <div className="reports__grid">
        <div className="report-card">
          <h2>Sales Overview</h2>
          <div className="chart">
            <div className="chart__bars">
              {salesData.map((data) => (
                <div key={data.day} className="chart__bar-wrapper">
                  <div
                    className="chart__bar"
                    style={{ height: `${(data.sales / maxSales) * 100}%` }}
                  >
                    <span className="chart__value">
                      {(data.sales / 1000).toFixed(1)}k
                    </span>
                  </div>
                  <span className="chart__label">{data.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="report-card">
          <h2>Top Products</h2>
          <div className="top-products">
            {topProducts.map((product, index) => (
              <div key={product.name} className="top-product">
                <div className="top-product__rank">#{index + 1}</div>
                <div className="top-product__info">
                  <div className="top-product__name">{product.name}</div>
                  <div className="top-product__stats">
                    {product.sales} sales · KSh {product.revenue.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="report-card">
          <h2>Revenue by Category</h2>
          <div className="category-revenue">
            {categoryRevenue.map((item) => (
              <div key={item.category} className="category-item">
                <div className="category-item__header">
                  <span className="category-item__name">{item.category}</span>
                  <span className="category-item__revenue">
                    KSh {item.revenue.toLocaleString()}
                  </span>
                </div>
                <div className="category-item__bar">
                  <div
                    className="category-item__fill"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
                <div className="category-item__percentage">{item.percentage}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="report-card">
          <h2>Customer Insights</h2>
          <div className="insights">
            <div className="insight-row">
              <span className="insight-label">Total Customers</span>
              <span className="insight-value">2,847</span>
            </div>
            <div className="insight-row">
              <span className="insight-label">Active Customers</span>
              <span className="insight-value">1,923</span>
            </div>
            <div className="insight-row">
              <span className="insight-label">Repeat Customers</span>
              <span className="insight-value">1,245</span>
            </div>
            <div className="insight-row">
              <span className="insight-label">Customer Retention</span>
              <span className="insight-value">67.5%</span>
            </div>
            <div className="insight-row">
              <span className="insight-label">Average Orders per Customer</span>
              <span className="insight-value">3.8</span>
            </div>
            <div className="insight-row">
              <span className="insight-label">Customer Lifetime Value</span>
              <span className="insight-value">KSh 2,493</span>
            </div>
          </div>
        </div>

        <div className="report-card">
          <h2>Inventory Performance</h2>
          <div className="insights">
            {inventoryPerformance.map((item) => (
              <div key={item.label} className="insight-row">
                <span className="insight-label">{item.label}</span>
                <span className="insight-value">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="report-card">
          <h2>Doctor & Consultation Performance</h2>
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

        <div className="report-card">
          <h2>Prescription Processing</h2>
          <div className="insights">
            {prescriptionStats.map((item) => (
              <div key={item.label} className="insight-row">
                <span className="insight-label">{item.label}</span>
                <span className="insight-value">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="reports__actions">
        <button className="btn btn--outline">Export to Excel</button>
        <button className="btn btn--outline">Export to PDF</button>
        <button className="btn btn--primary">Generate Report</button>
      </div>
    </div>
  )
}

export default Reports
