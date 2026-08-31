import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { faqService, type FAQ } from '../../services/faqService'
import '../../styles/pages/FAQPage.css'

function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  useEffect(() => {
    faqService.listPublished()
      .then(setFaqs)
      .catch(() => setError('We could not load the FAQs. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(faqs.map((faq) => faq.category)))],
    [faqs],
  )
  const visibleFaqs = activeCategory === 'All'
    ? faqs
    : faqs.filter((faq) => faq.category === activeCategory)
  const columnBreak = Math.ceil(visibleFaqs.length / 2)
  const faqColumns = [
    visibleFaqs.slice(0, columnBreak),
    visibleFaqs.slice(columnBreak),
  ]

  if (!loading && !error && faqs.length === 0) return null

  return (
    <main className="faq-page">
      <div className="container">
        <nav className="faq-page__breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link><span>/</span><span>FAQs</span>
        </nav>

        <header className="faq-page__hero">
          <h1>Frequently Asked Questions</h1>
        </header>

        {loading ? (
          <p className="faq-page__state">Loading frequently asked questions…</p>
        ) : error ? (
          <p className="faq-page__state faq-page__state--error">{error}</p>
        ) : (
          <section className="faq-page__content" aria-label="Frequently asked questions">
            {categories.length > 2 && (
              <div className="faq-page__categories" aria-label="FAQ categories">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={activeCategory === category ? 'is-active' : ''}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}

            <div className="faq-page__list">
              {faqColumns.map((column, columnIndex) => (
                <div className="faq-page__column" key={columnIndex}>
                  {column.map((faq, faqIndex) => (
                    <details key={faq.id} className="faq-page__item">
                      <summary>
                        <span className="faq-page__chevron" aria-hidden="true" />
                        <span>
                          <span className="faq-page__number" aria-hidden="true">
                            {columnIndex * columnBreak + faqIndex + 1}.
                          </span>
                          {faq.question}
                        </span>
                      </summary>
                      <div className="faq-page__answer"><p>{faq.answer}</p></div>
                    </details>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default FAQPage
