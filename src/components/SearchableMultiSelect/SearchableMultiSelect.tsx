import { useEffect, useId, useRef, useState } from 'react'
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
  ariaLabel?: string
  emptyMessage?: string
  maxLabelCount?: number
}

export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  ariaLabel,
  disabled = false,
  className = '',
  emptyMessage = 'No options available',
  maxLabelCount = 2,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const listId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
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
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
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

  const close = (restoreFocus = false) => {
    setOpen(false)
    setQuery('')
    setActiveIndex(-1)
    if (restoreFocus) triggerRef.current?.focus()
  }

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (activeIndex >= 0) {
      document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex, listId])

  const handleOpen = () => {
    if (disabled) return
    setOpen(true)
    setQuery('')
    setActiveIndex(-1)
  }

  const handleToggle = (opt: SearchableMultiSelectOption) => {
    const id = String(opt.value)
    const next = normalizedValue.includes(id)
      ? normalizedValue.filter((v) => v !== id)
      : [...normalizedValue, id]
    onChange(next)
  }

  return (
    <div onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) close() }} ref={containerRef} className={`ss-root${className ? ` ${className}` : ''}${disabled ? ' ss-root--disabled' : ''}`}>
      <button
        type="button"
        ref={triggerRef}
        aria-label={`${ariaLabel || placeholder}${selectedOptions.length ? `: ${label}` : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className="ss-trigger"
        onClick={() => open ? close() : handleOpen()}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            handleOpen()
          }
        }}
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
              role="combobox"
              aria-label={`Search ${ariaLabel || placeholder}`}
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeIndex >= 0 && filtered[activeIndex] ? `${listId}-${activeIndex}` : undefined}
              placeholder="Search…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1) }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true) }
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActiveIndex((current) => filtered.length === 0 ? -1 : e.key === 'ArrowDown'
                    ? (current + 1) % filtered.length
                    : (current <= 0 ? filtered.length - 1 : current - 1))
                }
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const option = filtered[activeIndex] || (filtered.length === 1 ? filtered[0] : undefined)
                  if (option) handleToggle(option)
                }
              }}
            />
          </div>
          <ul id={listId} role="listbox" aria-label={ariaLabel || placeholder} aria-multiselectable="true" className="ss-list">
            {filtered.length === 0 ? (
              <li role="presentation" className="ss-list__empty"><span role="status">{query ? `No results for "${query}"` : emptyMessage}</span></li>
            ) : (
              filtered.map((opt, index) => {
                const selected = normalizedValue.includes(String(opt.value))
                return (
                  <li
                    key={opt.value}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={selected}
                    className={`ss-list__item ss-list__item--multi${activeIndex === index ? ' ss-list__item--active' : ''}${selected ? ' ss-list__item--selected' : ''}`}
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
