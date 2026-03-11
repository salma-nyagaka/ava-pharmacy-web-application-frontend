import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import { FavouriteItem, loadFavourites } from '../../data/favourites'
import { favouritesService } from '../../services/favouritesService'
import { cartService } from '../../services/cartService'
import './AccountFavouritesPage.css'

function AccountFavouritesPage() {
  const [items, setItems] = useState<FavouriteItem[]>(loadFavourites)
  const [addedId, setAddedId] = useState<number | null>(null)

  useEffect(() => {
    return favouritesService.subscribe(() => setItems(loadFavourites()))
  }, [])

  const handleRemove = (id: number) => {
    void favouritesService.remove(id)
  }

  const handleAddToCart = (item: FavouriteItem) => {
    void cartService.add({
      id: item.id,
      name: item.name,
      brand: item.brand,
      price: item.price,
      image: item.image,
      stockSource: item.stockSource === 'out' ? undefined : item.stockSource,
    })
    setAddedId(item.id)
    setTimeout(() => setAddedId(null), 1800)
  }

  const formatPrice = (price: number) => `KSh ${price.toLocaleString()}`

  if (items.length === 0) {
    return (
      <div className="afp-empty">
        <div className="afp-empty__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
        <h2 className="afp-empty__title">No saved items yet</h2>
        <p className="afp-empty__sub">Tap the heart icon on any product to save it here.</p>
        <Link to="/products" className="afp-empty__cta">Browse products</Link>
      </div>
    )
  }

  return (
    <div className="afp">
      <div className="afp-header">
        <div>
          <h2 className="afp-header__title">Saved Items</h2>
          <p className="afp-header__sub">{items.length} item{items.length !== 1 ? 's' : ''} saved</p>
        </div>
        <Link to="/products" className="afp-header__browse">+ Add more</Link>
      </div>

      <ul className="afp-list">
        {items.map((item) => (
          <li key={item.id} className="afp-item">
            <Link to={`/product/${item.id}`} className="afp-item__img">
              <ImageWithFallback src={item.image ?? ''} alt={item.name} />
            </Link>
            <div className="afp-item__body">
              <span className="afp-item__brand">{item.brand}</span>
              <h3 className="afp-item__name">
                <Link to={`/product/${item.id}`}>{item.name}</Link>
              </h3>
              <div className="afp-item__pricing">
                <span className="afp-item__price">{formatPrice(item.price)}</span>
                {item.originalPrice && item.originalPrice > item.price && (
                  <span className="afp-item__original">{formatPrice(item.originalPrice)}</span>
                )}
              </div>
              <span className={`afp-item__stock afp-item__stock--${item.stockSource ?? 'out'}`}>
                {item.stockSource === 'branch' ? 'In stock' : item.stockSource === 'warehouse' ? 'Available (2–3 days)' : 'Out of stock'}
              </span>
            </div>
            <div className="afp-item__actions">
              {item.stockSource !== 'out' && (
                <button
                  className={`afp-item__cart ${addedId === item.id ? 'afp-item__cart--added' : ''}`}
                  type="button"
                  onClick={() => handleAddToCart(item)}
                >
                  {addedId === item.id ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Added
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                      </svg>
                      Add to Cart
                    </>
                  )}
                </button>
              )}
              <button className="afp-item__remove" type="button" onClick={() => handleRemove(item.id)} title="Remove">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default AccountFavouritesPage
