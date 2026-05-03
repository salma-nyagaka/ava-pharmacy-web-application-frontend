import { useCallback, useEffect, useState } from 'react'
import { fetchPromotions, type PromotionRecord } from '../services/promotionService'

export function usePromotions() {
  const [promotions, setPromotions] = useState<PromotionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPromotions(await fetchPromotions())
    } catch {
      setError('Failed to load promotions.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { promotions, loading, error, reload: load }
}
