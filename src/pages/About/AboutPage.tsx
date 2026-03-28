import { Link } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import SupportShortcuts from '../../components/SupportShortcuts/SupportShortcuts'
import '../../styles/pages/AboutPage.css'

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

function AboutPage() {
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

      <section className="about-page__section about-page__section--rose">
        <div className="container">
          <div className="about-page__content about-page__content--centered">
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
        </div>
      </section>

      <section className="about-page__section about-page__section--slate">
        <div className="container">
          <div className="about-page__reasons-wrap">
            <span className="about-page__section-kicker">Why choose AVA</span>
            <h2>Trusted products, real support, and a customer-first approach.</h2>
            <div className="about-page__reasons-grid">
              {reasons.map((reason) => (
                <article key={reason} className="about-page__reason-card">
                  <p>{reason}</p>
                </article>
              ))}
            </div>
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
                <div className="about-page__service-group-head">
                  <h3>{group.title}</h3>
                </div>
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

      <SupportShortcuts />
    </div>
  )
}

export default AboutPage
