import { PointerEvent as ReactPointerEvent, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/components/ui/Button'
import { IconButton } from '@/shared/components/ui/IconButton'
import { ChevronIcon, CloseIcon, TableIcon } from '@/shared/components/ui/icons'
import { useResourcePreview } from '../hooks'
import { DataTable } from './DataTable'

const PAGE_SIZE = 20
const MIN_WIDTH = 360
const MIN_HEIGHT = 240
const HEADER_HEIGHT = 50

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
  const [box, setBox] = useState(() => {
    const width = Math.min(640, window.innerWidth - 32)
    return { x: Math.max(16, window.innerWidth - 16 - width), y: 80, width, height: 480 }
  })
  const [isResizing, setIsResizing] = useState(false)
  const dragging = useRef(false)
  const resizing = useRef(false)

  const { data: preview, isLoading } = useResourcePreview(workspaceId, resourceKey, PAGE_SIZE, offset)
  const totalPages = preview ? Math.max(1, Math.ceil(preview.row_count / PAGE_SIZE)) : 1
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  function goToPage(page: number) {
    const clamped = Math.min(totalPages, Math.max(1, page))
    setOffset((clamped - 1) * PAGE_SIZE)
    setPageInput(String(clamped))
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('button')) return
    event.preventDefault()
    dragging.current = true
    const startX = event.clientX
    const startY = event.clientY
    const start = box

    function onMove(moveEvent: PointerEvent) {
      if (!dragging.current) return
      const x = start.x + (moveEvent.clientX - startX)
      const y = start.y + (moveEvent.clientY - startY)
      setBox((current) => ({
        ...current,
        x: Math.min(window.innerWidth - 120, Math.max(120 - current.width, x)),
        y: Math.min(window.innerHeight - HEADER_HEIGHT - 8, Math.max(8, y)),
      }))
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
      className={cn('ri', collapsed && 'collapsed')}
      style={{ left: box.x, top: box.y, width: box.width, maxHeight: 'calc(100vh - 32px)' }}
    >
      <div className="ri-head" onPointerDown={startDrag}>
        <div className="ri-title">
          <span className="cat-tile" data-cat="IO">
            <TableIcon />
          </span>
          <h2>{resourceKey}</h2>
          {preview && (
            <span className="ri-meta">
              {preview.returned_rows} / {preview.row_count} rows
            </span>
          )}
        </div>
        <div className="ri-tools">
          <IconButton size="sm" flat className="fold" tip={collapsed ? 'Expand' : 'Collapse'} onClick={() => setCollapsed((current) => !current)}>
            <ChevronIcon />
          </IconButton>
          <IconButton size="sm" flat tip="Close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
      </div>

      <div className={cn('ri-body', !isResizing && 'animate')} style={{ height: collapsed ? 0 : box.height - HEADER_HEIGHT }}>
        <div className="ri-scroll thin-scrollbar">
          {isLoading && (
            <div className="ri-skel">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="skeleton" />
              ))}
            </div>
          )}

          {!isLoading && preview && preview.rows.length > 0 && <DataTable rows={preview.rows} offset={offset} />}

          {!isLoading && preview && preview.rows.length === 0 && <p className="ri-state">This dataset has no rows.</p>}
        </div>

        {preview && preview.row_count > PAGE_SIZE && (
          <div className="ri-foot">
            <Button type="button" variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={offset === 0}>
              Previous
            </Button>
            <span className="page-jump">
              Page
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageInput}
                className="input"
                onChange={(event) => setPageInput(event.target.value)}
                onBlur={() => goToPage(Number(pageInput) || currentPage)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') goToPage(Number(pageInput) || currentPage)
                }}
              />
              of {totalPages}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={offset + PAGE_SIZE >= preview.row_count}>
              Next
            </Button>
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="ri-h nw" onPointerDown={(event) => startResize({ x: 'w', y: 'n' }, event)} />
          <div className="ri-h ne" onPointerDown={(event) => startResize({ x: 'e', y: 'n' }, event)} />
          <div className="ri-h sw" onPointerDown={(event) => startResize({ x: 'w', y: 's' }, event)} />
          <div className="ri-h se" onPointerDown={(event) => startResize({ x: 'e', y: 's' }, event)}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M9 1 1 9M9 5 5 9" />
            </svg>
          </div>
        </>
      )}
    </div>
  )
}
