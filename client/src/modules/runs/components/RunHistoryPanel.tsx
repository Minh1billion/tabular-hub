import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/ui/Button'
import { cn } from '@/shared/lib/cn'
import { useRuns } from '../hooks'
import { RunBadge } from './RunBadge'
import { ACTIVE_STATUSES, RunDetail } from './RunDetail'
import { formatDuration, formatKind, formatRelativeTime } from '../lib/format'

const LIMIT = 20

const QUICK_STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Failed', value: 'failed' },
  { label: 'Running', value: 'running' },
  { label: 'Done', value: 'completed' },
] as const

interface RunHistoryPanelProps {
  workspaceId: string
  initialRunId?: string | null
}

export function RunHistoryPanel({ workspaceId, initialRunId = null }: RunHistoryPanelProps) {
  const [runId, setRunId] = useState<string | null>(initialRunId)
  const [offset, setOffset] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [kindFilter, setKindFilter] = useState('')
  const [, setTick] = useState(0)

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

  function clearFilters() {
    setStatusFilter('')
    setKindFilter('')
    setOffset(0)
  }

  return (
    <div className="rh">
      <aside className="rh-side">
        <div className="rh-filters">
          <div className="segmented">
            {QUICK_STATUS_FILTERS.map((chip) => (
              <button key={chip.label} type="button" className={cn(statusFilter === chip.value && 'on')} onClick={() => changeStatus(statusFilter === chip.value && chip.value !== '' ? '' : chip.value)}>
                {chip.label}
              </button>
            ))}
          </div>
          <div className="rh-filter-row">
            <select className="input" value={kindFilter} onChange={(e) => { setKindFilter(e.target.value); setOffset(0) }} title="Filter by kind">
              <option value="">All kinds</option>
              <option value="pipeline">Pipeline</option>
              <option value="import">Import</option>
              <option value="export">Export</option>
            </select>
            <button type="button" className="rh-link" onClick={() => (hasFilters ? clearFilters() : refetch())}>
              {hasFilters ? 'Clear' : 'Refresh'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="rn-skel">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="skeleton" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="rn-empty">
            {hasFilters ? (
              <>
                <span>No runs match the filters.</span>
                <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                  Reset filters
                </Button>
              </>
            ) : offset === 0 ? (
              <span>No runs yet. Press Run to execute the pipeline.</span>
            ) : (
              <span>No more runs.</span>
            )}
          </div>
        ) : (
          <div className="rn-list thin-scrollbar">
            {runs.map((run) => (
              <button key={run.id} type="button" className={cn('rn-item', run.id === runId && 'on')} onClick={() => setRunId(run.id)}>
                <span className="rn-dot" data-s={run.status} />
                <div className="info">
                  <b>{run.id.slice(0, 8)}</b>
                  <small title={new Date(run.created_at).toLocaleString()}>
                    {formatKind(run.kind)} · {formatRelativeTime(run.created_at)} · {formatDuration(run)}
                  </small>
                </div>
                <RunBadge status={run.status} />
              </button>
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

      <section className="rh-main thin-scrollbar">
        {runId ? (
          <RunDetail workspaceId={workspaceId} runId={runId} onBack={() => setRunId(null)} />
        ) : (
          <div className="rh-placeholder">Select a run to see its progress and events.</div>
        )}
      </section>
    </div>
  )
}
