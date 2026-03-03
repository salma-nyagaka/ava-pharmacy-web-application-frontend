import { useState } from 'react'
import { Link } from 'react-router-dom'
import './HealthServicesPage.css'

const COLOR_HEX: Record<string, string> = {
  blue:   '#2563eb',
  green:  '#16a34a',
  purple: '#7c3aed',
  amber:  '#d97706',
}

const services = [
  {
    key: 'doctor',
    title: 'Doctor Consultation',
    badge: 'Consultation',
    desc: 'Connect with licensed general practitioners and specialists from the comfort of your home. Get diagnoses, treatment plans, and e-prescriptions in minutes.',
    path: '/doctor-consultation',
    cta: 'Book a Consultation',
    color: 'blue',
    features: ['Same-day appointments', 'E-prescriptions issued', 'Follow-up support included'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
  },
  {
    key: 'pediatric',
    title: 'Pediatric Services',
    badge: 'Pediatrics',
    desc: 'Expert child health consultations for infants, toddlers, and teens. Our paediatricians provide personalised care and guidance for parents and guardians.',
    path: '/pediatric-consultation',
    cta: 'Book for Your Child',
    color: 'green',
    features: ['Ages 0–18 covered', 'Vaccination guidance', 'Growth & development tracking'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    key: 'lab',
    title: 'Laboratory Services',
    badge: 'Diagnostics',
    desc: 'Book diagnostics online, visit a nearby partner lab, and receive certified results digitally. Covering blood panels, urinalysis, imaging referrals, and more.',
    path: '/lab-tests',
    cta: 'Book a Lab Test',
    color: 'purple',
    features: ['200+ tests available', 'Results in 24–48 hours', 'Home sample collection'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M14.5 2v14.5a4.5 4.5 0 0 1-9 0V2"/>
        <line x1="6" y1="2" x2="14.5" y2="2"/>
        <line x1="6" y1="9" x2="14.5" y2="9"/>
      </svg>
    ),
  },
  {
    key: 'prescription',
    title: 'Prescription Fulfillment',
    badge: 'Pharmacy',
    desc: 'Upload your prescription, have it verified by our licensed pharmacists, and get your medication delivered or ready for pickup — all digitally.',
    path: '/prescriptions',
    cta: 'Upload Prescription',
    color: 'amber',
    features: ['Instant pharmacist review', 'Medication delivery available', 'Secure & confidential'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
]

const steps = [
  { n: '01', title: 'Choose a Service',  desc: 'Select from consultations, lab tests, or prescription uploads.' },
  { n: '02', title: 'Book or Upload',    desc: 'Pick a time slot, answer a short health form, or upload your documents.' },
  { n: '03', title: 'Get Expert Care',   desc: 'Connect with a licensed professional or receive certified lab results.' },
  { n: '04', title: 'Receive Treatment', desc: 'Get e-prescriptions, medication delivery, or a referral — all in one place.' },
]

type Service = typeof services[number]

function HealthServicesPage() {
  const [selected, setSelected] = useState<Service | null>(null)

  return (
    <div className="hs-page">

      {/* Services */}
      <section className="hs-services">
        <div className="container">
          <div className="hs-section-head">
            <h2 className="hs-section-title">Our Services</h2>
            <p className="hs-section-sub">Everything you need to manage your health in one platform.</p>
          </div>
          <div className="hs-services__grid">
            {services.map((s) => (
              <div
                key={s.key}
                className={`hs-card hs-card--${s.color}`}
                style={{ '--hs-accent': COLOR_HEX[s.color] } as React.CSSProperties}
              >
                <div className="hs-card__top">
                  <span className="hs-card__icon">{s.icon}</span>
                  <span className="hs-card__badge">{s.badge}</span>
                </div>
                <h3 className="hs-card__title">{s.title}</h3>
                <div className="hs-card__actions">
                  <button className="btn btn--outline btn--sm" onClick={() => setSelected(s)}>
                    Details
                  </button>
                  <Link to={s.path} className="btn btn--sm hs-card__book">
                    Book →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="hs-how">
        <div className="container">
          <div className="hs-section-head">
            <h2 className="hs-section-title">How it works</h2>
            <p className="hs-section-sub">From booking to treatment in four simple steps.</p>
          </div>
          <div className="hs-how__steps">
            {steps.map((step, i) => (
              <div key={step.n} className="hs-step">
                <div className="hs-step__number">{step.n}</div>
                {i < steps.length - 1 && <div className="hs-step__connector" />}
                <h4 className="hs-step__title">{step.title}</h4>
                <p className="hs-step__desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="hs-cta">
        <div className="container">
          <div className="hs-cta__inner">
            <div>
              <h2 className="hs-cta__title">Not sure where to start?</h2>
              <p className="hs-cta__sub">Speak with a pharmacist — we'll guide you to the right service.</p>
            </div>
            <div className="hs-cta__actions">
              <a
                href="https://wa.me/254715737330"
                target="_blank"
                rel="noopener noreferrer"
                className="hs-cta__wa"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
                Chat on WhatsApp
              </a>
              <Link to="/contact" className="hs-cta__link">Contact Us</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Details modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div className="hs-modal__title-row">
                <span className={`hs-modal__icon hs-card--${selected.color}`}>
                  {selected.icon}
                </span>
                <div>
                  <span className="hs-modal__badge">{selected.badge}</span>
                  <h2>{selected.title}</h2>
                </div>
              </div>
              <button className="modal__close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="modal__content">
              <p className="hs-modal__desc">{selected.desc}</p>
              <div className="hs-modal__features">
                <p className="hs-modal__features-label">What's included</p>
                <ul>
                  {selected.features.map((f) => (
                    <li key={f}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline btn--sm" onClick={() => setSelected(null)}>Close</button>
              <Link
                to={selected.path}
                className="btn btn--primary btn--sm"
                onClick={() => setSelected(null)}
              >
                {selected.cta} →
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default HealthServicesPage
