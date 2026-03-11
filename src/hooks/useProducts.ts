import { useState, useEffect, useCallback } from 'react'
import { fetchProducts, type Product, type ProductFilters } from '../services/productService'
import type { CatalogProduct } from '../data/products'
import type { StockSource } from '../data/cart'

function mapStockSource(inventoryStatus: string): StockSource {
  if (inventoryStatus === 'in_stock') return 'branch'
  if (inventoryStatus === 'low_stock') return 'branch'
  if (inventoryStatus === 'backorder') return 'warehouse'
  return 'out'
}

export function mapApiProduct(p: Product): CatalogProduct {
  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    brand: p.brand_name ?? '',
    category: p.category_name ?? '',
    categorySlug: p.category_slug ?? '',
    subcategorySlugs: [],
    price: parseFloat(p.final_price ?? p.price ?? '0'),
    originalPrice: p.original_price ? parseFloat(p.original_price) : null,
    image: p.image ?? '',
    gallery: [],
    rating: p.average_rating ?? 0,
    reviews: p.review_count ?? 0,
    badge: p.badge ?? null,
    stockSource: mapStockSource(p.inventory_status ?? ''),
    shortDescription: p.short_description ?? '',
    description: '',
    features: [],
    directions: '',
    warnings: '',
  }
}

export function useProducts(filters: ProductFilters = {}) {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<Record<string, unknown>>({})

  const filtersKey = JSON.stringify(filters)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, meta: m } = await fetchProducts(filters)
      setProducts(data.map(mapApiProduct))
      setMeta(m)
    } catch (err) {
      setError('Failed to load products.')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  useEffect(() => {
    void load()
  }, [load])

  return { products, loading, error, meta, reload: load }
}
