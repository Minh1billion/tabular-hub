import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/ui/Button'
import { PlusIcon } from '@/shared/components/ui/icons'
import { useWorkspaces } from '@/modules/workspace/hooks'
import { sortWorkspaces } from '@/modules/workspace/lib/activity'
import { WorkspaceDialog } from '@/modules/workspace/components/WorkspaceDialog'

export function AppIndexPage() {
  const navigate = useNavigate()
  const { data: workspaces, isLoading, isError, error, refetch } = useWorkspaces()
  const [creating, setCreating] = useState(false)

  if (isLoading) {
    return (
      <div className="ed-empty">
        <div className="spinner" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="ed-empty">
        <div className="panel">
          <h1 className="m-0 mb-2 text-[18px] font-bold">Couldn't load workspaces</h1>
          <p className="m-0 mb-4 text-[13.5px] text-slate">{error instanceof Error ? error.message : 'Something went wrong.'}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (workspaces && workspaces.length > 0) {
    return <Navigate to={`/app/${sortWorkspaces(workspaces, 'recent')[0].id}`} replace />
  }

  return (
    <div className="ed-empty">
      <div className="panel rise">
        <span className="cat-tile" data-cat="Transform">
          <PlusIcon className="w-5 h-5" />
        </span>
        <h1 className="m-0 mb-2 text-[20px] font-bold tracking-tight">Create your first workspace</h1>
        <p className="m-0 mb-5 text-[13.5px] text-slate leading-relaxed">A workspace holds one pipeline, its datasets, custom nodes and run history.</p>
        <Button onClick={() => setCreating(true)}>
          <PlusIcon className="w-4 h-4" />
          New workspace
        </Button>
      </div>
      {creating && <WorkspaceDialog mode="create" onClose={() => setCreating(false)} onDone={(id) => navigate(`/app/${id}`)} />}
    </div>
  )
}
