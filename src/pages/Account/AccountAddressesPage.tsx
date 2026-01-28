import PageHeader from '../../components/PageHeader/PageHeader'

function AccountAddressesPage() {
  const addresses = [
    { name: 'Home', detail: 'Westlands, Nairobi' },
    { name: 'Office', detail: 'Upper Hill, Nairobi' },
  ]

  return (
    <div>
      <PageHeader
        title="Saved addresses"
        subtitle="Manage delivery addresses for faster checkout."
        badge="My Account"
      />
      <section className="page">
        <div className="container">
          <div className="page-grid page-grid--2">
            {addresses.map((address) => (
              <div key={address.name} className="card">
                <h3 className="card__title">{address.name}</h3>
                <p className="card__meta">{address.detail}</p>
                <div style={{ marginTop: '1rem' }}>
                  <button className="btn btn--outline btn--sm">Edit</button>
                </div>
              </div>
            ))}
            <div className="card card--soft">
              <h3 className="card__title">Add new address</h3>
              <button className="btn btn--primary btn--sm">Add address</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AccountAddressesPage
