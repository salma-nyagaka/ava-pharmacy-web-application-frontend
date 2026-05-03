export type PromotionScope = 'all' | 'category' | 'brand' | 'product'
export type PromotionType = 'percentage' | 'amount'
export type PromotionStatus = 'active' | 'draft'

export interface Promotion {
  id: string
  title: string
  type: PromotionType
  value: number
  scope: PromotionScope
  targets: string[]
  startDate: string
  endDate: string
  status: PromotionStatus
  badge?: string
}

export interface PromotionProduct {
  id: number
  name: string
  brand?: string
  category?: string
  price: number
  originalPrice?: number | null
  badge?: string | null
}

const STORAGE_KEY = 'ava_promotions'

const defaultPromotions: Promotion[] = [
  {
    id: 'promo-001',
    title: 'Wellness Week',
    type: 'percentage',
    value: 15,
    scope: 'category',
    targets: ['Health & Wellness'],
    startDate: '2026-02-01',
    endDate: '2026-02-15',
    status: 'active',
    badge: '15% Off',
  },
  {
    id: 'promo-002',
    title: 'Baby Care Essentials',
    type: 'amount',
    value: 300,
    scope: 'category',
    targets: ['Mother & Baby Care'],
    startDate: '2026-02-01',
    endDate: '2026-02-28',
    status: 'active',
    badge: 'KSh 300 Off',
  },
]

const safeParse = (value: string | null) => {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export const loadPromotions = (): Promotion[] => {
  if (typeof window === 'undefined') {
    return defaultPromotions
  }

  const stored = safeParse(window.localStorage.getItem(STORAGE_KEY))
  if (!stored || !Array.isArray(stored)) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPromotions))
    return defaultPromotions
  }

  return stored as Promotion[]
}

export const savePromotions = (promotions: Promotion[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(promotions))
}

const isDateBefore = (value: string, compare: Date) => {
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed < compare
}

const isDateAfter = (value: string, compare: Date) => {
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed > compare
}

export type PromotionDerivedStatus = 'active' | 'scheduled' | 'expired' | 'draft'

export const getPromotionStatus = (promotion: Promotion, now = new Date()): PromotionDerivedStatus => {
  if (promotion.status === 'draft') return 'draft'
  if (promotion.startDate && isDateAfter(promotion.startDate, now)) return 'scheduled'
  if (promotion.endDate && isDateBefore(promotion.endDate, now)) return 'expired'
  return 'active'
}

export const getPromotionBadge = (promotion: Promotion) => {
  if (promotion.badge) return promotion.badge
  if (promotion.type === 'percentage') {
    return `${promotion.value}% Off`
  }
  return `KSh ${promotion.value} Off`
}

const matchesPromotion = (promotion: Promotion, product: PromotionProduct) => {
  if (promotion.scope === 'all') return true
  if (promotion.scope === 'category') {
    return Boolean(product.category && promotion.targets.includes(product.category))
  }
  if (promotion.scope === 'brand') {
    return Boolean(product.brand && promotion.targets.includes(product.brand))
  }
  if (promotion.scope === 'product') {
    return promotion.targets.includes(product.name)
  }
  return false
}

const getDiscountAmount = (price: number, promotion: Promotion) => {
  if (promotion.type === 'percentage') {
    return (price * promotion.value) / 100
  }
  return promotion.value
}

export const applyPromotionsToProduct = <T extends PromotionProduct>(
  product: T,
  promotions: Promotion[]
) => {
  const basePrice = product.originalPrice ?? product.price
  const activePromotions = promotions.filter(
    (promotion) =>
      getPromotionStatus(promotion) === 'active' &&
      matchesPromotion(promotion, product)
  )

  if (activePromotions.length === 0) {
    return product
  }

  const bestPromotion = activePromotions.reduce((best, current) => {
    const bestDiscount = getDiscountAmount(basePrice, best)
    const currentDiscount = getDiscountAmount(basePrice, current)
    return currentDiscount > bestDiscount ? current : best
  })

  const discounted = Math.max(basePrice - getDiscountAmount(basePrice, bestPromotion), 0)

  return {
    ...product,
    price: Math.round(discounted),
    originalPrice: basePrice,
    badge: getPromotionBadge(bestPromotion),
  }
}
