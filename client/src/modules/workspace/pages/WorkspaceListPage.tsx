import { useEffect, useState } from 'react'
import { useCurrentUser } from '@/modules/auth/hooks'
import { useCreateWorkspace, useDeleteWorkspace, useUpdateWorkspace, useWorkspaces } from '../hooks'
import { WorkspaceListPanel } from '../components/WorkspaceListPanel'
import { WorkspaceCard } from '../components/WorkspaceCard'
import { CreateWorkspaceCard } from '../components/CreateWorkspaceCard'
import { RenameWorkspaceDialog } from '../components/RenameWorkspaceDialog'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { Workspace } from '../types'

export function WorkspaceListPage() {
  const { data: user } = useCurrentUser()
  const { data: workspaces = [], isLoading } = useWorkspaces()
  const createWorkspace = useCreateWorkspace()
  const deleteWorkspace = useDeleteWorkspace()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Delete confirmation state
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  // Rename state
  const [renamingWorkspace, setRenamingWorkspace] = useState<Workspace | null>(null)
  const updateWorkspace = useUpdateWorkspace(renamingWorkspace?.id ?? '')

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
        const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
        setDeleteError(msg)
      },
    })
  }

  function handleRenameConfirm(newName: string) {
    if (!renamingWorkspace) return
    updateWorkspace.mutate(
      { name: newName },
      { onSuccess: () => setRenamingWorkspace(null) },
    )
  }

  return (
    <div className="flex h-full">
      <WorkspaceListPanel
        workspaces={workspaces}
        activeId={activeId}
        onSelect={setActiveId}
        onCreateClick={() => setIsCreating(true)}
        onDelete={(id) => {
          const ws = workspaces.find((w) => w.id === id)
          if (ws) setDeletingWorkspace(ws)
        }}
        onRename={(id) => {
          const ws = workspaces.find((w) => w.id === id)
          if (ws) setRenamingWorkspace(ws)
        }}
      />

      <main className="flex-1 overflow-auto px-10 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-headline font-semibold text-[22px] mb-1.5">Your workspaces</h2>
            <p className="text-[13.5px] text-slate">Manage your workspaces and the tables inside them.</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted">Loading workspaces…</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3.5">
            {workspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                ownerName={ownerName}
                isPersonal={workspace.owner_id === user?.id && workspaces.length === 1}
                onDelete={(id) => {
                  const ws = workspaces.find((w) => w.id === id)
                  if (ws) setDeletingWorkspace(ws)
                }}
                onRename={(id) => {
                  const ws = workspaces.find((w) => w.id === id)
                  if (ws) setRenamingWorkspace(ws)
                }}
              />
            ))}

            <CreateWorkspaceCard
              isOpen={isCreating}
              onOpen={() => setIsCreating(true)}
              onCancel={() => setIsCreating(false)}
              onSubmit={(name) =>
                createWorkspace.mutate(
                  { name },
                  {
                    onSuccess: (workspace) => {
                      setActiveId(workspace.id)
                      setIsCreating(false)
                    },
                  },
                )
              }
              isSubmitting={createWorkspace.isPending}
            />
          </div>
        )}
      </main>

      {/* Delete confirmation dialog */}
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

      {/* Rename dialog */}
      {renamingWorkspace && (
        <RenameWorkspaceDialog
          currentName={renamingWorkspace.name}
          onConfirm={handleRenameConfirm}
          onCancel={() => setRenamingWorkspace(null)}
          isLoading={updateWorkspace.isPending}
        />
      )}
    </div>
  )
}