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
import { useSubscription } from '@/modules/billing/hooks'
import { formatBytes } from '@/modules/billing/lib/format'
import { useRunTracking } from '@/modules/runs/hooks-tracking'
import { useRunEventHistory } from '@/modules/runs/hooks-event-history'
import { useImportResource, useResources } from '../hooks'

const FORMATS = ['csv', 'parquet', 'arrow', 'json'] as const
type ResourceFormat = (typeof FORMATS)[number]
const FORMAT_OPTIONS = FORMATS.map((value) => ({ value: value as string, label: value }))
const ACCEPT = '.csv,.parquet,.pq,.arrow,.ipc,.feather,.json,.jsonl,.ndjson'

const EXTENSION_TO_FORMAT: Record<string, ResourceFormat> = {
  csv: 'csv',
  parquet: 'parquet',
  pq: 'parquet',
  arrow: 'arrow',
  ipc: 'arrow',
  feather: 'arrow',
  json: 'json',
  jsonl: 'json',
  ndjson: 'json',
}

function parseFilename(filename: string): { stem: string; ext: string; format?: ResourceFormat } {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot <= 0) {
    return { stem: filename.trim(), ext: '' }
  }
  const stem = filename.slice(0, lastDot).trim()
  const ext = filename.slice(lastDot + 1).toLowerCase()
  return {
    stem,
    ext,
    format: EXTENSION_TO_FORMAT[ext],
  }
}

function toDatasetKey(stem: string) {
  return stem.trim().replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase()
}

async function validateDatasetFile(file: File, targetFormat: string, ext?: string): Promise<string | null> {
  if (ext && !EXTENSION_TO_FORMAT[ext]) {
    return `Unsupported file format (.${ext}). Please upload a CSV, Parquet, Arrow, or JSON file.`
  }

  if (file.size === 0) {
    return `File "${file.name}" is empty (0 B). Please select a file that contains data.`
  }

  try {
    const buffer = await file.slice(0, 4096).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    if (bytes.length === 0 || bytes.every((b) => b === 0)) {
      return `Unable to import "${file.name}": the file appears to be corrupted or contains no readable ${targetFormat.toUpperCase()} data.`
    }

    if (targetFormat === 'csv') {
      if (bytes.some((b) => b === 0)) {
        return `Unable to import "${file.name}": the file contains binary data and is not a valid text CSV file.`
      }
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      if (!text.trim()) {
        return `File "${file.name}" contains only whitespace and has no CSV rows or columns.`
      }
    } else if (targetFormat === 'json') {
      if (bytes.some((b) => b === 0)) {
        return `Unable to import "${file.name}": the file contains binary data and is not a valid JSON file.`
      }
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).trimStart()
      if (!text || (text[0] !== '{' && text[0] !== '[')) {
        return `Unable to import "${file.name}": content must be a valid JSON array/object or JSON Lines (.jsonl).`
      }
    } else if (targetFormat === 'parquet') {
      const isPar1 =
        bytes.length >= 4 &&
        bytes[0] === 0x50 &&
        bytes[1] === 0x41 &&
        bytes[2] === 0x52 &&
        bytes[3] === 0x31
      if (!isPar1) {
        return `Unable to import "${file.name}": file header does not match Apache Parquet format.`
      }
    } else if (targetFormat === 'arrow') {
      const isArrowFile =
        bytes.length >= 6 &&
        bytes[0] === 0x41 &&
        bytes[1] === 0x52 &&
        bytes[2] === 0x52 &&
        bytes[3] === 0x4f &&
        bytes[4] === 0x57 &&
        bytes[5] === 0x31
      const isArrowStream =
        bytes.length >= 4 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xff &&
        bytes[2] === 0xff &&
        bytes[3] === 0xff
      if (!isArrowFile && !isArrowStream) {
        return `Unable to import "${file.name}": file header does not match Apache Arrow/Feather format.`
      }
    }
  } catch {
    return `Unable to read "${file.name}": the file is corrupted or its encoding is not valid ${targetFormat.toUpperCase()}.`
  }

  return null
}

interface ImportResourceDialogProps {
  workspaceId: string
  onClose: () => void
  onImported: () => void
}

export function ImportResourceDialog({ workspaceId, onClose, onImported }: ImportResourceDialogProps) {
  const [key, setKey] = useState('')
  const [format, setFormat] = useState<string>('csv')
  const [overwrite, setOverwrite] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [confirmingClose, setConfirmingClose] = useState(false)
  // Bumped to remount FileDrop so its hidden <input> is cleared (lets the user re-pick the same file).
  const [dropKey, setDropKey] = useState(0)
  const keyEditedRef = useRef(false)
  const notifiedRef = useRef(false)

  const { data: subscription } = useSubscription()
  const { data: resources } = useResources(workspaceId)
  const importResource = useImportResource(workspaceId)
  const { data: run } = useRunTracking(workspaceId, importResource.data?.id)

  const isUploading = importResource.isPending
  const failed = run?.status === 'failed'
  const completed = run?.status === 'completed'
  const isProcessing = Boolean(importResource.data) && !completed && !failed
  const isBusy = isUploading || isProcessing
  const { data: history } = useRunEventHistory(workspaceId, run?.id, failed || completed)
  const lastEvent = history?.[history.length - 1]

  const errorMessage = failed ? (lastEvent?.data?.error as string | undefined) : undefined
  const rowCount = completed ? ((lastEvent?.data?.data as { row_count?: number } | undefined)?.row_count ?? 0) : undefined

  const maxResourceSize = subscription?.max_resource_size_bytes
  const maxTotalStorage = subscription?.max_total_storage_bytes
  const storageUsed = subscription?.storage_used_bytes

  const trimmedKey = key.trim()
  const existingKeys = resources?.keys ?? []
  const isDuplicateKey = Boolean(trimmedKey && existingKeys.includes(trimmedKey))

  useEffect(() => {
    if (completed && !notifiedRef.current) {
      notifiedRef.current = true
      onImported()
    }
  }, [completed, onImported])

  useEffect(() => {
    if (!isUploading) {
      setConfirmingClose(false)
    }
  }, [isUploading])

  useEffect(() => {
    if (!isUploading) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isUploading])

  function getSizeError(candidate: File): string | null {
    if (maxResourceSize != null && candidate.size > maxResourceSize) {
      return `File "${candidate.name}" (${formatBytes(candidate.size)}) exceeds your plan limit of ${formatBytes(maxResourceSize)} per dataset.`
    }
    if (maxTotalStorage != null && storageUsed != null && storageUsed + candidate.size > maxTotalStorage) {
      return `File "${candidate.name}" (${formatBytes(candidate.size)}) exceeds remaining storage quota (${formatBytes(Math.max(0, maxTotalStorage - storageUsed))} available of ${formatBytes(maxTotalStorage)}).`
    }
    return null
  }

  // Re-check once the subscription loads (or changes) after a file was already picked.
  useEffect(() => {
    if (!file) return
    const sizeError = getSizeError(file)
    if (sizeError) rejectFile(sizeError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, maxResourceSize, maxTotalStorage, storageUsed])

  function rejectFile(message: string) {
    setFile(null)
    setDropKey((value) => value + 1)
    setFileError(message)
  }

  function resetRunStateIfNeeded() {
    if (importResource.data || importResource.isError) {
      importResource.reset()
      notifiedRef.current = false
    }
  }

  async function applySelectedFile(selected: File | null) {
    if (isBusy) return
    resetRunStateIfNeeded()
    setFileError(null)

    if (!selected) {
      setFile(null)
      return
    }

    const sizeError = getSizeError(selected)
    if (sizeError) {
      rejectFile(sizeError)
      return
    }

    const parsed = parseFilename(selected.name)
    const nextFormat = parsed.format ?? format

    const validationError = await validateDatasetFile(selected, nextFormat, parsed.ext)
    if (validationError) {
      rejectFile(validationError)
      return
    }

    setFile(selected)
    if (parsed.format) {
      setFormat(parsed.format)
    }
    if (!keyEditedRef.current || !key.trim()) {
      setKey(toDatasetKey(parsed.stem))
      keyEditedRef.current = false
    }
  }

  async function handleFormatChange(nextFormat: string) {
    if (isBusy) return
    resetRunStateIfNeeded()
    setFormat(nextFormat)
    if (file) {
      setFileError(await validateDatasetFile(file, nextFormat))
    }
  }

  function handleRequestClose() {
    if (isUploading) {
      setConfirmingClose(true)
      return
    }
    onClose()
  }

  function handleConfirmAbortAndClose() {
    importResource.abort()
    setConfirmingClose(false)
    onClose()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!file || !trimmedKey || Boolean(fileError) || isBusy) return
    const validationError = await validateDatasetFile(file, format)
    if (validationError) {
      rejectFile(validationError)
      return
    }
    notifiedRef.current = false
    importResource.mutate({ key: trimmedKey, format, overwrite, file })
  }

  return (
    <Modal title="Import dataset" onClose={handleRequestClose}>
      <form onSubmit={handleSubmit}>
        <Field label="File" hint={maxResourceSize != null ? `Max ${formatBytes(maxResourceSize)} per dataset.` : undefined}>
          <FileDrop key={dropKey} file={file} onChange={applySelectedFile} accept={ACCEPT} disabled={isBusy} />
          {fileError && <p className="err m-0">{fileError}</p>}
        </Field>

        <Field label="Key" hint="Pipelines reference the dataset by this name.">
          <Input
            value={key}
            disabled={isBusy}
            onChange={(event) => {
              resetRunStateIfNeeded()
              keyEditedRef.current = event.target.value.trim() !== ''
              setKey(event.target.value)
            }}
            placeholder="e.g. raw_orders"
          />
        </Field>

        <div className="dlg-row">
          <Field label="Format">
            <Segmented
              value={format}
              options={FORMAT_OPTIONS}
              onChange={handleFormatChange}
              className={cn(isBusy && 'pointer-events-none opacity-60')}
            />
          </Field>
          <div className="field">
            <Checkbox
              label="Overwrite if exists"
              checked={overwrite}
              disabled={isBusy}
              onChange={(event) => {
                resetRunStateIfNeeded()
                setOverwrite(event.target.checked)
              }}
            />
          </div>
        </div>

        {!isBusy && !completed && isDuplicateKey && (
          <div className="dlg-status fail">
            <span>
              {overwrite ? (
                <>
                  Dataset <b className="font-mono">{trimmedKey}</b> already exists and will be permanently overwritten.
                </>
              ) : (
                <>
                  Dataset <b className="font-mono">{trimmedKey}</b> already exists. Enable <b>Overwrite</b> to replace it or
                  choose a different key.
                </>
              )}
            </span>
          </div>
        )}

        {isUploading && (
          <div className="dlg-progress">
            <div className="bar live">
              <i style={{ width: `${importResource.progress}%` }} />
            </div>
            <small>Uploading {importResource.progress}%</small>
          </div>
        )}

        {isProcessing && (
          <div className="dlg-progress">
            <div className="bar indet">
              <i />
            </div>
            <small>Ingesting dataset into workspace…</small>
          </div>
        )}

        {importResource.isError && <div className="dlg-status fail">{importResource.error.message}</div>}

        {run && (
          <div className={cn('dlg-status', failed && 'fail', completed && 'ok')}>
            <Badge tone={failed ? 'error' : completed ? 'success' : 'pending'}>
              <i className={cn('bdot', isProcessing && 'live')} />
              {completed ? 'done' : isProcessing ? 'processing' : run.status}
            </Badge>
            {failed && <span className="grow">{errorMessage ?? 'Import failed'}</span>}
            {completed && <span className="grow">{rowCount} rows imported</span>}
          </div>
        )}

        {confirmingClose && isUploading && (
          <div className="dlg-status fail" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <span>Upload is still in progress ({importResource.progress}%). Closing now will cancel the upload.</span>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingClose(false)}>
                Keep uploading
              </Button>
              <Button type="button" variant="solid-danger" size="sm" onClick={handleConfirmAbortAndClose}>
                Cancel upload &amp; close
              </Button>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <Button type="button" variant="outline" size="sm" onClick={handleRequestClose}>
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
              loading={isUploading}
              disabled={isBusy || !file || !trimmedKey || Boolean(fileError) || (isDuplicateKey && !overwrite)}
            >
              {isUploading ? `Uploading ${importResource.progress}%…` : isProcessing ? 'Processing…' : 'Import'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}
