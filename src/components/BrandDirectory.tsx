import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/components/BrandDirectory.css'
type Brand = { id: number; name: string; slug: string; logo?: string | null }
const alphabet = ['All', '#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
const initial = (name: string) => /^[A-Z]/.test(name.trim().toUpperCase()) ? name.trim()[0].toUpperCase() : '#'
function BrandLogo({ brand }: { brand: Brand }) {
  const [failed, setFailed] = useState(false)
  return <span className="bd-logo">{brand.logo && !failed ? <img src={brand.logo} alt="" loading="lazy" onError={() => setFailed(true)} /> : brand.name.charAt(0).toUpperCase()}</span>
}
export default function BrandDirectory({ brands, pageSize = 24, onSelect, query = '' }: { brands: Brand[]; pageSize?: number; onSelect?: () => void; query?: string }) {
  const [letter, setLetter] = useState('All')
  const [page, setPage] = useState(1)
  const [previousQuery, setPreviousQuery] = useState(query)
  if (query !== previousQuery) { setPreviousQuery(query); setPage(1) }
  const searched = useMemo(() => brands.filter(brand => brand.name.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b) => a.name.localeCompare(b.name)), [brands,query])
  const available = new Set(searched.map(brand => initial(brand.name)))
  const filtered = searched.filter(brand => letter === 'All' || initial(brand.name) === letter)
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pages)
  const offset = (currentPage - 1) * pageSize
  return <div className="brand-directory">
    <nav className="bd-alphabet" aria-label="Filter brands by letter">{alphabet.map(value => <button key={value} type="button" aria-pressed={letter === value} disabled={value !== 'All' && !available.has(value)} onClick={() => { setLetter(value); setPage(1) }}>{value}</button>)}</nav>
    <div className="bd-summary" role="status">{filtered.length ? `${offset + 1}–${Math.min(offset + pageSize, filtered.length)} of ${filtered.length} brands` : 'No brands match this selection.'}</div>
    <div className="bd-grid">{filtered.slice(offset, offset + pageSize).map(brand => <Link key={brand.id} to={`/products?brand=${encodeURIComponent(brand.slug)}`} onClick={onSelect} className="bd-card"><BrandLogo key={brand.logo || brand.id} brand={brand} /><span>{brand.name}</span></Link>)}</div>
    {pages > 1 && <nav className="bd-pagination" aria-label="Brand pages"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><label>Page <select aria-label="Brand page" value={currentPage} onChange={event => setPage(Number(event.target.value))}>{Array.from({length:pages},(_,index) => <option key={index} value={index + 1}>{index + 1}</option>)}</select> of {pages}</label><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button></nav>}
  </div>
}
