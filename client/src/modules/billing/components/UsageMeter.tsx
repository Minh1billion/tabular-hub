import { cn } from '@/shared/lib/cn'
import { Badge } from '@/shared/components/ui/Badge'

interface UsageMeterProps {
  label: string
  used: number
  max: number
  formatValue: (value: number) => string
}

export function UsageMeter({ label, used, max, formatValue }: UsageMeterProps) {
  const percent = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0
  const isNearLimit = percent >= 80

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-[13px]">
        <span className="text-slate font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-muted">
            {formatValue(used)} / {formatValue(max)}
          </span>
          {isNearLimit && <Badge tone="error">near limit</Badge>}
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-cream-soft border border-black overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', isNearLimit ? 'bg-warn' : 'bg-brand')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}