import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/ui/Button'
import { CheckIcon, CloseIcon, CopyIcon } from '@/shared/components/ui/icons'
import { ApiError } from '@/shared/lib/api-client'
import { useRunEvents } from '../hooks-events'
import { useCancelRun, useRun } from '../hooks'
import { RunBadge } from './RunBadge'
import { RunEventTimeline } from './RunEventTimeline'
import { formatDuration, formatKind, formatRelativeTime } from '../lib/format'

export const ACTIVE_STATUSES = ['queued', 'running', 'cancelling', 'pending_upload']
const CANCELLABLE_STATUSES = ['queued', 'running', 'cancelling']

export function KindBadge({ kind }: { kind: string }) {
  return (
    <span className="rn-kind" data-k={(kind || 'pipeline').toLowerCase()}>
      {formatKind(kind)}
    </span>
  )
}

interface RunDetailProps {
  workspaceId: string
  runId: string
  onBack: () => void
}

export function RunDetail({ workspaceId, runId, onBack }: RunDetailProps) {
  const { data: run, isLoading, isError, error } = useRun(workspaceId, runId)
  const { events } = useRunEvents(workspaceId, runId)
  const cancelRun = useCancelRun(workspaceId)
  const [copied, setCopied] = useState(false)
  const [, setTick] = useState(0)

  const isActive = Boolean(run && ACTIVE_STATUSES.includes(run.status))

  useEffect(() => {
    if (!isActive) return
    const timer = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(timer)
  }, [isActive])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function handleCopyId() {
    if (!run?.id) return
    try {
      await navigator.clipboard.writeText(run.id)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  if (isLoading) {
    return (
      <div className="rn-detail">
        <div className="skeleton" style={{ height: 110, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 160 }} />
      </div>
    )
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <div className="rn-err">
        <p className="m-0">{notFound ? 'Run not found.' : error.message}</p>
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          Back to list
        </Button>
      </div>
    )
  }

  if (!run) return null

  const canCancel = CANCELLABLE_STATUSES.includes(run.status)
  const isCancelling = cancelRun.isPending || run.status === 'cancelling'

  return (
    <div className="rn-detail" key={run.id}>
      <div className="rn-hero">
        <div className="rn-hero-top">
          <KindBadge kind={run.kind} />
          <code>{run.id}</code>
          <RunBadge status={run.status} />
          <div className="rn-actions">
            <Button type="button" variant="outline" size="sm" onClick={handleCopyId} title="Copy run ID">
              {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy ID'}
            </Button>
            {canCancel && (
              <Button type="button" variant="danger" size="sm" disabled={isCancelling} onClick={() => cancelRun.mutate(run.id)}>
                <CloseIcon className="w-3.5 h-3.5" />
                {isCancelling ? 'Cancelling…' : 'Cancel run'}
              </Button>
            )}
          </div>
        </div>

        {cancelRun.isError && (
          <div className="rn-cancel-err">
            {cancelRun.error instanceof ApiError && cancelRun.error.status === 409 ? 'Run already finished and cannot be cancelled.' : cancelRun.error.message}
          </div>
        )}

        <dl className="rn-meta">
          <div>
            <dt>Created</dt>
            <dd title={new Date(run.created_at).toLocaleString()}>{formatRelativeTime(run.created_at)}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>
              {formatDuration(run)}
              {isActive && <small> · in progress</small>}
            </dd>
          </div>
          <div>
            <dt>Attempt</dt>
            <dd>#{run.attempt}</dd>
          </div>
          <div>
            <dt>Execution</dt>
            <dd title={run.execution_id ?? 'None'}>{run.execution_id ? `${run.execution_id.slice(0, 8)}…` : '—'}</dd>
          </div>
        </dl>
      </div>
      <RunEventTimeline events={events} />
    </div>
  )
}
