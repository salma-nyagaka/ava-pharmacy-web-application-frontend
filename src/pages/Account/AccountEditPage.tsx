import { Link } from 'react-router-dom'

function AccountEditPage() {
  return (
    <div>
      <section className="page">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', margin: '0 0 0.25rem' }}>My Account</p>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Edit Profile</h1>
            </div>
            <Link to="/account" className="btn btn--outline btn--sm">← Back to Account</Link>
          </div>
          <div className="form-card" style={{ maxWidth: '640px' }}>
            <form>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-first">First name</label>
                  <input id="edit-first" type="text" defaultValue="John" />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-last">Last name</label>
                  <input id="edit-last" type="text" defaultValue="Doe" />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="edit-email">Email</label>
                <input id="edit-email" type="email" defaultValue="john.doe@example.com" />
              </div>
              <div className="form-group">
                <label htmlFor="edit-phone">Phone</label>
                <input id="edit-phone" type="tel" defaultValue="+254 700 000 000" />
              </div>
              <button className="btn btn--primary">Save changes</button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AccountEditPage
