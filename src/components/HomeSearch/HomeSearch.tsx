import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './HomeSearch.css'

function HomeSearch() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const term = query.trim()
    if (!term) return
    navigate(`/products?query=${encodeURIComponent(term)}`)
  }

  const go = (term: string) => navigate(`/products?query=${encodeURIComponent(term)}`)

  return (
    <section className="home-search" aria-label="Search the store">
      <div className="container">
        <form className="home-search__form" role="search" onSubmit={submit}>
          <svg className="home-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            className="home-search__input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search medicines, wellness products, brands…"
            aria-label="Search products"
          />
          <button className="home-search__btn" type="submit">Search</button>
        </form>
        <div className="home-search__hints" aria-hidden="true">
          <span>Try:</span>
          <button type="button" onClick={() => go('paracetamol')}>Paracetamol</button>
          <button type="button" onClick={() => go('vitamins')}>Vitamins</button>
          <button type="button" onClick={() => go('blood pressure')}>Blood pressure</button>
        </div>
      </div>
    </section>
  )
}

export default HomeSearch