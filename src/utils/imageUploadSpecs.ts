export type ImageUploadSpecKey = 'category' | 'brand' | 'product'

export interface ImageUploadSpec {
  label: string
  minWidth: number
  minHeight: number
  hint: string
}

export const IMAGE_UPLOAD_SPECS: Record<ImageUploadSpecKey, ImageUploadSpec> = {
  category: {
    label: 'Category image',
    minWidth: 800,
    minHeight: 800,
    hint: 'Use a clear square image at least 800 × 800 px.',
  },
  brand: {
    label: 'Brand logo',
    minWidth: 400,
    minHeight: 400,
    hint: 'Use a sharp logo image at least 400 × 400 px.',
  },
  product: {
    label: 'Product image',
    minWidth: 1000,
    minHeight: 1000,
    hint: 'Use a clear product image at least 1000 × 1000 px.',
  },
}

export function getImageUploadHint(specKey: ImageUploadSpecKey): string {
  return IMAGE_UPLOAD_SPECS[specKey].hint
}

export async function validateImageFile(file: File, specKey: ImageUploadSpecKey): Promise<string | null> {
  const spec = IMAGE_UPLOAD_SPECS[specKey]
  const objectUrl = URL.createObjectURL(file)

  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error(`Upload a valid ${spec.label.toLowerCase()}.`))
      img.src = objectUrl
    })

    if (dimensions.width < spec.minWidth || dimensions.height < spec.minHeight) {
      return `${spec.label} is too low resolution and may look blurry. Please re-upload an image at least ${spec.minWidth} x ${spec.minHeight} pixels.`
    }

    return null
  } catch (error) {
    return error instanceof Error ? error.message : `Upload a valid ${spec.label.toLowerCase()}.`
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
