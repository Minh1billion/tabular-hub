import { useEffect, useState } from 'react'
import { useCurrentUser } from '@/modules/auth/hooks'
import { useCreateWorkspace, useDeleteWorkspace, useWorkspaces } from '../hooks'
import { WorkspaceListPanel } from '../components/WorkspaceListPanel'
import { WorkspaceCard } from '../components/WorkspaceCard'
import { CreateWorkspaceCard } from '../components/CreateWorkspaceCard'

export function WorkspaceListPage() {
  const { data: user } = useCurrentUser()
  const { data: workspaces = [], isLoading } = useWorkspaces()
  const createWorkspace = useCreateWorkspace()
  const deleteWorkspace = useDeleteWorkspace()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (!activeId && workspaces.length > 0) {
      setActiveId(workspaces[0].id)
    }
  }, [workspaces, activeId])

  const ownerName = user?.display_name ?? user?.email ?? 'You'

  return (
    <div className="flex h-full">
      <WorkspaceListPanel
        workspaces={workspaces}
        activeId={activeId}
        onSelect={setActiveId}
        onCreateClick={() => setIsCreating(true)}
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
                onDelete={(id) => deleteWorkspace.mutate(id)}
                isDeleting={deleteWorkspace.isPending && deleteWorkspace.variables === workspace.id}
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
    </div>
  )
}