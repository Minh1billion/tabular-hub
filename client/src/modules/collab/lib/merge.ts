import { GraphConnection, GraphNode, GraphSpec } from '@/modules/editor/types'
import { lockKey } from '../types'

export function edgeKey(connection: GraphConnection) {
  return [connection.from, connection.to, connection.on, connection.into].filter(Boolean).join(':')
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]))
  }
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = Object.keys(left)
  return keys.length === Object.keys(right).length && keys.every((key) => key in right && deepEqual(left[key], right[key]))
}

function indexNodes(spec: GraphSpec) {
  return new Map(spec.nodes.map((node) => [node.id, node]))
}

function indexEdges(spec: GraphSpec) {
  return new Map(spec.connections.map((connection) => [edgeKey(connection), connection]))
}

function mapsEqual<T>(a: Map<string, T>, b: Map<string, T>) {
  if (a.size !== b.size) return false
  for (const [key, value] of a) {
    if (!b.has(key) || !deepEqual(value, b.get(key))) return false
  }
  return true
}

export function specsEqual(a: GraphSpec, b: GraphSpec) {
  return a.name === b.name && mapsEqual(indexNodes(a), indexNodes(b)) && mapsEqual(indexEdges(a), indexEdges(b))
}

function mergeCollection<T>(
  base: Map<string, T>,
  local: Map<string, T>,
  remote: Map<string, T>,
  kind: 'node' | 'edge',
  remoteWins: ReadonlySet<string>,
): T[] {
  const ids = [...remote.keys(), ...[...local.keys()].filter((id) => !remote.has(id))]

  const result: T[] = []
  for (const id of ids) {
    const baseItem = base.get(id)
    const localItem = local.get(id)
    const remoteItem = remote.get(id)
    const localChanged = !deepEqual(baseItem, localItem)
    const remoteChanged = !deepEqual(baseItem, remoteItem)
    const takeRemote = !localChanged || remoteWins.has(lockKey(kind, id)) || remoteChanged
    const picked = takeRemote ? remoteItem : localItem
    if (picked !== undefined) result.push(picked)
  }
  return result
}

export function mergeSpecs(
  base: GraphSpec,
  local: GraphSpec,
  remote: GraphSpec,
  remoteWins: ReadonlySet<string> = new Set(),
): GraphSpec {
  const nodes = mergeCollection<GraphNode>(indexNodes(base), indexNodes(local), indexNodes(remote), 'node', remoteWins)
  const nodeIds = new Set(nodes.map((node) => node.id))
  const connections = mergeCollection<GraphConnection>(
    indexEdges(base),
    indexEdges(local),
    indexEdges(remote),
    'edge',
    remoteWins,
  ).filter((connection) => nodeIds.has(connection.from) && nodeIds.has(connection.to))

  return {
    name: local.name !== base.name ? local.name : remote.name,
    nodes,
    connections,
  }
}

export function overlayElements(target: GraphSpec, source: GraphSpec, keys: ReadonlySet<string>): GraphSpec {
  if (keys.size === 0) return target

  const sourceNodes = indexNodes(source)
  const sourceEdges = indexEdges(source)

  const nodes = target.nodes
    .filter((node) => !keys.has(lockKey('node', node.id)) || sourceNodes.has(node.id))
    .map((node) => (keys.has(lockKey('node', node.id)) ? sourceNodes.get(node.id)! : node))
  const present = new Set(nodes.map((node) => node.id))
  for (const node of source.nodes) {
    if (keys.has(lockKey('node', node.id)) && !present.has(node.id)) nodes.push(node)
  }

  const nodeIds = new Set(nodes.map((node) => node.id))
  const connections = target.connections.filter(
    (connection) => !keys.has(lockKey('edge', edgeKey(connection))) || sourceEdges.has(edgeKey(connection)),
  )
  const seen = new Set(connections.map(edgeKey))
  for (const connection of source.connections) {
    const key = edgeKey(connection)
    if (keys.has(lockKey('edge', key)) && !seen.has(key)) connections.push(connection)
  }

  return {
    ...target,
    nodes,
    connections: connections.filter((connection) => nodeIds.has(connection.from) && nodeIds.has(connection.to)),
  }
}
