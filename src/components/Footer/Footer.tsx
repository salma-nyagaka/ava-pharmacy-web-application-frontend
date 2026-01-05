import './Footer.css'

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer__container">
        <p className="footer__text">
          &copy; {currentYear} Ava Pharmacy. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

export default Footer
