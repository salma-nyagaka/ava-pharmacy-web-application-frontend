import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/PageHeader/PageHeader'
import './AuthPage.css'

function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/account'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = `${firstName} ${lastName}`.trim() || email.split('@')[0]
    login({ name, email })
    navigate(redirect)
  }

  return (
    <div>
      <PageHeader
        title="Create your account"
        subtitle="Join Ava Pharmacy to shop, book consultations, and manage prescriptions securely."
        badge="New Account"
      />
      <section className="page">
        <div className="container">
          <div className="auth-layout">
            <div className="auth-info">
              <div className="card card--soft">
                <h2 className="card__title">Why register?</h2>
                <p className="card__subtitle">Get full access to our digital pharmacy services.</p>
                <ul className="auth-info__list">
                  <li>✅ Prescription history saved for 7+ years.</li>
                  <li>✅ Faster checkout with stored delivery details.</li>
                  <li>✅ Access doctors, pediatricians, and lab services.</li>
                  <li>✅ Personalized wellness tips and offers.</li>
                </ul>
              </div>
              <div className="card">
                <h3 className="card__title">Already registered?</h3>
                <p className="card__subtitle">Sign in to continue where you left off.</p>
                <Link to={`/login${redirect !== '/account' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="btn btn--secondary btn--sm">Go to Sign in</Link>
              </div>
            </div>

            <div className="form-card">
              <h2 className="card__title">Create account</h2>
              <p className="card__subtitle">Tell us a little about you to get started.</p>
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="first-name">First name</label>
                    <input
                      id="first-name"
                      type="text"
                      placeholder="Sarah"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="last-name">Last name</label>
                    <input
                      id="last-name"
                      type="text"
                      placeholder="Mwangi"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="register-email">Email address</label>
                  <input
                    id="register-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="register-phone">Phone number</label>
                  <input id="register-phone" type="tel" placeholder="+254 700 000 000" required />
                </div>
                <div className="form-group">
                  <label htmlFor="register-password">Password</label>
                  <input id="register-password" type="password" placeholder="Create a secure password" required />
                </div>
                <div className="form-group">
                  <label htmlFor="register-role">Primary use</label>
                  <select id="register-role" required>
                    <option value="">Select a reason</option>
                    <option value="customer">Customer</option>
                    <option value="doctor">Doctor</option>
                    <option value="pediatrician">Pediatrician</option>
                    <option value="pharmacist">Pharmacist</option>
                    <option value="lab">Lab Technician</option>
                  </select>
                </div>
                <button type="submit" className="btn btn--primary">Create account</button>
                <p className="auth-secondary">
                  By creating an account you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default RegisterPage
