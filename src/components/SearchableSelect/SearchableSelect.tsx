import { useEffect, useRef, useState } from 'react'
import './SearchableSelect.css'

export interface SearchableSelectOption {
  value: number | string
  label: string
}

interface Props {
  options: SearchableSelectOption[]
  value: number | string | ''
  onChange: (value: number | string | '') => void
  placeholder?: string
  disabled?: boolean
  className?: string
  emptyMessage?: string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  className = '',
  emptyMessage = 'No options available',
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => String(o.value) === String(value))

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleOpen = () => {
    if (disabled) return
    setOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleSelect = (opt: SearchableSelectOption) => {
    onChange(opt.value)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className={`ss-root${className ? ` ${className}` : ''}${disabled ? ' ss-root--disabled' : ''}`}>
      <button
        type="button"
        className="ss-trigger"
        onClick={handleOpen}
        disabled={disabled}
        tabIndex={0}
      >
        <span className={selected ? 'ss-trigger__label' : 'ss-trigger__placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={`ss-trigger__chevron${open ? ' ss-trigger__chevron--open' : ''}`} viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="ss-dropdown">
          <div className="ss-search">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14" className="ss-search__icon">
              <circle cx="9" cy="9" r="5.5" /><path d="M13.5 13.5L17 17" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="ss-search__input"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setOpen(false); setQuery('') }
                if (e.key === 'Enter' && filtered.length === 1) handleSelect(filtered[0])
              }}
            />
          </div>
          <ul className="ss-list">
            {filtered.length === 0 ? (
              <li className="ss-list__empty">{query ? `No results for "${query}"` : emptyMessage}</li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt.value}
                  className={`ss-list__item${String(opt.value) === String(value) ? ' ss-list__item--selected' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(opt) }}
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
