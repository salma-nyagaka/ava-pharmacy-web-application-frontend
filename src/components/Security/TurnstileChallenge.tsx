import { useEffect, useRef } from 'react'
import { CAPTCHA_PROVIDER, HCAPTCHA_SITE_KEY, TURNSTILE_SITE_KEY } from '../../services/botProtectionService'

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
    hcaptcha?: TurnstileApi
  }
}

type TurnstileChallengeProps = {
  action: string
  onToken: (token: string) => void
  resetKey?: number
  className?: string
}

const SITE_KEY = CAPTCHA_PROVIDER === 'hcaptcha' ? HCAPTCHA_SITE_KEY : TURNSTILE_SITE_KEY
const SCRIPT_ID = `ava-${CAPTCHA_PROVIDER}-script`
const SCRIPT_SRC = CAPTCHA_PROVIDER === 'hcaptcha' ? 'https://js.hcaptcha.com/1/api.js?render=explicit' : 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

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
    if (!SITE_KEY || !containerRef.current) return

    let cancelled = false
    const script = loadTurnstileScript()

    const renderWidget = () => {
      const api = window[CAPTCHA_PROVIDER === 'hcaptcha' ? 'hcaptcha' : 'turnstile']
      if (cancelled || !containerRef.current || !api || widgetIdRef.current) return
      widgetIdRef.current = api.render(containerRef.current, {
        sitekey: SITE_KEY,
        action,
        callback: onToken,
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      })
    }

    if (window[CAPTCHA_PROVIDER === 'hcaptcha' ? 'hcaptcha' : 'turnstile']) {
      renderWidget()
    } else {
      script.addEventListener('load', renderWidget)
    }

    return () => {
      cancelled = true
      script.removeEventListener('load', renderWidget)
      if (widgetIdRef.current && window[CAPTCHA_PROVIDER === 'hcaptcha' ? 'hcaptcha' : 'turnstile']) {
        window[CAPTCHA_PROVIDER === 'hcaptcha' ? 'hcaptcha' : 'turnstile']?.remove(widgetIdRef.current)
      }
      widgetIdRef.current = null
      onToken('')
    }
  }, [action, onToken, resetKey])

  if (!SITE_KEY) return null

  return <div className={className} ref={containerRef} />
}
