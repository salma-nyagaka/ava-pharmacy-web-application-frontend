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
import { toApiResult } from './mockApi'

type CartAddPayload = Omit<CartItem, 'quantity'>

export const cartService = {
  list: async () => toApiResult(loadCartItems()),
  add: async (item: CartAddPayload, quantity = 1) => toApiResult(addItemToCart(item, quantity)),
  updateQuantity: async (itemId: number, quantity: number, prescriptionId?: string) =>
    toApiResult(updateCartItemQuantity(itemId, quantity, prescriptionId)),
  remove: async (itemId: number, prescriptionId?: string) =>
    toApiResult(removeCartItem(itemId, prescriptionId)),
  clear: async () => {
    clearCartItems()
    return toApiResult(loadCartItems())
  },
  count: async () => toApiResult(getCartItemCount()),
  subscribe: (listener: () => void) => subscribeCartUpdates(listener),
}
