import { FormEvent, useEffect, useRef, useState } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { useRunTracking } from '@/shared/hooks/useRunTracking'
import { useRunEventHistory } from '@/shared/hooks/useRunEventHistory'
import { useImportResource } from '../hooks'

const FORMATS = ['csv', 'parquet', 'arrow', 'json']

interface ImportResourceDialogProps {
  workspaceId: string
  onClose: () => void
  onImported: () => void
}

export function ImportResourceDialog({ workspaceId, onClose, onImported }: ImportResourceDialogProps) {
  const [key, setKey] = useState('')
  const [format, setFormat] = useState('csv')
  const [overwrite, setOverwrite] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const importResource = useImportResource(workspaceId)
  const { data: run } = useRunTracking(workspaceId, importResource.data?.id)

  const failed = run?.status === 'failed'
  const completed = run?.status === 'completed'
  const { data: history } = useRunEventHistory(workspaceId, run?.id, failed || completed)
  const lastEvent = history?.[history.length - 1]

  const errorMessage = failed ? (lastEvent?.data?.error as string | undefined) : undefined
  const rowCount = completed
    ? ((lastEvent?.data?.data as { row_count?: number } | undefined)?.row_count ?? 0)
    : undefined

  const notifiedRef = useRef(false)

  useEffect(() => {
    if (completed && !notifiedRef.current) {
      notifiedRef.current = true
      onImported()
    }
  }, [completed, onImported])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!file) return
    importResource.mutate({ key: key.trim(), format, overwrite, file })
  }

  return (
    <Modal title="Import resource" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-muted uppercase">File</label>
          <input
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="text-sm text-slate file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-line file:bg-white file:text-ink file:cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-muted uppercase">Key</label>
          <Input value={key} onChange={(event) => setKey(event.target.value)} placeholder="e.g. raw_orders" />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[10px] font-mono text-muted uppercase">Format</label>
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value)}
              className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-white text-ink outline-none focus:border-brand transition-colors"
            >
              {FORMATS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate pt-4">
            <input type="checkbox" checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} />
            Overwrite
          </label>
        </div>

        {importResource.isPending && (
          <div className="h-1.5 w-full bg-line rounded overflow-hidden">
            <div
              className="h-full bg-brand transition-all"
              style={{ width: `${importResource.progress}%` }}
            />
          </div>
        )}

        {importResource.isError && <p className="text-[12px] text-warn">{importResource.error.message}</p>}

        {run && (
          <div className="flex items-center gap-2 text-[12px]">
            <Badge tone={failed ? 'error' : completed ? 'success' : 'pending'}>{run.status}</Badge>
            {failed && <span className="text-warn truncate">{errorMessage ?? 'Import failed'}</span>}
            {completed && <span className="text-slate">{rowCount} rows</span>}
          </div>
        )}

        <div className="flex items-center gap-2 justify-end pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {completed ? 'Close' : 'Cancel'}
          </Button>
          {completed ? (
            <Button type="button" variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={importResource.isPending || Boolean(importResource.data) || !file || !key.trim()}
            >
              {importResource.isPending ? 'Uploading…' : 'Import'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}