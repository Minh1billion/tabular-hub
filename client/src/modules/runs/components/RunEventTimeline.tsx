import { AlertIcon, ArrowRightIcon } from '@/shared/components/ui/icons'
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

function kindOf(name: string) {
  if (name === 'failed' || name === 'cancelled' || name === 'node_failed') return 'bad'
  if (name === 'completed' || name === 'node_completed') return 'ok'
  if (name.endsWith('started') || name === 'queued' || name === 'running') return 'run'
  return 'n'
}

function NodeProgressBar({ nodeId, progress }: { nodeId: string; progress: NodeProgressState }) {
  const percent = progress.processed != null && progress.total ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : null

  return (
    <div className="tl-prog">
      <div className="tl-prog-top">
        <span>{nodeId}</span>
        {percent != null && <span>{percent}%</span>}
      </div>
      {percent != null ? (
        <div className="bar live">
          <i style={{ width: `${percent}%` }} />
        </div>
      ) : (
        <div className="bar indet">
          <i />
        </div>
      )}
    </div>
  )
}

export function RunEventTimeline({ events }: RunEventTimelineProps) {
  const failedEvent = events.find((event) => event.event === 'failed')
  const completedEvent = events.find((event) => event.event === 'completed')
  const leaves = (completedEvent?.data?.leaves as Array<{ node_id: string; columns: string[]; history: string[] }>) ?? []

  const nodeProgress = computeNodeProgress(events)
  const activeNodes = Object.entries(nodeProgress).filter(([, progress]) => progress.status === 'running')
  const visibleEvents = events.filter((event) => event.event !== 'node_progress')

  return (
    <div className="tl-wrap">
      {failedEvent && (
        <div className="tl-fail">
          <AlertIcon />
          {failedEvent.node_id ? (
            <span>
              Node <code>{failedEvent.node_id as string}</code> ({failedEvent.node_type as string}) failed: {failedEvent.error as string}
            </span>
          ) : (
            <span>{failedEvent.error as string}</span>
          )}
        </div>
      )}

      {activeNodes.length > 0 && (
        <div className="tl-sec">
          <span className="kicker">In progress</span>
          {activeNodes.map(([nodeId, progress]) => (
            <NodeProgressBar key={nodeId} nodeId={nodeId} progress={progress} />
          ))}
        </div>
      )}

      {leaves.length > 0 && (
        <div className="tl-sec">
          <span className="kicker">Output</span>
          {leaves.map((leaf) => (
            <div key={leaf.node_id} className="tl-leaf">
              <b>{leaf.node_id}</b>
              <div className="row">
                <span>Columns</span>
                <div className="tl-chips">
                  {leaf.columns.map((column) => (
                    <em key={column}>{column}</em>
                  ))}
                </div>
              </div>
              <div className="row">
                <span>History</span>
                <div className="tl-chips">
                  {leaf.history.map((step, index) => (
                    <span key={`${step}-${index}`} className="tl-chips">
                      {index > 0 && <ArrowRightIcon />}
                      <span className="hop">{step}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="tl-sec">
        <span className="kicker">Events</span>
        {visibleEvents.length === 0 ? (
          <span className="tl-none">No events yet.</span>
        ) : (
          <ul className="tl">
            {visibleEvents.map((event, index) => (
              <li key={index} data-k={kindOf(event.event)}>
                <b>{event.event}</b>
                {typeof event.node_id === 'string' && <span className="node">{event.node_id}</span>}
              </li>
            ))}
          </ul>
        )}
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
