import { useEffect, useState } from 'react'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { ApiError } from '@/shared/lib/api-client'
import { useRunEvents } from '@/shared/hooks/useRunEvents'
import { TERMINAL_RUN_EVENTS } from '@/shared/types/run'
import { useCancelRun } from '../hooks'

interface RunPanelProps {
  workspaceId: string
  runId: string
  initialStatus: string
}

const BADGE_TONE: Record<string, 'success' | 'error' | 'pending'> = {
  completed: 'success',
  failed: 'error',
  cancelled: 'error',
  cancelling: 'pending',
  running: 'pending',
  queued: 'pending',
}

export function RunPanel({ workspaceId, runId, initialStatus }: RunPanelProps) {
  const [status, setStatus] = useState(initialStatus)
  const { events, latestEvent } = useRunEvents(workspaceId, runId)
  const cancelRun = useCancelRun(workspaceId)

  useEffect(() => {
    setStatus(initialStatus)
  }, [runId, initialStatus])

  useEffect(() => {
    if (latestEvent && TERMINAL_RUN_EVENTS.includes(latestEvent.event as (typeof TERMINAL_RUN_EVENTS)[number])) {
      setStatus(latestEvent.event)
    }
  }, [latestEvent])

  const canCancel = status === 'queued' || status === 'running'
  const failedEvent = events.find((event) => event.event === 'failed')
  const completedEvent = events.find((event) => event.event === 'completed')
  const leaves = (completedEvent?.data?.leaves as Array<{ node_id: string; columns: string[]; history: string[] }>) ?? []

  return (
    <div className="p-3 flex flex-col gap-3 text-sm">
      <div className="flex items-center gap-2">
        <Badge tone={BADGE_TONE[status] ?? 'pending'}>{status}</Badge>
        {canCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={cancelRun.isPending}
            onClick={() => cancelRun.mutate(runId, { onSuccess: (run) => setStatus(run.status) })}
          >
            Cancel
          </Button>
        )}
        {cancelRun.isError && (
          <span className="text-[12px] text-warn">
            {cancelRun.error instanceof ApiError && cancelRun.error.status === 409
              ? 'Run already finished, cannot cancel'
              : cancelRun.error.message}
          </span>
        )}
      </div>

      {failedEvent && (
        <div className="text-[12px] text-warn">
          {failedEvent.node_id ? (
            <span>
              Node <b>{failedEvent.node_id as string}</b> ({failedEvent.node_type as string}) failed:{' '}
              {failedEvent.error as string}
            </span>
          ) : (
            <span>{failedEvent.error as string}</span>
          )}
        </div>
      )}

      {leaves.length > 0 && (
        <div className="flex flex-col gap-2">
          {leaves.map((leaf) => (
            <div key={leaf.node_id} className="border border-line rounded-lg p-2">
              <div className="font-mono text-[11px] text-ink">{leaf.node_id}</div>
              <div className="text-[11px] text-muted">columns: {leaf.columns.join(', ')}</div>
              <div className="text-[11px] text-muted">history: {leaf.history.join(' → ')}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1 font-mono text-[11px] text-muted">
        {events.map((event, index) => (
          <div key={index}>
            {event.event}
            {typeof event.node_id === 'string' ? ` - ${event.node_id}` : ''}
          </div>
        ))}
      </div>
    </div>
  )
}