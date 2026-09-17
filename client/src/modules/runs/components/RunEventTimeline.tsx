import { RunStreamEvent } from '../types'

interface RunEventTimelineProps {
  events: RunStreamEvent[]
}

interface NodeProgressState {
  status: 'running' | 'completed'
  processed?: number
  total?: number
}

function computeNodeProgress(events: RunStreamEvent[]): Record<string, NodeProgressState> {
  const state: Record<string, NodeProgressState> = {}

  for (const event of events) {
    const nodeId = typeof event.node_id === 'string' ? event.node_id : undefined
    if (!nodeId) continue

    if (event.event === 'node_started') {
      state[nodeId] = { status: 'running' }
    } else if (event.event === 'node_progress') {
      const processed = typeof event.rows_processed === 'number' ? event.rows_processed : undefined
      const total = typeof event.rows_total === 'number' ? event.rows_total : undefined
      state[nodeId] = { status: 'running', processed, total }
    } else if (event.event === 'node_completed') {
      state[nodeId] = { status: 'completed' }
    }
  }

  return state
}

function NodeProgressBar({ nodeId, progress }: { nodeId: string; progress: NodeProgressState }) {
  const percent =
    progress.processed != null && progress.total ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : null

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between font-mono text-[11px] text-ink">
        <span>{nodeId}</span>
        {percent != null && <span className="text-muted">{percent}%</span>}
      </div>
      <div className="h-1.5 w-full rounded-full bg-cream-soft overflow-hidden">
        {percent != null ? (
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} />
        ) : (
          <div className="h-full w-1/3 rounded-full bg-brand animate-pulse" />
        )}
      </div>
    </div>
  )
}

export function RunEventTimeline({ events }: RunEventTimelineProps) {
  const failedEvent = events.find((event) => event.event === 'failed')
  const completedEvent = events.find((event) => event.event === 'completed')
  const leaves = (completedEvent?.data?.leaves as Array<{ node_id: string; columns: string[]; history: string[] }>) ?? []

  const nodeProgress = computeNodeProgress(events)
  const activeNodes = Object.entries(nodeProgress).filter(([, progress]) => progress.status === 'running')

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

      {activeNodes.length > 0 && (
        <div className="flex flex-col gap-2">
          {activeNodes.map(([nodeId, progress]) => (
            <NodeProgressBar key={nodeId} nodeId={nodeId} progress={progress} />
          ))}
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
        {events
          .filter((event) => event.event !== 'node_progress')
          .map((event, index) => (
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