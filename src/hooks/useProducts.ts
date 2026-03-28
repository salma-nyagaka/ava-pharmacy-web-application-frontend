import { useState, useEffect, useCallback } from 'react'
import { fetchProducts, type FetchProductsOptions, type Product, type ProductDetail, type ProductFilters } from '../services/productService'
import type { CatalogProduct } from '../data/products'
import type { StockSource } from '../data/cart'

function mapStockSource(inventoryStatus: string): StockSource {
  if (inventoryStatus === 'in_stock') return 'branch'
  if (inventoryStatus === 'low_stock') return 'branch'
  if (inventoryStatus === 'backorder') return 'warehouse'
  return 'out'
}

function parseFeatureLines(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n|[•·]/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  return []
}

export function mapApiProduct(p: Product | ProductDetail): CatalogProduct {
  const detail = p as Partial<ProductDetail>
  const gallery = Array.isArray(detail.gallery)
    ? detail.gallery.map((entry) => entry.image).filter(Boolean)
    : []
  const brandName = p.brand_name ?? detail.brand?.name ?? ''
  const brandSlug = p.brand_slug ?? detail.brand?.slug ?? ''
  const categoryName = p.category_name ?? detail.category?.name ?? ''
  const categorySlug = p.category_slug ?? detail.category?.slug ?? ''

  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    brand: brandName,
    brandSlug,
    category: categoryName,
    categorySlug,
    subcategorySlugs: [],
    price: parseFloat(p.final_price ?? p.price ?? '0'),
    originalPrice: p.original_price ? parseFloat(p.original_price) : null,
    image: p.image ?? '',
    gallery,
    rating: p.average_rating ?? 0,
    reviews: p.review_count ?? 0,
    badge: p.badge ?? null,
    stockSource: mapStockSource(p.inventory_status ?? ''),
    shortDescription: p.short_description ?? '',
    description: detail.description ?? '',
    features: parseFeatureLines(detail.features),
    directions: detail.directions ?? '',
    warnings: detail.warnings ?? '',
    requiresPrescription: p.requires_prescription ?? false,
  }
}

export function useProducts(filters: ProductFilters = {}, options: FetchProductsOptions = {}) {
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
      const { data, meta: m } = await fetchProducts(filters, options)
      setProducts(data.map(mapApiProduct))
      setMeta(m)
    } catch (err) {
      setError('Failed to load products.')
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
