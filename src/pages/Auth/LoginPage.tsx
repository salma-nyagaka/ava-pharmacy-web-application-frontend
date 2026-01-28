import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import './AuthPage.css'

function LoginPage() {
  return (
    <div>
      <PageHeader
        title="Welcome back"
        subtitle="Sign in to track your orders, manage prescriptions, and access telemedicine services."
        badge="Account Access"
      />
      <section className="page">
        <div className="container">
          <div className="auth-layout">
            <div className="auth-info">
              <div className="card card--soft">
                <h2 className="card__title">What you can do with your account</h2>
                <p className="card__subtitle">All your pharmacy needs in one secure dashboard.</p>
                <ul className="auth-info__list">
                  <li>✅ Track orders and delivery status in real time.</li>
                  <li>✅ Upload and monitor prescription approvals.</li>
                  <li>✅ Manage consultations, lab results, and health records.</li>
                  <li>✅ Save delivery addresses and payment preferences.</li>
                </ul>
              </div>
              <div className="card">
                <h3 className="card__title">Need help signing in?</h3>
                <p className="card__subtitle">Our support team is available 24/7.</p>
                <Link to="/help" className="btn btn--secondary btn--sm">Visit Help Center</Link>
              </div>
            </div>

            <div className="form-card">
              <h2 className="card__title">Sign in</h2>
              <p className="card__subtitle">Use your email and password to continue.</p>
              <form className="auth-form">
                <div className="form-group">
                  <label htmlFor="login-email">Email address</label>
                  <input id="login-email" type="email" placeholder="you@example.com" required />
                </div>
                <div className="form-group">
                  <label htmlFor="login-password">Password</label>
                  <input id="login-password" type="password" placeholder="Enter your password" required />
                </div>
                <div className="auth-form__actions">
                  <button type="submit" className="btn btn--primary">Sign in</button>
                  <Link to="/account" className="btn btn--outline">Continue as guest</Link>
                </div>
                <div className="auth-divider">or</div>
                <button type="button" className="btn btn--secondary">Send magic link</button>
                <p className="auth-secondary">
                  Don&apos;t have an account? <Link to="/register">Create one</Link> in minutes.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LoginPage
