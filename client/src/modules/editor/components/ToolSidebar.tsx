import { useEffect, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { NodeLibrary } from '@/modules/editor/types'
import { NodePalette } from '@/modules/editor/nodes/components/NodePalette'
import { ResourceSidebarList } from '@/modules/resources/components/ResourceSidebarList'
import { ResourceInspector } from '@/modules/resources/components/ResourceInspector'

type ToolTab = 'nodes' | 'resources'

interface ToolSidebarProps {
  workspaceId: string
  nodeLibrary?: NodeLibrary
}

export function ToolSidebar({ workspaceId, nodeLibrary }: ToolSidebarProps) {
  const [isOpen, setIsOpen] = useState(() => localStorage.getItem('toolSidebar.isOpen') !== 'false')
  const [activeTab, setActiveTab] = useState<ToolTab>(
    () => (localStorage.getItem('toolSidebar.tab') as ToolTab | null) ?? 'nodes',
  )
  const [activeResourceKey, setActiveResourceKey] = useState<string | null>(() =>
    localStorage.getItem(`toolSidebar.activeResourceKey:${workspaceId}`),
  )

  useEffect(() => {
    localStorage.setItem('toolSidebar.isOpen', String(isOpen))
  }, [isOpen])

  useEffect(() => {
    localStorage.setItem('toolSidebar.tab', activeTab)
  }, [activeTab])

  useEffect(() => {
    if (activeResourceKey) localStorage.setItem(`toolSidebar.activeResourceKey:${workspaceId}`, activeResourceKey)
    else localStorage.removeItem(`toolSidebar.activeResourceKey:${workspaceId}`)
  }, [workspaceId, activeResourceKey])

  return (
    <>
      <div
        className={cn(
          'my-3 ml-3 border-2 border-black rounded-panel bg-white flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out',
          isOpen ? 'w-[264px]' : 'w-[60px]',
        )}
      >
        <div
          className={cn(
            'flex items-center px-3 py-3 border-b-2 border-black shrink-0',
            isOpen ? 'justify-between' : 'justify-center',
          )}
        >
          {isOpen ? (
            <div className="flex items-center gap-1 bg-cream-soft rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('nodes')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors',
                  activeTab === 'nodes' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
                )}
              >
                Nodes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('resources')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors',
                  activeTab === 'resources' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
                )}
              >
                Resources
              </button>
            </div>
          ) : null}
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

        {activeTab === 'nodes' && <NodePalette workspaceId={workspaceId} nodeLibrary={nodeLibrary} isOpen={isOpen} />}

        {activeTab === 'resources' && (
          <ResourceSidebarList
            workspaceId={workspaceId}
            isOpen={isOpen}
            activeKey={activeResourceKey}
            onSelect={setActiveResourceKey}
            onDeleted={(key) => {
              if (key === activeResourceKey) setActiveResourceKey(null)
            }}
          />
        )}
      </div>

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