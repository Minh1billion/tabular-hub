import { useEffect, useMemo, useRef, useState } from 'react'
import { useCurrentUser } from '@/modules/auth/hooks'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { GridPattern } from '@/shared/components/ui/GridPattern'
import { useCreateWorkspace, useDeleteWorkspace, useRenameWorkspace, useWorkspaces } from '../hooks'
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
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 150)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

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

  function handleSelectFromPanel(id: string) {
    setActiveId(id)
    cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedId(id)
    window.setTimeout(() => setHighlightedId((current) => (current === id ? null : current)), 1600)
  }

  return (
    <div className="flex h-full">
      <WorkspaceListPanel
        workspaces={filteredWorkspaces}
        activeId={activeId}
        onSelect={handleSelectFromPanel}
        onCreateClick={() => setIsCreating(true)}
        query={query}
        onQueryChange={setQuery}
      />

      <main className="relative flex-1 overflow-auto px-10 py-8">
        <GridPattern cellSize={28} />

        <div className="relative flex items-end justify-between mb-6">
          <div>
            <h2 className="font-headline font-semibold text-[22px] mb-1.5">Your workspaces</h2>
            <p className="text-[13.5px] text-slate">Manage your workspaces and the tables inside them.</p>
          </div>
        </div>

        {isLoading ? (
          <p className="relative text-sm text-muted">Loading workspaces…</p>
        ) : (
          <div className="relative grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
            {filteredWorkspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                ref={(el) => {
                  cardRefs.current[workspace.id] = el
                }}
                workspace={workspace}
                ownerName={ownerName}
                isPersonal={workspace.owner_id === user?.id && workspaces.length === 1}
                onDelete={(id) => deleteWorkspace.mutate(id)}
                onRename={(id, name) => renameWorkspace.mutate({ id, name })}
                isDeleting={deleteWorkspace.isPending && deleteWorkspace.variables === workspace.id}
                isHighlighted={highlightedId === workspace.id}
              />
            ))}

            {debouncedQuery && filteredWorkspaces.length === 0 && (
              <p className="text-sm text-muted col-span-full">No workspaces match “{debouncedQuery}”.</p>
            )}

            {!debouncedQuery && (
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
            )}
          </div>
        )}
      </main>
    </div>
  )
}