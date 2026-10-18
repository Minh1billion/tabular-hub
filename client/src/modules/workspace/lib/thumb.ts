import { GraphSpec } from '@/modules/editor/types'

export interface ThumbNode {
  x: number
  y: number
  size: number
  radius: string
  rot: number
  hoverY: number
  hoverRot: number
  tone: 'plain' | 'tint' | 'hero'
}

export interface ThumbLayout {
  nodes: ThumbNode[]
  edges: string[]
}

const HEIGHT = 84
const LANES = [20, 42, 64]

function fnv1a(text: string) {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function specSeed(spec: GraphSpec | null, fallback: string) {
  const nodes = spec?.nodes ?? []
  if (nodes.length === 0) return fnv1a(fallback)
  const canonical = JSON.stringify([nodes.map((node) => [node.type, node.name, node.params]), spec?.connections ?? []])
  return fnv1a(canonical)
}

export function thumbLayout(spec: GraphSpec | null, fallback: string): ThumbLayout {
  const rand = mulberry32(specSeed(spec, fallback))
  const specCount = spec?.nodes.length ?? 0
  const count = specCount > 0 ? Math.min(6, Math.max(3, specCount)) : 3 + Math.floor(rand() * 3)
  const hero = Math.floor(rand() * count)

  let lane = Math.floor(rand() * LANES.length)
  const nodes: ThumbNode[] = Array.from({ length: count }, (_, i) => {
    lane = (lane + 1 + Math.floor(rand() * (LANES.length - 1))) % LANES.length
    const isHero = i === hero
    const roll = rand()
    return {
      x: Math.min(92, Math.max(8, 8 + (84 * i) / (count - 1) + (rand() - 0.5) * 6)),
      y: LANES[lane] + (rand() - 0.5) * 6,
      size: isHero ? 34 : 24 + Math.floor(rand() * 9),
      radius: rand() < 0.15 ? '50%' : `${6 + Math.floor(rand() * 5)}px`,
      rot: (rand() - 0.5) * 12,
      hoverY: (rand() < 0.5 ? -1 : 1) * (3 + Math.floor(rand() * 4)),
      hoverRot: (rand() < 0.5 ? -1 : 1) * (4 + Math.floor(rand() * 5)),
      tone: isHero ? 'hero' : roll < 0.28 ? 'tint' : 'plain',
    }
  })

  const link = (a: ThumbNode, b: ThumbNode) => {
    const mid = (a.x + b.x) / 2
    return `M${a.x.toFixed(1)} ${a.y.toFixed(1)}C${mid.toFixed(1)} ${a.y.toFixed(1)} ${mid.toFixed(1)} ${b.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
  }

  const edges: string[] = []
  for (let i = 0; i < count - 1; i++) {
    edges.push(link(nodes[i], nodes[i + 1]))
    if (i + 2 < count && rand() < 0.4) edges.push(link(nodes[i], nodes[i + 2]))
  }

  return { nodes, edges }
}

export { HEIGHT as THUMB_HEIGHT }
