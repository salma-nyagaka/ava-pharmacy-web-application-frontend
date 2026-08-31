import PageHeader from '../../components/PageHeader/PageHeader'
import '../../styles/pages/StoreLocatorPage.css'

function StoreLocatorPage() {
  const branches = [
    { name: 'Karen Hub', address: 'The Hub Karen, Nairobi', hours: '9:00 AM - 8:00 PM', phone: '0715 737 330 / 0733 737 330 / 0724 282 282' },
    { name: 'GTC Westlands', address: 'GTC, Westlands, Nairobi', hours: '8:00 AM - 10:00 PM', phone: '0713 444 999 / 0101 444 999' },
    { name: 'Nyali Ava Promenade Mall', address: 'Promenade Mall, Nyali, Mombasa', hours: '8:00 AM - 10:00 PM', phone: '0723 888 835' },
  ]

  return (
    <div>
      <PageHeader
        title="Find a store"
        subtitle="Locate the nearest  branch for pickup or in-person consultations."
        badge="Store Locator"
      />
      <section className="page">
        <div className="container">
          <div className="split-layout">
            <div>
              <div className="form-card" style={{ marginBottom: '1.5rem' }}>
                <h2 className="card__title">Search by location</h2>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">City</label>
                    <input id="city" type="text" placeholder="Nairobi" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="area">Area</label>
                    <input id="area" type="text" placeholder="Westlands" />
                  </div>
                </div>
                <button className="btn btn--primary btn--sm">Find stores</button>
              </div>
              <div className="map-placeholder">Interactive map coming soon</div>
            </div>
            <div className="card">
              <h3 className="card__title">Nearby branches</h3>
              <div className="card__list">
                {branches.map((branch) => (
                  <div key={branch.name}>
                    <strong>{branch.name}</strong>
                    <p className="card__meta">{branch.address}</p>
                    <p className="card__meta">Hours: {branch.hours}</p>
                    <p className="card__meta">Phone: {branch.phone}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default StoreLocatorPage
