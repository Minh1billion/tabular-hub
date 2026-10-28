import { PointerEvent as ReactPointerEvent, ReactNode, useEffect, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { IconButton } from '@/shared/components/ui/IconButton'
import { ChevronIcon, CloseIcon } from '@/shared/components/ui/icons'

const STORAGE_KEY = 'inspector.pos'
const WIDTH = 328
const HEAD_HEIGHT = 40

interface Pos {
  x: number
  y: number
}

function clampPos(x: number, y: number): Pos {
  const top = (document.querySelector('.ed-main')?.getBoundingClientRect().top ?? 0) + 6
  return {
    x: Math.min(window.innerWidth - 120, Math.max(120 - WIDTH, x)),
    y: Math.min(window.innerHeight - HEAD_HEIGHT - 8, Math.max(top, y)),
  }
}

function initialPos(): Pos {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Pos | null
    if (stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)) return clampPos(stored.x, stored.y)
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
  return clampPos(window.innerWidth - WIDTH - 20, 76)
}

interface FloatingInspectorProps {
  children: ReactNode
  onClose: () => void
}

export function FloatingInspector({ children, onClose }: FloatingInspectorProps) {
  const [pos, setPos] = useState(initialPos)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)), [pos])

  useEffect(() => {
    const onResize = () => setPos((current) => clampPos(current.x, current.y))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if ((event.target as HTMLElement).closest('input, select, textarea')) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('button')) return
    event.preventDefault()
    const startX = event.clientX
    const startY = event.clientY
    const start = pos

    function onMove(move: PointerEvent) {
      setPos(clampPos(start.x + move.clientX - startX, start.y + move.clientY - startY))
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div className={cn('fi', collapsed && 'collapsed')} style={{ left: pos.x, top: pos.y, width: WIDTH }}>
      <div className="fi-head" onPointerDown={startDrag}>
        <svg className="fi-grip" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="4" r="1.3" />
          <circle cx="11" cy="4" r="1.3" />
          <circle cx="5" cy="8" r="1.3" />
          <circle cx="11" cy="8" r="1.3" />
          <circle cx="5" cy="12" r="1.3" />
          <circle cx="11" cy="12" r="1.3" />
        </svg>
        <span className="fi-title">Inspector</span>
        <div className="fi-tools">
          <IconButton size="sm" flat className="fold" tip={collapsed ? 'Expand' : 'Collapse'} onClick={() => setCollapsed((current) => !current)}>
            <ChevronIcon />
          </IconButton>
          <IconButton size="sm" flat tip="Close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
      </div>
      <div className="fi-body thin-scrollbar">{children}</div>
    </div>
  )
}
