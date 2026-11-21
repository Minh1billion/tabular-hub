import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/shared/lib/cn'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Input } from '@/shared/components/ui/Input'
import { ExportIcon, PlusIcon, TableIcon, TrashIcon } from '@/shared/components/ui/icons'
import { resourcesQueryKey, useDeleteResource, useResources } from '../hooks'
import { workspacesQueryKey } from '@/modules/workspace/hooks'
import { usePaletteDrag } from '@/modules/editor/nodes/lib/usePaletteDrag'
import { ExportResourceDialog } from './ExportResourceDialog'
import { ImportResourceDialog } from './ImportResourceDialog'

interface ResourceSidebarListProps {
  workspaceId: string
  activeKey: string | null
  onSelect: (key: string) => void
  onDeleted: (key: string) => void
}

interface ResourceItemProps {
  resourceKey: string
  active: boolean
  deleting: boolean
  onSelect: () => void
  onExport: () => void
  onDelete: () => void
}

function ResourceItem({ resourceKey, active, deleting, onSelect, onExport, onDelete }: ResourceItemProps) {
  const { drag, ghost, onPointerDown } = usePaletteDrag({ nodeType: 'fetch_internal', label: resourceKey, category: 'IO', params: { key: resourceKey } })

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn('pal-item rs-item', active && 'on', drag && 'dragging')}
      onPointerDown={onPointerDown}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <span className="cat-tile" data-cat="IO">
        <TableIcon />
      </span>
      <div className="grow">
        <b>{resourceKey}</b>
        <small>{active ? 'Previewing' : 'Drag to canvas'}</small>
      </div>
      <div className="rs-actions">
        <IconButton
          size="sm"
          flat
          tip="Export"
          onClick={(event) => {
            event.stopPropagation()
            onExport()
          }}
        >
          <ExportIcon className="w-3.5 h-3.5" />
        </IconButton>
        <IconButton
          size="sm"
          flat
          tone="danger"
          tip="Delete"
          disabled={deleting}
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </IconButton>
      </div>
      {ghost}
    </div>
  )
}

export function ResourceSidebarList({ workspaceId, activeKey, onSelect, onDeleted }: ResourceSidebarListProps) {
  const queryClient = useQueryClient()
  const { data: resources, isLoading } = useResources(workspaceId)
  const deleteResource = useDeleteResource(workspaceId)
  const [isImporting, setIsImporting] = useState(false)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [exportingKey, setExportingKey] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const keys = resources?.keys ?? []
  const query = search.trim().toLowerCase()
  const visible = useMemo(() => keys.filter((key) => key.toLowerCase().includes(query)), [keys, query])

  function handleRequestDelete(key: string) {
    deleteResource.reset()
    setDeletingKey(key)
  }

  function handleDeleteConfirm() {
    if (!deletingKey) return
    const key = deletingKey
    deleteResource.mutate(key, {
      onSuccess: () => {
        setDeletingKey(null)
        onDeleted(key)
      },
    })
  }

  return (
    <>
      <div className="ed-side-scroll">
        <div className="pal-head">
          <span className="cat-tile" data-cat="IO">
            <TableIcon />
          </span>
          <span>Datasets</span>
          <em>{keys.length}</em>
        </div>

        {keys.length > 5 && <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search datasets…" className="mb-3" />}

        {isLoading && (
          <div className="rs-load">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        )}

        {!isLoading && keys.length > 0 && (
          <div className="pal-list stagger">
            {visible.map((key) => (
              <ResourceItem
                key={key}
                resourceKey={key}
                active={key === activeKey}
                deleting={deleteResource.isPending && deletingKey === key}
                onSelect={() => onSelect(key)}
                onExport={() => setExportingKey(key)}
                onDelete={() => handleRequestDelete(key)}
              />
            ))}
            {visible.length === 0 && <p className="hint m-0">No datasets match “{search}”.</p>}
          </div>
        )}

        {!isLoading && keys.length === 0 && (
          <div className="rs-empty">
            <span className="cat-tile" data-cat="IO">
              <TableIcon className="w-5 h-5" />
            </span>
            <strong>No datasets yet</strong>
            <p>Import a CSV, Parquet, Arrow or JSON file to use it as a pipeline source.</p>
          </div>
        )}

        {!isLoading && (
          <button type="button" className="rs-add" onClick={() => setIsImporting(true)}>
            <PlusIcon />
            Import dataset
          </button>
        )}
      </div>

      {isImporting && (
        <ImportResourceDialog
          workspaceId={workspaceId}
          onClose={() => setIsImporting(false)}
          onImported={() => {
            queryClient.invalidateQueries({ queryKey: resourcesQueryKey(workspaceId) })
            queryClient.invalidateQueries({ queryKey: workspacesQueryKey })
          }}
        />
      )}

      {deletingKey && (
        <ConfirmDialog
          title={`Delete dataset "${deletingKey}"?`}
          description={`The dataset "${deletingKey}" will be permanently removed from this workspace. Any pipeline nodes referencing it will be affected. This action cannot be undone.`}
          confirmLabel="Delete dataset"
          onConfirm={handleDeleteConfirm}
          onCancel={() => !deleteResource.isPending && setDeletingKey(null)}
          isLoading={deleteResource.isPending}
          error={deleteResource.isError ? deleteResource.error.message : null}
        />
      )}

      {exportingKey && <ExportResourceDialog workspaceId={workspaceId} resourceKey={exportingKey} onClose={() => setExportingKey(null)} />}
    </>
  )
}
