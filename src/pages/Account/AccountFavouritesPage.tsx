import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import FavouriteProductCard from '../../components/FavouriteProductCard/FavouriteProductCard'
import { FavouriteItem } from '../../data/favourites'
import { favouritesService } from '../../services/favouritesService'
import './AccountFavouritesPage.css'

function AccountFavouritesPage() {
  const [items, setItems] = useState<FavouriteItem[]>([])
  const [addedId, setAddedId] = useState<number | null>(null)

  useEffect(() => {
    const refresh = () => {
      void favouritesService.list().then((response) => setItems(response.data))
    }
    refresh()
    return favouritesService.subscribe(refresh)
  }, [])

  const handleRemove = (item: FavouriteItem) => {
    void favouritesService.remove(item.id, item.serverWishlistId).then((response) => setItems(response.data))
  }

  const handleMoveToCart = (item: FavouriteItem) => {
    void favouritesService.moveToCart(item).then((response) => setItems(response.data))
    setAddedId(item.id)
    setTimeout(() => setAddedId(null), 1800)
  }

  if (items.length === 0) {
    return (
      <div className="afp-empty">
        <div className="afp-empty__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
        <h2 className="afp-empty__title">No saved items yet</h2>
        <p className="afp-empty__sub">Save products from the catalogue, then move them into cart when you are ready.</p>
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

      <div className="afp-grid">
        {items.map((item) => (
          <FavouriteProductCard
            key={item.serverWishlistId ?? item.id}
            item={item}
            isMoving={addedId === item.id}
            onMoveToCart={handleMoveToCart}
            onRemove={handleRemove}
          />
        ))}
      </div>
    </div>
  )
}

export default AccountFavouritesPage
