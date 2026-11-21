import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/components/ui/Button'
import { ApiError } from '@/shared/lib/api-client'
import { useRunEvents } from '../hooks-events'
import { TERMINAL_RUN_EVENTS } from '../types'
import { resourcesQueryKey } from '@/modules/resources/hooks'
import { useCancelRun } from '../hooks'
import { RunBadge } from './RunBadge'
import { RunEventTimeline } from './RunEventTimeline'

interface RunPanelProps {
  workspaceId: string
  runId: string
  initialStatus: string
}

export function RunPanel({ workspaceId, runId, initialStatus }: RunPanelProps) {
  const [status, setStatus] = useState(initialStatus)
  const { events, latestEvent } = useRunEvents(workspaceId, runId)
  const cancelRun = useCancelRun(workspaceId)
  const queryClient = useQueryClient()

  useEffect(() => {
    setStatus(initialStatus)
  }, [runId, initialStatus])

  useEffect(() => {
    if (latestEvent && TERMINAL_RUN_EVENTS.includes(latestEvent.event as (typeof TERMINAL_RUN_EVENTS)[number])) {
      setStatus(latestEvent.event)
    }
  }, [latestEvent])

  useEffect(() => {
    if (status === 'completed') {
      queryClient.invalidateQueries({ queryKey: resourcesQueryKey(workspaceId) })
    }
  }, [status, workspaceId])

  const canCancel = status === 'queued' || status === 'running'

  return (
    <div className="rp">
      <div className="rp-head">
        <RunBadge status={status} />
        <span className="font-mono text-[11px] text-muted">{runId.slice(0, 8)}</span>
        {canCancel && (
          <Button type="button" variant="danger" size="sm" loading={cancelRun.isPending} onClick={() => cancelRun.mutate(runId, { onSuccess: (run) => setStatus(run.status) })}>
            Cancel run
          </Button>
        )}
        {cancelRun.isError && (
          <span className="rp-err">
            {cancelRun.error instanceof ApiError && cancelRun.error.status === 409 ? 'Run already finished, cannot cancel' : cancelRun.error.message}
          </span>
        )}
      </div>

      <RunEventTimeline events={events} />
    </div>
  )
}
