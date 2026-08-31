export interface Banner {
  id: string
  title?: string
  message: string
  link?: string
  image?: string | null
  category?: number | null
  category_slug?: string | null
  category_name?: string | null
  target_url?: string
  placement?: string
  sort_order?: number
  status: 'active' | 'inactive'
}

const STORAGE_KEY = 'ava_banners'

const defaultBanners: Banner[] = [
  {
    id: 'banner-001',
    title: 'Free delivery',
    message: 'Free delivery for orders above KSh 2500/-',
    link: '/offers',
    image: null,
    placement: 'home_hero',
    sort_order: 0,
    status: 'active',
  },
]

const isExternalLink = (value: string) => /^https?:\/\//i.test(value)

const getCategoryTarget = (categorySlug?: string | null): string | undefined =>
  categorySlug ? `/products?category=${encodeURIComponent(categorySlug)}` : undefined

export const normalizeBannerLink = (link?: string): string | undefined => {
  if (!link) return undefined
  const trimmed = link.trim()
  if (!trimmed) return undefined

  if (trimmed.startsWith('/')) {
    return trimmed
  }

  if (isExternalLink(trimmed)) {
    try {
      const parsed = new URL(trimmed)
      if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/'
      }
      return parsed.toString()
    } catch {
      return undefined
    }
  }

  if (trimmed.includes('://')) {
    return undefined
  }

  return `/${trimmed.replace(/^\/+/, '')}`
}

const sanitizeBanner = (banner: Banner, fallbackId: string): Banner => {
  return {
    id: banner.id || fallbackId,
    title: banner.title?.trim() || undefined,
    message: banner.message || 'Promotion',
    link: normalizeBannerLink(banner.link),
    image: banner.image ?? null,
    category: banner.category ?? null,
    category_slug: banner.category_slug ?? null,
    category_name: banner.category_name ?? null,
    target_url: getCategoryTarget(banner.category_slug) || normalizeBannerLink(banner.target_url),
    placement: banner.placement || 'home_hero',
    sort_order: Number.isFinite(Number(banner.sort_order)) ? Number(banner.sort_order) : 0,
    status: banner.status === 'inactive' ? 'inactive' : 'active',
  }
}

export const loadBanners = (): Banner[] => {
  if (typeof window === 'undefined') {
    return [...defaultBanners].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const sortedDefaults = [...defaultBanners].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedDefaults))
      return sortedDefaults
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return [...defaultBanners].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    }
    const sanitized = parsed.map((item, index) => sanitizeBanner(item as Banner, `banner-${index + 1}`))
    const sorted = sanitized.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted))
    return sorted
  } catch {
    return [...defaultBanners].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }
}

export const saveBanners = (banners: Banner[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(banners))
}
