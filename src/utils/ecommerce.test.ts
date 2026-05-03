import { describe, expect, it } from 'vitest'
import type { CartItem } from '../data/cart'
import { buildCartMergeItem, getCheckoutAvailabilityErrors, getProductIdsForAvailability } from './ecommerce'

const item = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: 42,
  productId: 10,
  variantId: 42,
  name: 'Vitamin C 1000mg',
  brand: 'AVA',
  price: 450,
  quantity: 2,
  ...overrides,
})

describe('ecommerce cart helpers', () => {
  it('merges authenticated carts with product and variant identity preserved', () => {
    expect(buildCartMergeItem(item({ prescriptionId: 'RX-100' }))).toEqual({
      product_id: 10,
      variant_id: 42,
      quantity: 2,
      prescription_id: 'RX-100',
    })
  })

  it('deduplicates product ids for availability checks', () => {
    expect(getProductIdsForAvailability([
      item({ productId: 10, variantId: 41 }),
      item({ productId: 10, variantId: 42 }),
      item({ id: 11, productId: undefined, variantId: undefined }),
    ])).toEqual([10, 11])
  })

  it('blocks checkout when backend availability cannot satisfy cart quantities', () => {
    const errors = getCheckoutAvailabilityErrors(
      [item({ quantity: 4 }), item({ id: 99, productId: 99, name: 'Thermometer', quantity: 1 })],
      [
        {
          product_id: 10,
          is_available: true,
          stock_source: 'branch',
          quantity: 1,
          is_low_stock: true,
          pos_quantity: 2,
        },
      ],
    )

    expect(errors).toEqual([
      'Vitamin C 1000mg is no longer fully available.',
      'Thermometer availability could not be confirmed.',
    ])
  })
})
