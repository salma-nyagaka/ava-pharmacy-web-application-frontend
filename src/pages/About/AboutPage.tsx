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

const reasons = [
  'Thoughtfully curated beauty and wellness products',
  'Knowledgeable and friendly staff',
  'Safe, authentic, and trusted brands',
  'A customer-first experience in every visit',
]

const serviceGroups = [
  {
    title: 'Health & Wellness',
    items: [
      'Immune boosters and daily vitamins',
      'Natural supplements and herbal remedies',
      'Stress relief and relaxation products',
      'Women’s and men’s wellness essentials',
    ],
  },
  {
    title: 'Beauty & Skincare',
    items: [
      'Dermatologist-recommended skincare',
      'Organic beauty solutions',
      'Body care and personal hygiene',
      'Hair care for all types and textures',
    ],
  },
  {
    title: 'Mother & Baby Care',
    items: [
      'Safe baby skincare and bath products',
      'Maternity wellness items',
      'Diapers, wipes, and baby feeding accessories',
    ],
  },
  {
    title: 'Self-Care & Lifestyle',
    items: [
      'Aromatherapy and essential oils',
      'Wellness teas and detox blends',
      'Fitness and body-toning accessories',
      'Sustainable personal care tools',
    ],
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

  return (
    <div className="about-page">
      <section className="about-page__hero">
        <div className="container about-page__hero-grid">
          <div className="about-page__hero-copy">
            <span className="about-page__eyebrow">About Ava Pharmacy</span>
            <h1>Care You Can Trust</h1>
            <p className="about-page__lead">
              AVA Pharmacy is a curated wellness destination built around health, beauty, and peace of mind.
            </p>
            <p>
              We make it easier to shop trusted everyday essentials, skincare, supplements, baby care, and lifestyle
              wellness products in one place.
            </p>
            <div className="about-page__actions">
              <Link to="/products" className="btn btn--primary btn--lg">Browse products</Link>
              <Link to="/contact" className="btn btn--outline btn--lg">Contact us</Link>
            </div>
          </div>

          <div className="about-page__hero-media">
            <ImageWithFallback
              className="about-page__hero-image"
              src={ABOUT_IMAGE_URL}
              alt="Ava Pharmacy about section visual"
            />
          </div>
        </div>
      </section>

      <section className="about-page__section">
        <div className="container about-page__split">
          <div className="about-page__content">
            <span className="about-page__section-kicker">Who we are</span>
            <h2>A simple pharmacy experience centered on everyday wellness.</h2>
            <p>
              At AVA Pharmacy, we believe wellness should feel clear, practical, and reassuring. Our focus is to offer
              reliable products, trusted guidance, and a smoother shopping experience for daily care.
            </p>
            <p>
              From skincare and supplements to mother and baby essentials, we help customers choose products they can
              feel confident about.
            </p>
          </div>

          <div className="about-page__content">
            <span className="about-page__section-kicker">Why choose AVA</span>
            <h2>Trusted products, real support, and a customer-first approach.</h2>
            <ul className="about-page__list">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="about-page__section about-page__section--muted">
        <div className="container">
          <div className="about-page__section-head">
            <span className="about-page__section-kicker">What we offer</span>
            <h2>Reliable essentials and indulgent care in one place.</h2>
            <p>
              The product mix follows the same simple structure highlighted on the live AVA site, without the extra
              card-heavy presentation.
            </p>
          </div>

          <div className="about-page__services">
            {serviceGroups.map((group) => (
              <div key={group.title} className="about-page__service-group">
                <h3>{group.title}</h3>
                <ul className="about-page__list">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-page__section">
        <div className="container about-page__contact-grid">
          <div className="about-page__content">
            <span className="about-page__section-kicker">Visit or contact us</span>
            <h2>Find Ava Pharmacy at The Hub, Karen.</h2>
            <p>
              Have a question? Reach the team by phone, email, or WhatsApp for quick support during business hours.
            </p>

            <dl className="about-page__contact-list">
              <div>
                <dt>Address</dt>
                <dd>{contact.supportAddress}</dd>
              </div>
              <div>
                <dt>Office time</dt>
                <dd>{contact.supportHours}</dd>
              </div>
              <div>
                <dt>Call us</dt>
                <dd>
                  <a href={`tel:${formatPhoneHref(contact.supportPhone)}`}>{contact.supportPhone}</a>
                </dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a>
                </dd>
              </div>
            </dl>

            <div className="about-page__actions">
              <Link to="/contact" className="btn btn--primary btn--lg">Contact us</Link>
              <a
                className="btn btn--outline btn--lg"
                href={`https://wa.me/${formatWhatsAppHref(contact.whatsappPhone)}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            </div>
          </div>

          <div className="about-page__map">
            <img src={mapIllustration} alt="Map showing Ava Pharmacy at The Hub Karen" />
          </div>
        </div>
      </section>
    </div>
  )
}

export default AboutPage
