import { useSearchParams } from 'react-router-dom'
import { GridPattern } from '@/shared/components/ui/GridPattern'
import { Button } from '@/shared/components/ui/Button'
import { useCheckout, usePlans, usePortal, useSubscription } from '../hooks'
import { PlanCard } from '../components/PlanCard'
import { UsageMeter } from '../components/UsageMeter'
import { formatBytes } from '../lib/format'

export function BillingPage() {
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription()
  const { data: plans, isLoading: plansLoading } = usePlans()
  const checkout = useCheckout()
  const portal = usePortal()
  const [searchParams] = useSearchParams()
  const checkoutResult = searchParams.get('checkout')

  if (subscriptionLoading || plansLoading || !subscription || !plans) {
    return <p className="text-sm text-muted px-10 py-8">Loading billing…</p>
  }

  return (
    <div className="relative px-10 py-8">
      <GridPattern cellSize={28} />

      <div className="relative flex items-end justify-between mb-6">
        <div>
          <h2 className="font-headline font-semibold text-[22px] mb-1.5">Billing</h2>
          <p className="text-[13.5px] text-slate">Manage your plan, usage, and payment details.</p>
        </div>
        {subscription.tier !== 'free' && (
          <Button variant="outline" size="sm" onClick={() => portal.mutate()} disabled={portal.isPending}>
            {portal.isPending ? 'Opening…' : 'Manage billing'}
          </Button>
        )}
      </div>

      {checkoutResult === 'success' && (
        <div className="relative mb-6 px-4 py-3 rounded-lg bg-brand-tint text-[#0f6e4c] text-sm">
          Subscription updated. It may take a few seconds to reflect below.
        </div>
      )}
      {checkoutResult === 'cancel' && (
        <div className="relative mb-6 px-4 py-3 rounded-lg bg-warn-tint text-warn text-sm">
          Checkout was cancelled.
        </div>
      )}
      {subscription.status === 'past_due' && (
        <div className="relative mb-6 px-4 py-3 rounded-lg bg-warn-tint text-warn text-sm">
          Your last payment failed. Update your payment method to avoid losing access to your plan.
        </div>
      )}

      <div className="relative grid grid-cols-3 gap-4 mb-8 max-w-3xl">
        {plans.map((plan) => (
          <PlanCard
            key={plan.tier}
            plan={plan}
            isCurrent={subscription.tier === plan.tier}
            onUpgrade={() => checkout.mutate(plan.tier)}
            isUpgrading={checkout.isPending && checkout.variables === plan.tier}
          />
        ))}
      </div>

      <div className="relative bg-white border border-line rounded-card p-5 flex flex-col gap-5 max-w-3xl">
        <h3 className="font-headline font-semibold text-[15px]">Usage</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          <UsageMeter
            label="Workspaces"
            used={subscription.workspace_count}
            max={subscription.max_workspaces}
            formatValue={(value) => String(value)}
          />
          <UsageMeter
            label="Storage"
            used={subscription.storage_used_bytes}
            max={subscription.max_total_storage_bytes}
            formatValue={formatBytes}
          />
        </div>
        <p className="text-xs text-muted">
          Max file size on your plan: {formatBytes(subscription.max_resource_size_bytes)}
        </p>
      </div>
    </div>
  )
}