import PageHeader from '../../components/PageHeader/PageHeader'

function CookiesPage() {
  return (
    <div>
      <PageHeader
        title="Cookie policy"
        subtitle="We use cookies to personalize your experience and keep your account secure."
        badge="Legal"
      />
      <section className="page">
        <div className="container">
          <div className="card card--soft">
            <h2 className="card__title">Cookie usage</h2>
            <ul className="card__list">
              <li>🍪 Essential cookies keep you signed in.</li>
              <li>📊 Analytics cookies help improve performance.</li>
              <li>🔐 Security cookies protect transactions.</li>
              <li>⚙️ You can manage preferences in your browser.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

export default CookiesPage
