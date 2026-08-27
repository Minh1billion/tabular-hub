import { cn } from '@/shared/lib/cn'

interface ResourceListPanelProps {
  keys: string[]
  activeKey: string | null
  onSelect: (key: string) => void
  onImportClick: () => void
  isLoading: boolean
}

export function ResourceListPanel({ keys, activeKey, onSelect, onImportClick, isLoading }: ResourceListPanelProps) {
  return (
    <div className="w-[280px] bg-white border-r border-line flex flex-col p-5">
      <h1 className="font-headline font-semibold text-lg mb-4">Resources</h1>

      <button
        type="button"
        onClick={onImportClick}
        className="w-full flex items-center justify-center gap-2 py-[9px] bg-brand text-[#eff9f4] rounded-lg font-medium text-[13.5px] mb-4.5 transition-colors hover:bg-brand-hover"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Import resource
      </button>

      <div className="flex flex-col gap-0.5 flex-1 overflow-auto">
        {isLoading && <p className="text-xs text-muted px-2.5 py-4">Loading…</p>}

        {!isLoading &&
          keys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-colors font-mono text-[13px] truncate',
                key === activeKey ? 'bg-brand-tint text-[#0f6e4c]' : 'text-ink hover:bg-cream-soft',
              )}
            >
              {key}
            </button>
          ))}

        {!isLoading && keys.length === 0 && (
          <p className="text-xs text-muted px-2.5 py-4">No datasets imported yet.</p>
        )}
      </div>
    </div>
  )
}
