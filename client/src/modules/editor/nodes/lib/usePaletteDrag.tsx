import { CSSProperties, PointerEvent as ReactPointerEvent, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/lib/cn'
import { CategoryIcon } from '../category'

export const NODE_DROP_EVENT = 'palette-node-drop'

export interface PaletteDrop {
  nodeType: string
  label?: string
  params?: Record<string, unknown>
  x: number
  y: number
  width: number
}

interface DragState {
  x: number
  y: number
  over: boolean
}

interface Options {
  nodeType: string
  label: string
  category: string
  params?: Record<string, unknown>
  onStart?: () => void
}

function ghostWidth(label: string) {
  return Math.min(232, Math.max(156, 65 + label.length * 7.5))
}

export function usePaletteDrag({ nodeType, label, category, params, onStart }: Options) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const width = ghostWidth(label)

  function onPointerDown(event: ReactPointerEvent) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return
    const startX = event.clientX
    const startY = event.clientY
    let active = false

    const isOver = (x: number, y: number) => !!document.elementFromPoint(x, y)?.closest('.ed-canvas')

    const move = (e: PointerEvent) => {
      if (!active && Math.hypot(e.clientX - startX, e.clientY - startY) < 5) return
      if (!active) {
        active = true
        onStart?.()
        document.body.classList.add('pal-dragging')
      }
      setDrag({ x: e.clientX, y: e.clientY, over: isOver(e.clientX, e.clientY) })
    }

    const end = (e: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      document.body.classList.remove('pal-dragging')
      if (active) {
        const swallow = (ev: Event) => ev.stopPropagation()
        window.addEventListener('click', swallow, { capture: true, once: true })
        window.setTimeout(() => window.removeEventListener('click', swallow, true), 0)
        if (e.type === 'pointerup' && isOver(e.clientX, e.clientY)) {
          window.dispatchEvent(
            new CustomEvent<PaletteDrop>(NODE_DROP_EVENT, { detail: { nodeType, label, params, x: e.clientX, y: e.clientY, width } }),
          )
        }
      }
      setDrag(null)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  const ghost = drag
    ? createPortal(
        <div className={cn('pn-ghost', drag.over && 'over')} data-cat={category} style={{ left: drag.x, top: drag.y, '--w': `${width}px` } as CSSProperties}>
          <span className="pn-icon cat-tile">
            <CategoryIcon category={category} />
          </span>
          <span className="pn-ghost-title">{label}</span>
        </div>,
        document.body,
      )
    : null

  return { drag, ghost, onPointerDown }
}
