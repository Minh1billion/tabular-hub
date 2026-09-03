import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { Button } from '@/shared/components/ui/Button'
import { useUpdateWorkspace, useWorkspace } from '@/modules/workspace/hooks'
import { useNodeLibrary } from '@/modules/editor/nodes/hooks'
import { useCreateRun, useValidateSpec } from '@/modules/runs/hooks'
import { ValidateResponse } from '@/modules/runs/types'
import { RunPanel } from '@/modules/runs/components/RunPanel'
import { GraphSpec } from '../types'
import { Canvas } from '../components/Canvas'
import { BottomPanel } from '../components/BottomPanel'
import { ToolSidebar } from '../components/ToolSidebar'

function emptySpec(name: string): GraphSpec {
  return { name, nodes: [], connections: [] }
}

function shortErrorMessage(error: string) {
  const withoutPrefix = error.replace(/^Node '.*?' \(.*?\) failed schema inference:\s*/, '')
  return withoutPrefix.split('\n\n')[0]
}

function ErrorsTab({
  spec,
  result,
  onFocusNode,
}: {
  spec: GraphSpec
  result: ValidateResponse | null
  onFocusNode: (nodeId: string) => void
}) {
  if (!result || result.valid || result.errors.length === 0) {
    return <div className="p-3 text-sm text-muted">No errors.</div>
  }

  return (
    <div className="p-3 space-y-3">
      {result.errors.map((error, index) => {
        const node = error.node_id ? spec.nodes.find((n) => n.id === error.node_id) : null
        return (
          <div key={error.node_id ?? index} className="space-y-1">
            {node && (
              <button
                type="button"
                onClick={() => onFocusNode(node.id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-warn-tint hover:opacity-80 transition-opacity"
              >
                <span className="text-[12.5px] font-medium text-ink">{node.name}</span>
                <span className="font-mono text-[10px] text-muted uppercase">{node.type}</span>
              </button>
            )}
            <p className="text-[12.5px] leading-relaxed text-warn">{shortErrorMessage(error.message)}</p>
          </div>
        )
      })}
    </div>
  )
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

  const validateSpec = useValidateSpec(workspaceId)
  const createRun = useCreateRun(workspaceId)
  const [activeRun, setActiveRun] = useState<{ id: string; status: string } | null>(null)
  const [bottomTabId, setBottomTabIdState] = useState(() => localStorage.getItem('bottomPanel.tab') ?? 'spec')
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null)

  function setBottomTabId(tabId: string) {
    setBottomTabIdState(tabId)
    localStorage.setItem('bottomPanel.tab', tabId)
  }

  async function handleRun() {
    if (!spec) return
    try {
      const result = await validateSpec.mutateAsync(spec)
      if (!result.valid) return
      const run = await createRun.mutateAsync(spec)
      setActiveRun({ id: run.id, status: run.status })
      setBottomTabId('run')
    } catch {
      return
    }
  }

  useEffect(() => {
    if (workspace && hydratedForRef.current !== workspace.id) {
      const initial = workspace.spec ?? emptySpec(workspace.name)
      setSpec(initial)
      hydratedForRef.current = workspace.id
      skipNextSaveRef.current = true
      if (initial.nodes.length > 0) validateSpec.mutate(initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace])

  const debouncedSpec = useDebounce(spec, 500)

  useEffect(() => {
    if (!debouncedSpec) return
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }
    updateWorkspace.mutate({ spec: debouncedSpec })
    validateSpec.mutate(debouncedSpec)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSpec])

  if (isLoading || !spec) {
    return <div className="h-full flex items-center justify-center text-sm text-muted">Loading workspace…</div>
  }

  const errorNodeIds =
    validateSpec.data && !validateSpec.data.valid
      ? validateSpec.data.errors.map((error) => error.node_id).filter((id): id is string => Boolean(id))
      : []

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 flex items-center gap-3 px-5 border-b border-line bg-white shrink-0">
        <Link to="/workspaces" className="text-sm text-muted hover:text-ink transition-colors">
          Workspaces
        </Link>
        <span className="text-muted">/</span>
        <span className="text-sm font-medium text-ink truncate">{workspace?.name}</span>
        <Link to={`/workspaces/${workspaceId}/runs`} className="text-sm text-muted hover:text-ink transition-colors">
          Run History
        </Link>
        <div className="flex-1" />
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleRun}
          disabled={createRun.isPending}
          className="border-[1.5px] border-black"
        >
          Run
        </Button>
        <span className="font-mono text-[11px] text-muted">
          {updateWorkspace.isPending ? 'Saving…' : 'Saved'}
        </span>
      </div>

      <div className="flex-1 min-h-0 flex">
        <ToolSidebar workspaceId={workspaceId} nodeLibrary={nodeLibrary} />
        <Canvas
          workspaceId={workspaceId}
          spec={spec}
          onSpecChange={setSpec}
          nodeLibrary={nodeLibrary}
          errorNodeIds={errorNodeIds}
          focusNodeId={focusNodeId}
        />
      </div>

      <BottomPanel
        activeTabId={bottomTabId}
        onActiveTabChange={setBottomTabId}
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
          {
            id: 'errors',
            label: 'Errors',
            badge: Boolean(validateSpec.data && !validateSpec.data.valid && validateSpec.data.errors.length > 0),
            content: (
              <ErrorsTab
                spec={spec}
                result={validateSpec.data ?? null}
                onFocusNode={(nodeId) => setFocusNodeId(nodeId)}
              />
            ),
          },
          {
            id: 'run',
            label: 'Run',
            content: activeRun ? (
              <RunPanel workspaceId={workspaceId} runId={activeRun.id} initialStatus={activeRun.status} />
            ) : (
              <div className="p-3 text-sm text-muted">No run yet.</div>
            ),
          },
        ]}
      />
    </div>
  )
}