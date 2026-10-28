import { FormEvent, useState } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { Field } from '@/shared/components/ui/Field'
import { Segmented } from '@/shared/components/ui/Segmented'
import { TableIcon } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/cn'
import { useRunTracking } from '@/modules/runs/hooks-tracking'
import { useRunEventHistory } from '@/modules/runs/hooks-event-history'
import { exportDownloadUrl } from '../api'
import { useExportResource } from '../hooks'

const FORMATS = ['csv', 'parquet', 'arrow', 'json'].map((value) => ({ value, label: value }))

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
    <Modal title="Export dataset" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="dlg-status" style={{ background: 'var(--white)' }}>
          <span className="cat-tile" data-cat="IO" style={{ width: 28, height: 28, border: 'var(--edge)', borderRadius: 7 }}>
            <TableIcon className="w-3.5 h-3.5" />
          </span>
          <span className="grow font-mono font-semibold">{resourceKey}</span>
        </div>

        <Field label="Format">
          <Segmented value={format} options={FORMATS} onChange={handleFormatChange} className={cn(running && 'pointer-events-none opacity-60')} />
        </Field>

        {running && (
          <div className="dlg-progress">
            <div className="bar indet">
              <i />
            </div>
            <small>Preparing your file…</small>
          </div>
        )}

        {exportResource.isError && <div className="dlg-status fail">{exportResource.error.message}</div>}

        {run && (
          <div className={cn('dlg-status', failed && 'fail', completed && 'ok')}>
            <Badge tone={failed ? 'error' : completed ? 'success' : 'pending'}>
              <i className={cn('bdot', running && 'live')} />
              {run.status}
            </Badge>
            {failed && <span className="grow">{errorMessage ?? 'Export failed'}</span>}
            {completed && <span className="grow">Your file is ready.</span>}
          </div>
        )}

        <div className="modal-actions">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {completed ? 'Close' : 'Cancel'}
          </Button>
          {completed ? (
            <Button type="button" size="sm" onClick={handleDownload} loading={downloading}>
              Download
            </Button>
          ) : (
            <Button type="submit" size="sm" loading={exportResource.isPending} disabled={exportResource.isPending || running}>
              {exportResource.isPending ? 'Starting…' : 'Export'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}
