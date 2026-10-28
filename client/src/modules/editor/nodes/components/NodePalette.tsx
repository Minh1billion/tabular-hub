import { useEffect, useMemo, useRef, useState } from 'react'
import { NodeDescriptor, NodeLibrary } from '@/modules/editor/types'
import { useUnregisterNode } from '@/modules/editor/nodes/hooks'
import { NodeTip, useHoverRect } from '@/modules/editor/components/NodeTip'
import { Input } from '@/shared/components/ui/Input'
import { IconButton } from '@/shared/components/ui/IconButton'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { ChevronIcon, PlusIcon, SearchIcon } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/cn'
import { CATEGORY_ORDER, CategoryIcon, NodeCategory, categoryOf } from '../category'
import { RegisterNodeDialog } from './RegisterNodeDialog'
import { usePaletteDrag } from '../lib/usePaletteDrag'

function groupByCategory(descriptors: NodeDescriptor[]) {
  const groups = new Map<NodeCategory, NodeDescriptor[]>()
  for (const descriptor of descriptors) {
    const label = categoryOf(descriptor)
    groups.set(label, [...(groups.get(label) ?? []), descriptor])
  }
  return CATEGORY_ORDER.filter((label) => groups.has(label)).map((label) => [label, groups.get(label)!] as const)
}

interface NodeItemProps {
  descriptor: NodeDescriptor
  category: NodeCategory
  onDelete?: () => void
}

function NodeItem({ descriptor, category, onDelete }: NodeItemProps) {
  const { rect, show, hide } = useHoverRect()
  const required = Object.keys(descriptor.required).filter((key) => key !== 'bucket')
  const { drag, ghost, onPointerDown } = usePaletteDrag({ nodeType: descriptor.type, label: descriptor.type, category, onStart: hide })

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerEnter={(event) => !drag && show(event.currentTarget)}
      onPointerLeave={hide}
      className={cn('pal-item', drag && 'dragging')}
      data-cat={category}
    >
      <span className="cat-tile">
        <CategoryIcon category={category} />
      </span>
      <div className="grow">
        <b>{descriptor.type}</b>
        {required.length > 0 && <small>{required.join(', ')}</small>}
      </div>
      {onDelete && (
        <IconButton size="sm" flat tone="danger" className="x" tip="Delete" aria-label={`Delete custom node ${descriptor.type}`} onClick={onDelete}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <path d="M6 6 18 18M6 18 18 6" />
          </svg>
        </IconButton>
      )}
      {ghost}
      {rect && !drag && <NodeTip rect={rect} prefer="right" label={descriptor.type} nodeType={descriptor.type} category={category} descriptor={descriptor} />}
    </div>
  )
}

interface GroupProps {
  category: NodeCategory
  count: number
  open: boolean
  onToggle: () => void
  action?: React.ReactNode
  children: React.ReactNode
}

function Group({ category, count, open, onToggle, action, children }: GroupProps) {
  return (
    <section className="pal-group" data-cat={category}>
      <div className="pal-head">
        <button type="button" className="pal-toggle" aria-expanded={open} onClick={onToggle}>
          <ChevronIcon className={cn('chev', open && 'open')} />
          <span className="cat-tile">
            <CategoryIcon category={category} />
          </span>
          <span>{category}</span>
          <em>{count}</em>
        </button>
        {action}
      </div>
      {open && <div className="pal-list">{children}</div>}
    </section>
  )
}

interface NodePaletteProps {
  workspaceId: string
  nodeLibrary?: NodeLibrary
}

export function NodePalette({ workspaceId, nodeLibrary }: NodePaletteProps) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [search, setSearch] = useState('')
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const [deletingNodeName, setDeletingNodeName] = useState<string | null>(null)
  const unregisterNode = useUnregisterNode(workspaceId)
  const searchRef = useRef<HTMLInputElement>(null)

  const query = search.trim().toLowerCase()
  const builtin = useMemo(() => nodeLibrary?.builtin.filter((d) => d.type.includes(query)) ?? [], [nodeLibrary, query])
  const custom = useMemo(() => nodeLibrary?.custom.filter((d) => d.type.includes(query)) ?? [], [nodeLibrary, query])
  const grouped = useMemo(() => groupByCategory(builtin), [builtin])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== '/' || (event.target as HTMLElement).closest('input, textarea, select')) return
      event.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function toggle(label: string) {
    setClosed((current) => {
      const next = new Set(current)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  function isOpen(label: string) {
    return query !== '' || !closed.has(label)
  }

  function confirmDelete() {
    if (!deletingNodeName) return
    unregisterNode.mutate(deletingNodeName, { onSuccess: () => setDeletingNodeName(null) })
  }

  const empty = query !== '' && grouped.length === 0 && custom.length === 0

  return (
    <>
      <div className="pal-search">
        <SearchIcon />
        <Input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return
            setSearch('')
            e.currentTarget.blur()
          }}
          placeholder="Search nodes"
        />
        {search ? (
          <button type="button" className="pal-clear" aria-label="Clear search" onClick={() => setSearch('')}>
            ×
          </button>
        ) : (
          <kbd>/</kbd>
        )}
      </div>

      <div className="ed-side-scroll">
        {grouped.map(([label, list]) => (
          <Group key={label} category={label} count={list.length} open={isOpen(label)} onToggle={() => toggle(label)}>
            {list.map((descriptor) => (
              <NodeItem key={descriptor.type} descriptor={descriptor} category={label} />
            ))}
          </Group>
        ))}

        {(query === '' || custom.length > 0) && (
          <Group
            category="Custom"
            count={custom.length}
            open={isOpen('Custom')}
            onToggle={() => toggle('Custom')}
            action={
              <IconButton size="sm" tip="New custom node" tipSide="left" onClick={() => setIsRegistering(true)}>
                <PlusIcon className="w-3.5 h-3.5" />
              </IconButton>
            }
          >
            {custom.map((descriptor) => (
              <NodeItem key={descriptor.type} descriptor={descriptor} category="Custom" onDelete={() => setDeletingNodeName(descriptor.type)} />
            ))}
            {custom.length === 0 && <p className="hint m-0">No custom nodes yet.</p>}
          </Group>
        )}

        {empty && <p className="hint m-0">No nodes match “{search}”.</p>}
      </div>

      {isRegistering && <RegisterNodeDialog workspaceId={workspaceId} onClose={() => setIsRegistering(false)} />}

      {deletingNodeName && (
        <ConfirmDialog
          title={`Delete custom node "${deletingNodeName}"?`}
          description={`The custom node "${deletingNodeName}" will be permanently removed from this workspace. Any pipeline nodes using it will no longer function.`}
          confirmLabel="Delete node"
          onConfirm={confirmDelete}
          onCancel={() => setDeletingNodeName(null)}
          isLoading={unregisterNode.isPending}
        />
      )}
    </>
  )
}
