import { useSearchParams } from 'react-router-dom'
import { GridPattern } from '@/shared/components/ui/GridPattern'
import { PageHead } from '@/shared/components/ui/PageHead'
import { Button } from '@/shared/components/ui/Button'
import { AlertIcon } from '@/shared/components/ui/icons'
import { useCheckout, usePlans, usePortal, useSubscription } from '../hooks'
import { PlanCard } from '../components/PlanCard'
import { UsageMeter } from '../components/UsageMeter'
import { NeedHelpCard } from '../components/NeedHelpCard'
import { ReportIssueCard } from '../components/ReportIssueCard'
import { formatBytes } from '../lib/format'

const TIER_ORDER = ['free', 'pro', 'team']

export function BillingPage() {
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription()
  const { data: plans, isLoading: plansLoading } = usePlans()
  const checkout = useCheckout()
  const portal = usePortal()
  const [searchParams] = useSearchParams()
  const checkoutResult = searchParams.get('checkout')

  if (subscriptionLoading || plansLoading || !subscription || !plans) {
    return (
      <div className="pg">
        <GridPattern cellSize={28} className="pg-grid" />
        <div className="pg-body bl-skel">
          <PageHead kicker="Billing" title="Billing" subtitle="Manage your plan, usage, and payment details." />
          <div className="bl-layout">
            <div className="bl-main">
              <div className="plans">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="skeleton" style={{ height: 300 }} />
                ))}
              </div>
              <div className="skeleton" style={{ height: 170 }} />
            </div>
            <div className="bl-aside">
              <div className="skeleton" style={{ height: 260 }} />
              <div className="skeleton" style={{ height: 140 }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const featuredTier = plans.find((plan) => plan.tier === 'pro')?.tier

  return (
    <div className="pg">
      <GridPattern cellSize={28} className="pg-grid" />

      <div className="pg-body">
        <PageHead
          kicker="Billing"
          title="Billing"
          subtitle="Manage your plan, usage, and payment details."
          actions={
            subscription.tier !== 'free' && (
              <Button variant="outline" size="sm" onClick={() => portal.mutate()} loading={portal.isPending}>
                {portal.isPending ? 'Opening…' : 'Manage billing'}
              </Button>
            )
          }
        />

        {checkoutResult === 'cancel' && (
          <div className="note-bar rise">
            <AlertIcon />
            Checkout was cancelled.
          </div>
        )}
        {subscription.status === 'past_due' && (
          <div className="note-bar rise">
            <AlertIcon />
            Your last payment failed. Update your payment method to avoid losing access to your plan.
          </div>
        )}

        <div className="bl-layout">
          <div className="bl-main">
            <div className="plans stagger">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.tier}
                  plan={plan}
                  featured={plan.tier === featuredTier}
                  isCurrent={subscription.tier === plan.tier}
                  isDowngrade={TIER_ORDER.indexOf(plan.tier) < TIER_ORDER.indexOf(subscription.tier)}
                  onUpgrade={() => checkout.mutate(plan.tier)}
                  isUpgrading={checkout.isPending && checkout.variables === plan.tier}
                />
              ))}
            </div>

            <section className="panel usage rise">
              <h3>Usage</h3>
              <div className="usage-grid">
                <UsageMeter label="Workspaces" used={subscription.workspace_count} max={subscription.max_workspaces} formatValue={(value) => String(value)} />
                <UsageMeter label="Storage" used={subscription.storage_used_bytes} max={subscription.max_total_storage_bytes} formatValue={formatBytes} />
              </div>
              <p className="usage-note">Max file size on your plan: {formatBytes(subscription.max_resource_size_bytes)}</p>
            </section>
          </div>

          <aside className="bl-aside rise">
            <NeedHelpCard />
            <ReportIssueCard />
          </aside>
        </div>
      </div>
    </div>
  )
}
