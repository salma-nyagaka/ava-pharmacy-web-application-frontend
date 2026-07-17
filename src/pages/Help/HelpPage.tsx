import { Link } from 'react-router-dom'
import SupportShortcuts from '../../components/SupportShortcuts/SupportShortcuts'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { formatPhoneHref, formatWhatsAppHref } from '../../services/siteSettingsService'
import '../../styles/pages/HelpPage.css'

function HelpPage() {
  const { settings } = useSiteSettings()
  return (
    <div className="help-page">
      <section className="help-page__section">
        <div className="container">
          <nav className="help-page__breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Help</span>
          </nav>

          <div className="help-page__header">
            <div>
              <p className="help-page__eyebrow">Support</p>
              <h1 className="help-page__title">Help center</h1>
              <p className="help-page__subtitle">Quick answers and direct support.</p>
            </div>

            <div className="help-page__actions">
              <a
                className="btn btn--primary btn--sm"
                href={`https://wa.me/${formatWhatsAppHref(settings.whatsappPhone)}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
              <a className="btn btn--outline btn--sm" href={`tel:${formatPhoneHref(settings.supportPhone)}`}>
                Call
              </a>
            </div>
          </div>

          <div className="help-page__layout help-page__layout--single">
            <section className="help-page__panel">
              <div className="help-page__panel-head">
                <h2 className="help-page__panel-title">Contact</h2>
                <p className="help-page__panel-subtitle">Pick a channel and continue.</p>
              </div>

              <div className="help-page__contact-grid">
                <a
                  className="help-page__contact-card"
                  href={`https://wa.me/${formatWhatsAppHref(settings.whatsappPhone)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="help-page__contact-label">WhatsApp</span>
                  <strong className="help-page__contact-value">{settings.whatsappPhone}</strong>
                  <span className="help-page__contact-meta">Fastest response</span>
                </a>

                <a className="help-page__contact-card" href={`tel:${formatPhoneHref(settings.supportPhone)}`}>
                  <span className="help-page__contact-label">Call</span>
                  <strong className="help-page__contact-value">{settings.supportPhone}</strong>
                  <span className="help-page__contact-meta">Urgent issues</span>
                </a>

                <a className="help-page__contact-card" href={`mailto:${settings.supportEmail}`}>
                  <span className="help-page__contact-label">Email</span>
                  <strong className="help-page__contact-value">{settings.supportEmail}</strong>
                  <span className="help-page__contact-meta">General support</span>
                </a>

                <div className="help-page__contact-card help-page__contact-card--static">
                  <span className="help-page__contact-label">Hours</span>
                  <strong className="help-page__contact-value">{settings.supportHours}</strong>
                  <span className="help-page__contact-meta">Support desk</span>
                </div>
              </div>

              <div className="help-page__location">
                <span className="help-page__location-label">Location</span>
                <strong className="help-page__location-value">{settings.supportAddress}</strong>
              </div>
            </section>

          </div>
        </div>
      </section>

      <SupportShortcuts />
    </div>
  )
}

export default HelpPage
