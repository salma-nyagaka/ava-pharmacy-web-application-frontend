import PageHeader from '../../components/PageHeader/PageHeader'

function AccountPaymentPage() {
  return (
    <div>
      <PageHeader
        title="Payment methods"
        subtitle="Securely manage your saved cards and mobile money preferences."
        badge="My Account"
      />
      <section className="page">
        <div className="container">
          <div className="page-grid page-grid--2">
            <div className="card">
              <h3 className="card__title">Visa •••• 4242</h3>
              <p className="card__meta">Expires 08/27</p>
              <div style={{ marginTop: '1rem' }}>
                <button className="btn btn--outline btn--sm">Remove</button>
              </div>
            </div>
            <div className="card card--soft">
              <h3 className="card__title">Add payment method</h3>
              <button className="btn btn--primary btn--sm">Add new</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AccountPaymentPage
