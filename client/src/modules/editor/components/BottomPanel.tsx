import { ReactNode, useState } from 'react'
import { cn } from '@/shared/lib/cn'

interface BottomPanelTab {
  id: string
  label: string
  content: ReactNode
}

interface BottomPanelProps {
  tabs: BottomPanelTab[]
  defaultOpen?: boolean
  activeTabId?: string
  onActiveTabChange?: (tabId: string) => void
}

export function BottomPanel({ tabs, defaultOpen = false, activeTabId: controlledTabId, onActiveTabChange }: BottomPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [internalTabId, setInternalTabId] = useState(tabs[0]?.id)
  const activeTabId = controlledTabId ?? internalTabId

  function selectTab(tabId: string) {
    setInternalTabId(tabId)
    onActiveTabChange?.(tabId)
  }

  return (
    <div className="shrink-0 bg-white border-t border-line flex flex-col">
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

      {isOpen && (
        <div className="h-96 border-t border-line overflow-auto">
          {tabs.map((tab) => (
            <div key={tab.id} className={tab.id === activeTabId ? 'h-full' : 'hidden'}>
              {tab.content}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}