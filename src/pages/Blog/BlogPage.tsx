import PageHeader from '../../components/PageHeader/PageHeader'

function BlogPage() {
  const posts = [
    {
      title: 'Managing diabetes: daily checklist',
      excerpt: 'Track glucose, stay hydrated, and keep prescriptions organized.',
      date: 'Jan 12, 2026',
    },
    {
      title: 'Understanding prescription refills',
      excerpt: 'How to request refills, verify approvals, and avoid delays.',
      date: 'Jan 8, 2026',
    },
    {
      title: 'Pediatric wellness tips for parents',
      excerpt: 'Safety-first advice for children under 18.',
      date: 'Jan 2, 2026',
    },
  ]

  return (
    <div>
      <PageHeader
        title="Health & wellness blog"
        subtitle="Latest guidance from our pharmacists and medical partners."
        badge="Insights"
      />
      <section className="page">
        <div className="container">
          <div className="page-grid page-grid--3">
            {posts.map((post) => (
              <div key={post.title} className="card">
                <h3 className="card__title">{post.title}</h3>
                <p className="card__subtitle">{post.excerpt}</p>
                <p className="card__meta">{post.date}</p>
                <div style={{ marginTop: '1rem' }}>
                  <button className="btn btn--outline btn--sm">Read more</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default BlogPage
