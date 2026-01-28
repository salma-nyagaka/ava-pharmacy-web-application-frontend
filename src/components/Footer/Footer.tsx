import { Link } from 'react-router-dom'
import './Footer.css'
import logo from '../../assets/images/logos/avalogo.jpg'

function Footer() {
  const currentYear = new Date().getFullYear()

  const shopLinks = [
    { name: 'Medicines', path: '/category/medicines' },
    { name: 'Health & Wellness', path: '/category/health-wellness' },
    { name: 'Beauty & Skincare', path: '/category/beauty-skincare' },
    { name: 'Baby & Mom', path: '/category/baby-mom' },
    { name: 'Medical Devices', path: '/category/medical-devices' },
    { name: 'Personal Care', path: '/category/personal-care' },
  ]

  const customerLinks = [
    { name: 'My Account', path: '/account' },
    { name: 'Order History', path: '/orders' },
    { name: 'Track Order', path: '/track-order' },
    { name: 'Wishlist', path: '/wishlist' },
    { name: 'Returns & Refunds', path: '/returns' },
  ]

  const companyLinks = [
    { name: 'About Us', path: '/about' },
    { name: 'Contact Us', path: '/contact' },
    { name: 'Store Locator', path: '/store-locator' },
    { name: 'Careers', path: '/careers' },
    { name: 'Blog', path: '/blog' },
  ]

  const legalLinks = [
    { name: 'Privacy Policy', path: '/privacy' },
    { name: 'Terms of Service', path: '/terms' },
    { name: 'Cookie Policy', path: '/cookies' },
  ]

  return (
    <footer className="footer">
      <div className="footer__main">
        <div className="container">
          <div className="footer__grid">
            {/* Brand Column */}
            <div className="footer__brand">
              <Link to="/" className="footer__logo">
                <img src={logo} alt="Ava Pharmacy" />
              </Link>
              <p className="footer__description">
                Your trusted online pharmacy delivering genuine medicines and health products
                right to your doorstep. Quality healthcare made accessible.
              </p>
              <div className="footer__contact">
                <div className="footer__contact-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <span>+254 700 000 000</span>
                </div>
                <div className="footer__contact-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span>info@avapharmacy.co.ke</span>
                </div>
                <div className="footer__contact-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span>Nairobi, Kenya</span>
                </div>
              </div>
            </div>

            {/* Shop Links */}
            <div className="footer__column">
              <h4 className="footer__title">Shop</h4>
              <ul className="footer__links">
                {shopLinks.map((link) => (
                  <li key={link.name}>
                    <Link to={link.path}>{link.name}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Customer Service */}
            <div className="footer__column">
              <h4 className="footer__title">Customer Service</h4>
              <ul className="footer__links">
                {customerLinks.map((link) => (
                  <li key={link.name}>
                    <Link to={link.path}>{link.name}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div className="footer__column">
              <h4 className="footer__title">Company</h4>
              <ul className="footer__links">
                {companyLinks.map((link) => (
                  <li key={link.name}>
                    <Link to={link.path}>{link.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer__bottom">
        <div className="container">
          <div className="footer__bottom-content">
            <p className="footer__copyright">
              &copy; {currentYear} Ava Pharmacy. All rights reserved.
            </p>
            <div className="footer__legal">
              {legalLinks.map((link, index) => (
                <span key={link.name}>
                  <Link to={link.path}>{link.name}</Link>
                  {index < legalLinks.length - 1 && <span className="footer__separator">|</span>}
                </span>
              ))}
            </div>
            <div className="footer__social">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="footer__social-link" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="footer__social-link" aria-label="Twitter">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
                </svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="footer__social-link" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="footer__social-link" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                  <rect x="2" y="9" width="4" height="12"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
