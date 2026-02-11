export type Subcategory = {
  name: string
  slug: string
}

export type Category = {
  name: string
  slug: string
  path: string
  subcategories: Subcategory[]
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

const buildCategory = (name: string, slug: string, subcategories: string[]): Category => ({
  name,
  slug,
  path: `/category/${slug}`,
  subcategories: subcategories.map((subcategory) => ({
    name: subcategory,
    slug: slugify(subcategory),
  })),
})

export const categoryData: Category[] = [
  buildCategory('Health & Wellness', 'health-wellness', [
    'Immune boosters & daily vitamins',
    'Natural supplements & herbal remedies',
    'Stress relief & relaxation products',
    "Women's and men's wellness essentials",
  ]),
  buildCategory('Beauty & Skincare', 'beauty-skincare', [
    'Dermatologist-recommended skincare',
    'Organic beauty solutions',
    'Body care & personal hygiene',
    'Hair care for all types and textures',
  ]),
  buildCategory('Mother & Baby Care', 'mother-baby-care', [
    'Safe baby skincare & bath products',
    'Maternity wellness items',
    'Diapers, wipes & baby feeding accessories',
  ]),
  buildCategory('Self-Care & Lifestyle', 'self-care-lifestyle', [
    'Aromatherapy & essential oils',
    'Wellness teas & detox blends',
    'Fitness and body toning accessories',
    'Sustainable personal care tools',
  ]),
]

export const getCategoryBySlug = (slug?: string | null) =>
  categoryData.find((category) => category.slug === slug)

export const getSubcategoryBySlug = (categorySlug?: string | null, subSlug?: string | null) =>
  getCategoryBySlug(categorySlug)?.subcategories.find((subcategory) => subcategory.slug === subSlug)
