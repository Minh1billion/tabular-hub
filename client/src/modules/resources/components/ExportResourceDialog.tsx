import { FormEvent, useState } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { useRunTracking } from '@/modules/runs/hooks-tracking'
import { useRunEventHistory } from '@/modules/runs/hooks-event-history'
import { exportDownloadUrl } from '../api'
import { useExportResource } from '../hooks'

const FORMATS = ['csv', 'parquet', 'arrow', 'json']

interface ExportResourceDialogProps {
  workspaceId: string
  resourceKey: string
  onClose: () => void
}

export function ExportResourceDialog({ workspaceId, resourceKey, onClose }: ExportResourceDialogProps) {
  const [format, setFormat] = useState('csv')
  const [downloading, setDownloading] = useState(false)

  const exportResource = useExportResource(workspaceId, resourceKey)
  const { data: run } = useRunTracking(workspaceId, exportResource.data?.id)

  const running = Boolean(run) && run?.status !== 'completed' && run?.status !== 'failed'
  const failed = run?.status === 'failed'
  const completed = run?.status === 'completed'
  const { data: history } = useRunEventHistory(workspaceId, run?.id, failed)
  const lastEvent = history?.[history.length - 1]

  const errorMessage = failed ? (lastEvent?.data?.error as string | undefined) : undefined

  function handleFormatChange(nextFormat: string) {
    setFormat(nextFormat)
    if (exportResource.data) {
      exportResource.reset()
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    exportResource.mutate({ format })
  }

  async function handleDownload() {
    if (!run) return
    setDownloading(true)
    try {
      const url = await exportDownloadUrl(workspaceId, resourceKey, run.id)
      window.open(url, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Modal title="Export resource" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-muted uppercase">Format</label>
          <select
            value={format}
            onChange={(event) => handleFormatChange(event.target.value)}
            disabled={running}
            className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-white text-ink outline-none focus:border-brand transition-colors disabled:opacity-50"
          >
            {FORMATS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {exportResource.isError && <p className="text-[12px] text-warn">{exportResource.error.message}</p>}

        {run && (
          <div className="flex items-center gap-2 text-[12px]">
            <Badge tone={failed ? 'error' : completed ? 'success' : 'pending'}>{run.status}</Badge>
            {failed && <span className="text-warn truncate">{errorMessage ?? 'Export failed'}</span>}
          </div>
        )}

        <div className="flex items-center gap-2 justify-end pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {completed ? 'Close' : 'Cancel'}
          </Button>
          {completed ? (
            <Button type="button" variant="primary" size="sm" onClick={handleDownload} disabled={downloading}>
              {downloading ? 'Preparing…' : 'Download'}
            </Button>
          ) : (
            <Button type="submit" variant="primary" size="sm" disabled={exportResource.isPending || running}>
              {exportResource.isPending ? 'Starting…' : 'Export'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}