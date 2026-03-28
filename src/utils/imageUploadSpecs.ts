export type ImageUploadSpecKey = 'category' | 'brand' | 'product'

export interface ImageUploadSpec {
  label: string
  hint: string
}

export const IMAGE_UPLOAD_SPECS: Record<ImageUploadSpecKey, ImageUploadSpec> = {
  category: {
    label: 'Category image',
    hint: 'Use a clear category image that matches the storefront section.',
  },
  brand: {
    label: 'Brand logo',
    hint: 'Use the main brand logo or packshot that best represents the brand.',
  },
  product: {
    label: 'Product image',
    hint: 'Use the main product image or packshot you want customers to see.',
  },
}

export function getImageUploadHint(specKey: ImageUploadSpecKey): string {
  return IMAGE_UPLOAD_SPECS[specKey].hint
}

export async function validateImageFile(file: File, specKey: ImageUploadSpecKey): Promise<string | null> {
  const spec = IMAGE_UPLOAD_SPECS[specKey]
  const objectUrl = URL.createObjectURL(file)

  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => reject(new Error(`Upload a valid ${spec.label.toLowerCase()}.`))
      img.src = objectUrl
    })

    return null
  } catch (error) {
    return error instanceof Error ? error.message : `Upload a valid ${spec.label.toLowerCase()}.`
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
