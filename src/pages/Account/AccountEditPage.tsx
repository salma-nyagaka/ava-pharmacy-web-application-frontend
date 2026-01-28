import PageHeader from '../../components/PageHeader/PageHeader'

function AccountEditPage() {
  return (
    <div>
      <PageHeader
        title="Edit profile"
        subtitle="Update your personal information and contact details."
        badge="My Account"
      />
      <section className="page">
        <div className="container">
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
