export const PREFERRED_CATEGORY_ORDER = [
  'Prescription Medicines',
  'Over-the-Counter Medicines',
  'Vitamins & Supplements',
  'Personal Care & Beauty',
  'Baby, Mother & Family Care',
  'Medical Devices & Home Diagnostics',
  'Natural & Herbal Remedies',
] as const


export interface OrderedCategoryLike {
  name: string
}

export function sortCategoriesByPreferredOrder<T extends OrderedCategoryLike>(categories: T[]): T[] {
  return [...categories].sort((left, right) => {
    const leftIndex = PREFERRED_CATEGORY_ORDER.indexOf(left.name)
    const rightIndex = PREFERRED_CATEGORY_ORDER.indexOf(right.name)
    const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex
    const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex
    if (normalizedLeft !== normalizedRight) return normalizedLeft - normalizedRight
    return left.name.localeCompare(right.name)
  })
}
