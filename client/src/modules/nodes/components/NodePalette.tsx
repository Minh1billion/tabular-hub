import { useMemo, useState } from 'react'
import { NodeDescriptor, NodeLibrary } from '@/modules/nodes/types'
import { useUnregisterNode } from '@/modules/nodes/hooks'
import { Input } from '@/shared/components/ui/Input'
import { RegisterNodeDialog } from './RegisterNodeDialog'

export const NODE_DRAG_MIME = 'application/tabular-node-type'

const CATEGORY_ORDER = ['IO', 'Transform', 'Merge']

function categoryOf(descriptor: NodeDescriptor): string {
  if (descriptor.fan_in) return 'Merge'
  if (descriptor.type.startsWith('fetch_') || descriptor.type.startsWith('push_')) return 'IO'
  return 'Transform'
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

function NodeItem({ descriptor }: { descriptor: NodeDescriptor }) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(NODE_DRAG_MIME, descriptor.type)
        event.dataTransfer.effectAllowed = 'move'
      }}
      className="px-2.5 py-2 rounded-lg border border-line bg-white cursor-grab active:cursor-grabbing hover:border-brand transition-colors"
    >
      <div className="font-mono text-[10px] tracking-wide text-muted uppercase">{descriptor.type}</div>
      {Object.keys(descriptor.required).length > 0 && (
        <div className="text-[11px] text-slate truncate mt-0.5">
          {Object.keys(descriptor.required).join(', ')}
        </div>
      )}
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
        onDragStart={(event) => {
          event.dataTransfer.setData(NODE_DRAG_MIME, descriptor.type)
          event.dataTransfer.effectAllowed = 'move'
        }}
        className="flex-1 px-2.5 py-2 rounded-lg border border-line bg-white cursor-grab active:cursor-grabbing hover:border-brand transition-colors"
      >
        <div className="font-mono text-[10px] tracking-wide text-muted uppercase">{descriptor.type}</div>
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

  return (
    <div className="w-[240px] bg-white border-r border-line flex flex-col p-4 overflow-auto">
      <h2 className="font-headline font-semibold text-sm mb-3">Node library</h2>

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search nodes…"
        className="mb-4"
      />

      {groupedBuiltin.map(([label, descriptors]) => (
        <div key={label} className="mb-5">
          <div className="font-mono text-[10px] tracking-wide text-muted uppercase mb-2">{label}</div>
          <div className="flex flex-col gap-1.5">
            {descriptors.map((descriptor) => (
              <NodeItem key={descriptor.type} descriptor={descriptor} />
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-[10px] tracking-wide text-muted uppercase">Custom</div>
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

      {isRegistering && (
        <RegisterNodeDialog workspaceId={workspaceId} onClose={() => setIsRegistering(false)} />
      )}
    </div>
  )
}