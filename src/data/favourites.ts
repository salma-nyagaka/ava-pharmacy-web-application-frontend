import type { StockSource } from './cart'

export interface FavouriteItem {
  id: number
  name: string
  brand: string
  price: number
  originalPrice?: number | null
  image?: string
  stockSource?: StockSource
}

const STORAGE_KEY = 'ava_favourites'
const FAV_EVENT = 'ava-favourites-updated'

const safeLoad = (): FavouriteItem[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as FavouriteItem[]) : []
  } catch {
    return []
  }
}

const emit = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(FAV_EVENT))
}

const save = (items: FavouriteItem[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  emit()
}

export const loadFavourites = () => safeLoad()

export const isFavourite = (id: number) => safeLoad().some((item) => item.id === id)

export const addFavourite = (item: FavouriteItem) => {
  const current = safeLoad()
  if (current.some((f) => f.id === item.id)) return current
  const updated = [item, ...current]
  save(updated)
  return updated
}

export const removeFavourite = (id: number) => {
  const updated = safeLoad().filter((f) => f.id !== id)
  save(updated)
  return updated
}

export const toggleFavourite = (item: FavouriteItem) => {
  return isFavourite(item.id) ? removeFavourite(item.id) : addFavourite(item)
}

export const getFavouriteCount = () => safeLoad().length

export const subscribeFavourites = (listener: () => void) => {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(FAV_EVENT, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(FAV_EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}
