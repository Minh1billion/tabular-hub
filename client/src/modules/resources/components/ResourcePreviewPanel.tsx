import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/ui/Button'
import { useDeleteResource, useResourcePreview } from '../hooks'

const PAGE_SIZE = 50

interface ResourcePreviewPanelProps {
  workspaceId: string
  activeKey: string | null
  onDeleted: () => void
}

export function ResourcePreviewPanel({ workspaceId, activeKey, onDeleted }: ResourcePreviewPanelProps) {
  const [offset, setOffset] = useState(0)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { data: preview, isLoading } = useResourcePreview(workspaceId, activeKey ?? '', PAGE_SIZE, offset)
  const deleteResource = useDeleteResource(workspaceId)

  useEffect(() => {
    setConfirmingDelete(false)
    setOffset(0)
  }, [activeKey])

  if (!activeKey) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted">
        Select a dataset to preview it.
      </div>
    )
  }

  const columns = preview?.rows[0] ? Object.keys(preview.rows[0]) : []

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    deleteResource.mutate(activeKey!, { onSuccess: onDeleted, onError: () => setConfirmingDelete(false) })
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <div className="h-12 flex items-center gap-3 px-5 border-b border-line bg-white shrink-0">
        <span className="font-mono text-sm text-ink truncate">{activeKey}</span>
        {preview && (
          <span className="font-mono text-[11px] text-muted">
            {preview.returned_rows} / {preview.row_count} rows
          </span>
        )}
        <div className="flex-1" />
        <Button
          type="button"
          variant={confirmingDelete ? 'primary' : 'ghost'}
          size="sm"
          onClick={handleDelete}
          disabled={deleteResource.isPending}
          className={confirmingDelete ? 'bg-warn hover:bg-warn' : ''}
        >
          {deleteResource.isPending ? 'Deleting…' : confirmingDelete ? 'Confirm delete' : 'Delete'}
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading && <p className="text-sm text-muted p-5">Loading preview…</p>}

        {!isLoading && preview && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 bg-cream-soft">
                {columns.map((column) => (
                  <th key={column} className="font-mono text-[9px] uppercase text-muted px-2.5 py-1 border-b border-line">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, index) => (
                <tr key={index} className="hover:bg-cream-soft">
                  {columns.map((column) => (
                    <td key={column} className="text-[12px] text-slate px-2.5 py-1 border-b border-line max-w-[240px] truncate">
                      {String(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!isLoading && preview && preview.rows.length === 0 && (
          <p className="text-sm text-muted p-5">This dataset has no rows.</p>
        )}
      </div>

      {preview && preview.row_count > PAGE_SIZE && (
        <div className="h-10 flex items-center justify-center gap-3 border-t border-line bg-white shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
          >
            Previous
          </Button>
          <span className="text-xs text-muted font-mono">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, preview.row_count)} of {preview.row_count}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= preview.row_count}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}