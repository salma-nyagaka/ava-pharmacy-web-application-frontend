import './HomePage.css'

function HomePage() {
  const environment = import.meta.env.VITE_APP_ENV || 'development'

  return (
    <div className="home">
      <section className="home__hero">
        <h1 className="home__title">Welcome to Ava Pharmacy</h1>
        <p className="home__subtitle">
          Your trusted online pharmacy for all your healthcare needs
        </p>
        <span className="home__env-badge">{environment}</span>
      </section>
    </div>
  )
}

export default HomePage
