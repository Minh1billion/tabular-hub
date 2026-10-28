import { useState } from 'react'
import { Button } from '@/shared/components/ui/Button'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { TableIcon } from '@/shared/components/ui/icons'
import { useDeleteResource, useResourcePreview } from '../hooks'
import { DataTable } from './DataTable'

const PAGE_SIZE = 50

interface ResourcePreviewPanelProps {
  workspaceId: string
  activeKey: string | null
  onDeleted: () => void
}

export function ResourcePreviewPanel({ workspaceId, activeKey, onDeleted }: ResourcePreviewPanelProps) {
  const [offset, setOffset] = useState(0)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const { data: preview, isLoading } = useResourcePreview(workspaceId, activeKey ?? '', PAGE_SIZE, offset)
  const deleteResource = useDeleteResource(workspaceId)

  if (!activeKey) {
    return (
      <div className="flex-1 grid place-items-center p-6">
        <div className="rs-empty">
          <span className="cat-tile" data-cat="IO">
            <TableIcon className="w-5 h-5" />
          </span>
          <strong>No dataset selected</strong>
          <p>Select a dataset to preview it.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-3 shrink-0 h-12 px-5 bg-white" style={{ borderBottom: 'var(--edge-soft)' }}>
        <span className="font-mono text-[13px] font-semibold truncate">{activeKey}</span>
        {preview && <span className="ri-meta">{preview.returned_rows} / {preview.row_count} rows</span>}
        <div className="flex-1" />
        <Button type="button" variant="danger" size="sm" onClick={() => setIsConfirmingDelete(true)} loading={deleteResource.isPending}>
          Delete
        </Button>
      </div>

      <div className="flex-1 overflow-auto thin-scrollbar">
        {isLoading && (
          <div className="ri-skel">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton" />
            ))}
          </div>
        )}
        {!isLoading && preview && preview.rows.length > 0 && <DataTable rows={preview.rows} offset={offset} />}
        {!isLoading && preview && preview.rows.length === 0 && <p className="ri-state">This dataset has no rows.</p>}
      </div>

      {preview && preview.row_count > PAGE_SIZE && (
        <div className="ri-foot">
          <Button type="button" variant="outline" size="sm" onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={offset === 0}>
            Previous
          </Button>
          <span className="page-jump">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, preview.row_count)} of {preview.row_count}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => setOffset(offset + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= preview.row_count}>
            Next
          </Button>
        </div>
      )}

      {isConfirmingDelete && (
        <ConfirmDialog
          title={`Delete dataset "${activeKey}"?`}
          description={`The dataset "${activeKey}" will be permanently removed from this workspace. Any pipeline nodes referencing it will be affected. This action cannot be undone.`}
          confirmLabel="Delete dataset"
          onConfirm={() =>
            deleteResource.mutate(activeKey, {
              onSuccess: () => {
                setIsConfirmingDelete(false)
                onDeleted()
              },
            })
          }
          onCancel={() => setIsConfirmingDelete(false)}
          isLoading={deleteResource.isPending}
        />
      )}
    </div>
  )
}
