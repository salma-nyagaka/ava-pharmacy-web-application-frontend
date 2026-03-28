import { useEffect, useRef, useState } from 'react'
import '../SearchableSelect/SearchableSelect.css'
import './SearchableMultiSelect.css'

export interface SearchableMultiSelectOption {
  value: number | string
  label: string
}

interface Props {
  options: SearchableMultiSelectOption[]
  value: Array<number | string>
  onChange: (value: Array<number | string>) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  emptyMessage?: string
  maxLabelCount?: number
}

export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  className = '',
  emptyMessage = 'No options available',
  maxLabelCount = 2,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const normalizedValue = value.map((v) => String(v))
  const selectedOptions = options.filter((o) => normalizedValue.includes(String(o.value)))

  const label = selectedOptions.length
    ? (() => {
      const visible = selectedOptions.slice(0, maxLabelCount).map((o) => o.label)
      const remaining = selectedOptions.length - visible.length
      return remaining > 0 ? `${visible.join(', ')} +${remaining} more` : visible.join(', ')
    })()
    : placeholder

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

  const handleToggle = (opt: SearchableMultiSelectOption) => {
    const id = String(opt.value)
    const next = normalizedValue.includes(id)
      ? normalizedValue.filter((v) => v !== id)
      : [...normalizedValue, id]
    onChange(next)
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
        <span className={selectedOptions.length ? 'ss-trigger__label' : 'ss-trigger__placeholder'}>
          {label}
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
              }}
            />
          </div>
          <ul className="ss-list">
            {filtered.length === 0 ? (
              <li className="ss-list__empty">{query ? `No results for "${query}"` : emptyMessage}</li>
            ) : (
              filtered.map((opt) => {
                const selected = normalizedValue.includes(String(opt.value))
                return (
                  <li
                    key={opt.value}
                    className={`ss-list__item ss-list__item--multi${selected ? ' ss-list__item--selected' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); handleToggle(opt) }}
                  >
                    <span className={`ss-list__checkbox${selected ? ' ss-list__checkbox--checked' : ''}`}>
                      {selected ? '✓' : ''}
                    </span>
                    {opt.label}
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
