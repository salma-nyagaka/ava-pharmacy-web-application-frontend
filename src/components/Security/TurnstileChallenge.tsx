import { useEffect, useRef } from 'react'
import { TURNSTILE_SITE_KEY } from '../../services/botProtectionService'

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      action?: string
      callback: (token: string) => void
      'expired-callback': () => void
      'error-callback': () => void
    },
  ) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

type TurnstileChallengeProps = {
  action: string
  onToken: (token: string) => void
  resetKey?: number
  className?: string
}

const SCRIPT_ID = 'ava-turnstile-script'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

function loadTurnstileScript() {
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
  if (existing) return existing

  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.src = SCRIPT_SRC
  script.async = true
  script.defer = true
  document.head.appendChild(script)
  return script
}

export function TurnstileChallenge({ action, onToken, resetKey = 0, className }: TurnstileChallengeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !containerRef.current) return

    let cancelled = false
    const script = loadTurnstileScript()

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        action,
        callback: onToken,
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      })
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      script.addEventListener('load', renderWidget)
    }

    return () => {
      cancelled = true
      script.removeEventListener('load', renderWidget)
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
      }
      widgetIdRef.current = null
      onToken('')
    }
  }, [action, onToken, resetKey])

  if (!TURNSTILE_SITE_KEY) return null

  return <div className={className} ref={containerRef} />
}
