import { apiClient } from '../lib/apiClient'
import {
  CartItem,
  addItemToCart,
  clearCartItems,
  getCartItemCount,
  loadCartItems,
  removeCartItem,
  subscribeCartUpdates,
  updateCartItemQuantity,
} from '../data/cart'

type CartAddPayload = Omit<CartItem, 'quantity'>

function isAuthenticated() {
  return !!localStorage.getItem('ava_access_token')
}

function mapApiItem(item: Record<string, unknown>): CartItem {
  const product = (item.product ?? {}) as Record<string, unknown>
  const variant = (item.product_variant ?? {}) as Record<string, unknown>
  return {
    id: (product.id ?? item.product_id ?? item.id) as number,
    serverItemId: item.id as number,
    name: (product.name ?? variant.name ?? '') as string,
    brand: (product.brand_name ?? (product.brand as Record<string, unknown> | undefined)?.name ?? '') as string,
    price: parseFloat((item.unit_price ?? item.price ?? '0') as string),
    quantity: (item.quantity ?? 1) as number,
    image: (product.image ?? '') as string,
    stockSource: ((product.inventory_status ?? '') === 'out_of_stock' ? undefined : 'branch'),
    prescriptionId: item.prescription_id as string | undefined,
  }
}

function dispatchCartEvent() {
  window.dispatchEvent(new Event('ava-cart-updated'))
}

export const cartService = {
  mergeLocalCart: async () => {
    if (!isAuthenticated()) return { data: loadCartItems() }
    const localItems = loadCartItems()
    if (!localItems.length) return cartService.list()
    await apiClient.post('/cart/merge/', {
      items: localItems.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      })),
    })
    clearCartItems()
    dispatchCartEvent()
    return cartService.list()
  },

  list: async () => {
    if (!isAuthenticated()) {
      return { data: loadCartItems() }
    }
    try {
      const res = await apiClient.get('/cart/')
      const items: CartItem[] = ((res.data?.data?.items ?? res.data?.items ?? []) as Record<string, unknown>[]).map(mapApiItem)
      return { data: items }
    } catch {
      return { data: loadCartItems() }
    }
  },

  add: async (item: CartAddPayload, quantity = 1) => {
    if (!isAuthenticated()) {
      const updated = addItemToCart(item, quantity)
      dispatchCartEvent()
      return { data: updated }
    }
    try {
      await apiClient.post('/cart/items/', {
        product_id: item.id,
        quantity,
      })
      const res = await apiClient.get('/cart/')
      const items: CartItem[] = ((res.data?.data?.items ?? res.data?.items ?? []) as Record<string, unknown>[]).map(mapApiItem)
      dispatchCartEvent()
      return { data: items }
    } catch {
      const updated = addItemToCart(item, quantity)
      dispatchCartEvent()
      return { data: updated }
    }
  },

  updateQuantity: async (itemId: number, quantity: number, prescriptionId?: string) => {
    if (!isAuthenticated()) {
      const updated = updateCartItemQuantity(itemId, quantity, prescriptionId)
      dispatchCartEvent()
      return { data: updated }
    }
    try {
      await apiClient.patch(`/cart/items/${itemId}/`, { quantity })
      const res = await apiClient.get('/cart/')
      const items: CartItem[] = ((res.data?.data?.items ?? res.data?.items ?? []) as Record<string, unknown>[]).map(mapApiItem)
      dispatchCartEvent()
      return { data: items }
    } catch {
      const updated = updateCartItemQuantity(itemId, quantity, prescriptionId)
      dispatchCartEvent()
      return { data: updated }
    }
  },

  remove: async (itemId: number, prescriptionId?: string) => {
    if (!isAuthenticated()) {
      const updated = removeCartItem(itemId, prescriptionId)
      dispatchCartEvent()
      return { data: updated }
    }
    try {
      await apiClient.delete(`/cart/items/${itemId}/delete/`)
      const res = await apiClient.get('/cart/')
      const items: CartItem[] = ((res.data?.data?.items ?? res.data?.items ?? []) as Record<string, unknown>[]).map(mapApiItem)
      dispatchCartEvent()
      return { data: items }
    } catch {
      const updated = removeCartItem(itemId, prescriptionId)
      dispatchCartEvent()
      return { data: updated }
    }
  },

  clear: async () => {
    if (!isAuthenticated()) {
      clearCartItems()
      dispatchCartEvent()
      return { data: [] }
    }
    try {
      await apiClient.delete('/cart/clear/')
      dispatchCartEvent()
      return { data: [] }
    } catch {
      clearCartItems()
      dispatchCartEvent()
      return { data: [] }
    }
  },

  count: async () => {
    if (!isAuthenticated()) {
      return { data: getCartItemCount() }
    }
    try {
      const res = await apiClient.get('/cart/')
      const items = (res.data?.data?.items ?? res.data?.items ?? []) as unknown[]
      const count = items.reduce((acc: number, i: unknown) => acc + ((i as Record<string, unknown>).quantity as number ?? 1), 0)
      return { data: count }
    } catch {
      return { data: getCartItemCount() }
    }
  },

  subscribe: (listener: () => void) => subscribeCartUpdates(listener),
}
