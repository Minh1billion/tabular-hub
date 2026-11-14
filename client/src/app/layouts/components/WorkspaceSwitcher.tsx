import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '@/shared/components/ui/Avatar'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { ChevronIcon, PencilIcon, PlusIcon, TrashIcon } from '@/shared/components/ui/icons'
import { useClickOutside } from '@/shared/hooks/useClickOutside'
import { useDeleteWorkspace, useWorkspaces } from '@/modules/workspace/hooks'
import { sortWorkspaces, touchWorkspace } from '@/modules/workspace/lib/activity'
import { WorkspaceDialog } from '@/modules/workspace/components/WorkspaceDialog'

export function WorkspaceSwitcher() {
  const { data: workspaces = [] } = useWorkspaces()
  const navigate = useNavigate()
  const { id: activeId } = useParams<{ id: string }>()
  const active = workspaces.find((w) => w.id === activeId)
  const deleteWorkspace = useDeleteWorkspace()

  const [open, setOpen] = useState(false)
  const [dialog, setDialog] = useState<'create' | 'rename' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false), open)

  const recent = useMemo(() => sortWorkspaces(workspaces, 'recent'), [workspaces, activeId, open])

  function handleDelete() {
    if (!active) return
    setDeleteError(null)
    deleteWorkspace.mutate(active.id, {
      onSuccess: () => {
        setConfirmDelete(false)
        const next = recent.find((w) => w.id !== active.id)
        navigate(next ? `/app/${next.id}` : '/app', { replace: true })
      },
      onError: (e) => setDeleteError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'),
    })
  }

  return (
    <>
      <div ref={ref} className="ws-menu">
        <button type="button" className="ws-trigger" aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen((o) => !o)}>
          <Avatar name={active?.name ?? 'W'} size={22} />
          <span className="name">{active?.name ?? 'Select workspace'}</span>
          <ChevronIcon />
        </button>

        {open && (
          <div className="ws-list">
            <div className="ws-list-head">Workspaces</div>
            <div role="listbox">
              {recent.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  role="option"
                  aria-selected={w.id === activeId}
                  onClick={() => {
                    touchWorkspace(w.id)
                    navigate(`/app/${w.id}`)
                    setOpen(false)
                  }}
                >
                  <span className="truncate">{w.name}</span>
                </button>
              ))}
            </div>
            <div className="ws-actions">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setDialog('create')
                }}
              >
                <PlusIcon />
                New workspace
              </button>
              {active && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      setDialog('rename')
                    }}
                  >
                    <PencilIcon />
                    Rename current
                  </button>
                  <button
                    type="button"
                    className="destructive"
                    onClick={() => {
                      setOpen(false)
                      setDeleteError(null)
                      setConfirmDelete(true)
                    }}
                  >
                    <TrashIcon />
                    Delete current
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {dialog === 'create' && <WorkspaceDialog mode="create" onClose={() => setDialog(null)} onDone={(id) => id && navigate(`/app/${id}`)} />}
      {dialog === 'rename' && active && <WorkspaceDialog mode="rename" workspace={active} onClose={() => setDialog(null)} />}
      {confirmDelete && active && (
        <ConfirmDialog
          title={`Delete "${active.name}"?`}
          description={`This will permanently delete "${active.name}" along with its pipelines, datasets, and run history. This action cannot be undone.`}
          confirmLabel="Delete workspace"
          isLoading={deleteWorkspace.isPending}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => {
            setConfirmDelete(false)
            setDeleteError(null)
          }}
        />
      )}
    </>
  )
}
