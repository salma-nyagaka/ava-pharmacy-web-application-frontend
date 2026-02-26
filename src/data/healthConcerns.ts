export type HealthConcern = {
  slug: string
  name: string
  path: string
  matchSubcategorySlugs: string[]
  matchKeywords: string[]
}

const buildConcern = (
  slug: string,
  name: string,
  matchSubcategorySlugs: string[],
  matchKeywords: string[]
): HealthConcern => ({
  slug,
  name,
  path: `/conditions/${slug}`,
  matchSubcategorySlugs,
  matchKeywords,
})

export const healthConcerns: HealthConcern[] = [
  buildConcern('aches-pains', 'Aches & Pains', ['stress-relief-and-relaxation-products'], ['pain', 'paracetamol', 'ibuprofen', 'aspirin', 'relief']),
  buildConcern('acne', 'Acne', ['dermatologist-recommended-skincare'], ['acne', 'clear face']),
  buildConcern('allergy-hayfever', 'Allergy & Hayfever', ['natural-supplements-and-herbal-remedies'], ['allergy', 'hayfever', 'sneeze']),
  buildConcern('anti-infectives', 'Anti Infectives', ['immune-boosters-and-daily-vitamins'], ['antibiotic', 'amoxicillin', 'infective']),
  buildConcern('bites-stings', 'Bites & Stings', ['stress-relief-and-relaxation-products'], ['bite', 'sting']),
  buildConcern('cold-flu-cough', 'Cough, Cold & Flu', ['immune-boosters-and-daily-vitamins'], ['cold', 'flu', 'cough']),
  buildConcern('dry-skin', 'Dry Skin', ['dermatologist-recommended-skincare', 'body-care-and-personal-hygiene'], ['dry skin', 'moistur', 'hydrat']),
  buildConcern('eczema', 'Eczema', ['dermatologist-recommended-skincare'], ['eczema', 'sensitive skin']),
  buildConcern('eye-ear-care', 'Eye & Ear Care', ['women-s-and-men-s-wellness-essentials'], ['eye', 'ear']),
  buildConcern('first-aid', 'First Aid & Bandages', ['women-s-and-men-s-wellness-essentials'], ['first aid', 'bandage', 'wound', 'sanitizer']),
  buildConcern('oral-care', 'Oral Care', ['body-care-and-personal-hygiene'], ['oral', 'tooth', 'gum', 'mouth']),
  buildConcern('skin-treatments', 'Skin Treatments', ['dermatologist-recommended-skincare', 'organic-beauty-solutions'], ['skin', 'treatment', 'lotion', 'cream']),
]

export const getHealthConcernBySlug = (slug?: string | null) =>
  healthConcerns.find((concern) => concern.slug === slug)

const STORAGE_CONCERNS_KEY = 'ava_admin_health_concerns'

interface AdminConcern {
  id: string
  name: string
}

const slugifyName = (name: string) =>
  name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

export function loadHealthConcerns(): HealthConcern[] {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_CONCERNS_KEY) : null
    if (!raw) return healthConcerns
    const parsed: AdminConcern[] = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return healthConcerns

    return parsed.map((concern) => {
      const slug = slugifyName(concern.name)
      const existing = healthConcerns.find((h) => h.slug === slug || h.name.toLowerCase() === concern.name.toLowerCase())
      if (existing) return existing
      return buildConcern(slug, concern.name, [], [])
    })
  } catch {
    return healthConcerns
  }
}

type ConcernProduct = {
  name: string
  brand: string
  shortDescription: string
  subcategorySlugs: string[]
}

export const matchesHealthConcern = (product: ConcernProduct, concern: HealthConcern) => {
  const hasSubcategoryMatch = concern.matchSubcategorySlugs.some((subcategorySlug) =>
    product.subcategorySlugs.includes(subcategorySlug)
  )
  if (hasSubcategoryMatch) return true

  const haystack = `${product.name} ${product.brand} ${product.shortDescription}`.toLowerCase()
  return concern.matchKeywords.some((keyword) => haystack.includes(keyword.toLowerCase()))
}
