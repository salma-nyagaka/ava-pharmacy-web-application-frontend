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
