import { apiClient } from '../lib/apiClient'

export interface Product {
  id: number
  sku: string
  slug: string
  name: string
  brand_name: string
  brand_slug: string
  category_name: string
  category_slug: string
  price: string
  original_price: string | null
  final_price: string
  discount_total: string
  active_promotions: unknown[]
  image: string | null
  badge: string | null
  short_description: string
  average_rating: number
  review_count: number
  requires_prescription: boolean
  inventory_status: string
  available_quantity: number
  can_purchase: boolean
  has_variants: boolean
  is_featured: boolean
  is_active: boolean
}

export interface ProductDetail extends Product {
  brand: { id: number; name: string; slug: string; logo: string | null }
  category: { id: number; name: string; slug: string }
  gallery: { id: number; image: string; alt_text: string; order: number }[]
  variants: unknown[]
  description: string
  features: string
  directions: string
  warnings: string
  created_at: string
  updated_at: string
}

export interface ProductListResponse {
  results: Product[]
  count: number
  next: string | null
  previous: string | null
}

export interface ProductFilters {
  category?: string
  subcategory?: string
  brand?: string
  health_concern?: string
  search?: string
  ordering?: string
  page?: number
  page_size?: number
  min_price?: number
  max_price?: number
  requires_prescription?: boolean
  is_featured?: boolean
}

export interface NavBrand {
  id: number
  name: string
  slug: string
  logo: string | null
}

export interface NavHealthConcern {
  id: number
  name: string
  slug: string
  icon: string
}

export async function fetchProducts(filters: ProductFilters = {}): Promise<{ data: Product[]; meta: Record<string, unknown> }> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  )
  const res = await apiClient.get('/products/', { params })
  return { data: res.data?.data ?? [], meta: res.data?.meta ?? {} }
}

export async function fetchProductBySlug(slug: string): Promise<ProductDetail> {
  const res = await apiClient.get(`/products/${slug}/`)
  return res.data?.data ?? res.data
}

export async function fetchProductById(id: number): Promise<ProductDetail> {
  const res = await apiClient.get(`/products/id/${id}/`)
  return res.data?.data ?? res.data
}

export async function searchProducts(query: string, filters: ProductFilters = {}): Promise<{ data: Product[]; meta: Record<string, unknown>; facets: unknown }> {
  const params = { q: query, ...filters }
  const res = await apiClient.get('/products/search/', { params })
  return { data: res.data?.data ?? [], meta: res.data?.meta ?? {}, facets: res.data?.facets ?? {} }
}

export async function fetchSuggestions(query: string): Promise<string[]> {
  if (query.length < 2) return []
  const res = await apiClient.get('/products/search/suggestions/', { params: { q: query } })
  return res.data?.data ?? []
}

export async function fetchCategories(): Promise<unknown[]> {
  const res = await apiClient.get('/products/categories/')
  return res.data?.data ?? []
}

export interface NavSubcategory {
  name: string
  slug: string
}

export interface NavCategory {
  id: number
  name: string
  slug: string
  image: string | null
  description: string
  path: string
  subcategories: NavSubcategory[]
}

export async function fetchNavCategories(): Promise<NavCategory[]> {
  try {
    const res = await apiClient.get('/product-categories/')
    const raw: Array<{
      id: number
      name: string
      slug: string
      image: string | null
      description: string
      is_active: boolean
      subcategories?: Array<{ id: number; name: string; slug: string; is_active: boolean }>
    }> = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data?.results)
        ? res.data.results
        : Array.isArray(res.data)
          ? res.data
          : []

    return raw
      .filter((c) => c.is_active)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        image: c.image,
        description: c.description ?? '',
        path: `/products?category=${c.slug}`,
        subcategories: (c.subcategories ?? [])
          .filter((s) => s.is_active)
          .map((s) => ({ name: s.name, slug: s.slug })),
      }))
  } catch {
    return []
  }
}

export async function fetchNavBrands(): Promise<NavBrand[]> {
  try {
    const res = await apiClient.get('/brands/')
    const raw: Array<{ id: number; name: string; slug: string; logo: string | null; is_active: boolean }> =
      Array.isArray(res.data?.data) ? res.data.data
      : Array.isArray(res.data?.results) ? res.data.results
      : Array.isArray(res.data) ? res.data
      : []
    return raw.filter((b) => b.is_active).map((b) => ({ id: b.id, name: b.name, slug: b.slug, logo: b.logo }))
  } catch {
    return []
  }
}

export async function fetchNavHealthConcerns(): Promise<NavHealthConcern[]> {
  try {
    const res = await apiClient.get('/health-concerns/')
    const raw: Array<{ id: number; name: string; slug: string; icon: string; is_active: boolean }> =
      Array.isArray(res.data?.data) ? res.data.data
      : Array.isArray(res.data?.results) ? res.data.results
      : Array.isArray(res.data) ? res.data
      : []
    return raw.filter((c) => c.is_active).map((c) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon ?? '' }))
  } catch {
    return []
  }
}

export async function fetchBrands(): Promise<unknown[]> {
  const res = await apiClient.get('/products/brands/')
  return res.data?.data ?? []
}

export async function fetchFeaturedProducts(): Promise<Product[]> {
  const res = await apiClient.get('/products/', { params: { is_featured: true, page_size: 12 } })
  return res.data?.data ?? []
}

export async function fetchBanners(): Promise<unknown[]> {
  const res = await apiClient.get('/products/banners/')
  return res.data?.data ?? []
}

export async function fetchProductReviews(productId: number): Promise<unknown[]> {
  const res = await apiClient.get(`/products/${productId}/reviews/`)
  return res.data?.data ?? []
}

export async function submitProductReview(productId: number, payload: { rating: number; comment: string }): Promise<unknown> {
  const res = await apiClient.post(`/products/${productId}/reviews/`, payload)
  return res.data?.data ?? res.data
}

export async function toggleWishlist(productId: number): Promise<unknown> {
  const res = await apiClient.post('/products/wishlist/', { product_id: productId })
  return res.data?.data ?? res.data
}

export async function fetchWishlist(): Promise<unknown[]> {
  const res = await apiClient.get('/products/wishlist/')
  return res.data?.data ?? []
}

export async function removeFromWishlist(id: number): Promise<void> {
  await apiClient.delete(`/products/wishlist/${id}/`)
}
