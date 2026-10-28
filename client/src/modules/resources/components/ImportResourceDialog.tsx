import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { cn } from '@/shared/lib/cn'
import { useSubscription } from '@/modules/billing/hooks'
import { formatBytes } from '@/modules/billing/lib/format'
import { useRunTracking } from '@/modules/runs/hooks-tracking'
import { useRunEventHistory } from '@/modules/runs/hooks-event-history'
import { useImportResource, useResources } from '../hooks'

const FORMATS = ['csv', 'parquet', 'arrow', 'json'] as const
type ResourceFormat = (typeof FORMATS)[number]

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
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false)
  const [format, setFormat] = useState<string>('csv')
  const [overwrite, setOverwrite] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [confirmingClose, setConfirmingClose] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
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
  const rowCount = completed
    ? ((lastEvent?.data?.data as { row_count?: number } | undefined)?.row_count ?? 0)
    : undefined

  const maxResourceSize = subscription?.max_resource_size_bytes
  const maxTotalStorage = subscription?.max_total_storage_bytes
  const storageUsed = subscription?.storage_used_bytes

  const exceedsResourceLimit = Boolean(file && maxResourceSize != null && file.size > maxResourceSize)
  const exceedsTotalStorage = Boolean(
    file &&
      !exceedsResourceLimit &&
      maxTotalStorage != null &&
      storageUsed != null &&
      storageUsed + file.size > maxTotalStorage,
  )
  const isFileTooLarge = exceedsResourceLimit || exceedsTotalStorage

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

  useEffect(() => {
    if (!file) return
    if (maxResourceSize != null && file.size > maxResourceSize) {
      setFileError(
        `File "${file.name}" (${formatBytes(file.size)}) exceeds your plan limit of ${formatBytes(maxResourceSize)} per dataset.`,
      )
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } else if (maxTotalStorage != null && storageUsed != null && storageUsed + file.size > maxTotalStorage) {
      setFileError(
        `File "${file.name}" (${formatBytes(file.size)}) exceeds remaining storage quota (${formatBytes(Math.max(0, maxTotalStorage - storageUsed))} available of ${formatBytes(maxTotalStorage)}).`,
      )
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [file, maxResourceSize, maxTotalStorage, storageUsed])

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

    if (maxResourceSize != null && selected.size > maxResourceSize) {
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setFileError(
        `File "${selected.name}" (${formatBytes(selected.size)}) exceeds your plan limit of ${formatBytes(maxResourceSize)} per dataset.`,
      )
      return
    }

    if (maxTotalStorage != null && storageUsed != null && storageUsed + selected.size > maxTotalStorage) {
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setFileError(
        `File "${selected.name}" (${formatBytes(selected.size)}) exceeds remaining storage quota (${formatBytes(Math.max(0, maxTotalStorage - storageUsed))} available of ${formatBytes(maxTotalStorage)}).`,
      )
      return
    }

    const parsed = parseFilename(selected.name)
    const nextFormat = parsed.format ?? format

    const validationError = await validateDatasetFile(selected, nextFormat, parsed.ext)
    if (validationError) {
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setFileError(validationError)
      return
    }

    setFile(selected)
    if (parsed.format) {
      setFormat(parsed.format)
    }
    if (!keyManuallyEdited || !key.trim()) {
      setKey(parsed.stem)
      setKeyManuallyEdited(false)
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    applySelectedFile(selected)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (!isBusy) {
      setIsDragging(true)
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
    if (isBusy) return
    const droppedFile = event.dataTransfer.files?.[0] ?? null
    if (droppedFile) {
      applySelectedFile(droppedFile)
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
    if (!file || !trimmedKey || isFileTooLarge || Boolean(fileError) || isBusy) return
    const validationError = await validateDatasetFile(file, format)
    if (validationError) {
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setFileError(validationError)
      return
    }
    notifiedRef.current = false
    importResource.mutate({ key: trimmedKey, format, overwrite, file })
  }

  const showStepTracker = isUploading || Boolean(importResource.data) || importResource.isError

  return (
    <Modal title="Import resource" onClose={handleRequestClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono text-muted uppercase">File</label>
            {maxResourceSize != null && (
              <span className="text-[10px] font-mono text-muted">Max {formatBytes(maxResourceSize)}</span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.parquet,.pq,.arrow,.ipc,.feather,.json,.jsonl,.ndjson"
            onChange={handleFileChange}
            disabled={isBusy}
            className="hidden"
          />

          <div
            role="button"
            tabIndex={isBusy ? -1 : 0}
            onClick={() => !isBusy && fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (!isBusy && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'rounded-lg border-2 border-dashed px-4 py-4 transition-colors text-left outline-none',
              isBusy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
              fileError || isFileTooLarge
                ? 'border-warn bg-warn-tint/40'
                : isDragging
                  ? 'border-brand bg-brand-tint/60'
                  : file
                    ? 'border-brand/60 bg-brand-tint/20 hover:border-brand'
                    : 'border-line bg-[#f4f6f2] hover:border-brand focus:border-brand',
            )}
          >
            {file ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      isFileTooLarge ? 'bg-warn-tint text-warn' : 'bg-brand-tint text-[#0f6e4c]',
                    )}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[11px] font-mono text-muted">{formatBytes(file.size)}</p>
                  </div>
                </div>

                {!isBusy && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      applySelectedFile(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }}
                    className="text-xs font-mono text-muted hover:text-warn px-2 py-1 rounded transition-colors shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center gap-1 py-1">
                <svg
                  className="w-6 h-6 text-muted mb-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 16V4M7 9l5-5 5 5M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-sm text-ink font-medium">
                  Drop a file here, or <span className="text-brand underline">browse</span>
                </p>
                <p className="text-[11px] text-muted font-mono">CSV, Parquet, Arrow, JSON</p>
              </div>
            )}
          </div>

          {fileError && (
            <div className="flex items-start gap-2 rounded-lg bg-warn-tint px-3 py-2 text-[12px] text-warn mt-1">
              <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{fileError}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-muted uppercase">Key</label>
          <Input
            value={key}
            disabled={isBusy}
            onChange={(event) => {
              resetRunStateIfNeeded()
              const nextValue = event.target.value
              setKey(nextValue)
              setKeyManuallyEdited(Boolean(nextValue.trim()))
            }}
            placeholder="e.g. raw_orders"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[10px] font-mono text-muted uppercase">Format</label>
            <select
              value={format}
              disabled={isBusy}
              onChange={async (event) => {
                resetRunStateIfNeeded()
                const nextFormat = event.target.value
                setFormat(nextFormat)
                if (file) {
                  const err = await validateDatasetFile(file, nextFormat)
                  setFileError(err)
                }
              }}
              className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-white text-ink outline-none focus:border-brand transition-colors disabled:opacity-50"
            >
              {FORMATS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate pt-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={overwrite}
              disabled={isBusy}
              onChange={(event) => {
                resetRunStateIfNeeded()
                setOverwrite(event.target.checked)
              }}
            />
            Overwrite
          </label>
        </div>

        {!isBusy && !completed && overwrite && isDuplicateKey && (
          <div className="flex items-start gap-2 rounded-lg bg-warn-tint px-3 py-2 text-[12px] text-warn">
            <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              Dataset <b className="font-mono">{trimmedKey}</b> already exists and will be permanently overwritten.
            </span>
          </div>
        )}

        {!isBusy && !completed && overwrite && !isDuplicateKey && (
          <div className="flex items-start gap-2 rounded-lg bg-cream-soft border border-line px-3 py-2 text-[12px] text-slate">
            <svg className="w-4 h-4 shrink-0 mt-0.5 text-accent-clay" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Overwrite is enabled. If a dataset with this key exists, its data will be replaced.</span>
          </div>
        )}

        {!isBusy && !completed && !overwrite && isDuplicateKey && (
          <div className="flex items-start gap-2 rounded-lg bg-warn-tint px-3 py-2 text-[12px] text-warn">
            <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              Dataset <b className="font-mono">{trimmedKey}</b> already exists. Enable <b>Overwrite</b> to replace it or choose a different key.
            </span>
          </div>
        )}

        {showStepTracker && (
          <div className="flex flex-col gap-2 rounded-lg border border-line bg-[#f4f6f2] p-3">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span
                className={cn(
                  'flex items-center gap-1',
                  isUploading
                    ? 'text-brand font-semibold'
                    : importResource.data
                      ? 'text-[#0f6e4c]'
                      : importResource.isError
                        ? 'text-warn font-semibold'
                        : 'text-muted',
                )}
              >
                1. Uploading {isUploading ? `(${importResource.progress}%)` : importResource.data ? '(100%)' : ''}
              </span>
              <span className="text-muted">→</span>
              <span
                className={cn(
                  'flex items-center gap-1',
                  isProcessing
                    ? 'text-brand font-semibold'
                    : completed
                      ? 'text-[#0f6e4c]'
                      : failed
                        ? 'text-warn font-semibold'
                        : 'text-muted',
                )}
              >
                2. Processing
              </span>
              <span className="text-muted">→</span>
              <span
                className={cn(
                  'flex items-center gap-1',
                  completed ? 'text-[#0f6e4c] font-semibold' : 'text-muted',
                )}
              >
                3. Done
              </span>
            </div>

            {(isUploading || isProcessing || completed) && (
              <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
                {isUploading && (
                  <div
                    className="h-full bg-brand transition-all duration-150"
                    style={{ width: `${importResource.progress}%` }}
                  />
                )}
                {isProcessing && <div className="h-full w-2/3 bg-brand rounded-full animate-pulse" />}
                {completed && <div className="h-full w-full bg-brand transition-all" />}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 text-[12px]">
              {isUploading && (
                <span className="text-slate font-mono text-[11px]">Uploading file… {importResource.progress}%</span>
              )}
              {run && !isUploading && (
                <div className="flex items-center gap-2 min-w-0">
                  <Badge tone={failed ? 'error' : completed ? 'success' : 'pending'}>
                    {completed ? 'done' : isProcessing ? 'processing' : run.status}
                  </Badge>
                  {isProcessing && <span className="text-slate text-[11px]">Ingesting dataset into workspace…</span>}
                  {failed && <span className="text-warn truncate">{errorMessage ?? 'Import failed'}</span>}
                  {completed && <span className="text-slate font-mono text-[11px]">{rowCount} rows imported</span>}
                </div>
              )}
              {importResource.isError && (
                <span className="text-warn truncate">{importResource.error.message}</span>
              )}
            </div>
          </div>
        )}

        {confirmingClose && isUploading && (
          <div className="flex flex-col gap-2.5 rounded-lg border border-warn bg-warn-tint p-3 text-[12px] text-warn">
            <div className="font-medium">
              Upload is still in progress ({importResource.progress}%). Closing now will cancel the upload.
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingClose(false)}>
                Keep uploading
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmAbortAndClose}
                className="bg-warn text-white hover:bg-[#a64509]"
              >
                Cancel upload & close
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 justify-end pt-1">
          {completed ? (
            <Button type="button" variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          ) : (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={handleRequestClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isBusy || !file || !trimmedKey || isFileTooLarge || Boolean(fileError)}
              >
                {isUploading
                  ? `Uploading ${importResource.progress}%…`
                  : isProcessing
                    ? 'Processing…'
                    : 'Import'}
              </Button>
            </>
          )}
        </div>
      </form>
    </Modal>
  )
}
