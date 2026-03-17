import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import FavouriteProductCard from '../../components/FavouriteProductCard/FavouriteProductCard'
import { FavouriteItem } from '../../data/favourites'
import { favouritesService } from '../../services/favouritesService'
import './WishlistPage.css'

function WishlistPage() {
  const [items, setItems] = useState<FavouriteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [movingId, setMovingId] = useState<number | null>(null)

  useEffect(() => {
    const refresh = () => {
      void favouritesService.list().then((response) => {
        setItems(response.data)
        setLoading(false)
      })
    }
    refresh()
    return favouritesService.subscribe(refresh)
  }, [])

  const handleRemove = (item: FavouriteItem) => {
    void favouritesService.remove(item.id, item.serverWishlistId).then((response) => setItems(response.data))
  }

  const handleMoveToCart = (item: FavouriteItem) => {
    void favouritesService.moveToCart(item).then((response) => setItems(response.data))
    setMovingId(item.id)
    setTimeout(() => setMovingId(null), 1800)
  }

  return (
    <div>
      <PageHeader
        title="Your wishlist"
        subtitle="Saved products are kept here so you can move them into cart when you are ready to buy."
        badge="Saved Items"
      />
      <section className="page">
        <div className="container">
          {loading ? (
            <div className="wishlist-empty">
              <h2>Loading saved items…</h2>
            </div>
          ) : items.length === 0 ? (
            <div className="wishlist-empty">
              <div className="wishlist-empty__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <h2>No saved items yet</h2>
              <p>Save products from the catalogue, then move them into your cart from here.</p>
              <Link to="/products" className="btn btn--primary">Browse products</Link>
            </div>
          ) : (
            <div className="wishlist-grid">
              {items.map((item) => (
                <FavouriteProductCard
                  key={item.serverWishlistId ?? item.id}
                  item={item}
                  isMoving={movingId === item.id}
                  onMoveToCart={handleMoveToCart}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default WishlistPage
