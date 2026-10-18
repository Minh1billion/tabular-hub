import { PointerEvent as ReactPointerEvent, ReactNode, useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { IconButton } from '@/shared/components/ui/IconButton'
import { ChevronIcon } from '@/shared/components/ui/icons'

const STORAGE_KEY_HEIGHT = 'bottomPanel.height'
const MIN_HEIGHT = 140
const MAX_HEIGHT = 720
const DEFAULT_HEIGHT = 300

export interface BottomPanelTab {
  id: string
  label: string
  content: ReactNode
  badge?: boolean
  icon?: ReactNode
}

interface BottomPanelProps {
  tabs: BottomPanelTab[]
  open: boolean
  onOpenChange: (open: boolean) => void
  activeTabId: string
  onActiveTabChange: (tabId: string) => void
}

export function BottomPanel({ tabs, open, onOpenChange, activeTabId, onActiveTabChange }: BottomPanelProps) {
  const [height, setHeight] = useState(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY_HEIGHT))
    return stored >= MIN_HEIGHT && stored <= MAX_HEIGHT ? stored : DEFAULT_HEIGHT
  })
  const [resizing, setResizing] = useState(false)

  useEffect(() => localStorage.setItem(STORAGE_KEY_HEIGHT, String(height)), [height])

  const maxAllowed = useRef(MAX_HEIGHT)

  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault()
    setResizing(true)
    maxAllowed.current = Math.min(MAX_HEIGHT, window.innerHeight - 220)
    const startY = event.clientY
    const startHeight = height

    function onMove(e: PointerEvent) {
      setHeight(Math.min(maxAllowed.current, Math.max(MIN_HEIGHT, startHeight + (startY - e.clientY))))
    }
    function onUp() {
      setResizing(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <section className="dock" aria-label="Panel">
      {open && <div className={cn('dock-grip', resizing && 'active')} onPointerDown={startResize} />}

      <div className="dock-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn('dock-tab', open && activeTabId === tab.id && 'on')}
            onClick={() => {
              if (open && activeTabId === tab.id) {
                onOpenChange(false)
                return
              }
              onActiveTabChange(tab.id)
              onOpenChange(true)
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.badge && <span className="dot" />}
          </button>
        ))}
        <div className="spacer" />
        <IconButton size="sm" flat tip={open ? 'Collapse panel' : 'Expand panel'} onClick={() => onOpenChange(!open)}>
          <ChevronIcon className={cn('w-4 h-4 transition-transform duration-300', !open && 'rotate-180')} />
        </IconButton>
      </div>

      <div className={cn('dock-body', !resizing && 'animate', !open && 'closed')} style={{ height: open ? height : 0 }} aria-hidden={!open}>
        <div className="dock-scroll">
          {tabs.map((tab) => (
            <div key={tab.id} className={tab.id === activeTabId ? 'min-h-full' : 'hidden'}>
              {tab.content}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
