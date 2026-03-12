import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { fetchNavCategories, fetchNavBrands, fetchNavHealthConcerns, type NavCategory, type NavBrand, type NavHealthConcern } from '../services/productService'

interface CatalogContextType {
  categories: NavCategory[]
  brands: NavBrand[]
  healthConcerns: NavHealthConcern[]
  refreshCatalog: () => void
}

const CatalogContext = createContext<CatalogContextType>({
  categories: [],
  brands: [],
  healthConcerns: [],
  refreshCatalog: () => {},
})

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<NavCategory[]>([])
  const [brands, setBrands] = useState<NavBrand[]>([])
  const [healthConcerns, setHealthConcerns] = useState<NavHealthConcern[]>([])

  const refreshCatalog = useCallback(() => {
    void fetchNavCategories().then((data) => { if (data.length > 0) setCategories(data) })
    void fetchNavBrands().then(setBrands)
    void fetchNavHealthConcerns().then(setHealthConcerns)
  }, [])

  useEffect(() => {
    refreshCatalog()
  }, [refreshCatalog])

  useEffect(() => {
    window.addEventListener('ava:catalog-updated', refreshCatalog)
    return () => window.removeEventListener('ava:catalog-updated', refreshCatalog)
  }, [refreshCatalog])

  return (
    <CatalogContext.Provider value={{ categories, brands, healthConcerns, refreshCatalog }}>
      {children}
    </CatalogContext.Provider>
  )
}

export function useCatalog() {
  return useContext(CatalogContext)
}
