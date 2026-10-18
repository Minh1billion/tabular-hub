import { cn } from '@/shared/lib/cn'

interface ToggleProps {
  on: boolean
  onChange: (on: boolean) => void
  label?: string
}

export function Toggle({ on, onChange, label }: ToggleProps) {
  return (
    <button type="button" role="switch" aria-checked={on} className={cn('toggle', on && 'on')} onClick={() => onChange(!on)}>
      <span className="toggle-track">
        <i />
      </span>
      {label}
    </button>
  )
}
