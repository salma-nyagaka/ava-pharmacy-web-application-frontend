import { useSearchParams } from 'react-router-dom'

/** Keep workspace navigation addressable, refresh-safe and compatible with Back. */
export function useWorkspaceView<T extends string>(allowed: readonly T[], defaultView: T) {
  const [params, setParams] = useSearchParams()
  const raw = params.get('view') as T | null
  const view = raw && allowed.includes(raw) ? raw : defaultView
  const setView = (next: T) => {
    if (!allowed.includes(next)) return
    setParams((current) => {
      const updated = new URLSearchParams(current)
      if (next === defaultView) updated.delete('view')
      else updated.set('view', next)
      return updated
    })
  }
  return [view, setView] as const
}
