import { Link } from 'react-router-dom'
import './Header.css'

function Header() {
  return (
    <header className="header">
      <div className="header__container">
        <Link to="/" className="header__logo">
          Ava Pharmacy
        </Link>
        <nav className="header__nav">
          <Link to="/" className="header__link">Home</Link>
        </nav>
      </div>
    </header>
  )
}

export default Header
