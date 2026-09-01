import { PointerEvent as ReactPointerEvent, ReactNode, useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'

const STORAGE_KEY_OPEN = 'bottomPanel.isOpen'
const STORAGE_KEY_HEIGHT = 'bottomPanel.height'
const MIN_HEIGHT = 120
const MAX_HEIGHT = 720
const DEFAULT_HEIGHT = 384

interface BottomPanelTab {
  id: string
  label: string
  content: ReactNode
  badge?: boolean
}

interface BottomPanelProps {
  tabs: BottomPanelTab[]
  defaultOpen?: boolean
  activeTabId?: string
  onActiveTabChange?: (tabId: string) => void
}

export function BottomPanel({ tabs, defaultOpen = false, activeTabId: controlledTabId, onActiveTabChange }: BottomPanelProps) {
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY_OPEN)
    return stored !== null ? stored === 'true' : defaultOpen
  })
  const [height, setHeight] = useState(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY_HEIGHT))
    return stored >= MIN_HEIGHT && stored <= MAX_HEIGHT ? stored : DEFAULT_HEIGHT
  })
  const [internalTabId, setInternalTabId] = useState(tabs[0]?.id)
  const activeTabId = controlledTabId ?? internalTabId
  const resizing = useRef(false)
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_OPEN, String(isOpen))
  }, [isOpen])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HEIGHT, String(height))
  }, [height])

  function selectTab(tabId: string) {
    setInternalTabId(tabId)
    onActiveTabChange?.(tabId)
  }

  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault()
    resizing.current = true
    setIsResizing(true)
    const startY = event.clientY
    const startHeight = height

    function onMove(moveEvent: PointerEvent) {
      if (!resizing.current) return
      const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + (startY - moveEvent.clientY)))
      setHeight(next)
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
    <div className="shrink-0 mx-3 mb-3 border-2 border-black rounded-panel bg-white flex flex-col overflow-hidden">
      <div className="h-8 flex items-center px-2 gap-1 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              selectTab(tab.id)
              setIsOpen(true)
            }}
            className={cn(
              'px-2.5 h-full text-[12px] font-medium border-b-2 transition-colors',
              isOpen && activeTabId === tab.id
                ? 'border-brand text-ink'
                : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {tab.label}
            {tab.badge && <span className="inline-block w-1.5 h-1.5 rounded-full bg-warn ml-1.5 align-middle" />}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="text-muted hover:text-ink transition-colors p-1"
        >
          <svg
            className={cn('w-3.5 h-3.5 transition-transform', isOpen ? 'rotate-180' : '')}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      <div
        className={cn(
          'flex flex-col overflow-hidden',
          isOpen && 'border-t-2 border-black',
          !isResizing && 'transition-[height] duration-300 ease-in-out',
        )}
        style={{ height: isOpen ? height : 0 }}
      >
        <div onPointerDown={startResize} className="h-1 shrink-0 cursor-row-resize hover:bg-brand/40" />
        <div className="flex-1 min-h-0 overflow-auto">
          {tabs.map((tab) => (
            <div key={tab.id} className={tab.id === activeTabId ? 'h-full' : 'hidden'}>
              {tab.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}