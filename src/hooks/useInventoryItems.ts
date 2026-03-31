import { useCallback, useEffect, useState } from 'react'
import { fetchInventoryItems, type FetchProductsOptions, type InventoryItem, type ProductFilters } from '../services/productService'
import type { CatalogProduct } from '../data/products'
import type { StockSource } from '../data/cart'

function mapStockSource(inventoryStatus: string): StockSource {
  if (inventoryStatus === 'in_stock') return 'branch'
  if (inventoryStatus === 'low_stock') return 'branch'
  if (inventoryStatus === 'backorder') return 'warehouse'
  return 'out'
}

export function mapInventoryItem(item: InventoryItem): CatalogProduct {
  return {
    id: item.id,
    productId: item.product_id,
    variantId: item.id,
    slug: item.product_slug ?? item.slug,
    sku: item.sku,
    name: item.name,
    brand: item.brand_name ?? '',
    brandSlug: item.brand_slug ?? '',
    category: item.category_name ?? '',
    categorySlug: item.category_slug ?? '',
    subcategorySlugs: [],
    price: parseFloat(item.final_price ?? item.price ?? '0'),
    originalPrice: item.original_price ? parseFloat(item.original_price) : null,
    image: item.image ?? '',
    gallery: item.image ? [item.image] : [],
    rating: item.average_rating ?? 0,
    reviews: item.review_count ?? 0,
    badge: item.badge ?? null,
    stockSource: mapStockSource(item.inventory_status ?? ''),
    shortDescription: item.short_description ?? '',
    description: '',
    features: [],
    directions: '',
    warnings: '',
    requiresPrescription: item.requires_prescription ?? false,
  }
}

export function useInventoryItems(filters: ProductFilters = {}, options: FetchProductsOptions = {}) {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<Record<string, unknown>>({})

  const filtersKey = JSON.stringify(filters)
  const optionsKey = JSON.stringify(options)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, meta: m } = await fetchInventoryItems(filters, options)
      setProducts(data.map(mapInventoryItem))
      setMeta(m)
    } catch {
      setError('Failed to load inventory items.')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, optionsKey])

  useEffect(() => {
    void load()
  }, [load])

  return { products, loading, error, meta, reload: load }
}
