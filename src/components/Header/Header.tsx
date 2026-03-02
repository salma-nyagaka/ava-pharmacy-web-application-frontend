import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
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
import { loadCategories } from '../../data/categories'
import { loadHealthConcerns } from '../../data/healthConcerns'
import { loadBanners } from '../../data/banners'
import { cartService } from '../../services/cartService'
import { useAuth } from '../../context/AuthContext'

function Header() {
  const ALL_CATEGORIES_KEY = 'all'
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoggedIn, logout } = useAuth()

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAccountsOpen, setIsAccountsOpen] = useState(false)
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

  const [categories] = useState(() => loadCategories())
  const [healthConcerns] = useState(() => loadHealthConcerns())
  const defaultCategorySlug = categories[0]?.slug ?? ALL_CATEGORIES_KEY

  const [activeCategory, setActiveCategory] = useState(defaultCategorySlug)
  const banners = loadBanners()
  const activeBanner = banners.find((banner) => banner.status === 'active')

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

  const openCategoryMenu = () => {
    setActiveCategory(defaultCategorySlug)
    setActiveMenu('category')
  }

  const toggleCategoryMenu = () => {
    if (activeMenu === 'category') {
      setActiveMenu(null)
      return
    }
    openCategoryMenu()
  }

  const buildSubcategoryPath = (categoryPath: string, subSlug: string) =>
    `${categoryPath}?subcategory=${encodeURIComponent(subSlug)}`

  const activeCategoryData =
    activeCategory === ALL_CATEGORIES_KEY
      ? categories[0]
      : categories.find((category) => category.slug === activeCategory) || categories[0]
  const activeCategoryLabel = activeCategory === ALL_CATEGORIES_KEY ? 'All Products' : activeCategoryData?.name ?? 'Shop by Category'
  const megaPanelItems =
    activeCategory === ALL_CATEGORIES_KEY
      ? categories.flatMap((category) =>
          category.subcategories.map((item) => ({
            id: `${category.slug}-${item.slug}`,
            name: item.name,
            categoryName: category.name,
            path: buildSubcategoryPath(category.path, item.slug),
          }))
        )
      : (activeCategoryData?.subcategories ?? []).map((item) => ({
          id: item.slug,
          name: item.name,
          categoryName: null,
          path: buildSubcategoryPath(activeCategoryData.path, item.slug),
        }))
  const itemsSplitIndex = Math.ceil(megaPanelItems.length / 2)
  const itemsColumnOne = megaPanelItems.slice(0, itemsSplitIndex)
  const itemsColumnTwo = megaPanelItems.slice(itemsSplitIndex)

  const closeActiveMenu = () => setActiveMenu(null)

  const closeMenus = () => {
    setActiveMenu(null)
    setIsMenuOpen(false)
    setActiveCategory(defaultCategorySlug)
  }

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
                    <rect x="1" y="3" width="15" height="13" rx="1"/>
                    <path d="M16 8h4l3 5v3h-7V8z"/>
                    <circle cx="5.5" cy="18.5" r="1.5"/>
                    <circle cx="18.5" cy="18.5" r="1.5"/>
                  </svg>
                  {activeBanner.message}
                </Link>
              ) : (
                <span className="header__topbar-item">
                  <svg className="header__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13" rx="1"/>
                    <path d="M16 8h4l3 5v3h-7V8z"/>
                    <circle cx="5.5" cy="18.5" r="1.5"/>
                    <circle cx="18.5" cy="18.5" r="1.5"/>
                  </svg>
                  {activeBanner?.message ?? 'Free delivery for orders above KSh 2,500'}
                </span>
              )}
            </div>
            <div className="header__topbar-right">
              <Link to="/about" className="header__topbar-link">About Us</Link>
              <Link to="/help" className="header__topbar-link">FAQ</Link>
              <Link to="/track-order" className="header__topbar-link">Track Order</Link>
              <Link to="/contact" className="header__topbar-link">Contact Us</Link>
              <Link to="/professional/register" className="header__topbar-link header__topbar-link--pro">Professional Registration</Link>
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

              <div
                className={`header__accounts ${isAccountsOpen ? 'header__accounts--open' : ''}`}
                onMouseEnter={() => setIsAccountsOpen(true)}
                onMouseLeave={() => setIsAccountsOpen(false)}
              >
                <button className="header__action-btn" type="button">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span className="header__action-text">
                    {isLoggedIn ? user?.name?.split(' ')[0] : 'Account'}
                  </span>
                </button>
                <div className="header__accounts-dropdown">
                  {isLoggedIn ? (
                    <>
                      <p className="header__accounts-greeting">Hello, {user?.name?.split(' ')[0]}</p>
                      <Link to="/account" className="header__accounts-link">My Account</Link>
                      <Link to="/account/profile" className="header__accounts-link">Profile</Link>
                      <div className="header__accounts-divider" />
                      <button className="header__accounts-signout" onClick={logout} type="button">Sign Out</button>
                    </>
                  ) : (
                    <>
                      <p className="header__accounts-greeting">Hello, sign in</p>
                      <Link to="/login" className="header__accounts-signin-btn">Sign In</Link>
                      <p className="header__accounts-register">
                        New customer? <Link to="/register">Register here</Link>
                      </p>
                      <div className="header__accounts-divider" />
                      <Link to="/account/orders" className="header__accounts-link">Your Orders</Link>
                    </>
                  )}
                </div>
              </div>

              <Link to="/account/orders" className="header__action-btn header__action-btn--orders">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                  <path d="M9 12h6M9 16h4"/>
                </svg>
                <span className="header__action-text">Orders</span>
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
              onMouseEnter={openCategoryMenu}
              onMouseLeave={closeActiveMenu}
            >
              <button
                className="header__nav-button"
                onClick={toggleCategoryMenu}
                aria-expanded={activeMenu === 'category'}
                type="button"
              >
                Shop Categories
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
                          onMouseEnter={() => setActiveCategory(ALL_CATEGORIES_KEY)}
                          onFocus={() => setActiveCategory(ALL_CATEGORIES_KEY)}
                          onClick={closeMenus}
                          className={`mega-panel__menu-link mega-panel__menu-link--all ${
                            activeCategory === ALL_CATEGORIES_KEY ? 'mega-panel__menu-link--active' : ''
                          }`}
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
                    <h4>{activeCategoryLabel}</h4>
                    <div className="mega-panel__values-grid">
                      <ul className="mega-panel__values-list">
                        {itemsColumnOne.map((item) => (
                          <li key={item.id}>
                            <Link to={item.path} onClick={closeMenus}>
                              <span>{item.name}</span>
                              {activeCategory === ALL_CATEGORIES_KEY && item.categoryName && (
                                <small className="mega-panel__item-category">{item.categoryName}</small>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <ul className="mega-panel__values-list">
                        {itemsColumnTwo.map((item) => (
                          <li key={item.id}>
                            <Link to={item.path} onClick={closeMenus}>
                              <span>{item.name}</span>
                              {activeCategory === ALL_CATEGORIES_KEY && item.categoryName && (
                                <small className="mega-panel__item-category">{item.categoryName}</small>
                              )}
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
                Shop by Health Concern
                <span className="header__nav-caret">▾</span>
              </button>
              <div className="conditions-panel">
                <div className="conditions-panel__grid">
                  {healthConcerns.map((condition) => (
                    <Link
                      key={condition.slug}
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
                Top Brands
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
              <Link to="/offers" className={`header__nav-link${isActive('/offers') ? ' header__nav-link--active' : ''}`} onClick={closeMenus}>Deals</Link>
            </li>
            <li className="header__nav-item" onMouseEnter={closeActiveMenu}>
              <Link to="/prescriptions" className="header__nav-link header__nav-link--cta" onClick={closeMenus}>
                Upload Prescription
              </Link>
            </li>
            <li className="header__nav-item" onMouseEnter={closeActiveMenu}>
              <Link to="/health-services" className={`header__nav-link${isActive('/health-services') ? ' header__nav-link--active' : ''}`} onClick={closeMenus}>Consult &amp; Care</Link>
            </li>
            <li className="header__nav-item" onMouseEnter={closeActiveMenu}>
              <Link to="/lab-tests" className={`header__nav-link${isActive('/lab-tests') ? ' header__nav-link--active' : ''}`} onClick={closeMenus}>Lab Tests</Link>
            </li>
          </ul>
        </div>
      </nav>

    </header>
  )
}

export default Header
