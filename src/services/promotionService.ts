import { apiClient, resolveMediaUrl } from '../lib/apiClient'
import type { CatalogProduct } from '../data/products'

export type PromotionScope = 'all' | 'category' | 'brand' | 'product'
export type PromotionType = 'percentage' | 'amount'
export type PromotionStatus = 'active' | 'draft'

export interface PromotionRecord {
  id: number
  title: string
  code: string | null
  description: string
  image: string | null
  type: PromotionType
  value: string
  scope: PromotionScope
  targets: string[]
  badge: string
  priority: number
  is_stackable: boolean
  minimum_order_amount: string
  start_date: string
  end_date: string
  status: PromotionStatus
  is_currently_active: boolean
  created_at: string
  updated_at: string
}

function unwrapList<T>(raw: unknown): T[] {
  const payload = raw as { data?: unknown; results?: unknown }
  const inner = payload?.data ?? raw
  if (Array.isArray(inner)) return inner as T[]
  if (inner && typeof inner === 'object' && Array.isArray((inner as { results?: T[] }).results)) {
    return (inner as { results: T[] }).results
  }
  return []
}

function normalizePromotion(promotion: PromotionRecord): PromotionRecord {
  return {
    ...promotion,
    image: resolveMediaUrl(promotion.image),
  }
}

function normalizeValue(value: string | number | null | undefined): string {
  if (typeof value === 'number') return String(value)
  return value?.trim().toLowerCase() ?? ''
}

export function promotionMatchesProduct(promotion: Pick<PromotionRecord, 'scope' | 'targets'>, product: CatalogProduct): boolean {
  const normalizedTargets = new Set((promotion.targets ?? []).map(normalizeValue).filter(Boolean))

  if (promotion.scope === 'all') return true
  if (normalizedTargets.size === 0) return false

  if (promotion.scope === 'category') {
    return normalizedTargets.has(normalizeValue(product.categorySlug))
  }

  if (promotion.scope === 'brand') {
    return normalizedTargets.has(normalizeValue(product.brandSlug))
  }

  return [
    normalizeValue(product.id),
    normalizeValue(product.slug),
    normalizeValue(product.sku),
  ].some((candidate) => normalizedTargets.has(candidate))
}

export function filterProductsByPromotion(products: CatalogProduct[], promotion: Pick<PromotionRecord, 'scope' | 'targets'> | null): CatalogProduct[] {
  if (!promotion) return products
  return products.filter((product) => promotionMatchesProduct(promotion, product))
}

export function getPromotionScopeEyebrow(promotion: Pick<PromotionRecord, 'scope' | 'targets'>): string {
  if (promotion.scope === 'all') return 'Storewide offer'
  if (promotion.scope === 'category') return promotion.targets.length > 1 ? 'Category event' : 'Category spotlight'
  if (promotion.scope === 'brand') return promotion.targets.length > 1 ? 'Brand event' : 'Brand spotlight'
  return promotion.targets.length > 1 ? 'Selected products' : 'Product spotlight'
}

export function buildPromotionSummary(promotion: Pick<PromotionRecord, 'description' | 'badge' | 'scope' | 'targets' | 'type' | 'value'>, matchingProductCount = 0): string {
  const description = promotion.description?.trim()
  if (description) return description

  const numericValue = Number(promotion.value)
  const discountLabel = promotion.badge?.trim()
    || (promotion.type === 'amount'
      ? `Save KSh ${numericValue.toLocaleString()}`
      : `${numericValue}% off`)

  if (promotion.scope === 'all') {
    return `${discountLabel} across the catalogue on a rotating set of everyday essentials.`
  }

  if (promotion.scope === 'category') {
    return `${discountLabel} on ${promotion.targets.length > 1 ? 'selected categories' : 'a featured category'} while the campaign is live.`
  }

  if (promotion.scope === 'brand') {
    return `${discountLabel} on ${promotion.targets.length > 1 ? 'participating brands' : 'a featured brand'} with ${matchingProductCount} discounted line${matchingProductCount === 1 ? '' : 's'} currently in the offer.`
  }

  return `${discountLabel} on ${promotion.targets.length > 1 ? 'selected products' : 'a highlighted product'} for a limited time.`
}

export async function fetchPromotions(): Promise<PromotionRecord[]> {
  const res = await apiClient.get('/promotions/')
  return unwrapList<PromotionRecord>(res.data).map(normalizePromotion)
}
