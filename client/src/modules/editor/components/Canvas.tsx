import { useCallback, useEffect } from 'react'
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
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import { GraphConnection, GraphNode, GraphSpec } from '../types'
import { PipelineNode, PipelineNodeData } from './PipelineNode'

const nodeTypes: NodeTypes = { pipeline: PipelineNode }

function edgeId(connection: GraphConnection) {
  return [connection.from, connection.to, connection.on, connection.into].filter(Boolean).join(':')
}

function toFlowNodes(nodes: GraphNode[]): Node[] {
  return nodes.map((node) => ({
    id: node.id,
    type: 'pipeline',
    position: node.position,
    data: { label: node.name, nodeType: node.type, params: node.params } satisfies PipelineNodeData,
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
}

export function Canvas({ spec, onSpecChange }: CanvasProps) {
  const [nodes, , onNodesChange] = useNodesState<Node>(toFlowNodes(spec.nodes))
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toFlowEdges(spec.connections))

  const onConnect = useCallback(
    (connection: Connection) => setEdges((current) => addEdge(connection, current)),
    [setEdges],
  )

  useEffect(() => {
    onSpecChange(toGraphSpec(spec.name, nodes, edges))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  if (nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-muted">
        This workspace has no nodes yet.
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  )
}