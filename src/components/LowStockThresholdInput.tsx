import { useId, useState, type InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement>

/** Keep threshold drafts editable, but only accept whole, non-negative counts. */
export default function LowStockThresholdInput({ onChange, onKeyDown, onPaste, ...props }: Props) {
  const [invalidAttempt, setInvalidAttempt] = useState(false)
  const messageId = useId()
  return <>
    <input {...props} type="text" inputMode="numeric" pattern="[0-9]*"
      aria-invalid={invalidAttempt || props['aria-invalid']}
      aria-describedby={[props['aria-describedby'], invalidAttempt ? messageId : ''].filter(Boolean).join(' ') || undefined}
      onKeyDown={event => {
        if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1 && !/^[0-9]$/.test(event.key)) {
          event.preventDefault()
          setInvalidAttempt(true)
        }
        onKeyDown?.(event)
      }}
      onPaste={event => {
        if (!/^[0-9]*$/.test(event.clipboardData.getData('text'))) {
          event.preventDefault()
          setInvalidAttempt(true)
        }
        onPaste?.(event)
      }}
      onChange={event => {
        if (!/^[0-9]*$/.test(event.target.value)) {
          setInvalidAttempt(true)
          return
        }
        setInvalidAttempt(false)
        onChange?.(event)
      }}
    />
    {invalidAttempt && <span id={messageId} role="alert" style={{ color: '#b91c1c', fontSize: '.75rem', lineHeight: 1.5 }}>Enter a whole number of 0 or more. Letters, minus signs, and decimals are not allowed.</span>}
  </>
}
