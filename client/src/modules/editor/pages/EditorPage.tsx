import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { Button } from '@/shared/components/ui/Button'
import { CheckIcon, HelpIcon } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/cn'
import { useUpdateWorkspace, useWorkspace } from '@/modules/workspace/hooks'
import { useNodeLibrary } from '@/modules/editor/nodes/hooks'
import { useCreateRun, useValidateSpec } from '@/modules/runs/hooks'
import { ValidateResponse } from '@/modules/runs/types'
import { RunPanel } from '@/modules/runs/components/RunPanel'
import { GraphSpec } from '../types'
import { Canvas, CanvasActions } from '../components/Canvas'
import { BottomPanel, BottomPanelTab } from '../components/BottomPanel'
import { ToolSidebar } from '../components/ToolSidebar'
import { FloatingInspector } from '../components/FloatingInspector'
import { ShortcutsDialog } from '../components/ShortcutsDialog'
import { SpecView } from '../components/SpecView'
import { bind } from '../shortcuts'
import { useHotkeys } from '@/shared/hooks/useHotkeys'
import { IconButton } from '@/shared/components/ui/IconButton'
import { NodeInspector } from '../nodes/components/NodeInspector'
import { categoryOf } from '../nodes/category'
import { shortErrorMessage } from '../lib/errors'

function emptySpec(name: string): GraphSpec {
  return { name, nodes: [], connections: [] }
}

function ErrorsTab({
  spec,
  result,
  onFocusNode,
  onHoverNode,
}: {
  spec: GraphSpec
  result: ValidateResponse | null
  onFocusNode: (nodeId: string) => void
  onHoverNode: (nodeId: string | null) => void
}) {
  if (!result || result.valid || result.errors.length === 0) {
    return (
      <div className="ok-note">
        <CheckIcon className="w-4 h-4 text-brand" />
        No errors — the pipeline looks good.
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-3 stagger">
      {result.errors.map((error, index) => {
        const node = error.node_id ? spec.nodes.find((n) => n.id === error.node_id) : null
        return (
          <div
            key={error.node_id ?? index}
            className="err-item"
            onMouseEnter={() => onHoverNode(error.node_id)}
            onMouseLeave={() => onHoverNode(null)}
          >
            {node && (
              <button type="button" className="err-node" onClick={() => onFocusNode(node.id)}>
                <b>{node.name}</b>
                <span>{node.type}</span>
              </button>
            )}
            <p>{shortErrorMessage(error.message)}</p>
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
  const actionsRef = useRef<CanvasActions | null>(null)

  const validateSpec = useValidateSpec(workspaceId)
  const [validation, setValidation] = useState<ValidateResponse | null>(null)
  const validationSeqRef = useRef(0)
  const createRun = useCreateRun(workspaceId)
  const [activeRun, setActiveRun] = useState<{ id: string; status: string } | null>(null)
  const [panelOpen, setPanelOpen] = useState(() => localStorage.getItem('bottomPanel.isOpen') === 'true')
  const [tabId, setTabId] = useState(() => {
    const stored = localStorage.getItem('bottomPanel.tab')
    return stored && stored !== 'node' ? stored : 'spec'
  })
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null)
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(() =>
    localStorage.getItem(`canvas.selectedNodeId:${workspaceId}`),
  )

  useEffect(() => localStorage.setItem('bottomPanel.isOpen', String(panelOpen)), [panelOpen])
  useEffect(() => localStorage.setItem('bottomPanel.tab', tabId), [tabId])
  useEffect(() => {
    if (selectedNodeId) localStorage.setItem(`canvas.selectedNodeId:${workspaceId}`, selectedNodeId)
    else localStorage.removeItem(`canvas.selectedNodeId:${workspaceId}`)
  }, [workspaceId, selectedNodeId])

  function openTab(next: string) {
    setTabId(next)
    setPanelOpen(true)
  }

  function validate(target: GraphSpec) {
    const seq = ++validationSeqRef.current
    return validateSpec.mutateAsync(target).then((result) => {
      if (seq === validationSeqRef.current) setValidation(result)
      return result
    })
  }

  async function handleRun() {
    if (!spec) return
    try {
      const result = await validate(spec)
      if (!result.valid) {
        openTab('errors')
        return
      }
      const run = await createRun.mutateAsync(spec)
      setActiveRun({ id: run.id, status: run.status })
      openTab('run')
    } catch {
      return
    }
  }

  useHotkeys([
    ...bind(
      'run',
      () => {
        handleRun()
      },
      true,
    ),
    ...bind('panel', () => setPanelOpen((open) => !open)),
  ])

  useEffect(() => {
    if (workspace && hydratedForRef.current !== workspace.id) {
      const initial = workspace.spec ?? emptySpec(workspace.name)
      setSpec(initial)
      hydratedForRef.current = workspace.id
      skipNextSaveRef.current = true
      validationSeqRef.current += 1
      setValidation(null)
      if (initial.nodes.length > 0) validate(initial).catch(() => undefined)
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
    validate(debouncedSpec).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSpec])

  const descriptorFor = useMemo(() => {
    const map = new Map<string, { descriptor: NonNullable<typeof nodeLibrary>['builtin'][number]; category: string }>()
    nodeLibrary?.builtin.forEach((d) => map.set(d.type, { descriptor: d, category: categoryOf(d) }))
    nodeLibrary?.custom.forEach((d) => map.set(d.type, { descriptor: d, category: 'Custom' }))
    return map
  }, [nodeLibrary])

  if (isLoading || !spec) {
    return (
      <div className="h-full grid place-items-center">
        <div className="spinner" />
      </div>
    )
  }

  const nodeErrors: Record<string, string[]> = {}
  if (validation && !validation.valid) {
    for (const error of validation.errors) {
      if (error.node_id) (nodeErrors[error.node_id] ??= []).push(shortErrorMessage(error.message))
    }
  }

  const selectedNode = spec.nodes.find((n) => n.id === selectedNodeId) ?? null
  const selectedMeta = selectedNode ? descriptorFor.get(selectedNode.type) : undefined
  const hasErrors = Boolean(validation && !validation.valid && validation.errors.length > 0)
  const saving = updateWorkspace.isPending

  const tabs: BottomPanelTab[] = [
    { id: 'spec', label: 'Spec', content: panelOpen && tabId === 'spec' ? <SpecView spec={spec} /> : null },
    {
      id: 'errors',
      label: 'Errors',
      badge: hasErrors,
      content: <ErrorsTab spec={spec} result={validation} onFocusNode={setFocusNodeId} onHoverNode={setHoverNodeId} />,
    },
    {
      id: 'run',
      label: 'Run',
      content: activeRun ? (
        <RunPanel workspaceId={workspaceId} runId={activeRun.id} initialStatus={activeRun.status} />
      ) : (
        <p className="dock-empty">No run yet. Press Run to execute the pipeline.</p>
      ),
    },
  ]

  return (
    <div className="ed">
      <div className="ed-bar">
        <h2>{workspace?.name}</h2>
        <div className="spacer" />
        <IconButton size="sm" className="help-btn" tip="Keyboard shortcuts" onClick={() => setShowShortcuts(true)}>
          <HelpIcon className="w-4 h-4" />
        </IconButton>
        <span className={cn('save-state', saving && 'busy')}>
          <i />
          {saving ? 'Saving…' : 'Saved'}
        </span>
        <Button type="button" size="sm" onClick={handleRun} loading={createRun.isPending}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5Z" />
          </svg>
          Run
        </Button>
      </div>

      <div className="ed-main">
        <ToolSidebar workspaceId={workspaceId} nodeLibrary={nodeLibrary} />
        <Canvas
          spec={spec}
          onSpecChange={setSpec}
          nodeLibrary={nodeLibrary}
          nodeErrors={nodeErrors}
          focusNodeId={focusNodeId}
          highlightNodeId={hoverNodeId}
          selectedNodeId={selectedNodeId}
          onSelectedNodeIdChange={setSelectedNodeId}
          actionsRef={actionsRef}
        />
        {selectedNode && (
          <FloatingInspector onClose={() => actionsRef.current?.deselect()}>
            <NodeInspector
              key={selectedNode.id}
              workspaceId={workspaceId}
              node={selectedNode}
              descriptor={selectedMeta?.descriptor}
              category={selectedMeta?.category}
              onChange={(params) => actionsRef.current?.updateParams(selectedNode.id, params)}
              onRename={(name) => actionsRef.current?.rename(selectedNode.id, name)}
            />
          </FloatingInspector>
        )}
      </div>

      {showShortcuts && <ShortcutsDialog onClose={() => setShowShortcuts(false)} />}

      <BottomPanel tabs={tabs} open={panelOpen} onOpenChange={setPanelOpen} activeTabId={tabId} onActiveTabChange={setTabId} />
    </div>
  )
}
