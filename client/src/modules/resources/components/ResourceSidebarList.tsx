import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/shared/lib/cn'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { resourcesQueryKey, useDeleteResource, useResources } from '../hooks'
import { ExportResourceDialog } from './ExportResourceDialog'
import { ImportResourceDialog } from './ImportResourceDialog'

interface ResourceSidebarListProps {
  workspaceId: string
  isOpen: boolean
  activeKey: string | null
  onSelect: (key: string) => void
  onDeleted: (key: string) => void
}

export function ResourceSidebarList({ workspaceId, isOpen, activeKey, onSelect, onDeleted }: ResourceSidebarListProps) {
  const queryClient = useQueryClient()
  const { data: resources, isLoading } = useResources(workspaceId)
  const deleteResource = useDeleteResource(workspaceId)
  const [isImporting, setIsImporting] = useState(false)
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null)
  const [exportingKey, setExportingKey] = useState<string | null>(null)

  const keys = resources?.keys ?? []

  function handleRequestDelete(key: string) {
    deleteResource.reset()
    setConfirmingKey(key)
  }

  function handleConfirmDelete() {
    if (!confirmingKey) return
    const keyToDelete = confirmingKey
    deleteResource.mutate(keyToDelete, {
      onSuccess: () => {
        setConfirmingKey(null)
        onDeleted(keyToDelete)
      },
    })
  }

  if (!isOpen) {
    return (
      <div className="thin-scrollbar flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col items-center gap-2 px-2.5 py-3">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            title={key}
            onClick={() => onSelect(key)}
            className={cn(
              'w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border text-muted transition-colors',
              key === activeKey ? 'border-black bg-brand-tint text-[#0f6e4c]' : 'border-line bg-white hover:border-brand hover:text-brand',
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 9h18" />
            </svg>
          </button>
        ))}
        {keys.length === 0 && <div className="w-1.5 h-1.5 rounded-full bg-line mt-1" />}
      </div>
    )
  }

  return (
    <div className="w-full shrink-0 flex-1 min-h-0 flex flex-col p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted shrink-0">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 9h18" />
          </svg>
          <div className="font-mono text-[10px] tracking-wide text-muted uppercase">Datasets</div>
        </div>
        <button type="button" onClick={() => setIsImporting(true)} className="text-muted hover:text-brand transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-1.5 flex-1 overflow-auto">
        {isLoading && <p className="text-xs text-muted px-2.5 py-4">Loading…</p>}

        {!isLoading &&
          keys.map((key) => (
            <div
              key={key}
              className={cn(
                'flex items-center gap-2 px-2.5 py-2 min-h-[42px] rounded-lg border transition-colors',
                key === activeKey ? 'border-brand bg-brand-tint' : 'border-line bg-white hover:border-brand',
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 9h18" />
              </svg>
              <button
                type="button"
                onClick={() => onSelect(key)}
                className="flex-1 min-w-0 text-left font-mono text-[10px] tracking-wide text-muted uppercase truncate outline-none"
              >
                {key}
              </button>
              <button
                type="button"
                onClick={() => setExportingKey(key)}
                className="shrink-0 text-muted hover:text-brand transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 16V4M7 9l5-5 5 5M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                title="Delete dataset"
                onClick={() => handleRequestDelete(key)}
                className="shrink-0 text-muted hover:text-warn transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ))}

        {!isLoading && keys.length === 0 && (
          <p className="text-xs text-muted px-2.5 py-4">No datasets imported yet.</p>
        )}
      </div>

      {isImporting && (
        <ImportResourceDialog
          workspaceId={workspaceId}
          onClose={() => setIsImporting(false)}
          onImported={() => {
            queryClient.invalidateQueries({ queryKey: resourcesQueryKey(workspaceId) })
          }}
        />
      )}

      {exportingKey && (
        <ExportResourceDialog
          workspaceId={workspaceId}
          resourceKey={exportingKey}
          onClose={() => setExportingKey(null)}
        />
      )}

      {confirmingKey && (
        <Modal
          title="Delete dataset"
          onClose={() => !deleteResource.isPending && setConfirmingKey(null)}
          className="w-[400px]"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-warn-tint text-warn flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="text-sm text-slate leading-relaxed">
                Are you sure you want to delete dataset{' '}
                <span className="font-mono font-semibold text-ink">{confirmingKey}</span>? This action cannot be undone.
              </div>
            </div>

            {deleteResource.isError && <p className="text-[12px] text-warn">{deleteResource.error.message}</p>}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={deleteResource.isPending}
                onClick={() => setConfirmingKey(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={deleteResource.isPending}
                onClick={handleConfirmDelete}
                className="bg-warn text-white hover:bg-[#a64509]"
              >
                {deleteResource.isPending ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}