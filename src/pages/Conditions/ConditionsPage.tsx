import { useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'

function ConditionsPage() {
  const { condition } = useParams()
  const formatLabel = (value: string) =>
    value
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')

  const conditions = [
    'Aches & Pains',
    'Acne',
    'Allergy & Hayfever',
    'Anti Infectives',
    'Bites & Stings',
    'Cough, Cold & Flu',
    'Dry Skin',
    'Eczema',
    'Eye & Ear Care',
    'First Aid & Bandages',
    'Oral Care',
    'Psoriasis',
    'Skin Treatments',
    'Sun Burn',
  ]

  return (
    <div>
      <PageHeader
        title={condition ? formatLabel(condition) : 'Shop by condition'}
        subtitle={condition ? 'Recommended products and care guidance for this condition.' : 'Find products curated for specific health and wellness needs.'}
        badge="Conditions"
      />
      <section className="page">
        <div className="container">
          <div className="page-grid page-grid--3">
            {conditions.map((condition) => (
              <div key={condition} className="card">
                <h3 className="card__title">{condition}</h3>
                <p className="card__meta">Recommended products and care tips.</p>
                <button className="btn btn--outline btn--sm" style={{ marginTop: '0.75rem' }}>
                  View products
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default ConditionsPage
