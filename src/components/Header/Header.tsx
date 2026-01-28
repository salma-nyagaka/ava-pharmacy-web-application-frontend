import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Header.css'
import logo from '../../assets/images/logos/avalogo.jpg'

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev)
    if (isMenuOpen) {
      setActiveMenu(null)
    }
  }
  const toggleSearch = () => setIsSearchOpen(!isSearchOpen)

  const categories = [
    { name: 'All Products', path: '/products' },
    { name: 'HealthCare', path: '/category/health-care' },
    { name: 'Vitamins & Supplements', path: '/category/vitamins-supplements' },
    { name: 'Skin Care', path: '/category/skin-care' },
    { name: 'Beauty & Make Up', path: '/category/beauty-skincare' },
    { name: 'Devices & Diagnostics', path: '/category/medical-devices' },
    { name: 'Family Planning', path: '/category/family-planning' },
    { name: 'Hair Care', path: '/category/hair-care' },
    { name: 'Mens', path: '/category/mens' },
    { name: 'Mum & Baby', path: '/category/baby-mom' },
    { name: 'Personal Care', path: '/category/personal-care' },
    { name: 'Prescription Products', path: '/category/prescription-products' },
    { name: 'Travel', path: '/category/travel' },
  ]

  const conditions = [
    { name: 'Aches & Pains', path: '/conditions/aches-pains' },
    { name: 'Acne', path: '/conditions/acne' },
    { name: 'Allergy & Hayfever', path: '/conditions/allergy-hayfever' },
    { name: 'Anti Infectives', path: '/conditions/anti-infectives' },
    { name: 'Bites & Stings', path: '/conditions/bites-stings' },
    { name: 'Cough, Cold & Flu', path: '/conditions/cold-flu-cough' },
    { name: 'Dry Skin', path: '/conditions/dry-skin' },
    { name: 'Eczema', path: '/conditions/eczema' },
    { name: 'Eye & Ear Care', path: '/conditions/eye-ear-care' },
    { name: 'First Aid & Bandages', path: '/conditions/first-aid' },
    { name: 'Oral Care', path: '/conditions/oral-care' },
    { name: 'Skin Treatments', path: '/conditions/skin-treatments' },
  ]

  const brands = [
    { name: 'Panadol', path: '/brands/panadol' },
    { name: 'Nivea', path: '/brands/nivea' },
    { name: 'CeraVe', path: '/brands/cerave' },
    { name: 'Durex', path: '/brands/durex' },
    { name: 'Eucerin', path: '/brands/eucerin' },
    { name: 'Vichy', path: '/brands/vichy' },
    { name: 'Centrum', path: '/brands/centrum' },
    { name: 'Sebamed', path: '/brands/sebamed' },
    { name: 'Huggies', path: '/brands/huggies' },
    { name: 'Accu-chek', path: '/brands/accu-chek' },
  ]

  const handleToggleMenu = (menuKey: string) => {
    setActiveMenu((prev) => (prev === menuKey ? null : menuKey))
  }

  const closeMenus = () => {
    setActiveMenu(null)
    setIsMenuOpen(false)
  }

  return (
    <header className="header">
      {/* Top Bar */}
      <div className="header__topbar">
        <div className="container">
          <div className="header__topbar-content">
            <div className="header__topbar-left">
              <span className="header__topbar-item">
                <svg className="header__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18"/>
                  <path d="M9 6h6"/>
                  <path d="M9 18h6"/>
                </svg>
                Free delivery for orders above KSh 2,500
              </span>
            </div>
            <div className="header__topbar-right">
              <Link to="/about" className="header__topbar-link">About Us</Link>
              <Link to="/blog" className="header__topbar-link">Blog</Link>
              <Link to="/help" className="header__topbar-link">FAQ</Link>
              <Link to="/store-locator" className="header__topbar-link">Store Locator</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="header__main">
        <div className="container">
          <div className="header__main-content">
            {/* Logo */}
            <Link to="/" className="header__logo">
              <img src={logo} alt="Ava Pharmacy" className="header__logo-img" />
            </Link>

            {/* Search Bar */}
            <div className={`header__search ${isSearchOpen ? 'header__search--active' : ''}`}>
              <svg className="header__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search medicines, brands, and services"
                className="header__search-input"
              />
              <button className="header__search-btn">Search</button>
            </div>

            {/* Actions */}
            <div className="header__actions">
              <button className="header__action-btn header__action-btn--search-mobile" onClick={toggleSearch}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </button>

              <a href="https://wa.me/254700000000" className="header__action-btn" aria-label="WhatsApp">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.5 8.5 0 0 1-12.18 7.72L3 21l1.86-5.64A8.5 8.5 0 1 1 21 11.5z"/>
                  <path d="M9.5 9.5c.4 1.2 1.3 2.2 2.5 2.8l.7-.4c.2-.1.5 0 .6.2l.8 1.2c.1.2 0 .5-.2.6-1 .5-2.2.6-3.4.2-1.5-.5-2.8-1.6-3.7-3.1-.7-1.2-1-2.5-.8-3.8 0-.2.2-.4.4-.4h1.4c.2 0 .4.1.4.3l.2 1.3c0 .2-.1.4-.3.5l-.7.4z"/>
                </svg>
                <span className="header__action-text">WhatsApp</span>
              </a>

              <Link to="/account" className="header__action-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span className="header__action-text">Account</span>
              </Link>

              <Link to="/cart" className="header__action-btn header__action-btn--cart">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                <span className="header__cart-badge">3</span>
                <span className="header__action-text">Cart</span>
              </Link>

              <button className="header__menu-toggle" onClick={toggleMenu}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {isMenuOpen ? (
                    <path d="M18 6L6 18M6 6l12 12"/>
                  ) : (
                    <>
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <line x1="3" y1="12" x2="21" y2="12"/>
                      <line x1="3" y1="18" x2="21" y2="18"/>
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`header__nav ${isMenuOpen ? 'header__nav--open' : ''}`} aria-label="Primary">
        <div className="container">
          <ul className="header__nav-list">
            <li
              className={`header__nav-item header__nav-item--mega ${activeMenu === 'category' ? 'header__nav-item--open' : ''}`}
              onMouseLeave={closeMenus}
            >
              <button
                className="header__nav-button"
                onClick={() => handleToggleMenu('category')}
                aria-expanded={activeMenu === 'category'}
                type="button"
              >
                Shop By Category
                <span className="header__nav-caret">▾</span>
              </button>
              <div className="mega-panel">
                <div className="mega-panel__grid">
                  <div className="mega-panel__col">
                    <h4>Categories</h4>
                    <ul className="mega-panel__links">
                      {categories.map((category) => (
                        <li key={category.name}>
                          <Link to={category.path} onClick={closeMenus}>{category.name}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mega-panel__col">
                    <h4>Health Care Conditions</h4>
                    <ul className="mega-panel__links">
                      {conditions.map((condition) => (
                        <li key={condition.name}>
                          <Link to={condition.path} onClick={closeMenus}>{condition.name}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mega-panel__col">
                    <h4>Brands</h4>
                    <ul className="mega-panel__links">
                      {brands.map((brand) => (
                        <li key={brand.name}>
                          <Link to={brand.path} onClick={closeMenus}>{brand.name}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mega-panel__col mega-panel__cta">
                    <div className="advisor-card">
                      <p className="advisor-card__title">Speak to an Advisor</p>
                      <p className="advisor-card__text">Book a free, one-to-one consultation with our qualified advisors.</p>
                      <Link to="/health-services" className="btn btn--primary btn--sm">Find out more</Link>
                    </div>
                  </div>
                </div>
              </div>
            </li>

            <li className={`header__nav-item ${activeMenu === 'condition' ? 'header__nav-item--open' : ''}`} onMouseLeave={closeMenus}>
              <button
                className="header__nav-button"
                onClick={() => handleToggleMenu('condition')}
                aria-expanded={activeMenu === 'condition'}
                type="button"
              >
                Shop By Condition
                <span className="header__nav-caret">▾</span>
              </button>
              <div className="dropdown-panel">
                <ul>
                  {conditions.map((condition) => (
                    <li key={condition.name}>
                      <Link to={condition.path} onClick={closeMenus}>{condition.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>

            <li className="header__nav-item">
              <Link to="/brands" className="header__nav-link" onClick={closeMenus}>Shop By Brand</Link>
            </li>
            <li className="header__nav-item">
              <Link to="/offers" className="header__nav-link" onClick={closeMenus}>Sale &amp; Offers</Link>
            </li>
            <li className="header__nav-item">
              <Link to="/prescriptions" className="header__nav-link header__nav-link--cta" onClick={closeMenus}>
                Submit Prescription
              </Link>
            </li>
            <li className="header__nav-item">
              <Link to="/skin-test" className="header__nav-link" onClick={closeMenus}>Skin Test</Link>
            </li>
            <li className="header__nav-item">
              <Link to="/health-services" className="header__nav-link" onClick={closeMenus}>Health Services</Link>
            </li>
            <li className="header__nav-item">
              <Link to="/store-locator" className="header__nav-link header__nav-link--icon" onClick={closeMenus}>
                <span className="header__nav-icon">📍</span>
                Store Locator
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  )
}

export default Header
