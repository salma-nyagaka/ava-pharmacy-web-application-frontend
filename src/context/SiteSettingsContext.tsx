import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_SITE_SETTINGS,
  fetchSiteSettings,
  loadCachedSiteSettings,
  SiteSettings,
  SiteSettingsUpdatePayload,
  updateSiteSettings,
} from '../services/siteSettingsService'

interface SiteSettingsContextValue {
  settings: SiteSettings
  isLoading: boolean
  error: string
  refresh: () => Promise<void>
  save: (payload: SiteSettingsUpdatePayload) => Promise<SiteSettings>
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined)

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(() => loadCachedSiteSettings())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setError('')
    try {
      const next = await fetchSiteSettings()
      setSettings(next)
    } catch {
      setError('Failed to load site settings.')
      setSettings((current) => current ?? { ...DEFAULT_SITE_SETTINGS })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const save = useCallback(async (payload: SiteSettingsUpdatePayload) => {
    const next = await updateSiteSettings(payload)
    setSettings(next)
    setError('')
    return next
  }, [])

  useEffect(() => {
    void refresh()
  }, [])

  const value = useMemo(
    () => ({ settings, isLoading, error, refresh, save }),
    [settings, isLoading, error, refresh, save],
  )

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext)
  if (!context) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider')
  }
  return context
}
