import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { ApiError } from '@/shared/lib/api-client'
import { useRunEvents } from '@/shared/hooks/useRunEvents'
import { useRun, useRuns } from '../hooks'
import { RunEventTimeline, RUN_BADGE_TONE } from '../components/RunEventTimeline'

const LIMIT = 20

function RunDetail({ workspaceId, runId }: { workspaceId: string; runId: string }) {
  const navigate = useNavigate()
  const { data: run, isLoading, isError, error } = useRun(workspaceId, runId)
  const { events } = useRunEvents(workspaceId, runId)

  if (isLoading) {
    return <div className="p-6 text-sm text-muted">Loading run…</div>
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404

    return (
      <div className="p-6 flex flex-col gap-3">
        <p className="text-sm text-warn">{notFound ? 'Run not found.' : error.message}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/workspaces/${workspaceId}/runs`)}>
          Back to list
        </Button>
      </div>
    )
  }

  if (!run) return null

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[12px] text-muted">{run.id}</span>
        <Badge tone={RUN_BADGE_TONE[run.status] ?? 'pending'}>{run.status}</Badge>
      </div>
      <RunEventTimeline events={events} />
    </div>
  )
}

export function RunHistoryPage() {
  const { workspaceId = '', runId } = useParams<{ workspaceId: string; runId: string }>()
  const [offset, setOffset] = useState(0)
  const { data: runs = [], isLoading } = useRuns(workspaceId, LIMIT, offset)

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 flex items-center gap-3 px-5 border-b border-line bg-white shrink-0">
        <Link to={`/workspaces/${workspaceId}`} className="text-sm text-muted hover:text-ink transition-colors">
          Editor
        </Link>
        <span className="text-muted">/</span>
        <span className="text-sm font-medium text-ink">Run History</span>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="w-72 border-r border-line flex flex-col overflow-auto">
          {isLoading ? (
            <p className="p-4 text-sm text-muted">Loading runs…</p>
          ) : runs.length === 0 && offset === 0 ? (
            <div className="p-4 flex flex-col gap-2">
              <p className="text-sm text-muted">No pipeline has been run in this workspace yet.</p>
              <Link to={`/workspaces/${workspaceId}`} className="text-sm text-brand hover:underline">
                Go build a pipeline
              </Link>
            </div>
          ) : (
            runs.map((run) => (
              <Link
                key={run.id}
                to={`/workspaces/${workspaceId}/runs/${run.id}`}
                className={`flex items-center justify-between gap-2 px-4 py-3 border-b border-line text-sm hover:bg-cream-soft ${
                  run.id === runId ? 'bg-cream-soft' : ''
                }`}
              >
                <span className="font-mono text-[11px] text-muted truncate">{run.id}</span>
                <Badge tone={RUN_BADGE_TONE[run.status] ?? 'pending'}>{run.status}</Badge>
              </Link>
            ))
          )}

          <div className="mt-auto flex items-center justify-between p-3 border-t border-line">
            <Button type="button" variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>
              Prev
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={runs.length < LIMIT} onClick={() => setOffset(offset + LIMIT)}>
              Next
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {runId ? (
            <RunDetail workspaceId={workspaceId} runId={runId} />
          ) : (
            <div className="p-6 text-sm text-muted">Select a run to see its details.</div>
          )}
        </div>
      </div>
    </div>
  )
}