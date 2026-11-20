import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { ApiError } from '@/shared/lib/api-client'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { CheckIcon, HelpIcon, ShareIcon } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/cn'
import { useUpdateWorkspace, useWorkspace, workspaceQueryKey } from '@/modules/workspace/hooks'
import { getWorkspace } from '@/modules/workspace/api'
import { useCollab } from '@/modules/collab/hooks'
import { PresenceBar } from '@/modules/collab/components/PresenceBar'
import { userColor, userLabel } from '@/modules/collab/lib/colors'
import { mergeSpecs, specsEqual } from '@/modules/collab/lib/merge'
import { LockHolder, LockKind, LockTarget, lockKey } from '@/modules/collab/types'
import { ShareDialog } from '@/modules/workspace/components/ShareDialog'
import { useGraphSchema, useNodeLibrary } from '@/modules/editor/nodes/hooks'
import { useCreateRun, useValidateSpec } from '@/modules/runs/hooks'
import { ValidateResponse } from '@/modules/runs/types'
import { RunPanel } from '@/modules/runs/components/RunPanel'
import { RunHistoryPanel } from '@/modules/runs/components/RunHistoryPanel'
import { TopbarPortal } from '@/app/layouts/TopbarSlot'
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

const MAX_SAVE_FAILURES = 5
const NOTICE_MS = 4000

function emptySpec(name: string): GraphSpec {
  return { name, nodes: [], connections: [] }
}

function normalizeSpec(spec: GraphSpec): GraphSpec {
  return { name: spec.name, nodes: spec.nodes ?? [], connections: spec.connections ?? [] }
}

interface LockedElement {
  kind: LockKind
  id: string
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
  const { data: workspace, isLoading, isError: workspaceFailed, error: workspaceError } = useWorkspace(workspaceId)
  const updateWorkspace = useUpdateWorkspace(workspaceId)
  const { data: nodeLibrary } = useNodeLibrary(workspaceId)

  const queryClient = useQueryClient()
  const [spec, setSpec] = useState<GraphSpec | null>(null)
  const hydratedForRef = useRef<string | null>(null)
  const actionsRef = useRef<CanvasActions | null>(null)
  const latestSpecRef = useRef<GraphSpec | null>(null)
  const baseRef = useRef<{ spec: GraphSpec; version: number } | null>(null)
  const savingRef = useRef(false)
  const failuresRef = useRef(0)
  const lastValidatedRef = useRef<string | null>(null)
  const [saveTick, setSaveTick] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
  const [showShare, setShowShare] = useState(false)
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

  function showNotice(message: string) {
    setNotice(message)
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(() => setNotice(null), NOTICE_MS)
  }

  useEffect(() => () => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
  }, [])

  function integrateRemote(remoteSpec: GraphSpec, remoteVersion: number, remoteWins?: Set<string>) {
    const base = baseRef.current
    const local = latestSpecRef.current
    if (!base || !local) return
    const remote = normalizeSpec(remoteSpec)
    const merged = mergeSpecs(base.spec, local, remote, remoteWins)
    baseRef.current = { spec: remote, version: Math.max(remoteVersion, base.version) }
    if (specsEqual(merged, local)) return
    latestSpecRef.current = merged
    actionsRef.current?.applyRemote(merged, base.spec, remote)
    if (!specsEqual(merged, remote)) setSaveTick((tick) => tick + 1)
  }

  const handleRemoteSpec = useCallback((version: number, remoteSpec: unknown) => {
    const base = baseRef.current
    if (!base || version <= base.version || !remoteSpec) return
    integrateRemote(remoteSpec as GraphSpec, version)
  }, [])

  const handleLockDenied = useCallback((target: LockTarget) => {
    actionsRef.current?.deselectElements([target])
    showNotice('That element is being edited by someone else')
  }, [])

  const collab = useCollab({
    workspaceId,
    enabled: Boolean(workspace),
    onSpecUpdated: handleRemoteSpec,
    onHello: (specVersion) => {
      if (baseRef.current && specVersion > baseRef.current.version) {
        queryClient.invalidateQueries({ queryKey: workspaceQueryKey(workspaceId) })
      }
    },
    onAccessLost: () => queryClient.invalidateQueries({ queryKey: workspaceQueryKey(workspaceId) }),
    onLockDenied: handleLockDenied,
  })

  async function flushSave() {
    const base = baseRef.current
    const target = latestSpecRef.current
    if (!base || !target || savingRef.current) return
    if (specsEqual(target, base.spec)) return

    savingRef.current = true
    try {
      const saved = await updateWorkspace.mutateAsync({ spec: target, base_version: base.version })
      failuresRef.current = 0
      const current = baseRef.current
      if (current && saved.spec_version > current.version && saved.spec) {
        baseRef.current = { spec: normalizeSpec(saved.spec), version: saved.spec_version }
      }
    } catch (error) {
      failuresRef.current += 1
      const retry = failuresRef.current < MAX_SAVE_FAILURES
      if (error instanceof ApiError && error.code === 'spec_version_conflict' && error.data?.spec) {
        integrateRemote(error.data.spec as GraphSpec, Number(error.data.version))
        if (retry) setSaveTick((tick) => tick + 1)
      } else if (error instanceof ApiError && error.code === 'element_locked') {
        const blocked = (error.data?.elements as LockedElement[] | undefined) ?? []
        try {
          const fresh = await getWorkspace(workspaceId)
          if (fresh.spec) {
            integrateRemote(fresh.spec, fresh.spec_version, new Set(blocked.map((item) => lockKey(item.kind, item.id))))
          }
          showNotice('Some changes were reverted because others are editing those elements')
          if (retry) setSaveTick((tick) => tick + 1)
        } catch {
          return
        }
      }
    } finally {
      savingRef.current = false
    }
  }

  useEffect(() => {
    if (!workspace) return
    if (hydratedForRef.current !== workspace.id) {
      const initial = normalizeSpec(workspace.spec ?? emptySpec(workspace.name))
      setSpec(initial)
      latestSpecRef.current = initial
      baseRef.current = { spec: initial, version: workspace.spec_version }
      hydratedForRef.current = workspace.id
      validationSeqRef.current += 1
      setValidation(null)
      lastValidatedRef.current = JSON.stringify(initial)
      if (initial.nodes.length > 0) validate(initial).catch(() => undefined)
      return
    }
    if (baseRef.current && workspace.spec && workspace.spec_version > baseRef.current.version) {
      integrateRemote(workspace.spec, workspace.spec_version)
    }
  }, [workspace])

  const debouncedSpec = useDebounce(spec, 500)
  const { data: graphSchema, isLoading: schemaLoading } = useGraphSchema(workspaceId, debouncedSpec)

  useEffect(() => {
    if (!debouncedSpec && saveTick === 0) return
    flushSave()
  }, [debouncedSpec, saveTick])

  useEffect(() => {
    if (!debouncedSpec) return
    const serialized = JSON.stringify(debouncedSpec)
    if (serialized === lastValidatedRef.current) return
    lastValidatedRef.current = serialized
    validate(debouncedSpec).catch(() => undefined)
  }, [debouncedSpec])

  const handleSpecChange = useCallback(
    (next: GraphSpec) => {
      latestSpecRef.current = next
      setSpec(next)
      collab.touch()
    },
    [collab.touch],
  )

  const lockHolders = useMemo(() => {
    const byId = new Map(collab.users.map((user) => [user.id, user]))
    const result: Record<string, LockHolder> = {}
    for (const lock of collab.locks) {
      if (lock.conn_id === collab.connId) continue
      const user = byId.get(lock.user_id)
      result[lockKey(lock.kind, lock.id)] = {
        userId: lock.user_id,
        name: user ? userLabel(user) : 'Someone',
        avatarUrl: user?.avatar_url ?? null,
        color: userColor(lock.user_id),
      }
    }
    return result
  }, [collab.locks, collab.users, collab.connId])

  const descriptorFor = useMemo(() => {
    const map = new Map<string, { descriptor: NonNullable<typeof nodeLibrary>['builtin'][number]; category: string }>()
    nodeLibrary?.builtin.forEach((d) => map.set(d.type, { descriptor: d, category: categoryOf(d) }))
    nodeLibrary?.custom.forEach((d) => map.set(d.type, { descriptor: d, category: 'Custom' }))
    return map
  }, [nodeLibrary])

  if (workspaceFailed) {
    const accessLost = workspaceError instanceof ApiError && workspaceError.status === 403
    return (
      <div className="ed-empty">
        <div className="panel rise">
          <h1 className="m-0 mb-2 text-[20px] font-bold tracking-tight">{accessLost ? 'Access removed' : 'Workspace not found'}</h1>
          <p className="m-0 mb-5 text-[13.5px] text-slate">
            {accessLost
              ? "You no longer have access to this workspace. The owner may have removed you. Any changes you haven't saved were not kept."
              : "It may have been deleted, or you don't have access to it."}
          </p>
          <Link to="/app" className="btn btn-primary btn-md">
            Open another workspace
          </Link>
        </div>
      </div>
    )
  }

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

  const selectedNode = selectedNodeId && lockHolders[lockKey('node', selectedNodeId)] ? null : spec.nodes.find((n) => n.id === selectedNodeId) ?? null
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
    {
      id: 'history',
      label: 'History',
      content: panelOpen && tabId === 'history' ? <RunHistoryPanel key={workspaceId} workspaceId={workspaceId} /> : null,
    },
  ]

  return (
    <div className="ed">
      <TopbarPortal>
        {workspace?.role === 'member' && <Badge tone="team">Shared</Badge>}
        {workspace?.role === 'owner' && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowShare(true)}>
            <ShareIcon className="w-3.5 h-3.5" />
            Share
          </Button>
        )}
        <IconButton size="sm" className="help-btn" tip="Keyboard shortcuts" tipSide="bottom" onClick={() => setShowShortcuts(true)}>
          <HelpIcon className="w-4 h-4" />
        </IconButton>
        {collab.status !== 'connecting' && <PresenceBar users={collab.users} meId={collab.me?.id} status={collab.status} />}
        <span className={cn('save-state', saving && 'busy')} title={notice ?? undefined}>
          <i />
          {notice ?? (saving ? 'Saving…' : 'Saved')}
        </span>
        <Button type="button" size="sm" onClick={handleRun} loading={createRun.isPending}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5Z" />
          </svg>
          Run
        </Button>
      </TopbarPortal>

      <div className="ed-main">
        <ToolSidebar workspaceId={workspaceId} nodeLibrary={nodeLibrary} />
        <Canvas
          spec={spec}
          onSpecChange={handleSpecChange}
          nodeLibrary={nodeLibrary}
          nodeErrors={nodeErrors}
          focusNodeId={focusNodeId}
          highlightNodeId={hoverNodeId}
          selectedNodeId={selectedNodeId}
          onSelectedNodeIdChange={setSelectedNodeId}
          onSelectionTargetsChange={collab.syncSelection}
          locks={lockHolders}
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
              nodeSchema={graphSchema?.nodes[selectedNode.id]}
              schemaLoading={schemaLoading}
              onChange={(params) => actionsRef.current?.updateParams(selectedNode.id, params)}
              onRename={(name) => actionsRef.current?.rename(selectedNode.id, name)}
            />
          </FloatingInspector>
        )}
      </div>

      {showShortcuts && <ShortcutsDialog onClose={() => setShowShortcuts(false)} />}
      {showShare && workspace?.role === 'owner' && <ShareDialog workspace={workspace} onClose={() => setShowShare(false)} />}

      <BottomPanel tabs={tabs} open={panelOpen} onOpenChange={setPanelOpen} activeTabId={tabId} onActiveTabChange={setTabId} />
    </div>
  )
}
