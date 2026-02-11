export type StockSource = 'branch' | 'warehouse' | 'out'

export interface CartItem {
  id: number
  name: string
  brand: string
  price: number
  quantity: number
  image?: string
  stockSource?: Exclude<StockSource, 'out'>
  prescriptionId?: string
}

const STORAGE_KEY = 'ava_cart_items'
const CART_EVENT = 'ava-cart-updated'

const safeLoad = (): CartItem[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as CartItem[] : []
  } catch {
    return []
  }
}

const emitCartUpdate = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CART_EVENT))
}

export const loadCartItems = () => safeLoad()

export const saveCartItems = (items: CartItem[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  emitCartUpdate()
}

export const addItemToCart = (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
  const current = loadCartItems()
  const existing = current.find(
    (entry) => entry.id === item.id && entry.prescriptionId === item.prescriptionId
  )
  const next = Math.max(1, quantity)
  if (existing) {
    const updated = current.map((entry) =>
      entry.id === item.id && entry.prescriptionId === item.prescriptionId
        ? { ...entry, quantity: entry.quantity + next }
        : entry
    )
    saveCartItems(updated)
    return updated
  }
  const updated = [{ ...item, quantity: next }, ...current]
  saveCartItems(updated)
  return updated
}

export const updateCartItemQuantity = (itemId: number, quantity: number, prescriptionId?: string) => {
  const current = loadCartItems()
  if (quantity <= 0) {
    const updated = current.filter(
      (entry) => !(entry.id === itemId && entry.prescriptionId === prescriptionId)
    )
    saveCartItems(updated)
    return updated
  }
  const updated = current.map((entry) =>
    entry.id === itemId && entry.prescriptionId === prescriptionId ? { ...entry, quantity } : entry
  )
  saveCartItems(updated)
  return updated
}

export const removeCartItem = (itemId: number, prescriptionId?: string) => {
  const current = loadCartItems()
  const updated = current.filter(
    (entry) => !(entry.id === itemId && entry.prescriptionId === prescriptionId)
  )
  saveCartItems(updated)
  return updated
}

export const clearCartItems = () => {
  saveCartItems([])
}

export const getCartItemCount = (items: CartItem[] = loadCartItems()) => {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

export const subscribeCartUpdates = (listener: () => void) => {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CART_EVENT, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(CART_EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}
