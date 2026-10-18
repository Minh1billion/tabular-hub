import { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addEdge,
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  NodeTypes,
  ReactFlow,
  ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import { NodeDescriptor, NodeLibrary } from '@/modules/editor/types'
import { ContextMenu } from '@/shared/components/ui/ContextMenu'
import { NODE_DROP_EVENT, PaletteDrop } from '@/modules/editor/nodes/lib/usePaletteDrag'
import { CategoryIcon, categoryOf } from '../nodes/category'
import { GraphConnection, GraphNode, GraphSpec } from '../types'
import { useHotkeys } from '@/shared/hooks/useHotkeys'
import { bind } from '../shortcuts'
import { PipelineNode, PipelineNodeData } from './PipelineNode'

const HISTORY_LIMIT = 100
const PASTE_STEP = 32

type CanvasContextMenu =
  | { type: 'node'; id: string; x: number; y: number }
  | { type: 'edge'; id: string; x: number; y: number }

export interface CanvasActions {
  updateParams: (id: string, params: Record<string, unknown>) => void
  rename: (id: string, name: string) => void
  deselect: () => void
}

const nodeTypes: NodeTypes = { pipeline: PipelineNode }

const defaultEdgeOptions = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#16231c', width: 16, height: 16 },
}

function edgeId(connection: GraphConnection) {
  return [connection.from, connection.to, connection.on, connection.into].filter(Boolean).join(':')
}

function toFlowNodes(
  nodes: GraphNode[],
  descriptors: Map<string, NodeDescriptor>,
  categories: Map<string, string>,
  onRename: (id: string, name: string) => void,
  selectedNodeId: string | null,
): Node[] {
  return nodes.map((node) => ({
    id: node.id,
    type: 'pipeline',
    position: node.position,
    selected: node.id === selectedNodeId,
    data: {
      label: node.name,
      nodeType: node.type,
      category: categories.get(node.type) ?? 'Transform',
      params: node.params,
      descriptor: descriptors.get(node.type),
      onRename: (name: string) => onRename(node.id, name),
    } satisfies PipelineNodeData,
  }))
}

function toFlowEdges(connections: GraphConnection[]): Edge[] {
  return connections.map((connection) => ({
    id: edgeId(connection),
    source: connection.from,
    target: connection.to,
    sourceHandle: connection.on,
    targetHandle: connection.into,
  }))
}

function toGraphSpec(name: string, nodes: Node[], edges: Edge[]): GraphSpec {
  return {
    name,
    nodes: nodes.map((node) => {
      const data = node.data as PipelineNodeData
      return {
        id: node.id,
        type: data.nodeType,
        name: data.label,
        params: (data.params as Record<string, unknown>) ?? {},
        position: { x: node.position.x, y: node.position.y },
      }
    }),
    connections: edges.map((edge) => ({
      from: edge.source,
      to: edge.target,
      ...(edge.sourceHandle ? { on: edge.sourceHandle } : {}),
      ...(edge.targetHandle ? { into: edge.targetHandle } : {}),
    })),
  }
}

interface CanvasProps {
  spec: GraphSpec
  onSpecChange: (spec: GraphSpec) => void
  nodeLibrary?: NodeLibrary
  nodeErrors?: Record<string, string[]>
  focusNodeId?: string | null
  highlightNodeId?: string | null
  selectedNodeId: string | null
  onSelectedNodeIdChange: (id: string | null) => void
  actionsRef: MutableRefObject<CanvasActions | null>
}

export function Canvas({
  spec,
  onSpecChange,
  nodeLibrary,
  nodeErrors,
  focusNodeId,
  highlightNodeId,
  selectedNodeId,
  onSelectedNodeIdChange,
  actionsRef,
}: CanvasProps) {
  const descriptors = useMemo(() => {
    const map = new Map<string, NodeDescriptor>()
    nodeLibrary?.builtin.forEach((descriptor) => map.set(descriptor.type, descriptor))
    nodeLibrary?.custom.forEach((descriptor) => map.set(descriptor.type, descriptor))
    return map
  }, [nodeLibrary])

  const categories = useMemo(() => {
    const map = new Map<string, string>()
    nodeLibrary?.builtin.forEach((descriptor) => map.set(descriptor.type, categoryOf(descriptor)))
    nodeLibrary?.custom.forEach((descriptor) => map.set(descriptor.type, 'Custom'))
    return map
  }, [nodeLibrary])

  const setNodesRef = useRef<React.Dispatch<React.SetStateAction<Node[]>>>(() => {})
  function renameNode(id: string, name: string) {
    pushHistory()
    setNodesRef.current((current) =>
      current.map((node) => (node.id === id ? { ...node, data: { ...node.data, label: name } } : node)),
    )
  }

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    toFlowNodes(spec.nodes, descriptors, categories, renameNode, selectedNodeId),
  )
  setNodesRef.current = setNodes
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toFlowEdges(spec.connections))
  const [contextMenu, setContextMenu] = useState<CanvasContextMenu | null>(null)
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const latestRef = useRef({ name: spec.name, nodes, edges })
  latestRef.current = { name: spec.name, nodes, edges }
  const pastRef = useRef<GraphSpec[]>([])
  const futureRef = useRef<GraphSpec[]>([])
  const lastPushRef = useRef<{ key: string; time: number } | null>(null)
  const clipboardRef = useRef<{ nodes: GraphNode[]; connections: GraphConnection[] } | null>(null)
  const pasteCountRef = useRef(0)

  const snapshot = useCallback(() => toGraphSpec(latestRef.current.name, latestRef.current.nodes, latestRef.current.edges), [])

  const pushHistory = useCallback(
    (key?: string) => {
      const now = Date.now()
      const last = lastPushRef.current
      if (key && last?.key === key && now - last.time < 1000) {
        lastPushRef.current = { key, time: now }
        return
      }
      lastPushRef.current = key ? { key, time: now } : null
      pastRef.current = [...pastRef.current.slice(-(HISTORY_LIMIT - 1)), snapshot()]
      futureRef.current = []
    },
    [snapshot],
  )

  function restore(target: GraphSpec) {
    setNodes(toFlowNodes(target.nodes, descriptors, categories, renameNode, null))
    setEdges(toFlowEdges(target.connections))
    onSelectedNodeIdChange(null)
  }

  function undo() {
    const previous = pastRef.current[pastRef.current.length - 1]
    if (!previous) return false
    pastRef.current = pastRef.current.slice(0, -1)
    futureRef.current = [...futureRef.current, snapshot()]
    lastPushRef.current = null
    restore(previous)
    return true
  }

  function redo() {
    const next = futureRef.current[futureRef.current.length - 1]
    if (!next) return false
    futureRef.current = futureRef.current.slice(0, -1)
    pastRef.current = [...pastRef.current, snapshot()]
    lastPushRef.current = null
    restore(next)
    return true
  }

  function copySelection() {
    const picked = nodes.filter((node) => node.selected)
    if (picked.length === 0) return false
    const ids = new Set(picked.map((node) => node.id))
    clipboardRef.current = {
      nodes: toGraphSpec(spec.name, picked, []).nodes,
      connections: toGraphSpec(spec.name, [], edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target))).connections,
    }
    pasteCountRef.current = 0
    return true
  }

  function pasteClipboard() {
    const clip = clipboardRef.current
    if (!clip) return false
    pasteCountRef.current += 1
    const offset = PASTE_STEP * pasteCountRef.current
    const idMap = new Map(clip.nodes.map((node) => [node.id, crypto.randomUUID()]))
    const addedNodes = clip.nodes.map((node) => ({
      ...node,
      id: idMap.get(node.id)!,
      position: { x: node.position.x + offset, y: node.position.y + offset },
      params: JSON.parse(JSON.stringify(node.params)) as Record<string, unknown>,
    }))
    const addedConnections = clip.connections.map((connection) => ({
      ...connection,
      from: idMap.get(connection.from)!,
      to: idMap.get(connection.to)!,
    }))
    pushHistory()
    setNodes((current) => [
      ...current.map((node) => (node.selected ? { ...node, selected: false } : node)),
      ...toFlowNodes(addedNodes, descriptors, categories, renameNode, null).map((node) => ({ ...node, selected: true })),
    ])
    setEdges((current) => [...current.map((edge) => (edge.selected ? { ...edge, selected: false } : edge)), ...toFlowEdges(addedConnections)])
    return true
  }

  function duplicateSelection() {
    return copySelection() && pasteClipboard()
  }

  function deleteSelection() {
    const removedIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id))
    const hasEdges = edges.some((edge) => edge.selected)
    if (removedIds.size === 0 && !hasEdges) return false
    pushHistory()
    setNodes((current) => current.filter((node) => !removedIds.has(node.id)))
    setEdges((current) => current.filter((edge) => !edge.selected && !removedIds.has(edge.source) && !removedIds.has(edge.target)))
    onSelectedNodeIdChange(null)
    return true
  }

  function renameSelected(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.target as HTMLElement).closest('button, a, [role="button"]')) return false
    const picked = nodes.filter((node) => node.selected)
    if (picked.length !== 1) return false
    setNodes((current) =>
      current.map((node) => (node.id === picked[0].id ? { ...node, data: { ...node.data, renameSignal: Date.now() } } : node)),
    )
    return true
  }

  function fitAll() {
    reactFlowInstance.current?.fitView({ duration: 300, padding: 0.2 })
    return true
  }

  function zoomSelected() {
    const picked = nodes.filter((node) => node.selected)
    if (picked.length === 0) return false
    reactFlowInstance.current?.fitView({ nodes: picked.map((node) => ({ id: node.id })), duration: 300, padding: 0.6, maxZoom: 1.5 })
    return true
  }

  function clearSelection() {
    if (!nodes.some((node) => node.selected) && !edges.some((edge) => edge.selected)) return false
    setNodes((current) => current.map((node) => (node.selected ? { ...node, selected: false } : node)))
    setEdges((current) => current.map((edge) => (edge.selected ? { ...edge, selected: false } : edge)))
    onSelectedNodeIdChange(null)
    return true
  }

  useHotkeys([
    ...bind('undo', undo),
    ...bind('redo', redo),
    ...bind('copy', () => !window.getSelection()?.toString() && copySelection()),
    ...bind('paste', pasteClipboard),
    ...bind('duplicate', duplicateSelection),
    ...bind('remove', deleteSelection),
    ...bind('rename', renameSelected),
    ...bind('fit', fitAll),
    ...bind('zoomSelected', zoomSelected),
    ...bind('deselect', clearSelection),
  ])

  actionsRef.current = {
    updateParams: (id, params) => {
      pushHistory(`params:${id}`)
      setNodes((current) => current.map((node) => (node.id === id ? { ...node, data: { ...node.data, params } } : node)))
    },
    rename: renameNode,
    deselect: () => {
      setNodes((current) => current.map((node) => (node.selected ? { ...node, selected: false } : node)))
      onSelectedNodeIdChange(null)
    },
  }

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => {
        const type = (node.data as PipelineNodeData).nodeType
        return { ...node, data: { ...node.data, descriptor: descriptors.get(type), category: categories.get(type) ?? 'Transform' } }
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descriptors, categories])

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => (Boolean(node.data.highlighted) === (node.id === highlightNodeId) ? node : { ...node, data: { ...node.data, highlighted: node.id === highlightNodeId } })),
    )
  }, [highlightNodeId, setNodes])

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        data: { ...node.data, hasError: Boolean(nodeErrors?.[node.id]), errorMessages: nodeErrors?.[node.id] },
      })),
    )
  }, [nodeErrors, setNodes])

  useEffect(() => {
    if (!focusNodeId) return
    setNodes((current) => current.map((node) => ({ ...node, selected: node.id === focusNodeId })))
    onSelectedNodeIdChange(focusNodeId)
    const target = nodes.find((node) => node.id === focusNodeId)
    if (target && reactFlowInstance.current) {
      reactFlowInstance.current.setCenter(target.position.x + 80, target.position.y, { zoom: 1, duration: 300 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNodeId])

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source === connection.target) return

      const targetNode = nodes.find((node) => node.id === connection.target)
      const targetDescriptor = targetNode ? descriptors.get((targetNode.data as PipelineNodeData).nodeType) : undefined
      const incoming = edges.filter((edge) => edge.target === connection.target)

      if (!targetDescriptor?.fan_in && incoming.length >= 1) return

      if (targetDescriptor?.fan_in && targetDescriptor.in_ports) {
        if (incoming.some((edge) => edge.targetHandle === connection.targetHandle)) return
        if (incoming.length >= 2) return
      }

      if (targetDescriptor?.fan_in && !targetDescriptor.in_ports && incoming.length >= 2) return

      pushHistory()
      setEdges((current) => addEdge(connection, current))
    },
    [nodes, edges, descriptors, setEdges, pushHistory],
  )

  useEffect(() => {
    function onPaletteDrop(event: Event) {
      const { nodeType, label, params, x, y, width } = (event as CustomEvent<PaletteDrop>).detail
      if (!nodeType || !reactFlowInstance.current) return

      const position = reactFlowInstance.current.screenToFlowPosition({ x: x - width / 2, y: y - 22 })

      const id = crypto.randomUUID()
      pushHistory()
      setNodes((current) => [
        ...current,
        {
          id,
          type: 'pipeline',
          position,
          data: {
            label: label ?? nodeType,
            nodeType,
            category: categories.get(nodeType) ?? 'Transform',
            params: params ?? {},
            descriptor: descriptors.get(nodeType),
            onRename: (name: string) => renameNode(id, name),
          } satisfies PipelineNodeData,
        },
      ])
    }

    window.addEventListener(NODE_DROP_EVENT, onPaletteDrop)
    return () => window.removeEventListener(NODE_DROP_EVENT, onPaletteDrop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descriptors, categories, setNodes, pushHistory])

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault()
    setContextMenu({ type: 'node', id: node.id, x: event.clientX, y: event.clientY })
  }, [])

  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault()
    setContextMenu({ type: 'edge', id: edge.id, x: event.clientX, y: event.clientY })
  }, [])

  const deleteNode = useCallback(
    (id: string) => {
      pushHistory()
      setNodes((current) => current.filter((node) => node.id !== id))
      setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id))
      if (selectedNodeId === id) onSelectedNodeIdChange(null)
    },
    [setNodes, setEdges, selectedNodeId, onSelectedNodeIdChange, pushHistory],
  )

  const deleteEdge = useCallback(
    (id: string) => {
      pushHistory()
      setEdges((current) => current.filter((edge) => edge.id !== id))
    },
    [setEdges, pushHistory],
  )

  const lastPushedSpecRef = useRef<string | null>(null)

  useEffect(() => {
    if (nodes.some((node) => node.dragging)) return
    const nextSpec = toGraphSpec(spec.name, nodes, edges)
    const serialized = JSON.stringify(nextSpec)
    if (serialized === lastPushedSpecRef.current) return
    lastPushedSpecRef.current = serialized
    onSpecChange(nextSpec)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  const closeMenu = () => setContextMenu(null)

  return (
    <div
      ref={wrapperRef}
      className="ed-canvas"
      onContextMenu={(event) => event.preventDefault()}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={(instance) => {
          reactFlowInstance.current = instance
        }}
        onSelectionChange={({ nodes: selected }) => onSelectedNodeIdChange(selected[0]?.id ?? null)}
        onNodeDragStart={() => pushHistory()}
        onSelectionDragStart={() => pushHistory()}
        deleteKeyCode={null}
        onNodeClick={closeMenu}
        onEdgeClick={closeMenu}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={(event) => {
          event.preventDefault()
          closeMenu()
        }}
        onPaneClick={closeMenu}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionRadius={28}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.6} color="var(--line-2)" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeStrokeWidth={2} nodeStrokeColor="#16231c" />
      </ReactFlow>

      {nodes.length === 0 && (
        <div className="empty-canvas">
          <div className="card rise">
            <div className="cat-tile" data-cat="Transform">
              <CategoryIcon category="Transform" className="w-5 h-5" />
            </div>
            <h3 className="m-0 mb-1 text-[15px] font-bold">Start your pipeline</h3>
            <p className="m-0 text-[13px] text-slate">Drag a node from the library onto the canvas.</p>
          </div>
        </div>
      )}

      {contextMenu?.type === 'node' && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeMenu}
          items={[
            {
              label: 'Rename node',
              onClick: () =>
                setNodes((current) =>
                  current.map((node) =>
                    node.id === contextMenu.id ? { ...node, data: { ...node.data, renameSignal: Date.now() } } : node,
                  ),
                ),
            },
            { label: 'Delete node', destructive: true, onClick: () => deleteNode(contextMenu.id) },
          ]}
        />
      )}

      {contextMenu?.type === 'edge' && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeMenu}
          items={[{ label: 'Delete connection', destructive: true, onClick: () => deleteEdge(contextMenu.id) }]}
        />
      )}
    </div>
  )
}
