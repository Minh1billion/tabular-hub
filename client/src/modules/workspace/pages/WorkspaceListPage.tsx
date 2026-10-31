import { useEffect, useMemo, useRef, useState } from 'react'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { ApiError } from '@/shared/lib/api-client'
import { GridPattern } from '@/shared/components/ui/GridPattern'
import { PageHead } from '@/shared/components/ui/PageHead'
import { Button } from '@/shared/components/ui/Button'
import { Segmented } from '@/shared/components/ui/Segmented'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { PlusIcon, SearchIcon } from '@/shared/components/ui/icons'
import { useSubscription } from '@/modules/billing/hooks'
import { useCreateWorkspace, useDeleteWorkspace, useRenameWorkspace, useWorkspaces } from '../hooks'
import { WorkspaceListItem } from '../types'
import { sortWorkspaces, WorkspaceSort } from '../lib/activity'
import { WorkspaceCard } from '../components/WorkspaceCard'
import { CreateWorkspaceCard, PlanLimitInfo } from '../components/CreateWorkspaceCard'

const SORT_STORAGE_KEY = 'tabular-hub:workspaces:sort'
const SORT_OPTIONS: { value: WorkspaceSort; label: string }[] = [
  { value: 'recent', label: 'Recent' },
  { value: 'name', label: 'Name' },
]

function readStoredSort(): WorkspaceSort {
  try {
    return localStorage.getItem(SORT_STORAGE_KEY) === 'name' ? 'name' : 'recent'
  } catch {
    return 'recent'
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function WorkspaceListPage() {
  const { data: workspaces = [], isLoading } = useWorkspaces()
  const { data: subscription } = useSubscription()
  const createWorkspace = useCreateWorkspace()
  const deleteWorkspace = useDeleteWorkspace()
  const renameWorkspace = useRenameWorkspace()

  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [serverLimit, setServerLimit] = useState<PlanLimitInfo | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<WorkspaceSort>(readStoredSort)
  const debouncedQuery = useDebounce(query, 150)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const createRef = useRef<HTMLDivElement | null>(null)
  const [deletingWorkspace, setDeletingWorkspace] = useState<WorkspaceListItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, sort)
    } catch {
      // Storage unavailable (private mode): sorting still works for this session.
    }
  }, [sort])

  const visibleWorkspaces = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase()
    const filtered = term ? workspaces.filter((workspace) => workspace.name.toLowerCase().includes(term)) : workspaces
    return sortWorkspaces(filtered, sort)
  }, [workspaces, debouncedQuery, sort])

  const planLabel = subscription ? capitalize(subscription.tier) : undefined
  const atPlanLimit = Boolean(subscription && workspaces.length >= subscription.max_workspaces)
  const planLimit: PlanLimitInfo | null =
    serverLimit ?? (atPlanLimit && subscription ? { max: subscription.max_workspaces, planLabel } : null)

  function openCreate() {
    setQuery('')
    setCreateError(null)
    setIsCreating(true)
    window.requestAnimationFrame(() => createRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  function closeCreate() {
    setIsCreating(false)
    setCreateError(null)
    setServerLimit(null)
  }

  function flash(id: string) {
    setHighlightedId(id)
    window.setTimeout(() => setHighlightedId((current) => (current === id ? null : current)), 1600)
  }

  function handleCreate(name: string) {
    setCreateError(null)
    createWorkspace.mutate(
      { name },
      {
        onSuccess: (workspace) => {
          closeCreate()
          window.requestAnimationFrame(() => cardRefs.current[workspace.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
          flash(workspace.id)
        },
        onError: (err: unknown) => {
          if (err instanceof ApiError && err.status === 402) {
            setServerLimit({ max: subscription?.max_workspaces, planLabel, message: err.message })
            return
          }
          setCreateError(err instanceof Error ? err.message : 'Could not create the workspace. Please try again.')
        },
      },
    )
  }

  function handleDeleteConfirm() {
    if (!deletingWorkspace) return
    setDeleteError(null)
    deleteWorkspace.mutate(deletingWorkspace.id, {
      onSuccess: () => {
        setDeletingWorkspace(null)
        setServerLimit(null)
      },
      onError: (err: unknown) => {
        setDeleteError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      },
    })
  }

  const usage = subscription ? `${workspaces.length} of ${subscription.max_workspaces} workspaces on the ${planLabel} plan` : undefined

  return (
    <div className="wl">
      <main className="wl-main thin-scrollbar">
        <GridPattern cellSize={28} className="pg-grid" />

        <div className="wl-inner">
          <PageHead
            kicker="Workspaces"
            title="Your workspaces"
            subtitle={usage ? `Manage your pipelines and datasets · ${usage}.` : 'Manage your pipelines and datasets.'}
            actions={
              <Button type="button" onClick={openCreate}>
                <PlusIcon className="w-3.5 h-3.5" />
                New workspace
              </Button>
            }
          />

          {(isLoading || workspaces.length > 0) && (
            <div className="wl-toolbar">
              <div className="wl-search">
                <SearchIcon />
                <input
                  className="input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search workspaces…"
                  aria-label="Search workspaces"
                  disabled={isLoading}
                />
              </div>
              <div className="wl-sort">
                <span className="kicker">Sort</span>
                <Segmented value={sort} options={SORT_OPTIONS} onChange={setSort} />
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="wl-grid" aria-busy="true" aria-label="Loading workspaces">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="wsc-skel">
                  <div className="skeleton thumb" />
                  <div className="lines">
                    <div className="skeleton title" />
                    <div className="skeleton meta" />
                    <div className="skeleton meta short" />
                  </div>
                  <div className="foot">
                    <div className="skeleton pill" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="wl-grid stagger">
              {visibleWorkspaces.map((workspace) => (
                <WorkspaceCard
                  key={workspace.id}
                  ref={(el) => {
                    cardRefs.current[workspace.id] = el
                  }}
                  workspace={workspace}
                  onDelete={(id) => {
                    const target = workspaces.find((item) => item.id === id)
                    if (target) setDeletingWorkspace(target)
                  }}
                  onRename={(id, name) => renameWorkspace.mutate({ id, name })}
                  isDeleting={deleteWorkspace.isPending && deleteWorkspace.variables === workspace.id}
                  isHighlighted={highlightedId === workspace.id}
                />
              ))}

              {debouncedQuery && visibleWorkspaces.length === 0 && <p className="wl-none">No workspaces match “{debouncedQuery}”.</p>}

              {!debouncedQuery && (
                <div ref={createRef} className="wl-create">
                  <CreateWorkspaceCard
                    isOpen={isCreating}
                    onOpen={openCreate}
                    onCancel={closeCreate}
                    onSubmit={handleCreate}
                    isSubmitting={createWorkspace.isPending}
                    error={createError}
                    planLimit={planLimit}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {deletingWorkspace && (
        <ConfirmDialog
          title={`Delete "${deletingWorkspace.name}"?`}
          description={`This will permanently delete the workspace "${deletingWorkspace.name}" along with all its pipelines, datasets, and run history. This action cannot be undone.`}
          confirmLabel="Delete workspace"
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setDeletingWorkspace(null)
            setDeleteError(null)
          }}
          isLoading={deleteWorkspace.isPending}
          error={deleteError}
        />
      )}
    </div>
  )
}
