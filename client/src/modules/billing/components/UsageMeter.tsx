import { Badge } from '@/shared/components/ui/Badge'
import { cn } from '@/shared/lib/cn'

const SEGMENTS = 20

interface UsageMeterProps {
  label: string
  used: number
  max: number
  formatValue: (value: number) => string
}

export function UsageMeter({ label, used, max, formatValue }: UsageMeterProps) {
  const percent = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0
  const isNearLimit = percent >= 80
  const filled = used > 0 ? Math.max(1, Math.round((percent / 100) * SEGMENTS)) : 0

  return (
    <div>
      <div className="um-top">
        <span>{label}</span>
        <span className="vals">
          <b>{formatValue(used)}</b> / {formatValue(max)}
          {isNearLimit && <Badge tone="error">near limit</Badge>}
        </span>
      </div>
      <div className={cn('um-meter', isNearLimit && 'low')} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        {Array.from({ length: SEGMENTS }).map((_, index) => (
          <i key={index} className={index < filled ? 'on' : undefined} style={{ ['--i' as string]: index }} />
        ))}
      </div>
    </div>
  )
}
