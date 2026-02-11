import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Header.css'
import logo from '../../assets/images/logos/avalogo.jpg'
import brandPanadol from '../../assets/images/brands/panadol.jpeg'
import brandNivea from '../../assets/images/brands/nivea.png'
import brandCerave from '../../assets/images/brands/cerave.png'
import brandDurex from '../../assets/images/brands/durex.png'
import brandEucerin from '../../assets/images/brands/eucerin.png'
import brandVichy from '../../assets/images/brands/vichy.png'
import brandCentrum from '../../assets/images/brands/centrum.jpeg'
import brandSebamed from '../../assets/images/brands/sebamed.png'
import brandHuggies from '../../assets/images/brands/huggies.jpeg'
import brandAccuChek from '../../assets/images/brands/accu-check.png'
import { categoryData } from '../../data/categories'
import { loadBanners } from '../../data/banners'
import { cartService } from '../../services/cartService'

function Header() {
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [cartCount, setCartCount] = useState(0)

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev)
    if (isMenuOpen) {
      setActiveMenu(null)
    }
  }
  const toggleSearch = () => setIsSearchOpen(!isSearchOpen)

  useEffect(() => {
    const refresh = () => {
      void cartService.count().then((response) => setCartCount(response.data))
    }
    refresh()
    const unsubscribe = cartService.subscribe(() => {
      refresh()
    })
    return unsubscribe
  }, [])

  const categories = categoryData

  const [activeCategory, setActiveCategory] = useState(categories[0]?.slug ?? '')
  const banners = loadBanners()
  const activeBanner = banners.find((banner) => banner.status === 'active')

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
    { name: 'Panadol', path: '/brands/panadol', logo: brandPanadol },
    { name: 'Nivea', path: '/brands/nivea', logo: brandNivea },
    { name: 'CeraVe', path: '/brands/cerave', logo: brandCerave },
    { name: 'Durex', path: '/brands/durex', logo: brandDurex },
    { name: 'Eucerin', path: '/brands/eucerin', logo: brandEucerin },
    { name: 'Vichy', path: '/brands/vichy', logo: brandVichy },
    { name: 'Centrum', path: '/brands/centrum', logo: brandCentrum },
    { name: 'Sebamed', path: '/brands/sebamed', logo: brandSebamed },
    { name: 'Huggies', path: '/brands/huggies', logo: brandHuggies },
    { name: 'Accu-chek', path: '/brands/accu-chek', logo: brandAccuChek },
  ]

  const handleToggleMenu = (menuKey: string) => {
    setActiveMenu((prev) => (prev === menuKey ? null : menuKey))
  }

  const activeCategoryData =
    categories.find((category) => category.slug === activeCategory) || categories[0]
  const activeItems = activeCategoryData?.subcategories ?? []
  const itemsSplitIndex = Math.ceil(activeItems.length / 2)
  const itemsColumnOne = activeItems.slice(0, itemsSplitIndex)
  const itemsColumnTwo = activeItems.slice(itemsSplitIndex)

  const closeActiveMenu = () => setActiveMenu(null)

  const closeMenus = () => {
    setActiveMenu(null)
    setIsMenuOpen(false)
  }

  const buildSubcategoryPath = (categoryPath: string, subSlug: string) =>
    `${categoryPath}?subcategory=${encodeURIComponent(subSlug)}`

  const submitSearch = () => {
    const query = searchQuery.trim()
    navigate(query ? `/products?query=${encodeURIComponent(query)}` : '/products')
    setIsSearchOpen(false)
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
              {activeBanner?.link ? (
                <Link to={activeBanner.link} className="header__topbar-item">
                  <svg className="header__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12h18"/>
                    <path d="M9 6h6"/>
                    <path d="M9 18h6"/>
                  </svg>
                  {activeBanner.message}
                </Link>
              ) : (
                <span className="header__topbar-item">
                  <svg className="header__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12h18"/>
                    <path d="M9 6h6"/>
                    <path d="M9 18h6"/>
                  </svg>
                  {activeBanner?.message ?? 'Free delivery for orders above KSh 2,500'}
                </span>
              )}
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
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    submitSearch()
                  }
                }}
              />
              <button className="header__search-btn" type="button" onClick={submitSearch}>Search</button>
            </div>

            {/* Actions */}
            <div className="header__actions">
              <button className="header__action-btn header__action-btn--search-mobile" onClick={toggleSearch}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </button>

              <Link to="/contact" className="header__action-btn" aria-label="Contact us">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 8V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v1"/>
                  <path d="M21 8l-9 6L3 8"/>
                  <path d="M3 8v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8"/>
                </svg>
                <span className="header__action-text">Contact Us</span>
              </Link>

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
                <span className="header__cart-badge">{cartCount}</span>
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
              onMouseEnter={() => setActiveMenu('category')}
              onMouseLeave={closeActiveMenu}
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
                  <div className="mega-panel__col mega-panel__menu">
                    <h4>Shop by Category</h4>
                    <ul className="mega-panel__menu-list">
                      <li>
                        <Link
                          to="/products"
                          onClick={closeMenus}
                          className="mega-panel__menu-link mega-panel__menu-link--all"
                        >
                          <span className="mega-panel__menu-text">All Products</span>
                          <span className="mega-panel__menu-arrow" aria-hidden="true">›</span>
                        </Link>
                      </li>
                      {categories.map((category) => (
                        <li key={category.slug}>
                          <Link
                            to={category.path}
                            onMouseEnter={() => setActiveCategory(category.slug)}
                            onFocus={() => setActiveCategory(category.slug)}
                            onClick={closeMenus}
                            className={`mega-panel__menu-link ${category.slug === activeCategory ? 'mega-panel__menu-link--active' : ''}`}
                          >
                            <span className="mega-panel__menu-text">{category.name}</span>
                            <span className="mega-panel__menu-arrow" aria-hidden="true">›</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mega-panel__col mega-panel__values">
                    <h4>{activeCategoryData?.name}</h4>
                    <div className="mega-panel__values-grid">
                      <ul className="mega-panel__values-list">
                        {itemsColumnOne.map((item) => (
                          <li key={item.slug}>
                            <Link to={activeCategoryData ? buildSubcategoryPath(activeCategoryData.path, item.slug) : '/'} onClick={closeMenus}>
                              {item.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <ul className="mega-panel__values-list">
                        {itemsColumnTwo.map((item) => (
                          <li key={item.slug}>
                            <Link to={activeCategoryData ? buildSubcategoryPath(activeCategoryData.path, item.slug) : '/'} onClick={closeMenus}>
                              {item.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
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

            <li
              className={`header__nav-item header__nav-item--conditions ${activeMenu === 'condition' ? 'header__nav-item--open' : ''}`}
              onMouseEnter={() => setActiveMenu('condition')}
              onMouseLeave={closeActiveMenu}
            >
              <button
                className="header__nav-button"
                onClick={() => handleToggleMenu('condition')}
                aria-expanded={activeMenu === 'condition'}
                type="button"
              >
                Shop By Condition
                <span className="header__nav-caret">▾</span>
              </button>
              <div className="conditions-panel">
                <div className="conditions-panel__grid">
                  {conditions.map((condition) => (
                    <Link
                      key={condition.name}
                      to={condition.path}
                      onClick={closeMenus}
                      className="conditions-panel__card"
                    >
                      {condition.name}
                    </Link>
                  ))}
                </div>
              </div>
            </li>

            <li
              className={`header__nav-item header__nav-item--brands ${activeMenu === 'brands' ? 'header__nav-item--open' : ''}`}
              onMouseEnter={() => setActiveMenu('brands')}
              onMouseLeave={closeActiveMenu}
            >
              <button
                className="header__nav-button"
                onClick={() => handleToggleMenu('brands')}
                aria-expanded={activeMenu === 'brands'}
                type="button"
              >
                Shop By Brand
                <span className="header__nav-caret">▾</span>
              </button>
              <div className="brands-panel">
                <div className="brands-panel__header">
                  <div>
                    <h4>Brands</h4>
                    <p>Explore our trusted pharmacy and beauty partners.</p>
                  </div>
                  {/* <Link to="/brands" onClick={closeMenus} className="brands-panel__view-all">View all</Link> */}
                </div>
                <div className="brands-panel__grid">
                  {brands.map((brand) => (
                    <Link key={brand.name} to={brand.path} onClick={closeMenus} className="brands-panel__card">
                      <span className="brands-panel__logo">
                        <img src={brand.logo} alt={`${brand.name} logo`} className="brands-panel__logo-img" />
                      </span>
                      <span>{brand.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </li>
            <li className="header__nav-item" onMouseEnter={closeActiveMenu}>
              <Link to="/offers" className="header__nav-link" onClick={closeMenus}>Sale &amp; Offers</Link>
            </li>
            <li className="header__nav-item" onMouseEnter={closeActiveMenu}>
              <Link to="/prescriptions" className="header__nav-link header__nav-link--cta" onClick={closeMenus}>
                Submit Prescription
              </Link>
            </li>
          
            <li className="header__nav-item" onMouseEnter={closeActiveMenu}>
              <Link to="/health-services" className="header__nav-link" onClick={closeMenus}>Health Services</Link>
            </li>
            <li className="header__nav-item" onMouseEnter={closeActiveMenu}>
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
