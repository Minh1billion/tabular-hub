import { useMemo, useState } from 'react'
import { NodeDescriptor, NodeLibrary } from '@/modules/editor/types'
import { useUnregisterNode } from '@/modules/editor/nodes/hooks'
import { Input } from '@/shared/components/ui/Input'
import { cn } from '@/shared/lib/cn'
import { RegisterNodeDialog } from './RegisterNodeDialog'

export const NODE_DRAG_MIME = 'application/tabular-node-type'

const CATEGORY_ORDER = ['IO', 'Transform', 'Merge']

function categoryOf(descriptor: NodeDescriptor): string {
  if (descriptor.fan_in) return 'Merge'
  if (descriptor.type.startsWith('fetch_') || descriptor.type.startsWith('push_')) return 'IO'
  return 'Transform'
}

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 } as const
  switch (category) {
    case 'IO':
      return (
        <svg className={className} {...common}>
          <path d="M12 3v12" strokeLinecap="round" />
          <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 19h16" strokeLinecap="round" />
        </svg>
      )
    case 'Merge':
      return (
        <svg className={className} {...common}>
          <circle cx="6" cy="6" r="2" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="12" r="2" />
          <path d="M6 8v3a5 5 0 0 0 5 5h1" strokeLinecap="round" />
          <path d="M6 16v-3" strokeLinecap="round" />
          <path d="M14 12h2" strokeLinecap="round" />
        </svg>
      )
    case 'Custom':
      return (
        <svg className={className} {...common}>
          <path d="M4 8h3.5a1.5 1.5 0 0 0 0-3A1.5 1.5 0 0 1 9 3.5 1.5 1.5 0 0 1 10.5 5H14a1 1 0 0 1 1 1v3.5a1.5 1.5 0 0 0 3 0A1.5 1.5 0 0 1 19.5 11 1.5 1.5 0 0 1 21 12.5a1.5 1.5 0 0 1-1.5 1.5 1.5 1.5 0 0 0 0 3A1.5 1.5 0 0 1 21 18.5 1.5 1.5 0 0 1 19.5 20H4v-3.5a1.5 1.5 0 0 1 1.5-1.5 1.5 1.5 0 0 0 0-3A1.5 1.5 0 0 1 4 10.5Z" strokeLinejoin="round" />
        </svg>
      )
    default:
      // Transform
      return (
        <svg className={className} {...common}>
          <path d="M4 6h10" strokeLinecap="round" />
          <circle cx="17" cy="6" r="2" />
          <path d="M20 18H10" strokeLinecap="round" />
          <circle cx="7" cy="18" r="2" />
          <path d="M4 12h5" strokeLinecap="round" />
          <path d="M15 12h5" strokeLinecap="round" />
        </svg>
      )
  }
}

function groupByCategory(descriptors: NodeDescriptor[]) {
  const groups = new Map<string, NodeDescriptor[]>()
  for (const descriptor of descriptors) {
    const label = categoryOf(descriptor)
    const list = groups.get(label) ?? []
    list.push(descriptor)
    groups.set(label, list)
  }
  return CATEGORY_ORDER.filter((label) => groups.has(label)).map((label) => [label, groups.get(label)!] as const)
}

interface NodePaletteProps {
  workspaceId: string
  nodeLibrary?: NodeLibrary
}

function NodeItem({ descriptor, category }: { descriptor: NodeDescriptor; category: string }) {
  return (
    <div
      draggable
      title={descriptor.type}
      onDragStart={(event) => {
        event.dataTransfer.setData(NODE_DRAG_MIME, descriptor.type)
        event.dataTransfer.effectAllowed = 'move'
      }}
      className="flex items-start gap-2 px-2.5 py-2 min-h-[42px] rounded-lg border border-line bg-white cursor-grab active:cursor-grabbing hover:border-brand transition-colors"
    >
      <CategoryIcon category={category} className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted" />
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[10px] tracking-wide text-muted uppercase truncate">{descriptor.type}</div>
        {Object.keys(descriptor.required).length > 0 && (
          <div className="text-[11px] text-slate truncate mt-0.5">
            {Object.keys(descriptor.required).join(', ')}
          </div>
        )}
      </div>
    </div>
  )
}

function CustomNodeItem({
  descriptor,
  onDelete,
  isDeleting,
}: {
  descriptor: NodeDescriptor
  onDelete: (name: string) => void
  isDeleting: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        draggable
        title={descriptor.type}
        onDragStart={(event) => {
          event.dataTransfer.setData(NODE_DRAG_MIME, descriptor.type)
          event.dataTransfer.effectAllowed = 'move'
        }}
        className="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-2 min-h-[42px] rounded-lg border border-line bg-white cursor-grab active:cursor-grabbing hover:border-brand transition-colors"
      >
        <CategoryIcon category="Custom" className="w-3.5 h-3.5 shrink-0 text-muted" />
        <div className="font-mono text-[10px] tracking-wide text-muted uppercase truncate">{descriptor.type}</div>
      </div>
      <button
        type="button"
        onClick={() => onDelete(descriptor.type)}
        disabled={isDeleting}
        className="text-muted hover:text-warn transition-colors disabled:opacity-50 shrink-0"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6 18 18M6 18 18 6" />
        </svg>
      </button>
    </div>
  )
}

export function NodePalette({ workspaceId, nodeLibrary }: NodePaletteProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isRegistering, setIsRegistering] = useState(false)
  const [search, setSearch] = useState('')
  const unregisterNode = useUnregisterNode(workspaceId)

  const query = search.trim().toLowerCase()
  const filteredBuiltin = useMemo(
    () => nodeLibrary?.builtin.filter((descriptor) => descriptor.type.includes(query)) ?? [],
    [nodeLibrary, query],
  )
  const filteredCustom = useMemo(
    () => nodeLibrary?.custom.filter((descriptor) => descriptor.type.includes(query)) ?? [],
    [nodeLibrary, query],
  )
  const groupedBuiltin = useMemo(() => groupByCategory(filteredBuiltin), [filteredBuiltin])
  const allDescriptors = useMemo(
    () => [
      ...groupedBuiltin.flatMap(([label, descriptors]) => descriptors.map((d) => ({ descriptor: d, category: label }))),
      ...filteredCustom.map((d) => ({ descriptor: d, category: 'Custom' })),
    ],
    [groupedBuiltin, filteredCustom],
  )

  return (
    <div
      className={cn(
        'my-3 ml-3 border-2 border-black rounded-panel bg-white flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out',
        isOpen ? 'w-[264px]' : 'w-[60px]',
      )}
    >
      <div
        className={cn(
          'flex items-center px-4 py-3 border-b-2 border-black shrink-0',
          isOpen ? 'justify-between' : 'justify-center',
        )}
      >
        <h2
          className={cn(
            'font-headline font-semibold text-sm whitespace-nowrap overflow-hidden transition-all duration-200 ease-in-out',
            isOpen ? 'max-w-[180px] opacity-100' : 'max-w-0 opacity-0',
          )}
        >
          Node library
        </h2>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="text-muted hover:text-ink transition-colors shrink-0"
        >
          <svg
            className={cn('w-3.5 h-3.5 transition-transform', isOpen ? '' : 'rotate-180')}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
      </div>

      <div
        className={cn(
          'thin-scrollbar flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col items-center gap-2 px-2.5 py-3 transition-opacity duration-200 ease-in-out',
          isOpen ? 'hidden opacity-0 pointer-events-none' : 'flex opacity-100',
        )}
      >
        {allDescriptors.map(({ descriptor, category }) => (
          <div
            key={descriptor.type}
            draggable
            title={descriptor.type}
            onDragStart={(event) => {
              event.dataTransfer.setData(NODE_DRAG_MIME, descriptor.type)
              event.dataTransfer.effectAllowed = 'move'
            }}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border border-line bg-white cursor-grab active:cursor-grabbing hover:border-brand hover:text-brand transition-colors text-muted"
          >
            <CategoryIcon category={category} className="w-3.5 h-3.5" />
          </div>
        ))}
        {allDescriptors.length === 0 && <div className="w-1.5 h-1.5 rounded-full bg-line mt-1" />}
      </div>

      <div
        className={cn(
          'w-full shrink-0 flex-1 min-h-0 overflow-auto p-4 transition-opacity duration-200 ease-in-out',
          isOpen ? 'opacity-100' : 'hidden opacity-0 pointer-events-none',
        )}
      >
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search nodes…"
          className="mb-4"
        />

        {groupedBuiltin.map(([label, descriptors]) => (
          <div key={label} className="mb-5">
            <div className="flex items-center gap-1.5 mb-2">
              <CategoryIcon category={label} className="w-3 h-3 text-muted shrink-0" />
              <div className="font-mono text-[10px] tracking-wide text-muted uppercase">{label}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              {descriptors.map((descriptor) => (
                <NodeItem key={descriptor.type} descriptor={descriptor} category={label} />
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <CategoryIcon category="Custom" className="w-3 h-3 text-muted shrink-0" />
            <div className="font-mono text-[10px] tracking-wide text-muted uppercase">Custom</div>
          </div>
          <button type="button" onClick={() => setIsRegistering(true)} className="text-muted hover:text-brand transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          {filteredCustom.map((descriptor) => (
            <CustomNodeItem
              key={descriptor.type}
              descriptor={descriptor}
              onDelete={(name) => unregisterNode.mutate(name)}
              isDeleting={unregisterNode.isPending && unregisterNode.variables === descriptor.type}
            />
          ))}
        </div>
      </div>

      {isRegistering && (
        <RegisterNodeDialog workspaceId={workspaceId} onClose={() => setIsRegistering(false)} />
      )}
    </div>
  )
}