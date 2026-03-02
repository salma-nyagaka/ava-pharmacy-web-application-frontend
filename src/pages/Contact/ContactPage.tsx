import './ContactPage.css'

function ContactPage() {
  return (
    <div className="contact">
      <section className="contact__hero">
        <div className="container">
          <div className="contact__layout">

            {/* Left — info */}
            <div className="contact__info">
              <h1 className="contact__info-title">We Ensure You Will Always Get The Best Result</h1>
              <p className="contact__info-sub">Have a question? We're here to help.</p>

              <div className="contact__details">
                <div className="contact__detail">
                  <span className="contact__detail-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </span>
                  <div>
                    <strong>Office Address</strong>
                    <span>Karen / The Hub, Karen, Nairobi, Kenya</span>
                  </div>
                </div>

                <div className="contact__detail">
                  <span className="contact__detail-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.4a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/>
                    </svg>
                  </span>
                  <div>
                    <strong>Call Us</strong>
                    <span>+254 (0) 715 737 330</span>
                  </div>
                </div>

                <div className="contact__detail">
                  <span className="contact__detail-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </span>
                  <div>
                    <strong>Office Hours</strong>
                    <span>Mon – Sun: 09am – 5pm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — form */}
            <div className="contact__form-card">
              <h2 className="contact__form-title">Contact Us</h2>
              <form className="contact__form">
                <div className="contact__form-row">
                  <input type="text" placeholder="Your Name" required />
                  <input type="email" placeholder="Your Email" required />
                </div>
                <input type="tel" placeholder="Your Mobile" />
                <textarea rows={5} placeholder="Message" required></textarea>
                <button type="submit" className="btn btn--primary contact__submit">Submit Now</button>
              </form>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}

export default ContactPage
