import { useCatalog } from '../context/CatalogContext'
import type { NavCategory } from '../services/productService'

export function useCategories(): NavCategory[] {
  return useCatalog().categories
}
