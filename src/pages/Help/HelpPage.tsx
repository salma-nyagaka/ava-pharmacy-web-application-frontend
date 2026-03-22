import PageHeader from '../../components/PageHeader/PageHeader'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { formatPhoneHref, formatWhatsAppHref } from '../../services/siteSettingsService'
import '../../styles/pages/HelpPage.css'

function HelpPage() {
  const { settings } = useSiteSettings()
  const normalizedSupportPhone = settings.supportPhone.replace(/\D/g, '')
  const normalizedWhatsappPhone = settings.whatsappPhone.replace(/\D/g, '')
  const hasDistinctWhatsapp = Boolean(normalizedWhatsappPhone) && normalizedWhatsappPhone !== normalizedSupportPhone
  const faqs = [
    {
      question: 'How do I upload a prescription? ',
      answer: 'Go to Prescriptions, upload a clear photo or PDF, and wait for pharmacist approval.',
    },
    {
      question: 'What payment methods are supported?',
      answer: 'We support card payments, M-Pesa, and mobile money via Flutterwave.',
    },
    {
      question: 'Can I request a pediatric consultation?',
      answer: 'Yes. Visit Pediatric Services to select a specialist and start a chat consultation.',
    },
    {
      question: 'How long does delivery take?',
      answer: 'Same-day within Nairobi, 2-3 business days for other regions.',
    },
  ]

  return (
    <div>
      <PageHeader
        title="Help center"
        subtitle="Find quick answers, contact support, and access self-service tools."
        badge="Support"
      />
      <section className="page">
        <div className="container">
          <div className="page-grid page-grid--3">
            <div className="card">
              <h3 className="card__title">Live chat</h3>
              <p className="card__subtitle">Available 24/7 on WhatsApp.</p>
              <a className="btn btn--primary btn--sm" href={`https://wa.me/${formatWhatsAppHref(settings.whatsappPhone)}`} target="_blank" rel="noreferrer">
                Start WhatsApp chat
              </a>
            </div>
            {hasDistinctWhatsapp && (
              <div className="card">
                <h3 className="card__title">Call support</h3>
                <p className="card__subtitle">Talk to an agent for urgent issues.</p>
                <a className="btn btn--secondary btn--sm" href={`tel:${formatPhoneHref(settings.supportPhone)}`}>{settings.supportPhone}</a>
              </div>
            )}
            <div className="card">
              <h3 className="card__title">Email support</h3>
              <p className="card__subtitle">We reply within 2 hours.</p>
              <a className="btn btn--outline btn--sm" href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a>
            </div>
          </div>

          <div className="page-section">
            <h2 style={{ marginBottom: '1rem' }}>Frequently asked questions</h2>
            <div className="faq-list">
              {faqs.map((faq) => (
                <div key={faq.question} className="faq-item">
                  <h4>{faq.question}</h4>
                  <p className="card__meta">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HelpPage
