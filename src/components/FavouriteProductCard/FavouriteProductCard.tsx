import { Link } from 'react-router-dom'
import ImageWithFallback from '../ImageWithFallback/ImageWithFallback'
import { FavouriteItem } from '../../data/favourites'
import '../../styles/components/FavouriteProductCard.css'

type FavouriteProductCardProps = {
  item: FavouriteItem
  isMoving: boolean
  onMoveToCart: (item: FavouriteItem) => void
  onRemove: (item: FavouriteItem) => void
}

function FavouriteProductCard({ item, isMoving, onMoveToCart, onRemove }: FavouriteProductCardProps) {
  const formatPrice = (price: number) => `KSh ${price.toLocaleString()}`

  return (
    <article className="favourite-product-card product-card">
      <Link to={`/product/${item.id}`} className="product-card__image favourite-product-card__image">
        <ImageWithFallback src={item.image ?? ''} alt={item.name} />
      </Link>

      <div className="product-card__content favourite-product-card__content">
        <span className="product-card__brand">{item.brand}</span>
        <h3 className="product-card__name">
          <Link to={`/product/${item.id}`}>{item.name}</Link>
        </h3>

        <div className="product-card__pricing favourite-product-card__pricing">
          <span className="product-card__price">{formatPrice(item.price)}</span>
          {item.originalPrice && item.originalPrice > item.price && (
            <span className="product-card__original-price">{formatPrice(item.originalPrice)}</span>
          )}
        </div>

        <p className={`favourite-product-card__stock favourite-product-card__stock--${item.stockSource ?? 'out'}`}>
          {item.stockSource === 'branch'
            ? 'In stock'
            : item.stockSource === 'warehouse'
              ? 'Available (2–3 days)'
              : 'Out of stock'}
        </p>

        <div className="favourite-product-card__actions">
          <button
            className={`product-card__add-to-cart ${isMoving ? 'product-card__add-to-cart--added' : ''}`}
            type="button"
            disabled={item.stockSource === 'out'}
            onClick={() => onMoveToCart(item)}
          >
            {isMoving ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Moved
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                Add to cart
              </>
            )}
          </button>
          <button className="favourite-product-card__remove" type="button" onClick={() => onRemove(item)}>
            Remove
          </button>
        </div>
      </div>
    </article>
  )
}

export default FavouriteProductCard
