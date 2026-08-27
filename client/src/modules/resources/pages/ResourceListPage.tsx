import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useWorkspace } from '@/modules/workspace/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { useResources, resourcesQueryKey } from '../hooks'
import { ResourceListPanel } from '../components/ResourceListPanel'
import { ResourcePreviewPanel } from '../components/ResourcePreviewPanel'
import { ImportResourceDialog } from '../components/ImportResourceDialog'

export function ResourceListPage() {
  const { id } = useParams<{ id: string }>()
  const workspaceId = id ?? ''
  const { data: workspace } = useWorkspace(workspaceId)
  const { data: resources, isLoading } = useResources(workspaceId)
  const queryClient = useQueryClient()

  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const keys = resources?.keys ?? []

  function handleImported() {
    queryClient.invalidateQueries({ queryKey: resourcesQueryKey(workspaceId) })
    setIsImporting(false)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 flex items-center gap-3 px-5 border-b border-line bg-white shrink-0">
        <Link to="/workspaces" className="text-sm text-muted hover:text-ink transition-colors">
          Workspaces
        </Link>
        <span className="text-muted">/</span>
        <Link to={`/workspaces/${workspaceId}`} className="text-sm text-muted hover:text-ink transition-colors">
          {workspace?.name}
        </Link>
        <span className="text-muted">/</span>
        <span className="text-sm font-medium text-ink">Resources</span>
      </div>

      <div className="flex-1 min-h-0 flex">
        <ResourceListPanel
          keys={keys}
          activeKey={activeKey}
          onSelect={setActiveKey}
          onImportClick={() => setIsImporting(true)}
          isLoading={isLoading}
        />
        <ResourcePreviewPanel
          key={activeKey}
          workspaceId={workspaceId}
          activeKey={activeKey}
          onDeleted={() => setActiveKey(null)}
        />
      </div>

      {isImporting && (
        <ImportResourceDialog
          workspaceId={workspaceId}
          onClose={() => setIsImporting(false)}
          onImported={handleImported}
        />
      )}
    </div>
  )
}
