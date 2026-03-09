import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { loadDoctorProfiles } from '../../data/telemedicine'
import { loadAdminUsers } from '../Admin/adminUsers'
import { loadLabPartners } from '../../data/labPartners'
import favicon from '../../assets/images/logos/favicon.png'
import './AuthPage.css'

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') ?? ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.')
      return
    }

    const profiles = loadDoctorProfiles()
    const match = profiles.find((p) => p.email.toLowerCase() === email.trim().toLowerCase())

    if (match && match.status === 'Pending') {
      setError('Your application is still under review. You will be notified once approved.')
      return
    }

    if (match && match.status === 'Suspended') {
      setError('Your account has been suspended. Please contact support.')
      return
    }

    const emailLower = email.trim().toLowerCase()
    const adminUsers = loadAdminUsers()
    const adminMatch = adminUsers.find((user) => user.email.toLowerCase() === emailLower)
    if (adminMatch) {
      if (adminMatch.status !== 'active') {
        setError('Your account has been suspended. Please contact support.')
        return
      }
      if (adminMatch.role === 'admin') {
        login({ name: adminMatch.name, email: adminMatch.email, role: 'admin' })
        navigate('/admin')
        return
      }
      if (adminMatch.role === 'pharmacist') {
        login({ name: adminMatch.name, email: adminMatch.email, role: 'pharmacist' })
        navigate('/pharmacist/dashboard')
        return
      }
      if (adminMatch.role === 'lab_technician') {
        login({ name: adminMatch.name, email: adminMatch.email, role: 'lab_technician' })
        navigate('/labtech/dashboard')
        return
      }
    }

    const partners = loadLabPartners()
    const labMatch = partners
      .flatMap((partner) => partner.techs.map((tech) => ({ partner, tech })))
      .find(({ tech }) => tech.email.toLowerCase() === emailLower)

    if (labMatch) {
      const { partner, tech } = labMatch
      if (partner.status !== 'Verified') {
        setError('Your lab partner is not verified yet. Please contact the lab admin.')
        return
      }
      if (tech.status !== 'Active') {
        setError('Your lab technician profile is inactive. Please contact support.')
        return
      }
      login({
        name: tech.name,
        email: email.trim(),
        role: 'lab_technician',
        labPartnerId: partner.id,
        labPartnerName: partner.name,
        labTechId: tech.id,
      })
      navigate('/labtech/dashboard')
      return
    }

    if (emailLower === 'lab@ava.com') {
      login({ name: 'Lab Technician', email: email.trim(), role: 'lab_technician' })
      navigate('/labtech/dashboard')
      return
    }

    const role = match
      ? match.type === 'Doctor' ? 'doctor' : 'pediatrician'
      : 'patient'

    const name = match ? match.name : email.split('@')[0]
    login({ name, email: email.trim(), role })

    if (redirect) {
      navigate(redirect)
    } else if (role === 'doctor') {
      navigate('/doctor/dashboard')
    } else if (role === 'pediatrician') {
      navigate('/pediatrician/dashboard')
    } else {
      navigate('/')
    }
  }

  return (
    <div className="login-page">
      {/* Left brand panel */}
      <div className="login-brand">
        <div className="login-brand__inner">
          <div className="login-brand__logo-wrap">
            <img src={favicon} alt="AVA Health" className="login-brand__logo" />
            <span className="login-brand__name">AVA Health</span>
          </div>

          <div className="login-brand__body">
            <h1 className="login-brand__headline">
              Your health,<br />delivered.
            </h1>
            <p className="login-brand__sub">
              Kenya's trusted pharmacy and telemedicine platform — prescriptions, consultations, and lab tests in one place.
            </p>

            <ul className="login-brand__features">
              {[
                'Track orders and deliveries in real time',
                'Upload and manage prescription approvals',
                'Book doctor & pediatric consultations',
                'Access lab results and health records',
              ].map((feat) => (
                <li key={feat}>
                  <span className="login-brand__feat-icon">
                    <svg viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="8" fill="rgba(255,255,255,0.18)"/>
                      <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  {feat}
                </li>
              ))}
            </ul>
          </div>

          <div className="login-brand__stats">
            <div className="login-brand__stat">
              <strong>12k+</strong>
              <span>Patients</span>
            </div>
            <div className="login-brand__stat-divider" />
            <div className="login-brand__stat">
              <strong>200+</strong>
              <span>Lab tests</span>
            </div>
            <div className="login-brand__stat-divider" />
            <div className="login-brand__stat">
              <strong>24/7</strong>
              <span>Support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-form-panel">
        <div className="login-form-inner">
          <div className="login-form-header">
            <h2 className="login-form-header__title">Welcome back</h2>
            <p className="login-form-header__sub">Sign in to your AVA Health account</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label htmlFor="login-email">Email address</label>
              <div className="login-field__input-wrap">
                <span className="login-field__icon">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M2.5 5.5h15v10a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-10z"/>
                    <path d="M2.5 5.5l7.5 6 7.5-6"/>
                  </svg>
                </span>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  autoComplete="email"
                  className={error ? 'login-field__input--error' : ''}
                />
              </div>
            </div>

            <div className="login-field">
              <div className="login-field__label-row">
                <label htmlFor="login-password">Password</label>
                <Link to="/help" className="login-field__forgot">Forgot password?</Link>
              </div>
              <div className="login-field__input-wrap">
                <span className="login-field__icon">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="3.5" y="9" width="13" height="9" rx="1.5"/>
                    <path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  autoComplete="current-password"
                  className={error ? 'login-field__input--error' : ''}
                />
                <button
                  type="button"
                  className="login-field__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/>
                      <circle cx="10" cy="10" r="2.5"/>
                      <path d="M3 3l14 14" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/>
                      <circle cx="10" cy="10" r="2.5"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error">
                <svg viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 5zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className="login-submit">
              Sign in
            </button>

            <div className="login-divider"><span>or</span></div>

            <Link to="/account" className="login-guest">
              Continue as guest
            </Link>
          </form>

          <p className="login-register">
            Don&apos;t have an account?{' '}
            <Link to={`/register${redirect !== '/account' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}>
              Create one free
            </Link>
          </p>

          <p className="login-professional">
            Are you a medical professional?{' '}
            <Link to="/professional/register">Join AVA Health</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
