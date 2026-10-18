import { DragEvent, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { formatBytes } from '@/modules/billing/lib/format'

interface FileDropProps {
  file: File | null
  onChange: (file: File | null) => void
  accept?: string
  disabled?: boolean
}

export function FileDrop({ file, onChange, accept, disabled }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setOver(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped && !disabled) onChange(dropped)
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn('drop', over && 'over', file && 'has')}
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <span className="drop-ico">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {file ? <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5" /> : <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />}
        </svg>
      </span>
      <span className="drop-text">
        <strong>{file ? file.name : 'Choose a file or drop it here'}</strong>
        <small>{file ? formatBytes(file.size) : 'CSV, Parquet, Arrow or JSON'}</small>
      </span>
    </button>
  )
}
