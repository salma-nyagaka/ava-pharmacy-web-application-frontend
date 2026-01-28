import { ReactNode } from 'react'
import './PageHeader.css'

type PageHeaderProps = {
  title: string
  subtitle?: string
  badge?: string
  actions?: ReactNode
  align?: 'left' | 'center'
}

function PageHeader({ title, subtitle, badge, actions, align = 'left' }: PageHeaderProps) {
  return (
    <section className={`page-hero ${align === 'center' ? 'page-hero--center' : ''}`}>
      <div className="container">
        <div className="page-hero__content">
          {badge ? <span className="page-hero__badge">{badge}</span> : null}
          <h1 className="page-hero__title">{title}</h1>
          {subtitle ? <p className="page-hero__subtitle">{subtitle}</p> : null}
          {actions ? <div className="page-hero__actions">{actions}</div> : null}
        </div>
      </div>
    </section>
  )
}

export default PageHeader
