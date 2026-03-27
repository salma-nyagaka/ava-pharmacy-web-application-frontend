import { Link } from 'react-router-dom'
import ImageWithFallback from '../ImageWithFallback/ImageWithFallback'
import '../../styles/components/PromotionFeatureCard.css'

interface PromotionFeatureCardProps {
  title: string
  href: string
  image: string | null
  badge?: string | null
  eyebrow?: string
  description?: string
  highlights?: string[]
  ctaLabel?: string
  featured?: boolean
  selected?: boolean
}

function PromotionFeatureCard({
  title,
  href,
  image,
  badge,
  eyebrow,
  description,
  highlights = [],
  ctaLabel = 'Shop this offer',
  featured = false,
  selected = false,
}: PromotionFeatureCardProps) {
  const note = highlights.slice(0, 2).join(' • ')

  return (
    <Link
      to={href}
      className={[
        'promotion-feature-card',
        featured ? 'promotion-feature-card--featured' : '',
        selected ? 'promotion-feature-card--selected' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="promotion-feature-card__media">
        {image ? (
          <ImageWithFallback src={image} alt={title} className="promotion-feature-card__image" />
        ) : (
          <div className="promotion-feature-card__image promotion-feature-card__image--empty" aria-hidden="true" />
        )}
        {badge && <span className="promotion-feature-card__badge">{badge}</span>}
      </div>

      <div className="promotion-feature-card__panel">
        {eyebrow && <span className="promotion-feature-card__eyebrow">{eyebrow}</span>}
        <h3 className="promotion-feature-card__title">{title}</h3>
        {description && <p className="promotion-feature-card__description">{description}</p>}
        {note && <p className="promotion-feature-card__note">{note}</p>}
        <span className="promotion-feature-card__cta">{ctaLabel}</span>
      </div>
    </Link>
  )
}

export default PromotionFeatureCard
