import type { StockSource } from './cart'

export interface FavouriteItem {
  id: number
  serverWishlistId?: number
  name: string
  brand: string
  price: number
  originalPrice?: number | null
  image?: string
  stockSource?: StockSource
}

const FAV_EVENT = 'ava-favourites-updated'

const FAV_STORAGE_KEY = 'ava-favourites'

function readFavourites(): FavouriteItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(FAV_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as FavouriteItem[] : []
  } catch {
    return []
  }
}

function writeFavourites(items: FavouriteItem[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event(FAV_EVENT))
}

export function loadFavourites(): FavouriteItem[] {
  return readFavourites()
}

export function addFavourite(item: FavouriteItem): FavouriteItem[] {
  const items = readFavourites()
  const existing = items.findIndex((entry) => entry.id === item.id)
  if (existing >= 0) {
    items[existing] = { ...items[existing], ...item }
  } else {
    items.unshift(item)
  }
  writeFavourites(items)
  return items
}

export function removeFavourite(productId: number): FavouriteItem[] {
  const items = readFavourites().filter((item) => item.id !== productId)
  writeFavourites(items)
  return items
}

export function isFavourite(productId: number): boolean {
  return readFavourites().some((item) => item.id === productId)
}

export function getFavouriteCount(): number {
  return readFavourites().length
}


export const subscribeFavourites = (listener: () => void) => {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(FAV_EVENT, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(FAV_EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}
