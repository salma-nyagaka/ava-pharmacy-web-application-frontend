import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import ImageWithFallback from '../../components/ImageWithFallback/ImageWithFallback'
import { loadCatalogProducts } from '../../data/products'
import { categoryData } from '../../data/categories'
import './BrandsPage.css'

function BrandsPage() {
  const { brand } = useParams()
  const products = loadCatalogProducts()

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')

  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

  const formatLabel = (value: string) =>
    value
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')

  const brandDirectory = Array.from(new Set(products.map((product) => product.brand)))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      slug: slugify(name),
      productCount: products.filter((product) => normalize(product.brand) === normalize(name)).length,
    }))

  const selectedBrandEntry = brandDirectory.find((entry) => entry.slug === brand)
  const selectedBrandLabel = selectedBrandEntry?.name ?? (brand ? formatLabel(brand) : '')
  const selectedBrandProducts = brand
    ? products.filter((product) => normalize(product.brand) === normalize(selectedBrandLabel))
    : []
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('all')

  const brandCategories = useMemo(
    () =>
      categoryData
        .filter((category) =>
          selectedBrandProducts.some((product) => product.categorySlug === category.slug)
        )
        .map((category) => ({
          slug: category.slug,
          name: category.name,
          count: selectedBrandProducts.filter((product) => product.categorySlug === category.slug).length,
        })),
    [selectedBrandProducts]
  )

  const filteredBrandProducts =
    selectedCategorySlug === 'all'
      ? selectedBrandProducts
      : selectedBrandProducts.filter((product) => product.categorySlug === selectedCategorySlug)

  useEffect(() => {
    setSelectedCategorySlug('all')
  }, [brand])

  const formatPrice = (value: number) => `KSh ${value.toLocaleString()}`

  return (
    <div>
      <PageHeader
        title={brand ? selectedBrandLabel : 'Shop by brand'}
        subtitle={
          brand
            ? `${selectedBrandProducts.length} product${selectedBrandProducts.length === 1 ? '' : 's'} available from this brand.`
            : 'Explore trusted pharmacy and beauty brands curated for you.'
        }
        badge="Brands"
      />
      <section className="page">
        <div className="container">
          {!brand && (
            <div className="brands-directory-grid">
              {brandDirectory.map((entry) => (
                <Link key={entry.slug} to={`/brands/${entry.slug}`} className="brands-directory-card">
                  <h3 className="card__title">{entry.name}</h3>
                  <p className="card__meta">{entry.productCount} product{entry.productCount === 1 ? '' : 's'}</p>
                  <span className="btn btn--outline btn--sm brands-directory-card__cta">Browse products</span>
                </Link>
              ))}
            </div>
          )}

          {brand && (
            <div className="brands-products">
              <div className="brands-products__actions">
                <Link to="/brands" className="btn btn--outline btn--sm">Back to all brands</Link>
                <Link to="/products" className="btn btn--outline btn--sm">View all products</Link>
              </div>

              {selectedBrandProducts.length > 0 ? (
                <div className="brands-products-layout">
                  <aside className="brands-products-sidebar">
                    <h3 className="brands-products-sidebar__title">Categories</h3>
                    <button
                      type="button"
                      className={`brands-category-filter ${selectedCategorySlug === 'all' ? 'is-active' : ''}`}
                      onClick={() => setSelectedCategorySlug('all')}
                    >
                      <span>All Categories</span>
                      <span>{selectedBrandProducts.length}</span>
                    </button>
                    {brandCategories.map((category) => (
                      <button
                        key={category.slug}
                        type="button"
                        className={`brands-category-filter ${selectedCategorySlug === category.slug ? 'is-active' : ''}`}
                        onClick={() => setSelectedCategorySlug(category.slug)}
                      >
                        <span>{category.name}</span>
                        <span>{category.count}</span>
                      </button>
                    ))}
                  </aside>

                  <div className="brands-products-main">
                    <div className="brands-products-main__toolbar">
                      <p className="brands-products-main__count">
                        {filteredBrandProducts.length} product{filteredBrandProducts.length === 1 ? '' : 's'}
                      </p>
                      <label className="brands-products-main__dropdown-label">
                        Category
                        <select
                          className="brands-products-main__dropdown"
                          value={selectedCategorySlug}
                          onChange={(event) => setSelectedCategorySlug(event.target.value)}
                        >
                          <option value="all">All Categories</option>
                          {brandCategories.map((category) => (
                            <option key={category.slug} value={category.slug}>
                              {category.name} ({category.count})
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="brands-products-grid">
                      {filteredBrandProducts.map((product) => (
                        <article key={product.id} className="brands-product-card">
                          <Link to={`/product/${product.id}`} className="brands-product-card__image">
                            <ImageWithFallback src={product.image} alt={product.name} />
                          </Link>
                          <div className="brands-product-card__content">
                            <p className="brands-product-card__brand">{product.brand}</p>
                            <h3 className="brands-product-card__name">
                              <Link to={`/product/${product.id}`}>{product.name}</Link>
                            </h3>
                            <p className="brands-product-card__meta">{product.category}</p>
                            <p className="brands-product-card__price">{formatPrice(product.price)}</p>
                            <Link to={`/product/${product.id}`} className="btn btn--outline btn--sm">View product</Link>
                          </div>
                        </article>
                      ))}
                      {filteredBrandProducts.length === 0 && (
                        <div className="brands-products-empty card">
                          <h3 className="card__title">No products in this category</h3>
                          <p className="card__meta">Switch category to view more products for {selectedBrandLabel}.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="brands-products-empty card">
                  <h3 className="card__title">No products found for {selectedBrandLabel}</h3>
                  <p className="card__meta">Try another brand or browse all products.</p>
                  <Link to="/products" className="btn btn--outline btn--sm" style={{ marginTop: '0.75rem' }}>
                    Browse all products
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default BrandsPage
