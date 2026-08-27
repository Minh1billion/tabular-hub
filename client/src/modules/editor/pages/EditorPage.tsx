import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useUpdateWorkspace, useWorkspace } from '@/modules/workspace/hooks'
import { useNodeLibrary } from '@/modules/nodes/hooks'
import { GraphSpec } from '../types'
import { Canvas } from '../components/Canvas'
import { NodePalette } from '../components/NodePalette'
import { BottomPanel } from '../components/BottomPanel'

function emptySpec(name: string): GraphSpec {
  return { name, nodes: [], connections: [] }
}

export function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const workspaceId = id ?? ''
  const { data: workspace, isLoading } = useWorkspace(workspaceId)
  const updateWorkspace = useUpdateWorkspace(workspaceId)
  const { data: nodeLibrary } = useNodeLibrary(workspaceId)

  const [spec, setSpec] = useState<GraphSpec | null>(null)
  const hydratedForRef = useRef<string | null>(null)
  const skipNextSaveRef = useRef(true)

  useEffect(() => {
    if (workspace && hydratedForRef.current !== workspace.id) {
      setSpec(workspace.spec ?? emptySpec(workspace.name))
      hydratedForRef.current = workspace.id
      skipNextSaveRef.current = true
    }
  }, [workspace])

  const debouncedSpec = useDebounce(spec, 500)

  useEffect(() => {
    if (!debouncedSpec) return
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }
    updateWorkspace.mutate({ spec: debouncedSpec })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSpec])

  if (isLoading || !spec) {
    return <div className="h-full flex items-center justify-center text-sm text-muted">Loading workspace…</div>
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 flex items-center gap-3 px-5 border-b border-line bg-white shrink-0">
        <Link to="/workspaces" className="text-sm text-muted hover:text-ink transition-colors">
          Workspaces
        </Link>
        <span className="text-muted">/</span>
        <span className="text-sm font-medium text-ink truncate">{workspace?.name}</span>
        <div className="flex-1" />
        <span className="font-mono text-[11px] text-muted">
          {updateWorkspace.isPending ? 'Saving…' : 'Saved'}
        </span>
      </div>

      <div className="flex-1 min-h-0 flex">
        <NodePalette workspaceId={workspaceId} nodeLibrary={nodeLibrary} />
        <Canvas spec={spec} onSpecChange={setSpec} nodeLibrary={nodeLibrary} />
      </div>

      <BottomPanel
        tabs={[
          {
            id: 'spec',
            label: 'Spec',
            content: (
              <pre className="p-3 font-mono text-[12px] leading-relaxed text-ink whitespace-pre-wrap break-all">
                {JSON.stringify(spec, null, 2)}
              </pre>
            ),
          },
        ]}
      />
    </div>
  )
}