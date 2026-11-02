import { useEffect, useState } from 'react'
import { apiClient, resolveMediaUrl } from '../../lib/apiClient'

type ContentBlock = { id: number; key: string; title: string; subtitle: string; body: string;
  image: string | null; cta_label: string; cta_url: string }

export default function ContentBlocks() {
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  useEffect(() => {
    let active = true
    void apiClient.get('/cms/', { params: { placement: 'home_content' } }).then((response) => {
      const payload = response.data?.data ?? response.data
      const rows = Array.isArray(payload) ? payload : payload?.results ?? []
      if (active) setBlocks(rows)
    }).catch(() => { if (active) setBlocks([]) })
    return () => { active = false }
  }, [])
  if (!blocks.length) return null
  return <div className="container home-content-blocks">
    {blocks.map((block) => <section className="home-content-block" key={block.id} aria-label={block.title}>
      {block.image && <img src={resolveMediaUrl(block.image) ?? ''} alt={block.title} loading="lazy" />}
      <h2 className="section__title">{block.title}</h2>
      {block.subtitle && <p><strong>{block.subtitle}</strong></p>}
      {block.body && <p className="home-content-block__body">{block.body}</p>}
      {block.cta_label && /^(https?:\/\/|\/(?!\/))/.test(block.cta_url) && <a className="btn" href={block.cta_url}>{block.cta_label}</a>}
    </section>)}
  </div>
}
