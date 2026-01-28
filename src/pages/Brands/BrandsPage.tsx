import { useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'

function BrandsPage() {
  const { brand } = useParams()
  const formatLabel = (value: string) =>
    value
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')

  const brands = [
    'Panadol',
    'CeraVe',
    'Nivea',
    'Durex',
    'Eucerin',
    'Vichy',
    'Centrum',
    'Sebamed',
    'Huggies',
    'Accu-chek',
    'Bioderma',
    'La Roche-Posay',
  ]

  return (
    <div>
      <PageHeader
        title={brand ? formatLabel(brand) : 'Shop by brand'}
        subtitle={brand ? 'Browse products and offers from this brand.' : 'Explore trusted pharmacy and beauty brands curated for you.'}
        badge="Brands"
      />
      <section className="page">
        <div className="container">
          <div className="page-grid page-grid--4">
            {brands.map((brand) => (
              <div key={brand} className="card">
                <h3 className="card__title">{brand}</h3>
                <p className="card__meta">View products from {brand}.</p>
                <button className="btn btn--outline btn--sm" style={{ marginTop: '0.75rem' }}>
                  Browse
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default BrandsPage
