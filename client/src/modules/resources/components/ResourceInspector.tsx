import { PointerEvent as ReactPointerEvent, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { useResourcePreview } from '../hooks'

const PAGE_SIZE = 20
const MIN_WIDTH = 360
const MIN_HEIGHT = 240
const HEADER_HEIGHT = 49

type ResizeCorner = { x: 'w' | 'e'; y: 'n' | 's' }

interface ResourceInspectorProps {
  workspaceId: string
  resourceKey: string
  onClose: () => void
}

export function ResourceInspector({ workspaceId, resourceKey, onClose }: ResourceInspectorProps) {
  const [offset, setOffset] = useState(0)
  const [pageInput, setPageInput] = useState('1')
  const [collapsed, setCollapsed] = useState(false)
  const [box, setBox] = useState(() => ({ x: window.innerWidth - 16 - 640, y: 80, width: 640, height: 480 }))
  const [isResizing, setIsResizing] = useState(false)
  const dragging = useRef(false)
  const resizing = useRef(false)

  const { data: preview, isLoading } = useResourcePreview(workspaceId, resourceKey, PAGE_SIZE, offset)
  const columns = preview?.rows[0] ? Object.keys(preview.rows[0]) : []
  const totalPages = preview ? Math.max(1, Math.ceil(preview.row_count / PAGE_SIZE)) : 1
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  function goToPage(page: number) {
    const clamped = Math.min(totalPages, Math.max(1, page))
    setOffset((clamped - 1) * PAGE_SIZE)
    setPageInput(String(clamped))
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault()
    dragging.current = true
    const startX = event.clientX
    const startY = event.clientY
    const start = box

    function onMove(moveEvent: PointerEvent) {
      if (!dragging.current) return
      setBox((current) => ({ ...current, x: start.x + (moveEvent.clientX - startX), y: start.y + (moveEvent.clientY - startY) }))
    }

    function onUp() {
      dragging.current = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function startResize(corner: ResizeCorner, event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    resizing.current = true
    setIsResizing(true)
    const startX = event.clientX
    const startY = event.clientY
    const start = box
    const rightEdge = start.x + start.width
    const bottomEdge = start.y + start.height

    function onMove(moveEvent: PointerEvent) {
      if (!resizing.current) return
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY

      const width = Math.max(MIN_WIDTH, corner.x === 'e' ? start.width + deltaX : start.width - deltaX)
      const height = Math.max(MIN_HEIGHT, corner.y === 's' ? start.height + deltaY : start.height - deltaY)
      const x = corner.x === 'e' ? start.x : rightEdge - width
      const y = corner.y === 's' ? start.y : bottomEdge - height

      setBox({ x, y, width, height })
    }

    function onUp() {
      resizing.current = false
      setIsResizing(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div
      className="fixed z-20 bg-white border-2 border-black rounded-panel flex flex-col overflow-hidden shadow-lg"
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        maxHeight: 'calc(100vh - 32px)',
      }}
    >
      <div
        onPointerDown={startDrag}
        className="flex items-center justify-between px-4 py-3 border-b-2 border-black cursor-grab active:cursor-grabbing shrink-0"
      >
        <div className="min-w-0 flex items-center gap-2">
          <h2 className="font-headline font-semibold text-sm truncate">{resourceKey}</h2>
          {preview && (
            <span className="font-mono text-[11px] text-muted shrink-0">
              {preview.returned_rows} / {preview.row_count} rows
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setCollapsed((current) => !current)}
            className="text-muted hover:text-ink transition-colors"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
          </button>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onClose}
            className="text-muted hover:text-ink transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6 18 18M6 18 18 6" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={cn(
          'flex flex-col overflow-hidden',
          !collapsed && 'border-t-2 border-black',
          !isResizing && 'transition-[height] duration-300 ease-in-out',
        )}
        style={{ height: collapsed ? 0 : box.height - HEADER_HEIGHT }}
      >
        <div className="flex-1 min-h-0 overflow-auto">
          {isLoading && <p className="text-sm text-muted p-4">Loading preview…</p>}

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
                      <td key={column} className="text-[12px] text-slate px-2.5 py-1 border-b border-line max-w-[160px] truncate">
                        {String(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!isLoading && preview && preview.rows.length === 0 && (
            <p className="text-sm text-muted p-4">This dataset has no rows.</p>
          )}
        </div>

        {preview && preview.row_count > PAGE_SIZE && (
          <div className="h-12 flex items-center justify-center gap-3 border-t-2 border-black bg-white shrink-0">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={offset === 0}
              className="px-3 py-1.5 rounded-lg border-[1.5px] border-black text-xs font-medium text-white bg-brand hover:bg-brand-hover active:scale-[0.97] disabled:opacity-30 disabled:hover:bg-brand transition-all"
            >
              Previous
            </button>
            <span className="flex items-center gap-1.5 text-xs text-muted font-mono">
              Page
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                onBlur={() => goToPage(Number(pageInput) || currentPage)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') goToPage(Number(pageInput) || currentPage)
                }}
                className="w-14 px-1.5 py-0.5 text-center rounded-md border border-line outline-none focus:border-brand transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={offset + PAGE_SIZE >= preview.row_count}
              className="px-3 py-1.5 rounded-lg border-[1.5px] border-black text-xs font-medium text-white bg-brand hover:bg-brand-hover active:scale-[0.97] disabled:opacity-30 disabled:hover:bg-brand transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          <div onPointerDown={(event) => startResize({ x: 'w', y: 'n' }, event)} className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize" />
          <div onPointerDown={(event) => startResize({ x: 'e', y: 'n' }, event)} className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize" />
          <div onPointerDown={(event) => startResize({ x: 'w', y: 's' }, event)} className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize" />
          <div
            onPointerDown={(event) => startResize({ x: 'e', y: 's' }, event)}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5 text-muted"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 1 1 9M9 5 5 9M9 9 9 9" />
            </svg>
          </div>
        </>
      )}
    </div>
  )
}