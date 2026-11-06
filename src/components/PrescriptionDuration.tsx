import { useState } from 'react'

type Unit = 'days' | 'weeks' | 'months'
const denominators = { days: '7', weeks: '52', months: '12' }
function parse(text: string): { value: string; unit: Unit } | null {
  let match = text.match(/^(\d+)\/(7|52|12)$/)
  if (match) return { value: match[1], unit: match[2] === '7' ? 'days' : match[2] === '52' ? 'weeks' : 'months' }
  match = text.match(/^(\d+)\s+(day|week|month)s?(?:\s*\(\d+\/(?:7|52|12)\))?$/i)
  return match ? { value: match[1], unit: `${match[2].toLowerCase()}s` as Unit } : null
}

export default function PrescriptionDuration({ value, disabled, onChange }: { value: string; disabled?: boolean; onChange: (value: string) => void }) {
  const parsed = parse(value)
  const [emptyUnit, setEmptyUnit] = useState<Unit>('days')
  const unit = parsed?.unit ?? emptyUnit
  const change = (amount: string, nextUnit: Unit) => {
    setEmptyUnit(nextUnit)
    onChange(amount ? `${amount}/${denominators[nextUnit]}` : '')
  }
  return <div style={{ minWidth: 120 }}>
    <div style={{ display: 'flex', gap: 4 }}>
      <input aria-label="Duration value" type="number" required min={1} max={999} step={1} disabled={disabled} value={parsed?.value ?? ''} onChange={event => change(event.target.value, unit)} style={{ minWidth: 50, width: '50%' }} />
      <select aria-label="Duration unit" disabled={disabled} value={unit} onChange={event => change(parsed?.value ?? '', event.target.value as Unit)}>
        <option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option>
      </select>
    </div>
    <small>{parsed ? `${parsed.value} ${Number(parsed.value) === 1 ? unit.slice(0, -1) : unit} (${parsed.value}/${denominators[unit]})` : value ? `Previous duration: ${value}. Select a value and unit to update.` : 'Enter duration'}</small>
  </div>
}
