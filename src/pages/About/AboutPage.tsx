import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import './AboutPage.css'

const services = [
  {
    title: 'Doctor Consultation',
    description: 'Chat, call, or video with licensed doctors for fast diagnoses and e-prescriptions — available 7 days a week.',
    link: '/doctor-consultation',
    color: 'indigo',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z"/>
        <path d="M20 21a8 8 0 1 0-16 0"/>
        <path d="M16 11v4M14 13h4"/>
      </svg>
    ),
  },
  {
    title: 'Pediatric Care',
    description: 'Specialist pediatricians for infants, children, and teens — on demand, with growth checks and vaccination advice.',
    link: '/pediatric-consultation',
    color: 'emerald',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="6" r="3"/>
        <path d="M9 14c-3 0-5 1.5-5 3v1h16v-1c0-1.5-2-3-5-3"/>
        <path d="M8 10c0 0-1 3 4 3s4-3 4-3"/>
      </svg>
    ),
  },
  {
    title: 'Prescription Upload',
    description: 'Upload a prescription for pharmacist verification and same-day fulfillment with full tracking.',
    link: '/prescriptions',
    color: 'amber',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="9" y1="13" x2="15" y2="13"/>
        <line x1="9" y1="17" x2="13" y2="17"/>
      </svg>
    ),
  },
  {
    title: 'Lab Tests',
    description: 'Book 200+ diagnostic tests online with home sample collection and certified digital results in 24–48 hours.',
    link: '/laboratory',
    color: 'sky',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11M3 9h18M3 9l3 9h12l3-9"/>
        <circle cx="12" cy="16" r="1"/>
      </svg>
    ),
  },
]

const stats = [
  { value: '10,000+', label: 'Customers Served' },
  { value: '5,000+', label: 'Products Listed' },
  { value: '200+', label: 'Lab Tests Available' },
  { value: '24/7', label: 'Pharmacist Support' },
]

const pillars = [
  {
    title: 'Thoughtfully Curated',
    body: 'Every product on our shelves is hand-picked for quality, safety, and effectiveness — from skincare and supplements to baby care and lifestyle wellness.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  },
  {
    title: 'Safe & Authentic',
    body: 'We only stock verified, genuine products from trusted brands — so you can invest in your personal care with complete confidence.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    title: 'Customer-First',
    body: 'Our knowledgeable team delivers a customer-first experience in every interaction — from browsing to delivery and beyond.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
]

function AboutPage() {
  return (
    <div className="about">
      <PageHeader
        title="About Ava Pharmacy"
        subtitle="At AVA Pharmacy, we believe that true wellness is a balance of health, beauty, and peace of mind — empowering you to feel your best, naturally, affordably, and stylishly."
        badge="Company"
      />

      {/* Stats */}
      <section className="about__stats">
        <div className="container">
          <div className="about__stats-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="about__stat">
                <span className="about__stat-value">{stat.value}</span>
                <span className="about__stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission / Promise / Reach */}
      <section className="about__pillars">
        <div className="container">
          <div className="about__section-head">
            <h2 className="about__section-title">Why Choose AVA Pharmacy</h2>
            <p className="about__section-sub">We've created a curated space where you can explore high-quality products, receive trusted advice, and invest in your personal care with confidence.</p>
          </div>
          <div className="about__pillars-grid">
            {pillars.map((p) => (
              <div key={p.title} className="about__pillar-card">
                <div className="about__pillar-icon">{p.icon}</div>
                <h3 className="about__pillar-title">{p.title}</h3>
                <p className="about__pillar-body">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="about__services">
        <div className="container">
          <div className="about__section-head">
            <h2 className="about__section-title">Our Services</h2>
            <p className="about__section-sub">Everything you need for your health — prescriptions, consultations, and diagnostics in one place.</p>
          </div>
          <div className="about__services-grid">
            {services.map((svc) => (
              <Link key={svc.title} to={svc.link} className={`about__svc-card about__svc-card--${svc.color}`} onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
                <div className="about__svc-icon">{svc.icon}</div>
                <h3 className="about__svc-title">{svc.title}</h3>
                <p className="about__svc-body">{svc.description}</p>
                <span className="about__svc-cta">Learn more →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="about__contact-cta">
        <div className="container">
          <div className="about__contact-cta-inner">
            <div className="about__contact-cta-text">
              <h2 className="about__contact-cta-title">Have a question or need support?</h2>
              <p className="about__contact-cta-sub">Our pharmacists and support team are ready to help — reach out anytime.</p>
            </div>
            <div className="about__contact-cta-actions">
              <Link to="/contact" className="btn btn--primary btn--lg">Contact Us</Link>
              <Link to="/help" className="btn btn--outline btn--lg">View FAQ</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AboutPage
