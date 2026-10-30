import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  tone?: 'neutral' | 'warning' | 'critical'
  onClick?: () => void
  active?: boolean
}

export function MetricCard({ label, value, detail, icon: Icon, tone = 'neutral', onClick, active }: MetricCardProps) {
  const content = (
    <>
      <span className={`metric-icon metric-icon--${tone} inline-flex shrink-0 items-center justify-center`}><Icon size={16} strokeWidth={1.8} /></span>
      <span className="metric-copy">
        <span className="metric-label">{label}</span>
        <strong>{value}</strong>
        <span className="metric-detail">{detail}</span>
      </span>
      <span className="metric-trend" aria-hidden="true">↗</span>
    </>
  )

  if (onClick) {
    return (
      <button className={`metric-card ${active ? 'metric-card--active' : ''}`} onClick={onClick} type="button">
        {content}
      </button>
    )
  }

  return <div className="metric-card">{content}</div>
}
