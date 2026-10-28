import { FormEvent, useState } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { useRunTracking } from '@/modules/runs/hooks-tracking'
import { useRunEventHistory } from '@/modules/runs/hooks-event-history'
import { useExportDownloadUrl, useExportResource } from '../hooks'

const FORMATS = ['csv', 'parquet', 'arrow', 'json']

interface ExportResourceDialogProps {
  workspaceId: string
  resourceKey: string
  onClose: () => void
}

export function ExportResourceDialog({ workspaceId, resourceKey, onClose }: ExportResourceDialogProps) {
  const [format, setFormat] = useState('csv')

  const exportResource = useExportResource(workspaceId, resourceKey)
  const { data: run } = useRunTracking(workspaceId, exportResource.data?.id)

  const running = Boolean(run) && run?.status !== 'completed' && run?.status !== 'failed'
  const failed = run?.status === 'failed'
  const completed = run?.status === 'completed'
  const { data: history } = useRunEventHistory(workspaceId, run?.id, failed)
  const lastEvent = history?.[history.length - 1]

  const {
    data: downloadUrl,
    isLoading: isPreparingDownload,
    isError: isDownloadError,
    error: downloadError,
    refetch: refetchDownloadUrl,
  } = useExportDownloadUrl(workspaceId, resourceKey, run?.id, completed)

  const errorMessage = failed ? (lastEvent?.data?.error as string | undefined) : undefined
  const downloadFilename = `${resourceKey}.${format}`

  function handleFormatChange(nextFormat: string) {
    setFormat(nextFormat)
    if (exportResource.data || exportResource.isError) {
      exportResource.reset()
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    exportResource.mutate({ format })
  }

  return (
    <Modal title="Export resource" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-muted uppercase">Dataset</label>
          <div className="px-3 py-2 text-xs font-mono border border-line rounded-lg bg-[#f4f6f2] text-ink truncate">
            {resourceKey}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-muted uppercase">Format</label>
          <select
            value={format}
            onChange={(event) => handleFormatChange(event.target.value)}
            disabled={running || exportResource.isPending}
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
        {isDownloadError && (
          <p className="text-[12px] text-warn">
            {downloadError instanceof Error ? downloadError.message : 'Failed to prepare download link'}
          </p>
        )}

        {run && (
          <div className="flex items-center gap-2 text-[12px]">
            <Badge tone={failed ? 'error' : completed ? 'success' : 'pending'}>{run.status}</Badge>
            {running && <span className="text-slate text-[11px]">Preparing {downloadFilename}…</span>}
            {completed && downloadUrl && (
              <span className="text-slate font-mono text-[11px]">Ready: {downloadFilename}</span>
            )}
            {failed && <span className="text-warn truncate">{errorMessage ?? 'Export failed'}</span>}
          </div>
        )}

        <div className="flex items-center gap-2 justify-end pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {completed ? 'Close' : 'Cancel'}
          </Button>
          {completed ? (
            downloadUrl ? (
              <a
                href={downloadUrl}
                download={downloadFilename}
                className="inline-flex items-center justify-center gap-2 font-medium transition-all active:scale-[0.98] bg-brand text-white hover:bg-brand-hover text-xs px-3 py-1.5 rounded-lg"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 4v12M7 11l5 5 5-5M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Download
              </a>
            ) : isDownloadError ? (
              <Button type="button" variant="primary" size="sm" onClick={() => refetchDownloadUrl()}>
                Retry link
              </Button>
            ) : (
              <Button type="button" variant="primary" size="sm" disabled={isPreparingDownload}>
                Preparing…
              </Button>
            )
          ) : (
            <Button type="submit" variant="primary" size="sm" disabled={exportResource.isPending || running}>
              {exportResource.isPending ? 'Starting…' : running ? 'Exporting…' : 'Export'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}
