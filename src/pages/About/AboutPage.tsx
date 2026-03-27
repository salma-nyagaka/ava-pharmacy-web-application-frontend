import { Link } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
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

const reasons = [
  {
    title: 'Thoughtfully curated products',
    body: 'Beauty, wellness, and daily essentials selected to make healthy routines easier to maintain.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5 9 16.5 19 6.5" />
        <path d="M5 6.5h4" />
        <path d="M5 18.5h8" />
      </svg>
    ),
  },
  {
    title: 'Knowledgeable, friendly staff',
    body: 'Trusted advice and practical support for prescriptions, wellness shopping, and day-to-day care questions.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="7" r="4" />
        <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
      </svg>
    ),
  },
  {
    title: 'Safe, authentic brands',
    body: 'A stronger focus on trusted stock, reliable sourcing, and products customers can buy with confidence.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s7-3.5 7-9.5V5.8L12 3 5 5.8v5.7C5 17.5 12 21 12 21Z" />
        <path d="m9.4 12.3 1.8 1.8 3.6-4" />
      </svg>
    ),
  },
  {
    title: 'Customer-first experience',
    body: 'From browsing to follow-up support, the service is built to feel practical, responsive, and reassuring.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20.5c4.6-2.8 7-5.4 7-8.7A4.3 4.3 0 0 0 12 8.8a4.3 4.3 0 0 0-7 3c0 3.3 2.4 5.9 7 8.7Z" />
      </svg>
    ),
  },
]

const categoryGroups = [
  {
    title: 'Health & Wellness',
    points: [
      'Daily vitamins and immune support',
      'Natural supplements and herbal remedies',
      'Relaxation and stress-support products',
      'Women’s and men’s wellness essentials',
    ],
  },
  {
    title: 'Beauty & Skincare',
    points: [
      'Dermatologist-led skincare picks',
      'Organic and everyday beauty solutions',
      'Body care and personal hygiene staples',
      'Hair care for different textures and routines',
    ],
  },
  {
    title: 'Mother & Baby Care',
    points: [
      'Gentle baby skincare and bath products',
      'Maternity wellness support items',
      'Diapers, wipes, and feeding accessories',
    ],
  },
  {
    title: 'Self-Care & Lifestyle',
    points: [
      'Aromatherapy and essential oils',
      'Wellness teas and detox blends',
      'Fitness and body-toning accessories',
      'Sustainable personal care tools',
    ],
  },
]

const careJourneys = [
  {
    title: 'Doctor consultation',
    description: 'Start an online consultation and speak with a licensed doctor for quick assessment and treatment guidance.',
    link: '/doctor-consultation',
    cta: 'Open consultation',
  },
  {
    title: 'Pediatric care',
    description: 'Access child-focused consultations for growth checks, everyday symptoms, and family care support.',
    link: '/pediatric-consultation',
    cta: 'See pediatric care',
  },
  {
    title: 'Prescription upload',
    description: 'Send a prescription for pharmacist review, fulfillment, and progress tracking inside the app.',
    link: '/prescriptions',
    cta: 'Upload prescription',
  },
  {
    title: 'Lab tests',
    description: 'Browse diagnostic services, book tests, and manage requests from the same Ava experience.',
    link: '/lab-tests',
    cta: 'Browse lab tests',
  },
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

  const signalCards = [
    {
      label: 'Storefront',
      value: 'Karen / The Hub',
      detail: contact.supportAddress,
    },
    {
      label: 'Availability',
      value: contact.supportHours,
      detail: 'Open daily for support, product guidance, and walk-in questions.',
    },
    {
      label: 'Support',
      value: 'Phone, email & WhatsApp',
      detail: contact.supportPhone,
    },
    {
      label: 'Focus',
      value: 'Health, beauty & lifestyle',
      detail: 'Supplements, skincare, baby care, and self-care essentials.',
    },
  ]

  const contactCards = [
    {
      label: 'Office address',
      value: contact.supportAddress,
    },
    {
      label: 'Call us',
      value: contact.supportPhone,
      href: `tel:${formatPhoneHref(contact.supportPhone)}`,
    },
    {
      label: 'Email us',
      value: contact.supportEmail,
      href: `mailto:${contact.supportEmail}`,
    },
    {
      label: 'Office time',
      value: contact.supportHours,
    },
  ]

  return (
    <div className="about-page">
      <section className="about-page__hero">
        <div className="container">
          <div className="about-page__hero-grid">
            <div className="about-page__hero-card about-page__hero-card--copy">
              <span className="about-page__eyebrow">About Ava Pharmacy</span>
              <h1 className="about-page__hero-title">Care You Can Trust</h1>
              <p className="about-page__hero-lead">
                AVA Pharmacy is built around a simple idea: wellness should feel balanced, practical,
                and approachable every day.
              </p>
              <p className="about-page__hero-body">
                We bring together health, beauty, and peace of mind through trusted products,
                informed support, and a curated mix of everyday essentials. From skincare and
                supplements to baby care and lifestyle wellness, the goal is to help customers feel
                their best naturally, affordably, and with confidence.
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

            <div className="about-page__hero-card about-page__hero-card--media">
              <div className="about-page__hero-image-wrap">
                <ImageWithFallback
                  className="about-page__hero-image"
                  src={ABOUT_IMAGE_URL}
                  alt="Ava Pharmacy about section visual"
                />
              </div>

              <div className="about-page__media-facts">
                <div className="about-page__media-fact">
                  <span className="about-page__media-label">Visit us</span>
                  <strong className="about-page__media-value">Karen / The Hub</strong>
                  <p className="about-page__media-copy">{contact.supportAddress}</p>
                </div>
                <div className="about-page__media-fact">
                  <span className="about-page__media-label">Open daily</span>
                  <strong className="about-page__media-value">{contact.supportHours}</strong>
                  <p className="about-page__media-copy">In-store support for wellness shopping and care questions.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="about-page__signal-grid">
            {signalCards.map((card) => (
              <article key={card.label} className="about-page__signal-card">
                <span className="about-page__signal-label">{card.label}</span>
                <strong className="about-page__signal-value">{card.value}</strong>
                <p className="about-page__signal-detail">{card.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-page__section about-page__section--soft">
        <div className="container">
          <div className="about-page__section-head">
            <span className="about-page__section-kicker">Why choose us</span>
            <h2 className="about-page__section-title">A cleaner, more trusted wellness experience.</h2>
            <p className="about-page__section-subtitle">
              The live AVA Pharmacy site emphasizes careful curation, trusted brands, and friendly
              support. This page now carries those same priorities in a stronger product-style layout.
            </p>
          </div>

          <div className="about-page__reasons-grid">
            {reasons.map((reason) => (
              <article key={reason.title} className="about-page__reason-card">
                <div className="about-page__reason-icon">{reason.icon}</div>
                <h3 className="about-page__reason-title">{reason.title}</h3>
                <p className="about-page__reason-body">{reason.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-page__section">
        <div className="container">
          <div className="about-page__section-head">
            <span className="about-page__section-kicker">Product mix</span>
            <h2 className="about-page__section-title">Reliable &amp; high-quality essentials and indulgences.</h2>
            <p className="about-page__section-subtitle">
              The storefront combines everyday care items with wellness-led discovery across four core
              shelves.
            </p>
          </div>

          <div className="about-page__category-grid">
            {categoryGroups.map((group) => (
              <article key={group.title} className="about-page__category-card">
                <h3 className="about-page__category-title">{group.title}</h3>
                <ul className="about-page__category-list">
                  {group.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-page__section about-page__section--soft">
        <div className="container">
          <div className="about-page__section-head">
            <span className="about-page__section-kicker">Care journeys</span>
            <h2 className="about-page__section-title">The same Ava experience now extends into the app.</h2>
            <p className="about-page__section-subtitle">
              Alongside the store story, this frontend already includes consultations, prescriptions,
              and diagnostics. The About page now surfaces those journeys more clearly.
            </p>
          </div>

          <div className="about-page__journey-grid">
            {careJourneys.map((journey) => (
              <Link key={journey.title} to={journey.link} className="about-page__journey-card">
                <span className="about-page__journey-label">Service</span>
                <h3 className="about-page__journey-title">{journey.title}</h3>
                <p className="about-page__journey-description">{journey.description}</p>
                <span className="about-page__journey-cta">{journey.cta}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="about-page__section about-page__section--compact">
        <div className="container">
          <div className="about-page__contact-grid">
            <div className="about-page__contact-panel">
              <span className="about-page__section-kicker">Get in touch</span>
              <h2 className="about-page__contact-title">We ensure you will always get the best result.</h2>
              <p className="about-page__contact-subtitle">
                Have a question? AVA Pharmacy can be reached by phone, email, WhatsApp, or in person at The Hub, Karen.
              </p>

              <div className="about-page__contact-cards">
                {contactCards.map((card) => (
                  <article key={card.label} className="about-page__contact-card">
                    <span className="about-page__contact-label">{card.label}</span>
                    {card.href ? (
                      <a className="about-page__contact-value about-page__contact-value--link" href={card.href}>
                        {card.value}
                      </a>
                    ) : (
                      <strong className="about-page__contact-value">{card.value}</strong>
                    )}
                  </article>
                ))}
              </div>
            </div>

            <aside className="about-page__cta-panel">
              <div>
                <span className="about-page__cta-kicker">Need support now?</span>
                <h3 className="about-page__cta-title">Talk to the team or continue into a service flow.</h3>
                <p className="about-page__cta-body">
                  The page now matches the app’s cleaner dashboard language while still carrying the
                  live AVA Pharmacy story and store details.
                </p>
              </div>

              <div className="about-page__cta-map">
                <img src={mapIllustration} alt="Map showing Ava Pharmacy at The Hub Karen" />
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
            </aside>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AboutPage
