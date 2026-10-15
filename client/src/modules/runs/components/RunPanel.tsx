import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { ApiError } from '@/shared/lib/api-client'
import { useRunEvents } from '../hooks-events'
import { TERMINAL_RUN_EVENTS } from '../types'
import { resourcesQueryKey } from '@/modules/resources/hooks'
import { useCancelRun } from '../hooks'
import { RunEventTimeline, RUN_BADGE_TONE } from './RunEventTimeline'

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
    <div className="p-3 flex flex-col gap-3 text-sm">
      <div className="flex items-center gap-2">
        <Badge tone={RUN_BADGE_TONE[status] ?? 'pending'}>{status}</Badge>
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

      <RunEventTimeline events={events} />
    </div>
  )
}