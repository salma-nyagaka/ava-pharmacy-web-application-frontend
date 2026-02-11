export interface Banner {
  id: string
  message: string
  link?: string
  status: 'active' | 'inactive'
}

const STORAGE_KEY = 'ava_banners'

const defaultBanners: Banner[] = [
  {
    id: 'banner-001',
    message: 'Free delivery for orders above KSh 2,500',
    link: '/offers',
    status: 'active',
  },
]

const isExternalLink = (value: string) => /^https?:\/\//i.test(value)

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
    message: banner.message || 'Promotion',
    link: normalizeBannerLink(banner.link),
    status: banner.status === 'inactive' ? 'inactive' : 'active',
  }
}

export const loadBanners = (): Banner[] => {
  if (typeof window === 'undefined') {
    return defaultBanners
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultBanners))
      return defaultBanners
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return defaultBanners
    }
    const sanitized = parsed.map((item, index) => sanitizeBanner(item as Banner, `banner-${index + 1}`))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized))
    return sanitized
  } catch {
    return defaultBanners
  }
}

export const saveBanners = (banners: Banner[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(banners))
}
