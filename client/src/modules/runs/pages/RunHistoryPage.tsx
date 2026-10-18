import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/components/ui/Button'
import { ChevronIcon, PlayIcon } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/cn'
import { ApiError } from '@/shared/lib/api-client'
import { useWorkspace } from '@/modules/workspace/hooks'
import { useRunEvents } from '@/modules/runs/hooks-events'
import { useRun, useRuns } from '../hooks'
import { RunBadge } from '../components/RunBadge'
import { RunEventTimeline } from '../components/RunEventTimeline'

const LIMIT = 20

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function RunDetail({ workspaceId, runId }: { workspaceId: string; runId: string }) {
  const navigate = useNavigate()
  const { data: run, isLoading, isError, error } = useRun(workspaceId, runId)
  const { events } = useRunEvents(workspaceId, runId)

  if (isLoading) {
    return (
      <div className="rn-detail">
        <div className="skeleton" style={{ height: 140, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 220 }} />
      </div>
    )
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404

    return (
      <div className="rn-err">
        <p className="m-0">{notFound ? 'Run not found.' : error.message}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/workspaces/${workspaceId}/runs`)}>
          Back to list
        </Button>
      </div>
    )
  }

  if (!run) return null

  return (
    <div className="rn-detail" key={run.id}>
      <div className="rn-hero">
        <div className="rn-hero-top">
          <code>{run.id}</code>
          <RunBadge status={run.status} />
        </div>
        <dl className="rn-meta">
          <div>
            <dt>Kind</dt>
            <dd>{run.kind}</dd>
          </div>
          <div>
            <dt>Attempt</dt>
            <dd>{run.attempt}</dd>
          </div>
          <div>
            <dt>Started</dt>
            <dd>{formatTime(run.created_at)}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatTime(run.updated_at)}</dd>
          </div>
        </dl>
      </div>
      <RunEventTimeline events={events} />
    </div>
  )
}

export function RunHistoryPage() {
  const { workspaceId = '', runId } = useParams<{ workspaceId: string; runId: string }>()
  const [offset, setOffset] = useState(0)
  const { data: runs = [], isLoading } = useRuns(workspaceId, LIMIT, offset)
  const { data: workspace } = useWorkspace(workspaceId)
  const page = Math.floor(offset / LIMIT) + 1

  return (
    <div className="rn">
      <div className="rn-bar">
        <h2>{workspace?.name}</h2>
        {!isLoading && <span className="count">{runs.length} on this page</span>}
      </div>

      <div className="rn-body">
        <aside className="rn-side">
          {isLoading ? (
            <div className="rn-skel">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="skeleton" />
              ))}
            </div>
          ) : runs.length === 0 && offset === 0 ? (
            <div className="rn-empty">
              <span>No pipeline has been run in this workspace yet.</span>
              <Link to={`/workspaces/${workspaceId}`} className="btn btn-primary btn-sm">
                <PlayIcon className="w-3 h-3" />
                Go build a pipeline
              </Link>
            </div>
          ) : (
            <div className="rn-list thin-scrollbar stagger">
              {runs.map((run) => (
                <Link key={run.id} to={`/workspaces/${workspaceId}/runs/${run.id}`} className={cn('rn-item', run.id === runId && 'on')}>
                  <span className="rn-dot" data-s={run.status} />
                  <div className="info">
                    <b>{run.id.slice(0, 8)}</b>
                    <small>
                      {run.kind} · {formatTime(run.created_at)}
                    </small>
                  </div>
                  <RunBadge status={run.status} />
                </Link>
              ))}
            </div>
          )}

          <div className="rn-pager">
            <Button type="button" variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>
              Prev
            </Button>
            <span>Page {page}</span>
            <Button type="button" variant="outline" size="sm" disabled={runs.length < LIMIT} onClick={() => setOffset(offset + LIMIT)}>
              Next
            </Button>
          </div>
        </aside>

        <section className="rn-main thin-scrollbar">
          {runId ? (
            <RunDetail workspaceId={workspaceId} runId={runId} />
          ) : (
            <div className="rn-placeholder">
              <div className="rs-empty">
                <span className="cat-tile" data-cat="Transform">
                  <ChevronIcon className="w-5 h-5" style={{ transform: 'rotate(-90deg)' }} />
                </span>
                <strong>Select a run</strong>
                <p>Pick a run from the list to see its progress and events.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
