import { useEffect, useRef, useState, type ReactNode } from 'react'
import './LazySection.css'

interface LazySectionProps {
  children: ReactNode
  fallback?: ReactNode
  rootMargin?: string
  className?: string
}

function LazySection({ children, fallback, rootMargin = '400px 0px', className }: LazySectionProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || visible) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        })
      },
      { rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [rootMargin, visible])

  return (
    <div ref={ref} className={className ? `lazy-section ${className}` : 'lazy-section'}>
      {visible ? children : fallback}
    </div>
  )
}

export default LazySection
