import type { CartItem } from '../data/cart'
import type { ProductAvailability } from '../services/productService'

export function getCartItemProductId(item: Pick<CartItem, 'id' | 'productId'>): number {
  return item.productId ?? item.id
}

export function getCartItemVariantId(item: Pick<CartItem, 'id' | 'variantId'>): number {
  return item.variantId ?? item.id
}

export function buildCartMergeItem(item: CartItem) {
  return {
    product_id: getCartItemProductId(item),
    variant_id: item.variantId,
    quantity: Math.max(1, item.quantity),
    prescription_id: item.prescriptionId,
  }
}

export function getProductIdsForAvailability(items: CartItem[]): number[] {
  return Array.from(new Set(items.map(getCartItemProductId)))
}

export function getCheckoutAvailabilityErrors(
  items: CartItem[],
  rows: ProductAvailability[],
): string[] {
  const byProductId = new Map(rows.map((row) => [row.product_id, row]))

  return items.flatMap((item) => {
    const availability = byProductId.get(getCartItemProductId(item))
    if (!availability) return [`${item.name} availability could not be confirmed.`]

    const posQty = availability.pos_quantity ?? 0
    const effectiveQty = Math.max(availability.quantity ?? 0, posQty)
    if (availability.is_available && effectiveQty >= item.quantity) return []
    return [`${item.name} is no longer fully available.`]
  })
}
