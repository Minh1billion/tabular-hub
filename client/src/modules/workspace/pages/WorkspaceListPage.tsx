import { useEffect, useMemo, useRef, useState } from 'react'
import { useCurrentUser } from '@/modules/auth/hooks'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { GridPattern } from '@/shared/components/ui/GridPattern'
import { PageHead } from '@/shared/components/ui/PageHead'
import { useCreateWorkspace, useDeleteWorkspace, useRenameWorkspace, useWorkspaces } from '../hooks'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { Workspace } from '../types'
import { WorkspaceListPanel } from '../components/WorkspaceListPanel'
import { WorkspaceCard } from '../components/WorkspaceCard'
import { CreateWorkspaceCard } from '../components/CreateWorkspaceCard'

export function WorkspaceListPage() {
  const { data: user } = useCurrentUser()
  const { data: workspaces = [], isLoading } = useWorkspaces()
  const createWorkspace = useCreateWorkspace()
  const deleteWorkspace = useDeleteWorkspace()
  const renameWorkspace = useRenameWorkspace()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 150)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const filteredWorkspaces = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase()
    if (!term) return workspaces
    return workspaces.filter((workspace) => workspace.name.toLowerCase().includes(term))
  }, [workspaces, debouncedQuery])

  useEffect(() => {
    if (!activeId && workspaces.length > 0) {
      setActiveId(workspaces[0].id)
    }
  }, [workspaces, activeId])

  const ownerName = user?.display_name ?? user?.email ?? 'You'

  function handleDeleteConfirm() {
    if (!deletingWorkspace) return
    setDeleteError(null)
    deleteWorkspace.mutate(deletingWorkspace.id, {
      onSuccess: () => {
        if (activeId === deletingWorkspace.id) setActiveId(null)
        setDeletingWorkspace(null)
      },
      onError: (err: unknown) => {
        setDeleteError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      },
    })
  }

  function handleSelectFromPanel(id: string) {
    setActiveId(id)
    cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedId(id)
    window.setTimeout(() => setHighlightedId((current) => (current === id ? null : current)), 1600)
  }

  return (
    <div className="wl">
      <WorkspaceListPanel
        workspaces={filteredWorkspaces}
        activeId={activeId}
        onSelect={handleSelectFromPanel}
        onCreateClick={() => setIsCreating(true)}
        query={query}
        onQueryChange={setQuery}
      />

      <main className="wl-main thin-scrollbar">
        <GridPattern cellSize={28} className="pg-grid" />

        <div className="wl-inner">
          <PageHead kicker="Workspaces" title="Your workspaces" subtitle="Manage your workspaces and the tables inside them." />

          {isLoading ? (
            <div className="wl-grid">
              {[0, 1, 2].map((index) => (
                <div key={index} className="wsc-skel skeleton" />
              ))}
            </div>
          ) : (
            <div className="wl-grid stagger">
              {filteredWorkspaces.map((workspace) => (
                <WorkspaceCard
                  key={workspace.id}
                  ref={(el) => {
                    cardRefs.current[workspace.id] = el
                  }}
                  workspace={workspace}
                  ownerName={ownerName}
                  isPersonal={workspace.owner_id === user?.id && workspaces.length === 1}
                  onDelete={(id) => {
                    const target = workspaces.find((item) => item.id === id)
                    if (target) setDeletingWorkspace(target)
                  }}
                  onRename={(id, name) => renameWorkspace.mutate({ id, name })}
                  isDeleting={deleteWorkspace.isPending && deleteWorkspace.variables === workspace.id}
                  isHighlighted={highlightedId === workspace.id}
                />
              ))}

              {debouncedQuery && filteredWorkspaces.length === 0 && <p className="wl-none">No workspaces match “{debouncedQuery}”.</p>}

              {!debouncedQuery && (
                <CreateWorkspaceCard
                  isOpen={isCreating}
                  onOpen={() => setIsCreating(true)}
                  onCancel={() => {
                    setIsCreating(false)
                    setCreateError(null)
                  }}
                  onSubmit={(name) => {
                    setCreateError(null)
                    createWorkspace.mutate(
                      { name },
                      {
                        onSuccess: (workspace) => {
                          setActiveId(workspace.id)
                          setIsCreating(false)
                        },
                        onError: (err: unknown) => {
                          setCreateError(err instanceof Error ? err.message : 'Could not create the workspace. Please try again.')
                        },
                      },
                    )
                  }}
                  isSubmitting={createWorkspace.isPending}
                  error={createError}
                />
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