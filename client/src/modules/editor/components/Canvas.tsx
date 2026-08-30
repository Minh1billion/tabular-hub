import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addEdge,
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  MiniMap,
  Node,
  NodeTypes,
  ReactFlow,
  ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import { NodeDescriptor, NodeLibrary } from '@/modules/nodes/types'
import { ContextMenu } from '@/shared/components/ui/ContextMenu'
import { NODE_DRAG_MIME } from '@/modules/nodes/components/NodePalette'
import { GraphConnection, GraphNode, GraphSpec } from '../types'
import { PipelineNode, PipelineNodeData } from './PipelineNode'
import { NodeInspector } from '../../nodes/components/NodeInspector'

type CanvasContextMenu =
  | { type: 'node'; id: string; x: number; y: number }
  | { type: 'edge'; id: string; x: number; y: number }

const nodeTypes: NodeTypes = { pipeline: PipelineNode }

function edgeId(connection: GraphConnection) {
  return [connection.from, connection.to, connection.on, connection.into].filter(Boolean).join(':')
}

function toFlowNodes(nodes: GraphNode[], descriptors: Map<string, NodeDescriptor>): Node[] {
  return nodes.map((node) => ({
    id: node.id,
    type: 'pipeline',
    position: node.position,
    data: {
      label: node.name,
      nodeType: node.type,
      params: node.params,
      descriptor: descriptors.get(node.type),
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
  workspaceId: string
  spec: GraphSpec
  onSpecChange: (spec: GraphSpec) => void
  nodeLibrary?: NodeLibrary
  errorNodeIds?: string[]
  focusNodeId?: string | null
}

export function Canvas({ workspaceId, spec, onSpecChange, nodeLibrary, errorNodeIds, focusNodeId }: CanvasProps) {
  const descriptors = useMemo(() => {
    const map = new Map<string, NodeDescriptor>()
    nodeLibrary?.builtin.forEach((descriptor) => map.set(descriptor.type, descriptor))
    nodeLibrary?.custom.forEach((descriptor) => map.set(descriptor.type, descriptor))
    return map
  }, [nodeLibrary])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(toFlowNodes(spec.nodes, descriptors))
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toFlowEdges(spec.connections))
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<CanvasContextMenu | null>(null)
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        data: { ...node.data, descriptor: descriptors.get((node.data as PipelineNodeData).nodeType) },
      })),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descriptors])

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        data: { ...node.data, hasError: (errorNodeIds ?? []).includes(node.id) },
      })),
    )
  }, [errorNodeIds, setNodes])

  useEffect(() => {
    if (!focusNodeId) return
    setNodes((current) => current.map((node) => ({ ...node, selected: node.id === focusNodeId })))
    setSelectedNodeId(focusNodeId)
    const target = nodes.find((node) => node.id === focusNodeId)
    if (target && reactFlowInstance.current) {
      reactFlowInstance.current.setCenter(target.position.x, target.position.y, { zoom: 1, duration: 300 })
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

      setEdges((current) => addEdge(connection, current))
    },
    [nodes, edges, descriptors, setEdges],
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const nodeType = event.dataTransfer.getData(NODE_DRAG_MIME)
      if (!nodeType || !reactFlowInstance.current) return

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const id = crypto.randomUUID()
      setNodes((current) => [
        ...current,
        {
          id,
          type: 'pipeline',
          position,
          data: { label: nodeType, nodeType, params: {}, descriptor: descriptors.get(nodeType) } satisfies PipelineNodeData,
        },
      ])
    },
    [descriptors, setNodes],
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault()
    setContextMenu(null)
  }, [])

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
      setNodes((current) => current.filter((node) => node.id !== id))
      setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id))
      setSelectedNodeId((current) => (current === id ? null : current))
    },
    [setNodes, setEdges],
  )

  const deleteEdge = useCallback(
    (id: string) => {
      setEdges((current) => current.filter((edge) => edge.id !== id))
    },
    [setEdges],
  )

  const closeInspector = useCallback(() => {
    setNodes((current) => current.map((node) => (node.selected ? { ...node, selected: false } : node)))
    setSelectedNodeId(null)
  }, [setNodes])

  const lastPushedSpecRef = useRef<string | null>(null)

  useEffect(() => {
    const nextSpec = toGraphSpec(spec.name, nodes, edges)
    const serialized = JSON.stringify(nextSpec)
    if (serialized === lastPushedSpecRef.current) return
    lastPushedSpecRef.current = serialized
    onSpecChange(nextSpec)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  const selectedGraphNode = spec.nodes.find((node) => node.id === selectedNodeId) ?? null

  function updateSelectedParams(params: Record<string, unknown>) {
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNodeId ? { ...node, data: { ...node.data, params } } : node,
      ),
    )
  }

  return (
    <div className="w-full h-full flex">
      <div
        ref={wrapperRef}
        className="relative flex-1 h-full"
        onDrop={onDrop}
        onDragOver={onDragOver}
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
          onSelectionChange={({ nodes: selected }) => setSelectedNodeId(selected[0]?.id ?? null)}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable />
        </ReactFlow>
        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted">
            Drag a node from the library to get started.
          </div>
        )}
      </div>

      {selectedGraphNode && (
        <NodeInspector
          workspaceId={workspaceId}
          node={selectedGraphNode}
          descriptor={descriptors.get(selectedGraphNode.type)}
          onChange={updateSelectedParams}
          onClose={closeInspector}
        />
      )}

      {contextMenu?.type === 'node' && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[{ label: 'Delete node', destructive: true, onClick: () => deleteNode(contextMenu.id) }]}
        />
      )}

      {contextMenu?.type === 'edge' && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[{ label: 'Delete connection', destructive: true, onClick: () => deleteEdge(contextMenu.id) }]}
        />
      )}
    </div>
  )
}