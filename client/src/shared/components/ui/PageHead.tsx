import { ReactNode } from 'react'

interface PageHeadProps {
  kicker?: string
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHead({ kicker, title, subtitle, actions }: PageHeadProps) {
  return (
    <div className="pg-head">
      <div>
        {kicker && <span className="kicker">{kicker}</span>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="pg-actions">{actions}</div>}
    </div>
  )
}
