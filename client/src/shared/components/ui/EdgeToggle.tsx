import { cn } from '@/shared/lib/cn'
import { ChevronIcon } from './icons'

interface EdgeToggleProps {
  collapsed: boolean
  onClick: () => void
  label: string
  className?: string
}

export function EdgeToggle({ collapsed, onClick, label, className }: EdgeToggleProps) {
  return (
    <button type="button" className={cn('edge-toggle', collapsed && 'collapsed', className)} onClick={onClick} aria-label={label} aria-expanded={!collapsed}>
      <ChevronIcon />
    </button>
  )
}
