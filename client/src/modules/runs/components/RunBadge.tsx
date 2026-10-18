import { Badge } from '@/shared/components/ui/Badge'
import { cn } from '@/shared/lib/cn'

const TONE: Record<string, 'success' | 'error' | 'pending'> = {
  completed: 'success',
  failed: 'error',
  cancelled: 'error',
  cancelling: 'pending',
  running: 'pending',
  queued: 'pending',
}

const LIVE = ['running', 'queued', 'cancelling']

export function RunBadge({ status }: { status: string }) {
  return (
    <Badge tone={TONE[status] ?? 'pending'}>
      <i className={cn('bdot', LIVE.includes(status) && 'live')} />
      {status}
    </Badge>
  )
}
