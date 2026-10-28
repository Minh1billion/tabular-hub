import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/components/ui/Button'
import { ChevronIcon, CheckIcon, CloseIcon, CopyIcon, PlayIcon } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/cn'
import { ApiError } from '@/shared/lib/api-client'
import { useWorkspace } from '@/modules/workspace/hooks'
import { useRunEvents } from '@/modules/runs/hooks-events'
import { useCancelRun, useRun, useRuns } from '../hooks'
import { RunBadge } from '../components/RunBadge'
import { RunEventTimeline } from '../components/RunEventTimeline'
import { formatDuration, formatKind, formatRelativeTime } from '../lib/format'

const LIMIT = 20
const ACTIVE_STATUSES = ['queued', 'running', 'cancelling', 'pending_upload']
const CANCELLABLE_STATUSES = ['queued', 'running', 'cancelling']

const QUICK_STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Failed', value: 'failed' },
  { label: 'Running', value: 'running' },
  { label: 'Completed', value: 'completed' },
] as const

function KindBadge({ kind }: { kind: string }) {
  return (
    <span className="rn-kind" data-k={(kind || 'pipeline').toLowerCase()}>
      {formatKind(kind)}
    </span>
  )
}

function RunDetail({ workspaceId, runId }: { workspaceId: string; runId: string }) {
  const navigate = useNavigate()
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
            {cancelRun.error instanceof ApiError && cancelRun.error.status === 409
              ? 'Run already finished and cannot be cancelled.'
              : cancelRun.error.message}
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

export function RunHistoryPage() {
  const { workspaceId = '', runId } = useParams<{ workspaceId: string; runId: string }>()
  const [offset, setOffset] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [kindFilter, setKindFilter] = useState('')
  const [, setTick] = useState(0)

  const { data: workspace } = useWorkspace(workspaceId)
  const {
    data: runs = [],
    isLoading,
    refetch,
  } = useRuns(workspaceId, {
    limit: LIMIT,
    offset,
    status: statusFilter || undefined,
    kind: kindFilter || undefined,
  })

  const hasActiveRun = runs.some((run) => ACTIVE_STATUSES.includes(run.status))
  const hasFilters = Boolean(statusFilter || kindFilter)
  const page = Math.floor(offset / LIMIT) + 1

  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), hasActiveRun ? 1000 : 15000)
    return () => window.clearInterval(timer)
  }, [hasActiveRun])

  function changeStatus(value: string) {
    setStatusFilter(value)
    setOffset(0)
  }

  function changeKind(value: string) {
    setKindFilter(value)
    setOffset(0)
  }

  function clearFilters() {
    setStatusFilter('')
    setKindFilter('')
    setOffset(0)
  }

  return (
    <div className="rn">
      <div className="rn-bar">
        <h2>{workspace?.name}</h2>
        {hasActiveRun && (
          <span className="badge badge-success">
            <i className="bdot live" />
            Live
          </span>
        )}
        {!isLoading && <span className="count">{runs.length} on this page</span>}
      </div>

      <div className="rn-body">
        <aside className="rn-side">
          <div className="rn-filters">
            <div className="segmented">
              {QUICK_STATUS_FILTERS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  className={cn(statusFilter === chip.value && 'on')}
                  onClick={() => changeStatus(statusFilter === chip.value && chip.value !== '' ? '' : chip.value)}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="rn-filter-row">
              <select className="input" value={statusFilter} onChange={(e) => changeStatus(e.target.value)} title="Filter by status">
                <option value="">All statuses</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
                <option value="queued">Queued</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select className="input" value={kindFilter} onChange={(e) => changeKind(e.target.value)} title="Filter by kind">
                <option value="">All kinds</option>
                <option value="pipeline">Pipeline</option>
                <option value="import">Import</option>
                <option value="export">Export</option>
              </select>
            </div>

            <div className="rn-filter-foot">
              <span>{hasFilters ? `Showing ${runs.length} ${runs.length === 1 ? 'run' : 'runs'}` : 'All runs'}</span>
              <button type="button" onClick={() => (hasFilters ? clearFilters() : refetch())}>
                {hasFilters ? 'Clear filters' : 'Refresh'}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="rn-skel">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="skeleton" />
              ))}
            </div>
          ) : runs.length === 0 ? (
            <div className="rn-empty">
              {hasFilters ? (
                <>
                  <span>No runs found matching the filters.</span>
                  <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                    Reset filters
                  </Button>
                </>
              ) : offset === 0 ? (
                <>
                  <span>No pipeline has been run in this workspace yet.</span>
                  <Link to={`/workspaces/${workspaceId}`} className="btn btn-primary btn-sm">
                    <PlayIcon className="w-3 h-3" />
                    Go build a pipeline
                  </Link>
                </>
              ) : (
                <span>No more runs on this page.</span>
              )}
            </div>
          ) : (
            <div className="rn-list thin-scrollbar stagger">
              {runs.map((run) => (
                <Link key={run.id} to={`/workspaces/${workspaceId}/runs/${run.id}`} className={cn('rn-item', run.id === runId && 'on')}>
                  <span className="rn-dot" data-s={run.status} />
                  <div className="info">
                    <b>{run.id.slice(0, 8)}</b>
                    <small title={new Date(run.created_at).toLocaleString()}>
                      {formatKind(run.kind)} · {formatRelativeTime(run.created_at)} · {formatDuration(run)}
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
