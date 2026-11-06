import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { fetchNavCategories, fetchNavBrands, fetchNavHealthConcerns, type NavCategory, type NavBrand, type NavHealthConcern } from '../services/productService'

interface CatalogContextType {
  categories: NavCategory[]
  brands: NavBrand[]
  healthConcerns: NavHealthConcern[]
  loading: boolean
  error: string | null
  refreshCatalog: (force?: boolean) => Promise<void>
}

type CatalogSnapshot = Pick<CatalogContextType, 'categories' | 'brands' | 'healthConcerns'>

let cachedCatalog: CatalogSnapshot | null = null
let catalogRequest: Promise<CatalogSnapshot> | null = null

function loadCatalog(force = false): Promise<CatalogSnapshot> {
  if (!force && cachedCatalog) return Promise.resolve(cachedCatalog)
  if (!force && catalogRequest) return catalogRequest

  catalogRequest = Promise.all([
    fetchNavCategories(),
    fetchNavBrands(),
    fetchNavHealthConcerns(),
  ]).then(([categories, brands, healthConcerns]) => {
    cachedCatalog = { categories, brands, healthConcerns }
    return cachedCatalog
  }).finally(() => {
    catalogRequest = null
  })

  return catalogRequest
}

const CatalogContext = createContext<CatalogContextType>({
  categories: [],
  brands: [],
  healthConcerns: [],
  loading: true,
  error: null,
  refreshCatalog: async () => {},
})

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<NavCategory[]>(cachedCatalog?.categories ?? [])
  const [brands, setBrands] = useState<NavBrand[]>(cachedCatalog?.brands ?? [])
  const [healthConcerns, setHealthConcerns] = useState<NavHealthConcern[]>(cachedCatalog?.healthConcerns ?? [])
  const [loading, setLoading] = useState(!cachedCatalog)
  const [error, setError] = useState<string | null>(null)

  const refreshCatalog = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const snapshot = await loadCatalog(force)
      setCategories(snapshot.categories)
      setBrands(snapshot.brands)
      setHealthConcerns(snapshot.healthConcerns)
    } catch {
      setError('The catalogue could not be loaded. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshCatalog()
  }, [refreshCatalog])

  useEffect(() => {
    const handleCatalogUpdated = () => { void refreshCatalog(true) }
    window.addEventListener('ava:catalog-updated', handleCatalogUpdated)
    return () => window.removeEventListener('ava:catalog-updated', handleCatalogUpdated)
  }, [refreshCatalog])

  return (
    <CatalogContext.Provider value={{ categories, brands, healthConcerns, loading, error, refreshCatalog }}>
      {children}
    </CatalogContext.Provider>
  )
}

export function useCatalog() {
  return useContext(CatalogContext)
}
