import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/lib/cn'
import { NodeDescriptor } from '@/modules/editor/types'
import { CategoryIcon } from '../nodes/category'

const GAP = 12
const EDGE = 8
const MAX_LIBRARY_ROWS = 6

export function useHoverRect(delay = 40) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const timer = useRef<number>()

  const hide = useCallback(() => {
    window.clearTimeout(timer.current)
    setRect(null)
  }, [])

  const show = useCallback(
    (element: Element) => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setRect(element.getBoundingClientRect()), delay)
    },
    [delay],
  )

  useEffect(() => {
    if (!rect) return
    window.addEventListener('wheel', hide, { passive: true })
    window.addEventListener('pointerdown', hide)
    return () => {
      window.removeEventListener('wheel', hide)
      window.removeEventListener('pointerdown', hide)
    }
  }, [rect, hide])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return { rect, show, hide }
}

function preview(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return text.length > 22 ? `${text.slice(0, 21)}…` : text
}

type Placement = 'below' | 'above' | 'right' | 'left'

interface Position {
  x: number
  y: number
  placement: Placement
  arrow: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function compute(rect: DOMRect, width: number, height: number, prefer: 'below' | 'right'): Position {
  const vw = window.innerWidth
  const vh = window.innerHeight

  if (prefer === 'right') {
    const fitsRight = rect.right + GAP + width <= vw - EDGE
    const x = fitsRight ? rect.right + GAP : Math.max(EDGE, rect.left - GAP - width)
    const y = clamp(rect.top + rect.height / 2 - height / 2, EDGE, Math.max(EDGE, vh - height - EDGE))
    return { x, y, placement: fitsRight ? 'right' : 'left', arrow: clamp(rect.top + rect.height / 2 - y, 18, height - 18) }
  }

  const fitsBelow = rect.bottom + GAP + height <= vh - EDGE
  const x = clamp(rect.left, EDGE, Math.max(EDGE, vw - width - EDGE))
  const y = fitsBelow ? rect.bottom + GAP : Math.max(EDGE, rect.top - GAP - height)
  return { x, y, placement: fitsBelow ? 'below' : 'above', arrow: clamp(rect.left + rect.width / 2 - x, 18, width - 18) }
}

interface NodeTipProps {
  rect: DOMRect
  prefer?: 'below' | 'right'
  label: string
  nodeType: string
  category: string
  descriptor?: NodeDescriptor
  params?: Record<string, unknown>
  hasError?: boolean
  errorMessages?: string[]
}

export function NodeTip({ rect, prefer = 'below', label, nodeType, category, descriptor, params, hasError, errorMessages }: NodeTipProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<Position | null>(null)

  const isLibrary = params === undefined
  const required = descriptor ? Object.entries(descriptor.required).filter(([key]) => key !== 'bucket') : []
  const optional = descriptor ? Object.entries(descriptor.optional) : []
  const missing = isLibrary ? 0 : required.filter(([key]) => preview(params[key]) === null).length
  const optionalSet = isLibrary ? 0 : optional.filter(([key]) => preview(params[key]) !== null).length
  const inPorts = descriptor?.fan_in ? descriptor.in_ports ?? ['a', 'b'] : ['in']
  const outPorts = descriptor?.ports_out.length ? descriptor.ports_out : ['out']
  const status = hasError ? 'err' : missing > 0 ? 'warn' : 'ok'
  const statusLabel = status === 'err' ? 'Error' : status === 'warn' ? 'Needs setup' : 'Ready'
  const libraryOptional = optional.slice(0, Math.max(0, MAX_LIBRARY_ROWS - required.length))

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    setPosition(compute(rect, element.offsetWidth, element.offsetHeight, prefer))
  }, [rect, prefer])

  const style = position
    ? ({ left: position.x, top: position.y, '--arrow': `${position.arrow}px` } as React.CSSProperties)
    : undefined

  return createPortal(
    <div ref={ref} role="tooltip" data-cat={category} className={cn('ntip', position && 'ready', position?.placement)} style={style}>
      <span className="ntip-arrow" />

      <div className="ntip-head">
        <span className="cat-tile">
          <CategoryIcon category={category} />
        </span>
        <div className="ntip-id">
          <strong>{label}</strong>
          <small>{nodeType}</small>
        </div>
        {!isLibrary && <span className={cn('ntip-status', status)}>{statusLabel}</span>}
      </div>

      {required.length > 0 && (
        <div className="ntip-sec">
          <h4>{isLibrary ? 'Required' : 'Params'}</h4>
          {required.map(([key, type]) => {
            const shown = isLibrary ? type : preview(params[key])
            return (
              <div key={key} className="ntip-row">
                <span className="ntip-key">{key}</span>
                {shown ? <span className={cn('ntip-val', isLibrary && 'type')}>{shown}</span> : <span className="ntip-val miss">not set</span>}
              </div>
            )
          })}
        </div>
      )}

      {isLibrary && libraryOptional.length > 0 && (
        <div className="ntip-sec">
          <h4>Optional</h4>
          {libraryOptional.map(([key, type]) => (
            <div key={key} className="ntip-row">
              <span className="ntip-key">{key}</span>
              <span className="ntip-val type">{type}</span>
            </div>
          ))}
          {optional.length > libraryOptional.length && <div className="ntip-more">+{optional.length - libraryOptional.length} more</div>}
        </div>
      )}

      {!isLibrary && optionalSet > 0 && (
        <div className="ntip-sec">
          <div className="ntip-row">
            <span className="ntip-key">optional</span>
            <span className="ntip-val">{optionalSet} set</span>
          </div>
        </div>
      )}

      <div className="ntip-io">
        <div>
          <h4>In</h4>
          <div className="ntip-ports">
            {inPorts.map((port) => (
              <span key={port} className="ntip-port">
                {port}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h4>Out</h4>
          <div className="ntip-ports">
            {outPorts.map((port) => (
              <span key={port} className="ntip-port">
                {port}
              </span>
            ))}
          </div>
        </div>
      </div>

      {hasError && (
        <div className="ntip-warn">
          {errorMessages && errorMessages.length > 0 ? (
            <>
              {errorMessages.slice(0, 2).map((message, index) => (
                <p key={index}>{message}</p>
              ))}
              {errorMessages.length > 2 && <small>+{errorMessages.length - 2} more in the Errors tab</small>}
            </>
          ) : (
            'Needs attention — see the Errors tab.'
          )}
        </div>
      )}
    </div>,
    document.body,
  )
}
