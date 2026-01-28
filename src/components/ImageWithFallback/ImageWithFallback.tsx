import { ImgHTMLAttributes, type SyntheticEvent, useState } from 'react'

const DEFAULT_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect width='100%25' height='100%25' fill='%23f2f4f8'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%238a91ac' text-anchor='middle' dy='.3em'%3EAVA%20Pharmacy%3C/text%3E%3C/svg%3E"

type ImageWithFallbackProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string
}

function ImageWithFallback({ src, fallbackSrc = DEFAULT_PLACEHOLDER, onError, ...rest }: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false)

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true)
    if (onError) {
      onError(event)
    }
  }

  const resolvedSrc = hasError || !src ? fallbackSrc : src

  return <img src={resolvedSrc} onError={handleError} {...rest} />
}

export default ImageWithFallback
