import { Link } from 'react-router-dom'
import '../../styles/pages/HealthServicesPage.css'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { formatWhatsAppHref } from '../../services/siteSettingsService'

type Service = {
  key: string
  category: string
  title: string
  hook: string
  turnaround: string
  price: string
  features: string[]
  path: string
  cta: string
  badge?: string
  icon: React.ReactNode
}

const services: Service[] = [
  {
    key: 'doctor',
    category: 'Consultation',
    title: 'Doctor Consultation',
    hook: 'Talk to a licensed GP or specialist from home, in minutes.',
    turnaround: 'Same-day',
    price: 'From KSh 500',
    features: ['Same-day appointments', 'Digital prescriptions issued', 'Secure chat & video'],
    path: '/doctor-consultation',
    cta: 'Book a consultation',
    badge: 'Popular',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
  },
  {
    key: 'prescription',
    category: 'Pharmacy',
    title: 'Prescription Review',
    hook: 'Upload an Rx for fast review by a licensed pharmacist.',
    turnaround: 'Reviewed in minutes',
    price: 'Free review',
    features: ['Licensed pharmacist check', 'Delivery or pickup'],
    path: '/prescriptions',
    cta: 'Upload prescription',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    key: 'pediatric',
    category: 'Pediatrics',
    title: 'Pediatric Care',
    hook: 'Child health guidance for infants, toddlers and teens.',
    turnaround: 'Same-day',
    price: 'From KSh 600',
    features: ['Ages 0–18 covered', 'Guardian consent captured'],
    path: '/pediatric-consultation',
    cta: 'Book for your child',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    key: 'lab',
    category: 'Diagnostics',
    title: 'Lab Tests',
    hook: 'Book diagnostics and get certified results delivered online.',
    turnaround: 'Results in 24h',
    price: 'From KSh 800',
    features: ['Partner labs nationwide', 'Secure result delivery'],
    path: '/lab-tests',
    cta: 'Book a lab test',
    badge: 'Same-day',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path d="M14.5 2v14.5a4.5 4.5 0 0 1-9 0V2"/>
        <line x1="6" y1="2" x2="14.5" y2="2"/>
        <line x1="6" y1="9" x2="14.5" y2="9"/>
      </svg>
    ),
  },
]

const steps = [
  { n: '01', title: 'Choose a service', outcome: 'Pick consultation, lab test or prescription upload.' },
  { n: '02', title: 'Share your details', outcome: 'Book a slot, pick a lab or upload your Rx.' },
  { n: '03', title: 'Clinician reviews', outcome: 'A licensed doctor, lab or pharmacist responds.' },
  { n: '04', title: 'Get your outcome', outcome: 'Diagnosis, certified results or approved medication.' },
]

const faqs = [
  {
    q: 'How much do consultations and lab tests cost?',
    a: 'Doctor consultations start from KSh 500 and pediatric visits from KSh 600. Lab test prices vary by panel, so browse the live catalogue for exact pricing, with most results returned within 24 hours.',
  },
  {
    q: 'Do you accept insurance or NHIF?',
    a: 'We accept selected insurers and NHIF for qualifying services. Confirm cover for your specific plan at checkout or chat with us on WhatsApp before booking.',
  },
  {
    q: 'How long is a digital prescription valid?',
    a: 'Prescriptions issued by our clinicians are valid for the period stated by the prescriber, in line with Kenyan pharmacy regulations. Uploaded prescriptions are reviewed by a licensed pharmacist before fulfilment.',
  },
  {
    q: 'Which areas do you deliver to?',
    a: 'Medication delivery is available across Nairobi and major towns in Kenya, with same-day delivery in select areas. Lab sample collection is available in partnered locations nationwide.',
  },
  {
    q: 'Can I book care for my child?',
    a: 'Yes. Pediatric services cover ages 0–18. Guardian consent is captured at booking so a parent or legal guardian can authorise and manage the child’s consultation.',
  },
]

const whatsappHref = (phone: string) => `https://wa.me/${formatWhatsAppHref(phone)}`

function HealthServicesPage() {
  const { settings } = useSiteSettings()

  return (
    <div className="hs-page">
      {/* ── Services ─────────────────────────────────────── */}
      <section className="hs-services" id="hs-services" aria-labelledby="hs-services-title">
        <div className="container">
          <div className="hs-section-head">
            <span className="hs-section-eyebrow">What we offer</span>
            <h2 id="hs-services-title" className="hs-section-title">Our services</h2>
            <p className="hs-section-sub">Four ways to manage your health, reviewed by licensed professionals.</p>
          </div>

          {/* Services */}
          <ul className="hs-services__grid">
            {services.map((service) => (
              <li key={service.key}>
                <Link
                  to={service.path}
                  className="hs-service-card"
                  aria-label={`${service.cta}: ${service.title}`}
                >
                  <span className="hs-service-card__tag">
                    {service.badge && <span className="hs-service-card__badge">{service.badge}</span>}
                    <span className="hs-service-card__category">{service.category}</span>
                  </span>
                  <div className="hs-service-card__main">
                    <span className="hs-service-card__icon">{service.icon}</span>
                    <div className="hs-service-card__body">
                      <h3 className="hs-service-card__title">{service.title}</h3>
                      <p className="hs-service-card__hook">{service.hook}</p>
                      <ul className="hs-service-card__chips">
                        {service.features.map((feature) => (
                          <li key={feature} className="hs-service-card__chip">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="hs-service-card__footer">
                    <span className="hs-service-card__meta">
                      <span className="hs-service-card__turnaround">{service.turnaround}</span>
                      <span className="hs-service-card__price">{service.price}</span>
                    </span>
                    <span className="hs-service-card__link">
                      {service.cta}
                      <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── How it works (outcome-mapped) ────────────────── */}
      <section className="hs-how" aria-labelledby="hs-how-title">
        <div className="container">
          <div className="hs-section-head">
            <span className="hs-section-eyebrow">Simple process</span>
            <h2 id="hs-how-title" className="hs-section-title">How it works</h2>
            <p className="hs-section-sub">Four steps, each ending in a concrete outcome.</p>
          </div>
          <ol className="hs-how__steps">
            {steps.map((step, index) => (
              <li key={step.n} className="hs-step">
                <div className="hs-step__head">
                  <span className="hs-step__number" aria-hidden="true">{step.n}</span>
                  {index < steps.length - 1 && <span className="hs-step__connector" aria-hidden="true" />}
                </div>
                <h3 className="hs-step__title">{step.title}</h3>
                <p className="hs-step__desc">{step.outcome}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="hs-faq" aria-labelledby="hs-faq-title">
        <div className="container hs-faq__inner">
          <div className="hs-faq__head">
            <span className="hs-section-eyebrow">Good to know</span>
            <h2 id="hs-faq-title" className="hs-section-title">Frequently asked questions</h2>
            <p className="hs-section-sub">The answers people need before they book.</p>
            <a
              href={whatsappHref(settings.whatsappPhone)}
              target="_blank"
              rel="noopener noreferrer"
              className="hs-faq__wa"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              Still unsure? Chat with us
            </a>
          </div>
          <div className="hs-faq__list">
            {faqs.map((faq) => (
              <details key={faq.q} className="hs-faq__item">
                <summary className="hs-faq__q">
                  {faq.q}
                  <svg className="hs-faq__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <p className="hs-faq__a">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Sticky WhatsApp on mobile */}
      <a
        href={whatsappHref(settings.whatsappPhone)}
        target="_blank"
        rel="noopener noreferrer"
        className="hs-wa-fab"
        aria-label="Chat with us on WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
        </svg>
      </a>
    </div>
  )
}

export default HealthServicesPage
