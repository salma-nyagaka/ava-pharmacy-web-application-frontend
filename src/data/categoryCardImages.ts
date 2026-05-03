import babyMotherFamilyCare from '../assets/images/category-cards/baby-mother-family-care.jpg'
import medicalDevicesHomeDiagnostics from '../assets/images/category-cards/medical-devices-home-diagnostics.jpg'
import naturalHerbalRemedies from '../assets/images/category-cards/natural-herbal-remedies.jpg'
import overTheCounterMedicines from '../assets/images/category-cards/over-the-counter-medicines.jpg'
import personalCareBeauty from '../assets/images/category-cards/personal-care-beauty.jpg'
import prescriptionMedicines from '../assets/images/category-cards/prescription-medicines.jpg'
import vitaminsSupplements from '../assets/images/category-cards/vitamins-supplements.jpg'

// Fixed-size artwork scraped from public Unsplash photo pages and stored locally
// so homepage category cards render consistently.
export const categoryCardImages: Record<string, string> = {
  'baby-mother-family-care': babyMotherFamilyCare,
  'medical-devices-home-diagnostics': medicalDevicesHomeDiagnostics,
  'natural-herbal-remedies': naturalHerbalRemedies,
  'over-the-counter-medicines': overTheCounterMedicines,
  'personal-care-beauty': personalCareBeauty,
  'prescription-medicines': prescriptionMedicines,
  'vitamins-supplements': vitaminsSupplements,
}
