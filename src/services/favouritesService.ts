import { apiClient, resolveMediaUrl } from '../lib/apiClient'
import { FavouriteItem, subscribeFavourites } from '../data/favourites'

const FAV_SERVICE_EVENT = 'ava-favourites-service-updated'
const CART_EVENT = 'ava-cart-updated'

type WishlistApiItem = {
  id: number
  product?: Record<string, unknown>
  product_id?: number
}

function isAuthenticated() {
  return !!localStorage.getItem('ava_access_token')
}

function emitFavouritesUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(FAV_SERVICE_EVENT))
  }
}

function emitCartUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CART_EVENT))
  }
}

function mapApiItem(item: WishlistApiItem): FavouriteItem {
  const product = (item.product ?? {}) as Record<string, unknown>
  const rawPrice = product.final_price ?? product.price ?? '0'
  const rawOriginalPrice = product.original_price ?? null
  const inventoryStatus = String(product.inventory_status ?? '')
  const stockSource = inventoryStatus === 'out_of_stock'
    ? 'out'
    : String(product.stock_source ?? '') === 'warehouse'
      ? 'warehouse'
      : 'branch'

  return {
    id: Number(product.id ?? item.product_id ?? 0),
    serverWishlistId: Number(item.id),
    name: String(product.name ?? ''),
    brand: String(product.brand_name ?? ((product.brand as Record<string, unknown> | undefined)?.name ?? '')),
    price: Number.parseFloat(String(rawPrice)) || 0,
    originalPrice: rawOriginalPrice == null ? null : Number.parseFloat(String(rawOriginalPrice)) || null,
    image: resolveMediaUrl(String(product.image ?? '')) ?? '',
    stockSource,
  }
}

async function listRemote(): Promise<FavouriteItem[]> {
  const res = await apiClient.get('/wishlist/')
  const payload = res.data?.data ?? res.data ?? []
  const rows = Array.isArray(payload) ? payload : []
  return rows.map((row) => mapApiItem(row as WishlistApiItem))
}

async function findRemoteWishlistItem(productId: number): Promise<FavouriteItem | undefined> {
  const items = await listRemote()
  return items.find((item) => item.id === productId)
}

export const favouritesService = {
  list: async (): Promise<{ data: FavouriteItem[] }> => {
    if (!isAuthenticated()) return { data: [] }
    return { data: await listRemote() }
  },

  add: async (item: FavouriteItem): Promise<{ data: FavouriteItem[] }> => {
    if (!isAuthenticated()) return { data: [] }
    await apiClient.post('/wishlist/', { product_id: item.id })
    emitFavouritesUpdate()
    return favouritesService.list()
  },

  remove: async (productId: number, serverWishlistId?: number): Promise<{ data: FavouriteItem[] }> => {
    if (!isAuthenticated()) return { data: [] }
    const remoteItem = serverWishlistId ? { serverWishlistId } : await findRemoteWishlistItem(productId)
    if (remoteItem?.serverWishlistId) {
      await apiClient.delete(`/wishlist/${remoteItem.serverWishlistId}/`)
    }
    emitFavouritesUpdate()
    return favouritesService.list()
  },

  toggle: async (item: FavouriteItem): Promise<{ data: FavouriteItem[] }> => {
    if (!isAuthenticated()) return { data: [] }
    const existing = await findRemoteWishlistItem(item.id)
    if (existing?.serverWishlistId) {
      await apiClient.delete(`/wishlist/${existing.serverWishlistId}/`)
    } else {
      await apiClient.post('/wishlist/', { product_id: item.id })
    }
    emitFavouritesUpdate()
    return favouritesService.list()
  },

  moveToCart: async (item: FavouriteItem, quantity = 1): Promise<{ data: FavouriteItem[] }> => {
    if (!isAuthenticated()) return { data: [] }
    const remoteItem = item.serverWishlistId ? item : await findRemoteWishlistItem(item.id)
    if (!remoteItem?.serverWishlistId) return favouritesService.list()

    await apiClient.post(`/wishlist/${remoteItem.serverWishlistId}/move-to-cart/`, { quantity })
    emitFavouritesUpdate()
    emitCartUpdate()
    return favouritesService.list()
  },

  isFavourite: async (id: number): Promise<boolean> => {
    if (!isAuthenticated()) return false
    const items = await listRemote()
    return items.some((item) => item.id === id)
  },

  count: async (): Promise<{ data: number }> => {
    if (!isAuthenticated()) return { data: 0 }
    const { data } = await favouritesService.list()
    return { data: data.length }
  },

  subscribe: (listener: () => void) => {
    if (typeof window === 'undefined') return () => {}
    const handler = () => listener()
    window.addEventListener(FAV_SERVICE_EVENT, handler)
    const unsubscribeLocal = subscribeFavourites(listener)
    return () => {
      window.removeEventListener(FAV_SERVICE_EVENT, handler)
      unsubscribeLocal()
    }
  },
}
