import { beforeEach, describe, expect, it } from 'vitest'
import { addItemToCart, clearCartItems, loadCartItems, removeCartItem, updateCartItemQuantity } from './cart'

describe('local cart storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('updates and removes variant-keyed cart items without dropping sibling variants', () => {
    addItemToCart({ id: 41, productId: 10, variantId: 41, name: 'Vitamin C 500mg', brand: 'AVA', price: 300 }, 1)
    addItemToCart({ id: 42, productId: 10, variantId: 42, name: 'Vitamin C 1000mg', brand: 'AVA', price: 450 }, 2)

    updateCartItemQuantity(42, 3)
    expect(loadCartItems()).toMatchObject([
      { variantId: 42, quantity: 3 },
      { variantId: 41, quantity: 1 },
    ])

    removeCartItem(42)
    expect(loadCartItems()).toMatchObject([{ variantId: 41, quantity: 1 }])
  })

  it('clears cart items', () => {
    addItemToCart({ id: 42, name: 'Vitamin C 1000mg', brand: 'AVA', price: 450 }, 1)
    clearCartItems()
    expect(loadCartItems()).toEqual([])
  })
})
