import { Link, useParams } from 'react-router-dom'
import { ArrowRightIcon } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/cn'
import { useWorkspaces } from '@/modules/workspace/hooks'
import { useSubscription, useWorkspaceSubscription } from '../hooks'
import { formatBytes } from '../lib/format'

const NEAR_LIMIT = 80

function percentOf(used: number, max: number) {
  return max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0
}

export function UsageTracker() {
  const { id: activeId } = useParams<{ id: string }>()
  const { data: workspaces } = useWorkspaces()
  const sharedWorkspaceId = workspaces?.find((w) => w.id === activeId && w.role === 'member')?.id
  const { data: ownSub } = useSubscription()
  const { data: ownerSub } = useWorkspaceSubscription(sharedWorkspaceId)
  const sub = sharedWorkspaceId ? ownerSub : ownSub

  if (!sub) return <span className="usage-chip skel" aria-hidden="true" />

  const wsPct = percentOf(sub.workspace_count, sub.max_workspaces)
  const stPct = percentOf(sub.storage_used_bytes, sub.max_total_storage_bytes)
  const near = wsPct >= NEAR_LIMIT || stPct >= NEAR_LIMIT
  const summary = `${sharedWorkspaceId ? "Owner's " : ''}${sub.tier} plan: ${sub.workspace_count}/${sub.max_workspaces} workspaces, ${formatBytes(sub.storage_used_bytes)} of ${formatBytes(sub.max_total_storage_bytes)} storage`

  const content = (
    <>
      <span className="uc-plan">{sub.tier}</span>
      <span className="uc-item">
        <i className={cn('uc-bar', wsPct >= NEAR_LIMIT && 'low')}>
          <b style={{ width: `${wsPct}%` }} />
        </i>
        <em>
          {sub.workspace_count}/{sub.max_workspaces} ws
        </em>
      </span>
      <span className="uc-item">
        <i className={cn('uc-bar', stPct >= NEAR_LIMIT && 'low')}>
          <b style={{ width: `${stPct}%` }} />
        </i>
        <em>
          {formatBytes(sub.storage_used_bytes)}/{formatBytes(sub.max_total_storage_bytes)}
        </em>
      </span>
    </>
  )

  if (sharedWorkspaceId) {
    return (
      <span className={cn('usage-chip tip-host', near && 'warn')} data-tip="Workspace owner's plan" data-side="bottom" aria-label={summary}>
        {content}
      </span>
    )
  }

  return (
    <Link to="/billing" className={cn('usage-chip tip-host', near && 'warn')} data-tip={near ? 'Near your limit — view plans' : 'Usage & plan'} data-side="bottom" aria-label={summary}>
      {content}
      <ArrowRightIcon className="uc-go" />
    </Link>
  )
}
