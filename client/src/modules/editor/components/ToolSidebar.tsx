import { ComponentType, SVGProps, useEffect, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { NodeLibrary } from '@/modules/editor/types'
import { useHotkeys } from '@/shared/hooks/useHotkeys'
import { bind } from '../shortcuts'
import { EdgeToggle } from '@/shared/components/ui/EdgeToggle'
import { NodesIcon, TableIcon } from '@/shared/components/ui/icons'
import { NodePalette } from '@/modules/editor/nodes/components/NodePalette'
import { ResourceSidebarList } from '@/modules/resources/components/ResourceSidebarList'
import { ResourceInspector } from '@/modules/resources/components/ResourceInspector'

type ToolTab = 'nodes' | 'resources'

const TABS: { id: ToolTab; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: 'nodes', label: 'Nodes', Icon: NodesIcon },
  { id: 'resources', label: 'Resources', Icon: TableIcon },
]

interface ToolSidebarProps {
  workspaceId: string
  nodeLibrary?: NodeLibrary
}

export function ToolSidebar({ workspaceId, nodeLibrary }: ToolSidebarProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<ToolTab>(() => (localStorage.getItem('toolSidebar.tab') as ToolTab | null) ?? 'nodes')
  const [activeResourceKey, setActiveResourceKey] = useState<string | null>(() =>
    localStorage.getItem(`toolSidebar.activeResourceKey:${workspaceId}`),
  )

  useEffect(() => localStorage.setItem('toolSidebar.tab', activeTab), [activeTab])
  useEffect(() => {
    if (activeResourceKey) localStorage.setItem(`toolSidebar.activeResourceKey:${workspaceId}`, activeResourceKey)
    else localStorage.removeItem(`toolSidebar.activeResourceKey:${workspaceId}`)
  }, [workspaceId, activeResourceKey])

  useHotkeys(bind('sidebar', () => setIsOpen((open) => !open)))

  function selectTab(tab: ToolTab) {
    if (isOpen && activeTab === tab) {
      setIsOpen(false)
      return
    }
    setActiveTab(tab)
    setIsOpen(true)
  }

  const current = TABS.find((tab) => tab.id === activeTab) ?? TABS[0]

  return (
    <>
      <aside className={cn('ed-tools', !isOpen && 'closed')}>
        <EdgeToggle collapsed={!isOpen} onClick={() => setIsOpen((open) => !open)} label={isOpen ? 'Collapse panel' : 'Expand panel'} />
        <nav className="tool-rail" aria-label="Editor tools">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={cn('tool-rail-btn tip-host', isOpen && activeTab === id && 'on')}
              data-tip={label}
              data-side="right"
              aria-label={label}
              aria-pressed={isOpen && activeTab === id}
              onClick={() => selectTab(id)}
            >
              <Icon />
            </button>
          ))}
        </nav>

        <div className="tool-panel" aria-hidden={!isOpen}>
          <div className="tool-panel-inner">
            <header className="tool-panel-head">
              <current.Icon />
              <h3>{current.label}</h3>
            </header>
            <div className="tool-panel-body">
              {activeTab === 'nodes' && <NodePalette workspaceId={workspaceId} nodeLibrary={nodeLibrary} />}
              {activeTab === 'resources' && (
                <ResourceSidebarList
                  workspaceId={workspaceId}
                  activeKey={activeResourceKey}
                  onSelect={setActiveResourceKey}
                  onDeleted={(key) => {
                    if (key === activeResourceKey) setActiveResourceKey(null)
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </aside>

      {activeResourceKey && (
        <ResourceInspector
          key={activeResourceKey}
          workspaceId={workspaceId}
          resourceKey={activeResourceKey}
          onClose={() => setActiveResourceKey(null)}
        />
      )}
    </>
  )
}
