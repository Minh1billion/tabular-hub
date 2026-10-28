import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { CheckIcon } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/cn'
import { formatBytes, formatPrice } from '../lib/format'
import { TIER_ACCENT, TierIcon } from '../lib/plan-icons'
import { Plan } from '../types'

interface PlanCardProps {
  plan: Plan
  isCurrent: boolean
  isDowngrade: boolean
  featured?: boolean
  onUpgrade: () => void
  isUpgrading: boolean
}

export function PlanCard({ plan, isCurrent, isDowngrade, featured, onUpgrade, isUpgrading }: PlanCardProps) {
  return (
    <article className={cn('plan', isCurrent && 'current', featured && !isCurrent && 'featured')} style={{ ['--accent' as string]: TIER_ACCENT[plan.tier] }}>
      {featured && !isCurrent && <span className="plan-badge">Popular</span>}

      <div className="plan-top">
        <span className="plan-ico">
          <TierIcon tier={plan.tier} />
        </span>
        {isCurrent && <Badge tone="success">Current plan</Badge>}
      </div>

      <div>
        <h3>{plan.label}</h3>
        <span className="price">
          {formatPrice(plan.price_cents, plan.currency)}
          {plan.interval && <small>/{plan.interval}</small>}
        </span>
      </div>

      <ul>
        <li>
          <CheckIcon />
          {plan.max_workspaces} workspace{plan.max_workspaces > 1 ? 's' : ''}
        </li>
        <li>
          <CheckIcon />
          Up to {formatBytes(plan.max_resource_size_bytes)} per file
        </li>
        <li>
          <CheckIcon />
          {formatBytes(plan.max_total_storage_bytes)} total storage
        </li>
      </ul>

      {plan.tier === 'free' ? (
        <Button variant="outline" disabled>
          {isCurrent ? 'Current plan' : 'Included'}
        </Button>
      ) : (
        <Button variant={isCurrent || isDowngrade ? 'outline' : 'primary'} disabled={isCurrent || isDowngrade} loading={isUpgrading} onClick={onUpgrade}>
          {isCurrent ? 'Current plan' : isDowngrade ? 'Included' : isUpgrading ? 'Redirecting…' : `Upgrade to ${plan.label}`}
        </Button>
      )}
    </article>
  )
}
