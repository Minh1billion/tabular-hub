import { Card } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { cn } from '@/shared/lib/cn'
import { formatBytes, formatPrice } from '../lib/format'
import { Plan, PlanTier } from '../types'

interface PlanCardProps {
  plan: Plan
  isCurrent: boolean
  isDowngrade: boolean
  onUpgrade: () => void
  isUpgrading: boolean
}

const TIER_ACCENT: Record<PlanTier, string> = {
  free: 'var(--accent-olive)',
  pro: 'var(--accent-teal)',
  team: 'var(--accent-plum)',
}

export function PlanCard({ plan, isCurrent, isDowngrade, onUpgrade, isUpgrading }: PlanCardProps) {
  const accentColor = TIER_ACCENT[plan.tier]

  return (
    <Card
      className={cn(
        'flex flex-col gap-4 border-2 !border-black',
        isCurrent && 'bg-brand-tint',
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center"
          style={{ background: `color-mix(in srgb, ${accentColor} 16%, white)` }}
        >
          <svg className="w-4 h-4" style={{ color: accentColor }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3l2.5 5.5L20 9.5l-4 4 1 5.5L12 16l-5 3 1-5.5-4-4 5.5-1z" />
          </svg>
        </div>
        {isCurrent && <Badge tone="success">Current plan</Badge>}
      </div>

      <div>
        <h3 className="font-headline font-semibold text-[17px] mb-1">{plan.label}</h3>
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
          variant={isCurrent || isDowngrade ? 'outline' : 'primary'}
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