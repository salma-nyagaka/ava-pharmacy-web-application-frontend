import type { StockSource } from './cart'
import {
  productVitaminC,
  productBpMonitor,
  productFaceCream,
  productOmega3,
  productBabyDiapers,
  productSanitizer,
  productThermometer,
  productMultivitamin,
  productPainRelief,
} from '../assets/images/remote'
import { categoryData } from './categories'

export type CatalogProduct = {
  id: number
  slug: string
  sku: string
  name: string
  brand: string
  category: string
  categorySlug: string
  subcategorySlugs: string[]
  price: number
  originalPrice: number | null
  image: string
  gallery: string[]
  rating: number
  reviews: number
  badge: string | null
  stockSource: StockSource
  shortDescription: string
  description: string
  features: string[]
  directions: string
  warnings: string
}

const baseProductCatalog: CatalogProduct[] = [
  {
    id: 1,
    slug: 'vitamin-c-1000mg-tablets',
    sku: 'HP-VIT-C-1000',
    name: 'Vitamin C 1000mg Tablets',
    brand: 'HealthPlus',
    category: 'Health & Wellness',
    categorySlug: 'health-wellness',
    subcategorySlugs: ['immune-boosters-and-daily-vitamins'],
    price: 1250,
    originalPrice: 1500,
    image: productVitaminC,
    gallery: [productVitaminC, productOmega3, productMultivitamin],
    rating: 4.8,
    reviews: 124,
    badge: 'Best Seller',
    stockSource: 'branch',
    shortDescription: 'Daily immune support with high-potency vitamin C.',
    description: 'High-quality Vitamin C tablets to support immune function and antioxidant protection in your daily wellness routine.',
    features: [
      '1000mg vitamin C per tablet',
      'Supports immune system function',
      'Suitable for adults',
      'No artificial colors',
    ],
    directions: 'Take one tablet daily with food, or as advised by your healthcare professional.',
    warnings: 'Consult your doctor before use if pregnant, nursing, or on medication.',
  },
  {
    id: 2,
    slug: 'digital-blood-pressure-monitor',
    sku: 'MT-BPM-220',
    name: 'Digital Blood Pressure Monitor',
    brand: 'MedTech',
    category: 'Health & Wellness',
    categorySlug: 'health-wellness',
    subcategorySlugs: ['women-s-and-men-s-wellness-essentials', 'fitness-and-body-toning-accessories'],
    price: 4500,
    originalPrice: 5500,
    image: productBpMonitor,
    gallery: [productBpMonitor, productThermometer, productSanitizer],
    rating: 4.6,
    reviews: 89,
    badge: '18% Off',
    stockSource: 'warehouse',
    shortDescription: 'Reliable home blood pressure and pulse monitoring.',
    description: 'Clinically reliable digital monitor with memory storage, clear display, and one-touch operation for home care.',
    features: [
      'One-button operation',
      'Irregular heartbeat indicator',
      'Memory for previous readings',
      'Large easy-read display',
    ],
    directions: 'Sit and rest for 5 minutes before use. Position cuff as directed and press start.',
    warnings: 'For home monitoring only. Always confirm unusual readings with your clinician.',
  },
  {
    id: 3,
    slug: 'moisturizing-face-cream-50ml',
    sku: 'SG-FC-50',
    name: 'Moisturizing Face Cream 50ml',
    brand: 'SkinGlow',
    category: 'Beauty & Skincare',
    categorySlug: 'beauty-skincare',
    subcategorySlugs: ['dermatologist-recommended-skincare', 'organic-beauty-solutions'],
    price: 890,
    originalPrice: null,
    image: productFaceCream,
    gallery: [productFaceCream, productSanitizer, productMultivitamin],
    rating: 4.5,
    reviews: 67,
    badge: null,
    stockSource: 'branch',
    shortDescription: 'Hydrating daily cream for normal to dry skin.',
    description: 'Lightweight moisturizer designed to improve skin texture and hydration with non-greasy daily wear.',
    features: [
      'Dermatologist-tested formula',
      'Fast absorbing texture',
      'Suitable for daily use',
      'Gentle on sensitive skin',
    ],
    directions: 'Apply a small amount to clean face morning and evening.',
    warnings: 'Avoid direct contact with eyes. Discontinue if irritation occurs.',
  },
  {
    id: 4,
    slug: 'omega-3-fish-oil-capsules',
    sku: 'NL-OMG3-90',
    name: 'Omega-3 Fish Oil Capsules',
    brand: 'NutraLife',
    category: 'Health & Wellness',
    categorySlug: 'health-wellness',
    subcategorySlugs: ['natural-supplements-and-herbal-remedies'],
    price: 2100,
    originalPrice: 2500,
    image: productOmega3,
    gallery: [productOmega3, productMultivitamin, productVitaminC],
    rating: 4.7,
    reviews: 156,
    badge: 'New',
    stockSource: 'warehouse',
    shortDescription: 'Omega-3 support for heart and brain health.',
    description: 'High-purity omega-3 capsules designed to support cardiovascular wellness, focus, and daily nutrition balance.',
    features: [
      'EPA and DHA blend',
      'Easy-to-swallow soft gels',
      'Third-party quality tested',
      '90-capsule pack',
    ],
    directions: 'Take one soft gel daily with a meal.',
    warnings: 'Consult your doctor if using blood-thinning medication.',
  },
  {
    id: 5,
    slug: 'hand-sanitizer-500ml',
    sku: 'CG-HS-500',
    name: 'Hand Sanitizer 500ml',
    brand: 'CleanGuard',
    category: 'Self-Care & Lifestyle',
    categorySlug: 'self-care-lifestyle',
    subcategorySlugs: ['sustainable-personal-care-tools'],
    price: 450,
    originalPrice: 550,
    image: productSanitizer,
    gallery: [productSanitizer, productFaceCream, productPainRelief],
    rating: 4.4,
    reviews: 45,
    badge: null,
    stockSource: 'out',
    shortDescription: 'Quick-dry sanitizer for daily hygiene routines.',
    description: 'Alcohol-based hand sanitizer with skin-friendly additives for effective hygiene at home and on the go.',
    features: [
      'Fast drying formula',
      'Travel and home friendly',
      'Pleasant mild scent',
    ],
    directions: 'Apply enough product to cover hands and rub until dry.',
    warnings: 'Flammable. Keep away from heat and out of reach of children.',
  },
  {
    id: 6,
    slug: 'multivitamin-complex-tablets',
    sku: 'VM-MV-60',
    name: 'Multivitamin Complex Tablets',
    brand: 'VitaMax',
    category: 'Health & Wellness',
    categorySlug: 'health-wellness',
    subcategorySlugs: ['immune-boosters-and-daily-vitamins'],
    price: 1650,
    originalPrice: null,
    image: productMultivitamin,
    gallery: [productMultivitamin, productVitaminC, productOmega3],
    rating: 4.7,
    reviews: 198,
    badge: 'Popular',
    stockSource: 'branch',
    shortDescription: 'Daily broad-spectrum vitamins and minerals.',
    description: 'Balanced vitamin and mineral support for everyday wellness, energy support, and nutritional balance.',
    features: [
      'Comprehensive formula',
      'One-tablet daily plan',
      'Supports immune health',
      'Value 60-tablet pack',
    ],
    directions: 'Take one tablet once daily after food.',
    warnings: 'Not intended to replace a balanced diet.',
  },
  {
    id: 7,
    slug: 'infrared-thermometer',
    sku: 'MT-IRT-100',
    name: 'Infrared Thermometer',
    brand: 'MedTech',
    category: 'Health & Wellness',
    categorySlug: 'health-wellness',
    subcategorySlugs: ['women-s-and-men-s-wellness-essentials'],
    price: 2800,
    originalPrice: 3500,
    image: productThermometer,
    gallery: [productThermometer, productBpMonitor, productSanitizer],
    rating: 4.6,
    reviews: 112,
    badge: '20% Off',
    stockSource: 'branch',
    shortDescription: 'Fast, contactless temperature checks.',
    description: 'Infrared thermometer for quick and accurate forehead temperature readings at home or workplace.',
    features: [
      '1-second response',
      'Backlit display',
      'Memory recall',
      'Contactless measurement',
    ],
    directions: 'Hold 2-3cm from forehead and press measure.',
    warnings: 'Use in room temperature environment for best accuracy.',
  },
  {
    id: 8,
    slug: 'baby-diapers-pack-60',
    sku: 'BC-DI-60',
    name: 'Baby Diapers Pack of 60',
    brand: 'BabyCare',
    category: 'Mother & Baby Care',
    categorySlug: 'mother-baby-care',
    subcategorySlugs: ['diapers-wipes-and-baby-feeding-accessories'],
    price: 1800,
    originalPrice: 2200,
    image: productBabyDiapers,
    gallery: [productBabyDiapers, productSanitizer, productFaceCream],
    rating: 4.9,
    reviews: 234,
    badge: '18% Off',
    stockSource: 'branch',
    shortDescription: 'Comfort-fit diapers with high absorbency.',
    description: 'Soft and breathable diapers designed for day and night dryness with leak guard protection.',
    features: [
      'High absorbency core',
      'Soft breathable liner',
      'Leak guard edges',
      'Pack size: 60',
    ],
    directions: 'Change regularly and dispose of used diapers hygienically.',
    warnings: 'Stop use if irritation occurs and consult a pediatrician.',
  },
  {
    id: 9,
    slug: 'pain-relief-gel-100g',
    sku: 'MR-PRG-100',
    name: 'Pain Relief Gel 100g',
    brand: 'MediRelief',
    category: 'Health & Wellness',
    categorySlug: 'health-wellness',
    subcategorySlugs: ['stress-relief-and-relaxation-products'],
    price: 650,
    originalPrice: 800,
    image: productPainRelief,
    gallery: [productPainRelief, productThermometer, productSanitizer],
    rating: 4.3,
    reviews: 78,
    badge: null,
    stockSource: 'warehouse',
    shortDescription: 'Cooling gel for muscle and joint discomfort.',
    description: 'Topical relief gel to support temporary easing of muscular and joint pain after activity.',
    features: [
      'Cooling sensation',
      'Quick absorbing',
      'Non-greasy finish',
    ],
    directions: 'Apply a thin layer to affected area up to 3 times daily.',
    warnings: 'For external use only. Avoid broken skin and eyes.',
  },
  {
    id: 10,
    slug: 'hydrating-cleanser-236ml',
    sku: 'CV-HC-236',
    name: 'Hydrating Cleanser 236ml',
    brand: 'CeraVe',
    category: 'Beauty & Skincare',
    categorySlug: 'beauty-skincare',
    subcategorySlugs: ['dermatologist-recommended-skincare'],
    price: 1900,
    originalPrice: 2200,
    image: productFaceCream,
    gallery: [productFaceCream, productSanitizer, productMultivitamin],
    rating: 4.8,
    reviews: 142,
    badge: 'New',
    stockSource: 'branch',
    shortDescription: 'Gentle cleanser for normal to dry skin.',
    description: 'Hydrating facial cleanser with skin barrier support ingredients for effective cleansing without stripping moisture.',
    features: [
      'Fragrance free',
      'Supports skin barrier',
      'Suitable for daily use',
    ],
    directions: 'Use morning and evening on damp skin then rinse.',
    warnings: 'Discontinue use if persistent irritation occurs.',
  },
  {
    id: 11,
    slug: 'herbal-sleep-tea-blend',
    sku: 'WL-HT-20',
    name: 'Herbal Sleep Tea Blend',
    brand: 'WellLeaf',
    category: 'Self-Care & Lifestyle',
    categorySlug: 'self-care-lifestyle',
    subcategorySlugs: ['wellness-teas-and-detox-blends', 'stress-relief-and-relaxation-products'],
    price: 780,
    originalPrice: null,
    image: productOmega3,
    gallery: [productOmega3, productMultivitamin, productFaceCream],
    rating: 4.4,
    reviews: 64,
    badge: null,
    stockSource: 'branch',
    shortDescription: 'Evening herbal tea to support calm bedtime routine.',
    description: 'Relaxing herbal infusion blend crafted for evening wind-down and bedtime comfort.',
    features: [
      'Caffeine free',
      '20 tea bags',
      'Mild natural flavor',
    ],
    directions: 'Steep one tea bag in hot water for 4-5 minutes.',
    warnings: 'If pregnant or nursing, seek medical advice before use.',
  },
  {
    id: 12,
    slug: 'maternity-stretch-mark-care-oil',
    sku: 'MB-MO-120',
    name: 'Maternity Stretch Mark Care Oil',
    brand: 'MamaBloom',
    category: 'Mother & Baby Care',
    categorySlug: 'mother-baby-care',
    subcategorySlugs: ['maternity-wellness-items'],
    price: 1450,
    originalPrice: 1700,
    image: productFaceCream,
    gallery: [productFaceCream, productBabyDiapers, productSanitizer],
    rating: 4.6,
    reviews: 73,
    badge: '15% Off',
    stockSource: 'warehouse',
    shortDescription: 'Nourishing body oil for maternity skin care.',
    description: 'Rich botanical oil blend formulated to nourish stretching skin during and after pregnancy.',
    features: [
      'Dermatologist tested',
      'Non-sticky texture',
      'Daily body care use',
    ],
    directions: 'Massage gently on clean skin once or twice daily.',
    warnings: 'Patch test before first use.',
  },
  {
    id: 13,
    slug: 'essential-oil-diffuser',
    sku: 'SC-DIF-01',
    name: 'Essential Oil Diffuser',
    brand: 'SereneCare',
    category: 'Self-Care & Lifestyle',
    categorySlug: 'self-care-lifestyle',
    subcategorySlugs: ['aromatherapy-and-essential-oils'],
    price: 3200,
    originalPrice: 3900,
    image: productThermometer,
    gallery: [productThermometer, productSanitizer, productFaceCream],
    rating: 4.5,
    reviews: 58,
    badge: '18% Off',
    stockSource: 'branch',
    shortDescription: 'Ultrasonic diffuser for home wellness spaces.',
    description: 'Quiet aroma diffuser designed for living rooms and bedrooms with auto shut-off safety.',
    features: [
      'Quiet operation',
      'Auto shut-off',
      'Adjustable mist output',
    ],
    directions: 'Fill with clean water, add oils, and switch on.',
    warnings: 'Use only as directed with compatible essential oils.',
  },
  {
    id: 14,
    slug: 'baby-gentle-wash-300ml',
    sku: 'BC-BW-300',
    name: 'Baby Gentle Wash 300ml',
    brand: 'BabyCare',
    category: 'Mother & Baby Care',
    categorySlug: 'mother-baby-care',
    subcategorySlugs: ['safe-baby-skincare-and-bath-products'],
    price: 640,
    originalPrice: 780,
    image: productBabyDiapers,
    gallery: [productBabyDiapers, productFaceCream, productSanitizer],
    rating: 4.7,
    reviews: 88,
    badge: '18% Off',
    stockSource: 'branch',
    shortDescription: 'Mild baby wash for daily bath time care.',
    description: 'Tear-free gentle wash with mild ingredients for baby skin cleansing and comfort.',
    features: [
      'Tear-free formula',
      'Dermatologist tested',
      'Suitable for daily bath use',
    ],
    directions: 'Apply on wet skin, lather gently, and rinse thoroughly.',
    warnings: 'Avoid contact with eyes. Keep out of reach of children.',
  },
  {
    id: 15,
    slug: 'panadol-extra-strength-tablets',
    sku: 'PA-EX-24',
    name: 'Panadol Extra Strength Tablets',
    brand: 'Panadol',
    category: 'Health & Wellness',
    categorySlug: 'health-wellness',
    subcategorySlugs: ['stress-relief-and-relaxation-products'],
    price: 420,
    originalPrice: 500,
    image: productPainRelief,
    gallery: [productPainRelief, productVitaminC, productThermometer],
    rating: 4.6,
    reviews: 184,
    badge: '16% Off',
    stockSource: 'branch',
    shortDescription: 'Fast-acting pain and fever relief tablets.',
    description: 'Trusted Panadol tablets for short-term relief of headaches, body aches, and fever symptoms.',
    features: [
      'Fast pain relief',
      'Gentle on stomach when used as directed',
      'Suitable for everyday use',
    ],
    directions: 'Take as directed on pack, with water after food when needed.',
    warnings: 'Do not exceed recommended dose. Keep out of reach of children.',
  },
  {
    id: 16,
    slug: 'nivea-soft-moisturizing-cream',
    sku: 'NV-SF-200',
    name: 'Nivea Soft Moisturizing Cream 200ml',
    brand: 'Nivea',
    category: 'Beauty & Skincare',
    categorySlug: 'beauty-skincare',
    subcategorySlugs: ['body-care-and-personal-hygiene'],
    price: 780,
    originalPrice: 920,
    image: productFaceCream,
    gallery: [productFaceCream, productSanitizer, productMultivitamin],
    rating: 4.7,
    reviews: 116,
    badge: null,
    stockSource: 'branch',
    shortDescription: 'Daily lightweight hydration for face and body.',
    description: 'A light, non-sticky cream enriched with vitamin E and jojoba oil for smooth, moisturized skin.',
    features: [
      'Quick-absorbing texture',
      'Face and body use',
      'Dermatologically approved',
    ],
    directions: 'Apply to clean skin as often as needed.',
    warnings: 'For external use only.',
  },
  {
    id: 17,
    slug: 'durex-extra-safe-condoms-pack-12',
    sku: 'DX-ES-12',
    name: 'Durex Extra Safe Condoms Pack of 12',
    brand: 'Durex',
    category: 'Health & Wellness',
    categorySlug: 'health-wellness',
    subcategorySlugs: ['women-s-and-men-s-wellness-essentials'],
    price: 980,
    originalPrice: null,
    image: productSanitizer,
    gallery: [productSanitizer, productFaceCream, productPainRelief],
    rating: 4.8,
    reviews: 92,
    badge: 'Popular',
    stockSource: 'branch',
    shortDescription: 'Extra comfort and confidence protection.',
    description: 'Durex Extra Safe condoms designed for reliable protection and secure fit.',
    features: [
      'Regular fit',
      'Electronically tested quality',
      'Pack of 12',
    ],
    directions: 'Use one condom per act and follow instructions on pack.',
    warnings: 'No method is 100% effective against pregnancy or infections.',
  },
  {
    id: 18,
    slug: 'eucerin-advanced-repair-lotion',
    sku: 'EU-AR-250',
    name: 'Eucerin Advanced Repair Lotion 250ml',
    brand: 'Eucerin',
    category: 'Beauty & Skincare',
    categorySlug: 'beauty-skincare',
    subcategorySlugs: ['dermatologist-recommended-skincare'],
    price: 2100,
    originalPrice: 2450,
    image: productFaceCream,
    gallery: [productFaceCream, productSanitizer, productThermometer],
    rating: 4.8,
    reviews: 131,
    badge: '14% Off',
    stockSource: 'warehouse',
    shortDescription: 'Deep hydration for very dry and sensitive skin.',
    description: 'Dermatologist-recommended body lotion formulated to restore moisture and improve skin texture.',
    features: [
      'Long-lasting hydration',
      'Fragrance free',
      'Suitable for sensitive skin',
    ],
    directions: 'Apply daily to dry areas after bathing.',
    warnings: 'Avoid contact with eyes.',
  },
  {
    id: 19,
    slug: 'vichy-mineral-89-serum',
    sku: 'VC-M89-50',
    name: 'Vichy Mineral 89 Hydrating Serum',
    brand: 'Vichy',
    category: 'Beauty & Skincare',
    categorySlug: 'beauty-skincare',
    subcategorySlugs: ['dermatologist-recommended-skincare'],
    price: 3950,
    originalPrice: 4500,
    image: productFaceCream,
    gallery: [productFaceCream, productSanitizer, productMultivitamin],
    rating: 4.7,
    reviews: 85,
    badge: '12% Off',
    stockSource: 'branch',
    shortDescription: 'Hydrating daily booster for stronger skin barrier.',
    description: 'A concentrated serum with mineral-rich water and hyaluronic acid for daily skin hydration.',
    features: [
      'Lightweight gel texture',
      'Suitable under makeup',
      'For daily morning and evening use',
    ],
    directions: 'Apply 2 pumps on clean skin before moisturizer.',
    warnings: 'For external use only.',
  },
  {
    id: 20,
    slug: 'centrum-adult-multivitamin-tablets',
    sku: 'CT-AD-60',
    name: 'Centrum Adult Multivitamin Tablets',
    brand: 'Centrum',
    category: 'Health & Wellness',
    categorySlug: 'health-wellness',
    subcategorySlugs: ['immune-boosters-and-daily-vitamins'],
    price: 1850,
    originalPrice: 2200,
    image: productMultivitamin,
    gallery: [productMultivitamin, productVitaminC, productOmega3],
    rating: 4.9,
    reviews: 243,
    badge: 'Best Seller',
    stockSource: 'branch',
    shortDescription: 'Complete daily vitamins and minerals for adults.',
    description: 'Daily Centrum multivitamin with key nutrients to support immunity, metabolism, and overall wellness.',
    features: [
      'Comprehensive adult formula',
      'One tablet daily',
      'Trusted global brand',
    ],
    directions: 'Take one tablet daily with food.',
    warnings: 'Do not exceed recommended daily intake.',
  },
  {
    id: 21,
    slug: 'sebamed-clear-face-cleansing-foam',
    sku: 'SB-CF-150',
    name: 'Sebamed Clear Face Cleansing Foam',
    brand: 'Sebamed',
    category: 'Beauty & Skincare',
    categorySlug: 'beauty-skincare',
    subcategorySlugs: ['dermatologist-recommended-skincare'],
    price: 1650,
    originalPrice: 1890,
    image: productFaceCream,
    gallery: [productFaceCream, productSanitizer, productThermometer],
    rating: 4.6,
    reviews: 77,
    badge: null,
    stockSource: 'warehouse',
    shortDescription: 'Gentle cleansing foam for acne-prone skin.',
    description: 'Sebamed cleansing foam helps remove excess oil and impurities while maintaining skin pH balance.',
    features: [
      'Soap and alkali free',
      'pH 5.5 support',
      'Suitable for acne-prone skin',
    ],
    directions: 'Use twice daily on wet face, then rinse.',
    warnings: 'Stop use if irritation occurs.',
  },
  {
    id: 22,
    slug: 'huggies-dry-comfort-diapers-size-4',
    sku: 'HG-DC-4-44',
    name: 'Huggies Dry Comfort Diapers Size 4 (44)',
    brand: 'Huggies',
    category: 'Mother & Baby Care',
    categorySlug: 'mother-baby-care',
    subcategorySlugs: ['diapers-wipes-and-baby-feeding-accessories'],
    price: 1990,
    originalPrice: 2350,
    image: productBabyDiapers,
    gallery: [productBabyDiapers, productSanitizer, productFaceCream],
    rating: 4.8,
    reviews: 164,
    badge: '15% Off',
    stockSource: 'branch',
    shortDescription: 'Soft-fit diapers with day and night leakage protection.',
    description: 'Huggies diapers built for comfort and absorbency to keep your baby dry for longer.',
    features: [
      'Absorb-lock core',
      'Stretch waistband',
      'Breathable outer cover',
    ],
    directions: 'Change regularly and dispose hygienically.',
    warnings: 'Keep packaging away from infants.',
  },
  {
    id: 23,
    slug: 'accu-chek-active-test-strips-50',
    sku: 'AC-TS-50',
    name: 'Accu-chek Active Test Strips (50)',
    brand: 'Accu-chek',
    category: 'Health & Wellness',
    categorySlug: 'health-wellness',
    subcategorySlugs: ['women-s-and-men-s-wellness-essentials'],
    price: 2450,
    originalPrice: 2850,
    image: productBpMonitor,
    gallery: [productBpMonitor, productThermometer, productSanitizer],
    rating: 4.7,
    reviews: 102,
    badge: null,
    stockSource: 'branch',
    shortDescription: 'Reliable glucose test strips for home monitoring.',
    description: 'Accu-chek strips for accurate daily blood glucose monitoring with compatible meter devices.',
    features: [
      'Pack of 50 strips',
      'Fast reading support',
      'High measurement reliability',
    ],
    directions: 'Use with compatible Accu-chek meter as directed by manufacturer.',
    warnings: 'Store in a cool, dry place and close vial immediately after use.',
  },
]

const normalizeBrand = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

const demoBrandProductNames: Record<string, string[]> = {
  Panadol: [
    'Panadol Cold & Flu Caplets',
    'Panadol Migraine Relief Tablets',
    'Panadol Night Pain Relief',
    'Panadol Children Syrup',
  ],
  Nivea: [
    'Nivea Rich Nourishing Body Lotion',
    'Nivea Men Deep Face Wash',
    'Nivea Cocoa Butter Body Cream',
    'Nivea Soft Lip Balm Duo',
  ],
  CeraVe: [
    'CeraVe Foaming Cleanser 236ml',
    'CeraVe Moisturizing Lotion 236ml',
    'CeraVe PM Facial Lotion',
    'CeraVe SA Smoothing Cleanser',
  ],
  Durex: [
    'Durex Invisible Condoms Pack of 10',
    'Durex Real Feel Condoms Pack of 12',
    'Durex Classic Lubricant Gel',
    'Durex Pleasuremax Condoms Pack of 12',
  ],
  Eucerin: [
    'Eucerin Sun Oil Control SPF 50+',
    'Eucerin Urea Repair Foot Cream',
    'Eucerin DermoPurifyer Cleanser',
    'Eucerin Spotless Brightening Serum',
  ],
  Vichy: [
    'Vichy Liftactiv Supreme Cream',
    'Vichy Capital Soleil SPF 50',
    'Vichy Purete Thermale Cleanser',
    'Vichy Aqualia Thermal Gel Cream',
  ],
  Centrum: [
    'Centrum Women Multivitamin',
    'Centrum Men Multivitamin',
    'Centrum Silver 50+',
    'Centrum Kids Chewables',
  ],
  Sebamed: [
    'Sebamed Baby Lotion 200ml',
    'Sebamed Everyday Shampoo',
    'Sebamed Face & Body Wash',
    'Sebamed Moisturizing Cream Jar',
  ],
  Huggies: [
    'Huggies Newborn Diapers Size 1',
    'Huggies Baby Wipes Aloe Care',
    'Huggies Pull-Ups Size 5',
    'Huggies Overnight Diapers Size 4',
  ],
  'Accu-chek': [
    'Accu-chek Instant Glucometer Kit',
    'Accu-chek Softclix Lancets 200',
    'Accu-chek Guide Test Strips 25',
    'Accu-chek Active Control Solution',
  ],
}

const demoCategoryCycle = categoryData.map((category) => ({
  slug: category.slug,
  name: category.name,
  subcategorySlugs: category.subcategories.map((subcategory) => subcategory.slug),
}))

const ensureFiveProductsPerTopBrand = (catalog: CatalogProduct[]): CatalogProduct[] => {
  const expanded = [...catalog]
  const usedSlugs = new Set(expanded.map((product) => product.slug))
  const usedSkus = new Set(expanded.map((product) => product.sku))
  let nextId = Math.max(0, ...expanded.map((product) => product.id)) + 1
  const demoRatingOffsets = [0.2, -0.3, -0.7, -1.1, -0.5]

  for (const [brandName, names] of Object.entries(demoBrandProductNames)) {
    const brandKey = normalizeBrand(brandName)
    const current = expanded.filter((product) => normalizeBrand(product.brand) === brandKey)
    if (current.length === 0) continue

    const seed = current[0]
    const missingCount = Math.max(0, 5 - current.length)

    for (let index = 0; index < missingCount; index += 1) {
      const name = names[index] ?? `${brandName} Demo Product ${index + 1}`
      let slug = slugify(name)
      while (usedSlugs.has(slug)) {
        slug = `${slugify(name)}-${nextId}`
      }
      usedSlugs.add(slug)

      const skuPrefix = brandName.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'SKU'
      let sku = `${skuPrefix}-D-${nextId}`
      while (usedSkus.has(sku)) {
        sku = `${skuPrefix}-D-${nextId + 1}`
      }
      usedSkus.add(sku)

      const price = Math.max(250, seed.price + (index + 1) * 120)
      const computedOriginalPrice = Math.round(price * 1.15)

      const demoRating = Number(
        Math.min(4.9, Math.max(3.4, seed.rating + demoRatingOffsets[index % demoRatingOffsets.length])).toFixed(1)
      )

      const selectedCategory =
        demoCategoryCycle.length > 0
          ? demoCategoryCycle[(index + 1) % demoCategoryCycle.length]
          : null
      const selectedSubcategorySlug =
        selectedCategory && selectedCategory.subcategorySlugs.length > 0
          ? selectedCategory.subcategorySlugs[index % selectedCategory.subcategorySlugs.length]
          : null

      expanded.push({
        ...seed,
        id: nextId,
        slug,
        sku,
        name,
        category: selectedCategory?.name ?? seed.category,
        categorySlug: selectedCategory?.slug ?? seed.categorySlug,
        subcategorySlugs: selectedSubcategorySlug ? [selectedSubcategorySlug] : seed.subcategorySlugs,
        price,
        originalPrice: seed.originalPrice ? Math.max(seed.originalPrice, computedOriginalPrice) : computedOriginalPrice,
        rating: demoRating,
        reviews: Math.max(28, seed.reviews + (index + 1) * 9),
        badge: index % 2 === 0 ? 'Popular' : null,
        shortDescription: `${brandName} quality product tailored for everyday pharmacy and wellness needs.`,
        description: `${name} by ${brandName}. Added as demo catalog content to showcase richer brand browsing in the storefront.`,
      })

      nextId += 1
    }
  }

  return expanded
}

export const productCatalog: CatalogProduct[] = ensureFiveProductsPerTopBrand(baseProductCatalog)

export const loadCatalogProducts = () => productCatalog

export const getCatalogProductById = (id: number) =>
  productCatalog.find((product) => product.id === id)
