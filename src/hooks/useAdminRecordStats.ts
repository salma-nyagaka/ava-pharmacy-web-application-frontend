import { useEffect, useState } from 'react'
import { apiClient } from '../lib/apiClient'

/** KPI totals deliberately omit table search, status, date and pagination params. */
export function useAdminRecordStats(section: string, scope = 'all', revision?: unknown) {
  const [result, setResult] = useState<{ key: string; counts: Record<string, number> } | null>(null)
  const [failed, setFailed] = useState(false)
  const key = `${section}:${scope}`
  useEffect(() => {
    let cancelled = false
    let sequence = 0
    const refresh = async () => {
      const request = ++sequence
      try {
        const response = await apiClient.get('/admin/record-stats/', { params: { section, scope } })
        if (cancelled || request !== sequence) return
        const data = response.data?.data ?? response.data
        setResult({ key, counts: Object.fromEntries(Object.entries(data).map(([name, value]) => [name, Number(value)])) })
        setFailed(false)
      } catch { if (!cancelled && request === sequence) setFailed(true) }
    }
    void refresh()
    const interval = window.setInterval(() => { void refresh() }, 30000)
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)
    return () => { cancelled = true; window.clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [section, scope, revision])
  const counts = result?.key === key ? result.counts : null
  const count = (name: string): number | string => failed ? 'Unavailable' : counts?.[name] ?? '—'
  return { counts, count, ready: !!counts && !failed }
}
