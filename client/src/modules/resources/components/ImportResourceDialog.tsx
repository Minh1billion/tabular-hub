import { FormEvent, useEffect, useRef, useState } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { Field } from '@/shared/components/ui/Field'
import { Checkbox } from '@/shared/components/ui/Checkbox'
import { FileDrop } from '@/shared/components/ui/FileDrop'
import { Segmented } from '@/shared/components/ui/Segmented'
import { cn } from '@/shared/lib/cn'
import { useRunTracking } from '@/modules/runs/hooks-tracking'
import { useRunEventHistory } from '@/modules/runs/hooks-event-history'
import { useSubscription } from '@/modules/billing/hooks'
import { useImportResource } from '../hooks'

const FORMATS = ['csv', 'parquet', 'arrow', 'json'].map((value) => ({ value, label: value }))

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

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
  const keyEditedRef = useRef(false)

  const importResource = useImportResource(workspaceId)
  const { data: run } = useRunTracking(workspaceId, importResource.data?.id)
  const { data: subscription } = useSubscription()

  const sizeError =
    file && subscription
      ? file.size > subscription.max_resource_size_bytes
        ? `File is ${formatBytes(file.size)}, plan limit is ${formatBytes(subscription.max_resource_size_bytes)}`
        : file.size > subscription.max_total_storage_bytes - subscription.storage_used_bytes
          ? `File exceeds remaining storage (${formatBytes(subscription.max_total_storage_bytes - subscription.storage_used_bytes)} left)`
          : undefined
      : undefined

  const failed = run?.status === 'failed'
  const completed = run?.status === 'completed'
  const processing = Boolean(run) && !failed && !completed
  const { data: history } = useRunEventHistory(workspaceId, run?.id, failed || completed)
  const lastEvent = history?.[history.length - 1]

  const errorMessage = failed ? (lastEvent?.data?.error as string | undefined) : undefined
  const rowCount = completed ? ((lastEvent?.data?.data as { row_count?: number } | undefined)?.row_count ?? 0) : undefined

  const notifiedRef = useRef(false)

  useEffect(() => {
    if (completed && !notifiedRef.current) {
      notifiedRef.current = true
      onImported()
    }
  }, [completed, onImported])

  function handleFile(next: File | null) {
    setFile(next)
    if (!next) return
    const dot = next.name.lastIndexOf('.')
    const extension = dot >= 0 ? next.name.slice(dot + 1).toLowerCase() : ''
    if (FORMATS.some((option) => option.value === extension)) setFormat(extension)
    if (!keyEditedRef.current) {
      const base = dot >= 0 ? next.name.slice(0, dot) : next.name
      setKey(base.trim().replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase())
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!file || sizeError) return
    importResource.mutate({ key: key.trim(), format, overwrite, file })
  }

  const locked = importResource.isPending || Boolean(importResource.data)

  return (
    <Modal title="Import dataset" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="File">
          <FileDrop file={file} onChange={handleFile} disabled={locked} />
          {sizeError && <p className="text-[12px] text-warn">{sizeError}</p>}
        </Field>

        <Field label="Key" hint="Pipelines reference the dataset by this name.">
          <Input value={key} onChange={(event) => {
              keyEditedRef.current = event.target.value !== ''
              setKey(event.target.value)
            }} placeholder="e.g. raw_orders" disabled={locked} />
        </Field>

        <div className="dlg-row">
          <Field label="Format">
            <Segmented value={format} options={FORMATS} onChange={setFormat} />
          </Field>
          <div className="field">
            <Checkbox label="Overwrite if exists" checked={overwrite} disabled={locked} onChange={(event) => setOverwrite(event.target.checked)} />
          </div>
        </div>

        {importResource.isPending && (
          <div className="dlg-progress">
            <div className="bar live">
              <i style={{ width: `${importResource.progress}%` }} />
            </div>
            <small>Uploading {importResource.progress}%</small>
          </div>
        )}

        {processing && (
          <div className="dlg-progress">
            <div className="bar indet">
              <i />
            </div>
            <small>Processing file…</small>
          </div>
        )}

        {importResource.isError && <div className="dlg-status fail">{importResource.error.message}</div>}

        {run && (
          <div className={cn('dlg-status', failed && 'fail', completed && 'ok')}>
            <Badge tone={failed ? 'error' : completed ? 'success' : 'pending'}>
              <i className={cn('bdot', processing && 'live')} />
              {run.status}
            </Badge>
            {failed && <span className="grow">{errorMessage ?? 'Import failed'}</span>}
            {completed && <span className="grow">{rowCount} rows imported</span>}
          </div>
        )}

        <div className="modal-actions">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {completed ? 'Close' : 'Cancel'}
          </Button>
          {completed ? (
            <Button type="button" size="sm" onClick={onClose}>
              Done
            </Button>
          ) : (
            <Button
              type="submit"
              size="sm"
              loading={importResource.isPending}
              disabled={locked || !file || !key.trim() || Boolean(sizeError)}
            >
              {importResource.isPending ? 'Uploading…' : 'Import'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}