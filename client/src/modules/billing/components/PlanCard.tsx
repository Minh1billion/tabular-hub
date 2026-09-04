import { Card } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { cn } from '@/shared/lib/cn'
import { formatBytes, formatPrice } from '../lib/format'
import { Plan } from '../types'

interface PlanCardProps {
  plan: Plan
  isCurrent: boolean
  isDowngrade: boolean
  onUpgrade: () => void
  isUpgrading: boolean
}

export function PlanCard({ plan, isCurrent, isDowngrade, onUpgrade, isUpgrading }: PlanCardProps) {
  return (
    <Card
      className={cn(
        'flex flex-col gap-4',
        isCurrent && 'border-[#32664d] ring-2 ring-[#32664d]/30 shadow-[0_0_0_4px_rgba(50,102,77,0.08)]',
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-headline font-semibold text-[17px]">{plan.label}</h3>
        {isCurrent && <Badge tone="success">Current plan</Badge>}
      </div>

      <div>
        <span className="text-2xl font-semibold">{formatPrice(plan.price_cents, plan.currency)}</span>
        {plan.interval && <span className="text-sm text-muted">/{plan.interval}</span>}
      </div>

      <ul className="flex flex-col gap-2 text-[13.5px] text-slate flex-1">
        <li>{plan.max_workspaces} workspace{plan.max_workspaces > 1 ? 's' : ''}</li>
        <li>Up to {formatBytes(plan.max_resource_size_bytes)} per file</li>
        <li>{formatBytes(plan.max_total_storage_bytes)} total storage</li>
      </ul>

      {plan.tier === 'free' ? (
        <Button variant="outline" size="md" disabled className="w-full justify-center">
          {isCurrent ? 'Current plan' : 'Included'}
        </Button>
      ) : (
        <Button
          variant={isCurrent ? 'outline' : 'primary'}
          size="md"
          disabled={isCurrent || isDowngrade || isUpgrading}
          onClick={onUpgrade}
          className="w-full justify-center"
        >
          {isCurrent ? 'Current plan' : isDowngrade ? 'Included' : isUpgrading ? 'Redirecting…' : `Upgrade to ${plan.label}`}
        </Button>
      )}
    </Card>
  )
}