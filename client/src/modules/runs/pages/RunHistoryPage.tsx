import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { ApiError } from '@/shared/lib/api-client'
import { cn } from '@/shared/lib/cn'
import { useWorkspace } from '@/modules/workspace/hooks'
import { useRunEvents } from '@/modules/runs/hooks-events'
import { useCancelRun, useRun, useRuns } from '../hooks'
import { RunEventTimeline, RUN_BADGE_TONE } from '../components/RunEventTimeline'
import { formatDuration, formatKind, formatRelativeTime } from '../lib/format'

const LIMIT = 20
const ACTIVE_STATUSES = ['queued', 'running', 'cancelling', 'pending_upload']

const QUICK_STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Failed', value: 'failed' },
  { label: 'Running', value: 'running' },
  { label: 'Completed', value: 'completed' },
] as const

function KindBadge({ kind }: { kind: string }) {
  const normalized = (kind || 'pipeline').toLowerCase()
  const styles =
    normalized === 'pipeline'
      ? 'bg-sky-50 text-sky-700 border-sky-200'
      : normalized === 'import'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : normalized === 'export'
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-cream-soft text-slate border-line'

  return (
    <span
      className={cn(
        'font-mono text-[10px] tracking-wide px-1.5 py-0.5 rounded border font-medium uppercase shrink-0',
        styles,
      )}
    >
      {formatKind(kind)}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const isRunning = ACTIVE_STATUSES.includes(status)

  return (
    <Badge tone={RUN_BADGE_TONE[status] ?? 'pending'} className="capitalize shrink-0 flex items-center gap-1">
      {isRunning && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
      )}
      {status}
    </Badge>
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

  const handleCopyId = async () => {
    if (!run?.id) return
    try {
      await navigator.clipboard.writeText(run.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback if clipboard API is restricted
    }
  }

  const handleCancel = () => {
    if (!run?.id) return
    cancelRun.mutate(run.id)
  }

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

  const canCancel = run.status === 'running' || run.status === 'queued' || run.status === 'cancelling'
  const isCancelling = cancelRun.isPending || run.status === 'cancelling'

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl">
      {/* Top action toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-line">
        <div className="flex items-center gap-2">
          <Link
            to={`/workspaces/${workspaceId}`}
            className="inline-flex items-center gap-1.5 text-xs text-ink font-medium px-3 py-1.5 rounded-lg bg-white hover:bg-cream-soft transition-colors border border-line"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Open in Editor
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyId}
            className="text-xs"
            title="Copy Run ID"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="text-brand font-medium">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy ID</span>
              </>
            )}
          </Button>

          {canCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isCancelling}
              className="text-xs text-warn border-warn/40 hover:bg-warn-tint hover:border-warn"
            >
              {isCancelling ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" />
                  </svg>
                  <span>Cancelling…</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9l-6 6M9 9l6 6" />
                  </svg>
                  <span>Cancel Run</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {cancelRun.isError && (
        <div className="px-3.5 py-2.5 rounded-lg bg-warn-tint border border-warn/30 text-xs text-warn">
          {cancelRun.error instanceof ApiError && cancelRun.error.status === 409
            ? 'Run already finished and cannot be cancelled.'
            : cancelRun.error.message}
        </div>
      )}

      {/* Run Summary Card */}
      <div className="bg-white border border-line rounded-xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <KindBadge kind={run.kind} />
            <button
              type="button"
              onClick={handleCopyId}
              title="Click to copy full Run ID"
              className="font-mono text-sm font-semibold text-ink hover:text-brand transition-colors break-all text-left"
            >
              {run.id}
            </button>
          </div>
          <StatusBadge status={run.status} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-line/70">
          <div>
            <div className="text-[11px] text-muted font-medium mb-1">Created</div>
            <div className="text-xs text-ink font-medium" title={new Date(run.created_at).toLocaleString()}>
              {formatRelativeTime(run.created_at)}
            </div>
            <div className="text-[10px] text-muted mt-0.5 font-mono">
              {new Date(run.created_at).toLocaleTimeString()}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-muted font-medium mb-1">Duration</div>
            <div className="text-xs text-ink font-mono font-medium">
              {formatDuration(run)}
            </div>
            <div className="text-[10px] text-muted mt-0.5">
              {isActive ? 'In progress' : 'Total runtime'}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-muted font-medium mb-1">Type</div>
            <div className="text-xs text-ink font-medium">
              {formatKind(run.kind)}
            </div>
            <div className="text-[10px] text-muted mt-0.5 font-mono">
              attempt #{run.attempt}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-muted font-medium mb-1">Execution ID</div>
            <div className="text-xs text-ink font-mono truncate" title={run.execution_id ?? 'None'}>
              {run.execution_id ? `${run.execution_id.slice(0, 8)}…` : '—'}
            </div>
            <div className="text-[10px] text-muted mt-0.5 capitalize">
              {run.cancelled_at ? 'Cancelled' : run.status}
            </div>
          </div>
        </div>
      </div>

      {/* Events timeline section */}
      <div className="flex flex-col gap-3">
        <h3 className="font-headline font-semibold text-sm text-ink">Execution Timeline</h3>
        <RunEventTimeline events={events} />
      </div>
    </div>
  )
}

export function RunHistoryPage() {
  const { workspaceId = '', runId } = useParams<{ workspaceId: string; runId: string }>()
  const { data: workspace } = useWorkspace(workspaceId)
  const [offset, setOffset] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [kindFilter, setKindFilter] = useState('')
  const [, setTick] = useState(0)

  const {
    data: runs = [],
    isLoading,
    isFetching,
    refetch,
  } = useRuns(workspaceId, {
    limit: LIMIT,
    offset,
    status: statusFilter || undefined,
    kind: kindFilter || undefined,
  })

  const hasActiveRun = runs.some((r) => ACTIVE_STATUSES.includes(r.status))

  useEffect(() => {
    const intervalMs = hasActiveRun ? 1000 : 15000
    const timer = window.setInterval(() => setTick((t) => t + 1), intervalMs)
    return () => window.clearInterval(timer)
  }, [hasActiveRun])

  const currentPage = Math.floor(offset / LIMIT) + 1
  const hasActiveFilters = Boolean(statusFilter || kindFilter)

  return (
    <div className="h-full flex flex-col">
      {/* Top Navbar */}
      <div className="h-12 flex items-center gap-3 px-5 border-b border-line bg-white shrink-0">
        <Link to="/workspaces" className="text-sm text-muted hover:text-ink transition-colors">
          Workspaces
        </Link>
        <span className="text-muted">/</span>
        <Link to={`/workspaces/${workspaceId}`} className="text-sm text-muted hover:text-ink transition-colors truncate max-w-[200px]">
          {workspace?.name ?? 'Editor'}
        </Link>
        <span className="text-muted">/</span>
        <span className="text-sm font-medium text-ink">Run History</span>

        <div className="flex-1" />

        <Link
          to={`/workspaces/${workspaceId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink px-3 py-1.5 rounded-lg border border-line hover:bg-cream-soft transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Editor
        </Link>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 min-h-0 flex">
        {/* Left Sidebar: Runs list with filters & pagination */}
        <div className="w-80 md:w-96 border-r border-line flex flex-col bg-white shrink-0">
          {/* Header & Filter Bar */}
          <div className="p-3 border-b border-line flex flex-col gap-2.5 bg-[#fdfdfb]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Run History</span>
                {hasActiveRun && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-brand-tint text-[#0f6e4c]">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-ping" />
                    Live
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-muted hover:text-ink p-1 rounded hover:bg-cream-soft transition-colors"
                title="Refresh list"
              >
                <svg
                  className={cn('w-3.5 h-3.5', isFetching ? 'animate-spin text-brand' : '')}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M21 21v-5h-5" />
                </svg>
              </button>
            </div>

            {/* 1-Click Quick Status Pills (Find latest failed run in <= 2 actions) */}
            <div className="flex items-center gap-1 flex-wrap">
              {QUICK_STATUS_FILTERS.map((chip) => {
                const active = statusFilter === chip.value
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      setStatusFilter(active && chip.value !== '' ? '' : chip.value)
                      setOffset(0)
                    }}
                    className={cn(
                      'text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors',
                      active
                        ? chip.value === 'failed'
                          ? 'bg-warn-tint text-warn border-warn/40'
                          : 'bg-brand-deep text-brand-tint border-brand-deep'
                        : 'bg-white text-slate border-line hover:bg-cream-soft',
                    )}
                  >
                    {chip.label}
                  </button>
                )
              })}
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setOffset(0)
                }}
                className="text-xs bg-white border border-line rounded-lg px-2 py-1.5 text-ink outline-none focus:border-brand transition-colors cursor-pointer"
                title="Filter by status"
              >
                <option value="">All statuses</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
                <option value="queued">Queued</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={kindFilter}
                onChange={(e) => {
                  setKindFilter(e.target.value)
                  setOffset(0)
                }}
                className="text-xs bg-white border border-line rounded-lg px-2 py-1.5 text-ink outline-none focus:border-brand transition-colors cursor-pointer"
                title="Filter by kind"
              >
                <option value="">All kinds</option>
                <option value="pipeline">Pipeline</option>
                <option value="import">Import</option>
                <option value="export">Export</option>
              </select>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>
                  Showing {runs.length} {runs.length === 1 ? 'run' : 'runs'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('')
                    setKindFilter('')
                    setOffset(0)
                  }}
                  className="text-brand hover:underline font-medium"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-auto divide-y divide-line/60">
            {isLoading ? (
              <p className="p-4 text-sm text-muted">Loading runs…</p>
            ) : runs.length === 0 ? (
              <div className="p-5 flex flex-col gap-2 text-center items-center justify-center h-48">
                {hasActiveFilters ? (
                  <>
                    <p className="text-xs text-muted">No runs found matching the filters.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('')
                        setKindFilter('')
                        setOffset(0)
                      }}
                      className="text-xs text-brand hover:underline font-medium"
                    >
                      Reset filters
                    </button>
                  </>
                ) : offset === 0 ? (
                  <>
                    <p className="text-xs text-muted">No pipeline has been run in this workspace yet.</p>
                    <Link to={`/workspaces/${workspaceId}`} className="text-xs text-brand hover:underline font-medium">
                      Go build a pipeline
                    </Link>
                  </>
                ) : (
                  <p className="text-xs text-muted">No more runs on this page.</p>
                )}
              </div>
            ) : (
              runs.map((run) => (
                <Link
                  key={run.id}
                  to={`/workspaces/${workspaceId}/runs/${run.id}`}
                  className={cn(
                    'flex flex-col gap-1.5 px-4 py-3 text-sm transition-colors hover:bg-cream-soft',
                    run.id === runId ? 'bg-cream-soft border-l-2 border-l-brand' : '',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <KindBadge kind={run.kind} />
                      <span className="font-mono text-[11px] text-muted truncate">{run.id.slice(0, 8)}…</span>
                    </div>
                    <StatusBadge status={run.status} />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span title={new Date(run.created_at).toLocaleString()} className="flex items-center gap-1 truncate">
                      <svg className="w-3 h-3 text-muted/70 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {formatRelativeTime(run.created_at)}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[10.5px] shrink-0" title="Duration">
                      <svg className="w-3 h-3 text-muted/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12" />
                      </svg>
                      {formatDuration(run)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Pagination Footer */}
          <div className="mt-auto flex items-center justify-between p-3 border-t border-line bg-[#fdfdfb]">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              >
                Prev
              </Button>
              {offset > 0 && (
                <button
                  type="button"
                  onClick={() => setOffset(0)}
                  className="text-[11px] text-muted hover:text-ink px-1.5 py-1 rounded transition-colors"
                  title="Jump to first page"
                >
                  Page 1
                </button>
              )}
            </div>

            <span className="text-[11px] font-mono text-muted">
              Page {currentPage}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={runs.length < LIMIT}
              onClick={() => setOffset(offset + LIMIT)}
            >
              Next
            </Button>
          </div>
        </div>

        {/* Right Pane: Selected Run Details */}
        <div className="flex-1 overflow-auto bg-[#fafaf9]">
          {runId ? (
            <RunDetail workspaceId={workspaceId} runId={runId} />
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-center h-full gap-2">
              <div className="w-12 h-12 rounded-full bg-cream-soft flex items-center justify-center text-muted mb-2">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-ink">No run selected</p>
              <p className="text-xs text-muted max-w-xs">
                Select a run from the history on the left to inspect its parameters, timeline events, and status.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
