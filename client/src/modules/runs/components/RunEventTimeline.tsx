import { RunStreamEvent } from '@/shared/types/run'

interface RunEventTimelineProps {
  events: RunStreamEvent[]
}

export function RunEventTimeline({ events }: RunEventTimelineProps) {
  const failedEvent = events.find((event) => event.event === 'failed')
  const completedEvent = events.find((event) => event.event === 'completed')
  const leaves = (completedEvent?.data?.leaves as Array<{ node_id: string; columns: string[]; history: string[] }>) ?? []

  return (
    <div className="flex flex-col gap-3">
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
        {events.length === 0 && <span>No events yet.</span>}
      </div>
    </div>
  )
}

export const RUN_BADGE_TONE: Record<string, 'success' | 'error' | 'pending'> = {
  completed: 'success',
  failed: 'error',
  cancelled: 'error',
  cancelling: 'pending',
  running: 'pending',
  queued: 'pending',
}