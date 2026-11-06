import { useEffect, useRef, useState } from 'react'
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
    avaCaptchaLoaded?: () => void
  }
}

type TurnstileChallengeProps = {
  action: string
  onToken: (token: string) => void
  resetKey?: number
  className?: string
}

const SITE_KEY = (CAPTCHA_PROVIDER === 'hcaptcha' ? HCAPTCHA_SITE_KEY : TURNSTILE_SITE_KEY).trim()
const SCRIPT_ID = `ava-${CAPTCHA_PROVIDER}-script`
const READY_EVENT = 'ava-captcha-ready'
let sdkReady = false
const SCRIPT_SRC = CAPTCHA_PROVIDER === 'hcaptcha' ? 'https://js.hcaptcha.com/1/api.js?render=explicit&onload=avaCaptchaLoaded' : 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=avaCaptchaLoaded'

function loadTurnstileScript() {
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
  if (existing) return existing

  sdkReady = false
  window.avaCaptchaLoaded = () => {
    sdkReady = true
    window.dispatchEvent(new Event(READY_EVENT))
  }
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
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return

    setStatus('loading')
    let cancelled = false
    const script = loadTurnstileScript()

    const fail = () => {
      if (cancelled) return
      onToken('')
      setStatus('failed')
    }
    const timeout = window.setTimeout(fail, 15000)
    const renderWidget = () => {
      const api = window[CAPTCHA_PROVIDER === 'hcaptcha' ? 'hcaptcha' : 'turnstile']
      if (cancelled || !containerRef.current || !api || widgetIdRef.current !== null) return
      window.clearTimeout(timeout)
      try {
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: SITE_KEY,
          action,
          callback: (token) => {
            if (cancelled) return
            setStatus('ready')
            onToken(token)
          },
          'expired-callback': fail,
          'error-callback': fail,
        })
        setStatus((current) => current === 'failed' ? current : 'ready')
      } catch { fail() }
    }

    script.addEventListener('error', fail)
    if (sdkReady) {
      renderWidget()
    } else {
      window.addEventListener(READY_EVENT, renderWidget)
    }

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      script.removeEventListener('error', fail)
      window.removeEventListener(READY_EVENT, renderWidget)
      if (widgetIdRef.current !== null && window[CAPTCHA_PROVIDER === 'hcaptcha' ? 'hcaptcha' : 'turnstile']) {
        window[CAPTCHA_PROVIDER === 'hcaptcha' ? 'hcaptcha' : 'turnstile']?.remove(widgetIdRef.current)
      }
      widgetIdRef.current = null
      onToken('')
    }
  }, [action, onToken, resetKey, attempt])

  if (!SITE_KEY) return <p role="alert">Security verification is unavailable. Please contact support for help signing in.</p>

  return (
    <div className={className}>
      <div ref={containerRef} />
      {status === 'loading' && <p role="status">Loading security verification…</p>}
      {status === 'failed' && (
        <div role="alert">
          <p>Security verification could not load or complete. Check your connection and try again.</p>
          <button type="button" onClick={() => {
            const api = window[CAPTCHA_PROVIDER === 'hcaptcha' ? 'hcaptcha' : 'turnstile']
            if (!api || !sdkReady) document.getElementById(SCRIPT_ID)?.remove()
            setAttempt((value) => value + 1)
          }}>Retry security verification</button>
        </div>
      )}
    </div>
  )
}
