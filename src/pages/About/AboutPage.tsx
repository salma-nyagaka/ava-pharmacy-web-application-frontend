import { Link } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import SupportShortcuts from '../../components/SupportShortcuts/SupportShortcuts'
import mapIllustration from '../../assets/images/maps/map-the-hub-karen.svg'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import {
  DEFAULT_SITE_SETTINGS,
  formatPhoneHref,
  formatWhatsAppHref,
} from '../../services/siteSettingsService'
import '../../styles/pages/AboutPage.css'

const LIVE_SITE_CONTACT = {
  supportEmail: 'info@avapharmacy.co.ke',
  supportPhone: '+254 (0) 715 737 330',
  whatsappPhone: '+254 (0) 715 737 330',
  supportAddress: 'Karen/The hub, Karen, Nairobi, Kenya',
  supportHours: 'Mon-Sun 09am-5pm',
}

const ABOUT_IMAGE_URL = 'https://avapharmacy.co.ke/img/about-4.jpg'

const heroPills = [
  'Care you can trust',
  'Authentic brands',
  'Customer-first support',
]

const promisePoints = [
  'Curated wellness picks',
  'Friendly expert guidance',
  'Trusted authentic brands',
  'A smoother customer experience',
]

const serviceLines = [
  {
    title: 'Health & Wellness',
    summary: 'Daily essentials for immunity and wellness.',
    points: ['Daily vitamins', 'Herbal wellness', 'Stress support'],
  },
  {
    title: 'Beauty & Skincare',
    summary: 'Skincare and beauty care you can trust.',
    points: ['Clinical skincare', 'Beauty essentials', 'Body and hair care'],
  },
  {
    title: 'Mother & Baby Care',
    summary: 'Gentle products for growing families.',
    points: ['Baby bath and skincare', 'Maternity support', 'Diapers and feeding'],
  },
  {
    title: 'Self-Care & Lifestyle',
    summary: 'Lifestyle products that support self-care.',
    points: ['Aromatherapy', 'Wellness teas', 'Fitness accessories'],
  },
]

const actionLinks = [
  { label: 'Browse products', to: '/products' },
  { label: 'Upload prescription', to: '/prescriptions' },
  { label: 'Explore health services', to: '/health-services' },
  { label: 'Contact us', to: '/contact' },
]

function withLiveFallback(value: string, defaultValue: string, liveValue: string) {
  const normalized = value.trim()
  if (!normalized || normalized === defaultValue) return liveValue
  return normalized
}

function AboutPage() {
  const { settings } = useSiteSettings()

  const contact = {
    supportEmail: withLiveFallback(
      settings.supportEmail,
      DEFAULT_SITE_SETTINGS.supportEmail,
      LIVE_SITE_CONTACT.supportEmail,
    ),
    supportPhone: withLiveFallback(
      settings.supportPhone,
      DEFAULT_SITE_SETTINGS.supportPhone,
      LIVE_SITE_CONTACT.supportPhone,
    ),
    whatsappPhone: withLiveFallback(
      settings.whatsappPhone,
      DEFAULT_SITE_SETTINGS.whatsappPhone,
      LIVE_SITE_CONTACT.whatsappPhone,
    ),
    supportAddress: withLiveFallback(
      settings.supportAddress,
      DEFAULT_SITE_SETTINGS.supportAddress,
      LIVE_SITE_CONTACT.supportAddress,
    ),
    supportHours: withLiveFallback(
      settings.supportHours,
      DEFAULT_SITE_SETTINGS.supportHours,
      LIVE_SITE_CONTACT.supportHours,
    ),
  }

  return (
    <div className="about-page">
      <section className="about-page__hero">
        <div className="container">
          <div className="about-page__hero-grid">
            <div className="about-page__hero-copy">
              <span className="about-page__eyebrow">About Ava Pharmacy</span>
              <h1 className="about-page__hero-title">Care You Can Trust</h1>
              <p className="about-page__hero-lead">
                Wellness should feel simple, trusted, and easy to choose.
              </p>
              <p className="about-page__hero-body">
                AVA Pharmacy brings health, beauty, and everyday care into one curated experience.
              </p>

              <div className="about-page__hero-actions">
                <Link to="/products" className="btn btn--primary btn--lg">Browse products</Link>
                <Link to="/health-services" className="btn btn--outline btn--lg">Explore services</Link>
              </div>

              <div className="about-page__hero-pills" aria-label="Ava Pharmacy strengths">
                {heroPills.map((item) => (
                  <span key={item} className="about-page__hero-pill">{item}</span>
                ))}
              </div>
            </div>

            <div className="about-page__hero-media">
              <div className="about-page__hero-image-wrap">
                <ImageWithFallback
                  className="about-page__hero-image"
                  src={ABOUT_IMAGE_URL}
                  alt="Ava Pharmacy about section visual"
                />
              </div>

              <div className="about-page__hero-note">
                <p>
                  “True wellness is a balance of health, beauty, and peace of mind.”
                </p>
              </div>

              <div className="about-page__hero-meta">
                <div>
                  <span className="about-page__meta-label">Visit us</span>
                  <strong className="about-page__meta-value">Karen / The Hub</strong>
                </div>
                <div>
                  <span className="about-page__meta-label">Open daily</span>
                  <strong className="about-page__meta-value">{contact.supportHours}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-page__section about-page__section--story">
        <div className="container">
          <div className="about-page__story-grid">
            <div className="about-page__story-copy">
              <span className="about-page__section-kicker">Who we are</span>
              <h2 className="about-page__section-title">A curated pharmacy experience built for everyday wellness.</h2>
              <p className="about-page__section-subtitle">
                A modern destination for wellness products, skincare, and everyday health essentials.
              </p>
            </div>

            <div className="about-page__promise">
              <h3 className="about-page__promise-title">Why customers choose AVA</h3>
              <ul className="about-page__promise-list">
                {promisePoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="about-page__section about-page__section--services">
        <div className="container">
          <div className="about-page__section-head">
            <span className="about-page__section-kicker">What we offer</span>
            <h2 className="about-page__section-title">Reliable essentials, indulgent care, and wellness support.</h2>
            <p className="about-page__section-subtitle">
              Four simple care lanes that make the range easy to scan at a glance.
            </p>
          </div>

          <div className="about-page__service-story">
            {serviceLines.map((service, index) => (
              <article key={service.title} className="about-page__service-row">
                <div className="about-page__service-count">{String(index + 1).padStart(2, '0')}</div>
                <div className="about-page__service-copy">
                  <h3 className="about-page__service-title">{service.title}</h3>
                  <p className="about-page__service-summary">{service.summary}</p>
                </div>
                <ul className="about-page__service-points">
                  {service.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="about-page__actions">
            {actionLinks.map((action) => (
              <Link key={action.label} to={action.to} className="about-page__text-link">
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="about-page__section about-page__section--contact">
        <div className="container">
          <div className="about-page__contact-panel">
            <div className="about-page__contact-copy">
              <span className="about-page__cta-kicker">Visit or contact us</span>
              <h2 className="about-page__contact-title">Find AVA at The Hub, Karen.</h2>
              <p className="about-page__contact-subtitle">
                Reach the team by phone, email, or WhatsApp for quick support.
              </p>

              <div className="about-page__contact-list">
                <div className="about-page__contact-item">
                  <span className="about-page__contact-label">Address</span>
                  <strong className="about-page__contact-value">{contact.supportAddress}</strong>
                </div>
                <div className="about-page__contact-item">
                  <span className="about-page__contact-label">Hours</span>
                  <strong className="about-page__contact-value">{contact.supportHours}</strong>
                </div>
                <div className="about-page__contact-item">
                  <span className="about-page__contact-label">Phone</span>
                  <a className="about-page__contact-value about-page__contact-value--link" href={`tel:${formatPhoneHref(contact.supportPhone)}`}>
                    {contact.supportPhone}
                  </a>
                </div>
                <div className="about-page__contact-item">
                  <span className="about-page__contact-label">Email</span>
                  <a className="about-page__contact-value about-page__contact-value--link" href={`mailto:${contact.supportEmail}`}>
                    {contact.supportEmail}
                  </a>
                </div>
              </div>

              <div className="about-page__cta-actions">
                <Link to="/contact" className="btn btn--primary btn--lg">Contact us</Link>
                <a
                  className="btn btn--outline btn--lg"
                  href={`https://wa.me/${formatWhatsAppHref(contact.whatsappPhone)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Start WhatsApp chat
                </a>
              </div>
            </div>

            <aside className="about-page__contact-aside">
              <div className="about-page__cta-map">
                <img src={mapIllustration} alt="Map showing Ava Pharmacy at The Hub Karen" />
              </div>
            </aside>
          </div>
        </div>
      </section>

      <SupportShortcuts />
    </div>
  )
}

export default AboutPage
