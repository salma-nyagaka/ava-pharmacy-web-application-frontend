import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import '../../styles/admin/AdminShared.css'
import '../../styles/admin/Settings.css'
import { logAdminAction } from '../../data/adminAudit'
import { kenyaCounties } from '../../data/kenyaLocations'
import { useSiteSettings } from '../../context/SiteSettingsContext'

const SUPPORT_DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SUPPORT_TIME_OPTIONS = [
  '06:00am',
  '06:30am',
  '07:00am',
  '07:30am',
  '08:00am',
  '08:30am',
  '09:00am',
  '09:30am',
  '10:00am',
  '10:30am',
  '11:00am',
  '11:30am',
  '12:00pm',
  '12:30pm',
  '01:00pm',
  '01:30pm',
  '02:00pm',
  '02:30pm',
  '03:00pm',
  '03:30pm',
  '04:00pm',
  '04:30pm',
  '05:00pm',
  '05:30pm',
  '06:00pm',
  '06:30pm',
  '07:00pm',
  '07:30pm',
  '08:00pm',
  '08:30pm',
  '09:00pm',
  '09:30pm',
  '10:00pm',
]

function normalizeSupportTime(value: string) {
  return value.replace(/^0(\d:)/, '$1').replace(':00', '')
}

function formatSupportHours(fromDay: string, toDay: string, opensAt: string, closesAt: string) {
  return `${fromDay} – ${toDay}: ${normalizeSupportTime(opensAt)} – ${normalizeSupportTime(closesAt)}`
}

function parseSupportHours(value: string) {
  const match = value.match(/^([A-Za-z]{3})\s*[–-]\s*([A-Za-z]{3}):\s*([0-9]{1,2}(?::[0-9]{2})?(?:am|pm))\s*[–-]\s*([0-9]{1,2}(?::[0-9]{2})?(?:am|pm))$/i)
  if (!match) {
    return {
      fromDay: 'Mon',
      toDay: 'Sun',
      opensAt: '09:00am',
      closesAt: '05:00pm',
    }
  }

  const [, fromDay, toDay, opensAt, closesAt] = match
  const normalizeParsedTime = (time: string) => {
    const [rawHour, rawMinute = '00'] = time.replace(/am|pm/i, '').split(':')
    const suffix = time.toLowerCase().endsWith('pm') ? 'pm' : 'am'
    return `${rawHour.padStart(2, '0')}:${rawMinute.padStart(2, '0')}${suffix}`
  }

  return {
    fromDay,
    toDay,
    opensAt: normalizeParsedTime(opensAt),
    closesAt: normalizeParsedTime(closesAt),
  }
}

function CountyPicker({
  options,
  selected,
  onToggle,
  onClear,
}: {
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = useMemo(
    () => options.filter((option) => option.toLowerCase().includes(query.toLowerCase().trim())),
    [options, query],
  )

  const selectedOptions = useMemo(
    () => options.filter((option) => selected.includes(option)),
    [options, selected],
  )

  const openDropdown = () => {
    setOpen(true)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div className="settings-picker" ref={wrapRef}>
      <button
        type="button"
        className={`settings-picker__trigger${open ? ' settings-picker__trigger--open' : ''}`}
        onClick={() => {
          if (open) {
            setOpen(false)
            setQuery('')
            return
          }
          openDropdown()
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected.length > 0 ? 'settings-picker__value' : 'settings-picker__placeholder'}>
          {selected.length > 0 ? `${selected.length} counties selected` : 'Select active delivery counties'}
        </span>
        <svg className={`settings-picker__chevron${open ? ' settings-picker__chevron--open' : ''}`} viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="settings-picker__dropdown">
          <div className="settings-picker__search">
            <svg className="settings-picker__search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14">
              <circle cx="9" cy="9" r="5.5" />
              <path d="M13 13L16.5 16.5" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="settings-picker__search-input"
              placeholder="Search counties..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setOpen(false)
                  setQuery('')
                }
              }}
            />
          </div>

          <div className="settings-picker__list" role="listbox" aria-multiselectable="true">
            {filteredOptions.length === 0 ? (
              <div className="settings-picker__empty">
                {query ? `No counties found for "${query}"` : 'No counties available'}
              </div>
            ) : (
              filteredOptions.map((countyName) => {
                const isSelected = selected.includes(countyName)
                return (
                  <label
                    key={countyName}
                    className={`settings-picker__option${isSelected ? ' settings-picker__option--selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(countyName)}
                    />
                    <span>{countyName}</span>
                  </label>
                )
              })
            )}
          </div>

          <div className="settings-picker__footer">
            <span>{selected.length} selected</span>
            <button
              type="button"
              className="settings-picker__clear"
              onClick={onClear}
              disabled={selected.length === 0}
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {selectedOptions.length > 0 && (
        <div className="settings-picker__chips">
          {selectedOptions.map((countyName) => (
            <span key={countyName} className="settings-picker__chip">
              <span className="settings-picker__chip-label">{countyName}</span>
              <button
                type="button"
                className="settings-picker__chip-remove"
                onClick={() => onToggle(countyName)}
                aria-label={`Remove ${countyName}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function Settings() {
  const { settings, isLoading, save } = useSiteSettings()
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail)
  const [supportPhone, setSupportPhone] = useState(settings.supportPhone)
  const [whatsappPhone, setWhatsappPhone] = useState(settings.whatsappPhone)
  const [useSeparateWhatsapp, setUseSeparateWhatsapp] = useState(
    settings.supportPhone.replace(/\D/g, '') !== settings.whatsappPhone.replace(/\D/g, ''),
  )
  const [supportAddress, setSupportAddress] = useState(settings.supportAddress)
  const [supportHours, setSupportHours] = useState(settings.supportHours)
  const initialSupportSchedule = parseSupportHours(settings.supportHours)
  const [supportFromDay, setSupportFromDay] = useState(initialSupportSchedule.fromDay)
  const [supportToDay, setSupportToDay] = useState(initialSupportSchedule.toDay)
  const [supportOpensAt, setSupportOpensAt] = useState(initialSupportSchedule.opensAt)
  const [supportClosesAt, setSupportClosesAt] = useState(initialSupportSchedule.closesAt)
  const [baseFee, setBaseFee] = useState(String(settings.baseDeliveryFee))
  const [freeThreshold, setFreeThreshold] = useState(String(settings.freeDeliveryThreshold))
  const [selectedZones, setSelectedZones] = useState(settings.activeDeliveryZones)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [formError, setFormError] = useState('')
  const normalizedSelectedZones = useMemo(
    () => kenyaCounties.filter((entry) => selectedZones.includes(entry)),
    [selectedZones],
  )
  const normalizedSavedZones = useMemo(
    () => kenyaCounties.filter((entry) => settings.activeDeliveryZones.includes(entry)),
    [settings.activeDeliveryZones],
  )

  useEffect(() => {
    const hasSeparateWhatsapp = settings.supportPhone.replace(/\D/g, '') !== settings.whatsappPhone.replace(/\D/g, '')

    setSupportEmail(settings.supportEmail)
    setSupportPhone(settings.supportPhone)
    setWhatsappPhone(settings.whatsappPhone)
    setUseSeparateWhatsapp(hasSeparateWhatsapp)
    setSupportAddress(settings.supportAddress)
    setSupportHours(settings.supportHours)
    const nextSupportSchedule = parseSupportHours(settings.supportHours)
    setSupportFromDay(nextSupportSchedule.fromDay)
    setSupportToDay(nextSupportSchedule.toDay)
    setSupportOpensAt(nextSupportSchedule.opensAt)
    setSupportClosesAt(nextSupportSchedule.closesAt)
    setBaseFee(String(settings.baseDeliveryFee))
    setFreeThreshold(String(settings.freeDeliveryThreshold))
    setSelectedZones(settings.activeDeliveryZones)
  }, [settings])

  const markDirty = () => {
    if (saveState !== 'idle') setSaveState('idle')
    if (formError) setFormError('')
  }

  const toggleCounty = (countyName: string) => {
    setSelectedZones((current) => {
      const next = current.includes(countyName)
        ? current.filter((entry) => entry !== countyName)
        : [...current, countyName]

      return kenyaCounties.filter((entry) => next.includes(entry))
    })
    markDirty()
  }

  const clearCounties = () => {
    setSelectedZones([])
    markDirty()
  }

  const updateSupportSchedule = (
    nextValues: Partial<{
      fromDay: string
      toDay: string
      opensAt: string
      closesAt: string
    }>,
  ) => {
    const nextFromDay = nextValues.fromDay ?? supportFromDay
    const nextToDay = nextValues.toDay ?? supportToDay
    const nextOpensAt = nextValues.opensAt ?? supportOpensAt
    const nextClosesAt = nextValues.closesAt ?? supportClosesAt

    setSupportFromDay(nextFromDay)
    setSupportToDay(nextToDay)
    setSupportOpensAt(nextOpensAt)
    setSupportClosesAt(nextClosesAt)
    setSupportHours(formatSupportHours(nextFromDay, nextToDay, nextOpensAt, nextClosesAt))
    markDirty()
  }

  const handleSaveSettings = async () => {
    const normalizedBaseFee = Number(baseFee)
    const normalizedFreeThreshold = Number(freeThreshold)
    const effectiveWhatsappPhone = useSeparateWhatsapp ? whatsappPhone.trim() : supportPhone.trim()

    if (!supportEmail.trim()) {
      setFormError('Support email is required.')
      setSaveState('error')
      return
    }
    if (!supportPhone.trim()) {
      setFormError('Support phone is required.')
      setSaveState('error')
      return
    }
    if (useSeparateWhatsapp && !effectiveWhatsappPhone) {
      setFormError('Enter the separate WhatsApp number or turn off the override.')
      setSaveState('error')
      return
    }
    if (!Number.isFinite(normalizedBaseFee) || normalizedBaseFee < 0) {
      setFormError('Base delivery fee must be 0 or more.')
      setSaveState('error')
      return
    }
    if (!Number.isFinite(normalizedFreeThreshold) || normalizedFreeThreshold < 0) {
      setFormError('Free delivery threshold must be 0 or more.')
      setSaveState('error')
      return
    }
    if (selectedZones.length === 0) {
      setFormError('Select at least one active delivery county.')
      setSaveState('error')
      return
    }

    setSaveState('saving')
    setFormError('')
    try {
      await save({
        supportEmail,
        supportPhone,
        whatsappPhone: effectiveWhatsappPhone,
        supportAddress,
        supportHours,
        baseDeliveryFee: normalizedBaseFee,
        freeDeliveryThreshold: normalizedFreeThreshold,
        activeDeliveryZones: selectedZones,
      })
      setSaveState('saved')
      logAdminAction({ action: 'Save system settings', entity: 'Settings' })
    } catch {
      setSaveState('error')
      setFormError('Failed to save settings. Check the backend connection and try again.')
    }
  }

  const saveLabel =
    saveState === 'saving'
      ? 'Saving...'
      : saveState === 'saved'
        ? 'Saved'
        : 'Save changes'

  const hasChanges = useMemo(
    () => (
      supportEmail.trim() !== settings.supportEmail
      || supportPhone.trim() !== settings.supportPhone
      || (useSeparateWhatsapp ? whatsappPhone.trim() : supportPhone.trim()) !== settings.whatsappPhone
      || useSeparateWhatsapp !== (settings.supportPhone.replace(/\D/g, '') !== settings.whatsappPhone.replace(/\D/g, ''))
      || supportAddress.trim() !== settings.supportAddress
      || supportHours.trim() !== settings.supportHours
      || baseFee.trim() !== String(settings.baseDeliveryFee)
      || freeThreshold.trim() !== String(settings.freeDeliveryThreshold)
      || JSON.stringify(normalizedSelectedZones) !== JSON.stringify(normalizedSavedZones)
    ),
    [
      baseFee,
      freeThreshold,
      normalizedSavedZones,
      normalizedSelectedZones,
      settings.baseDeliveryFee,
      settings.freeDeliveryThreshold,
      settings.supportAddress,
      settings.supportEmail,
      settings.supportHours,
      settings.supportPhone,
      settings.whatsappPhone,
      supportAddress,
      supportEmail,
      supportHours,
      supportPhone,
      useSeparateWhatsapp,
      whatsappPhone,
    ],
  )

  const isSaveDisabled = isLoading || saveState === 'saving'

  return (
    <div className="admin-page">
      <div className="settings-page__hero">
        <div className="cm-title-group">
          <h1>Settings Management</h1>
          <p className="cm-title-sub">Manage storefront contacts, delivery counties, and checkout rules</p>
        </div>
      </div>

      {(formError || saveState === 'saved') && (
        <div className={`settings-status settings-status--${saveState === 'saved' ? 'success' : 'error'}`}>
          {saveState === 'saved' ? 'Settings saved successfully.' : formError}
        </div>
      )}

      <div className="page-grid page-grid--2">
        <div className="form-card settings-card">
          <h2 className="card__title">Delivery & fees</h2>
          <p className="card__subtitle">These values are used in checkout and cart messaging.</p>
          <div className="form-group">
            <label htmlFor="base-fee">Base delivery fee (KSh)</label>
            <input
              id="base-fee"
              type="number"
              min="0"
              value={baseFee}
              onChange={(e) => {
                setBaseFee(e.target.value)
                markDirty()
              }}
            />
          </div>
          <div className="form-group">
            <label htmlFor="free-threshold">Free delivery threshold (KSh)</label>
            <input
              id="free-threshold"
              type="number"
              min="0"
              value={freeThreshold}
              onChange={(e) => {
                setFreeThreshold(e.target.value)
                markDirty()
              }}
            />
          </div>
          <div className="form-group">
            <div className="settings-field-header">
              <label>Active delivery counties</label>
              <span className="settings-field-count">{selectedZones.length} selected</span>
            </div>
            <p className="settings-field-note">
              Select the counties customers can choose when creating or selecting a delivery address at checkout.
            </p>
            <CountyPicker options={kenyaCounties} selected={selectedZones} onToggle={toggleCounty} onClear={clearCounties} />
          </div>
        </div>

        <div className="form-card settings-card">
          <h2 className="card__title">Notifications & Support</h2>
          <p className="card__subtitle">These details appear on the public website support surfaces.</p>
          <div className="form-group">
            <label htmlFor="support-email">Support email address</label>
            <input
              id="support-email"
              type="email"
              value={supportEmail}
              onChange={(e) => {
                setSupportEmail(e.target.value)
                markDirty()
              }}
              placeholder="support@avapharmacy.co.ke"
            />
          </div>
          <div className="form-group">
            <label htmlFor="support-phone">Support phone / WhatsApp number</label>
            <input
              id="support-phone"
              type="text"
              value={supportPhone}
              onChange={(e) => {
                const nextValue = e.target.value
                setSupportPhone(nextValue)
                if (!useSeparateWhatsapp) {
                  setWhatsappPhone(nextValue)
                }
                markDirty()
              }}
            />
            <p className="settings-field-note">This number is also used for WhatsApp unless you set a separate WhatsApp line below.</p>
          </div>
          <div className="form-group">
            <label className="settings-checkbox" htmlFor="use-separate-whatsapp">
              <input
                id="use-separate-whatsapp"
                type="checkbox"
                checked={useSeparateWhatsapp}
                onChange={(e) => {
                  const enabled = e.target.checked
                  setUseSeparateWhatsapp(enabled)
                  if (!enabled) {
                    setWhatsappPhone(supportPhone)
                  }
                  markDirty()
                }}
              />
              <span>Use a different WhatsApp number</span>
            </label>
          </div>
          {useSeparateWhatsapp && (
            <div className="form-group">
              <label htmlFor="whatsapp">Separate WhatsApp number</label>
              <input
                id="whatsapp"
                type="text"
                value={whatsappPhone}
                onChange={(e) => {
                  setWhatsappPhone(e.target.value)
                  markDirty()
                }}
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="support-address">Store location</label>
            <input
              id="support-address"
              type="text"
              value={supportAddress}
              onChange={(e) => {
                setSupportAddress(e.target.value)
                markDirty()
              }}
            />
          </div>
          <div className="form-group">
            <label htmlFor="support-hours">Support hours</label>
            <div className="settings-support-hours" id="support-hours">
              <div className="settings-support-hours__field">
                <span>From</span>
                <select
                  aria-label="Support starts on"
                  value={supportFromDay}
                  onChange={(e) => updateSupportSchedule({ fromDay: e.target.value })}
                >
                  {SUPPORT_DAY_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="settings-support-hours__field">
                <span>To</span>
                <select
                  aria-label="Support ends on"
                  value={supportToDay}
                  onChange={(e) => updateSupportSchedule({ toDay: e.target.value })}
                >
                  {SUPPORT_DAY_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="settings-support-hours__field">
                <span>Opens</span>
                <select
                  aria-label="Support opening time"
                  value={supportOpensAt}
                  onChange={(e) => updateSupportSchedule({ opensAt: e.target.value })}
                >
                  {SUPPORT_TIME_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="settings-support-hours__field">
                <span>Closes</span>
                <select
                  aria-label="Support closing time"
                  value={supportClosesAt}
                  onChange={(e) => updateSupportSchedule({ closesAt: e.target.value })}
                >
                  {SUPPORT_TIME_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
            <span className="settings-support-hours__preview">{supportHours}</span>
          </div>
          <div className="settings-inline-link">
            <span>Promotions are managed in</span>
            <Link to="/admin/deals">Deals & Discounts</Link>
          </div>
          <div className="settings-inline-link">
            <span>Escalated issues are handled in</span>
            <Link to="/admin/support">Support & Escalations</Link>
          </div>
        </div>
      </div>

      <div className="form-card settings-card settings-card--full">
        <h2 className="card__title">Storefront impact</h2>
        <p className="card__subtitle">The following areas now read from these settings.</p>
        <ul className="settings-impact-list">
          <li>Footer contact details</li>
          <li>Contact, Help, Returns, and Order Tracking support sections</li>
          <li>Cart and Checkout delivery fee calculations</li>
          <li>Header and homepage delivery-threshold messaging</li>
        </ul>
      </div>

      {(hasChanges || saveState === 'saving') && (
        <div className="settings-actions">
          <div className="settings-actions__copy">
            <strong>Unsaved changes</strong>
            <span>Review the updates above, then save them to apply across the storefront and checkout.</span>
          </div>
          <button className="btn btn--primary" onClick={() => { void handleSaveSettings() }} disabled={isSaveDisabled}>
            {saveLabel}
          </button>
        </div>
      )}
    </div>
  )
}

export default Settings
