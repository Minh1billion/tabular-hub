import { CSSProperties, useMemo } from 'react'
import { GraphSpec } from '@/modules/editor/types'
import { THUMB_HEIGHT, thumbLayout } from '../lib/thumb'

interface PipelineThumbProps {
  spec: GraphSpec | null
  fallback: string
}

export function PipelineThumb({ spec, fallback }: PipelineThumbProps) {
  const layout = useMemo(() => thumbLayout(spec, fallback), [spec, fallback])

  return (
    <>
      <svg className="wsc-edges" viewBox={`0 0 100 ${THUMB_HEIGHT}`} preserveAspectRatio="none" aria-hidden>
        {layout.edges.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
      {layout.nodes.map((node, index) => (
        <i
          key={index}
          className={node.tone === 'plain' ? undefined : node.tone}
          style={
            {
              left: `${node.x}%`,
              top: node.y,
              width: node.size,
              height: node.size,
              marginLeft: -node.size / 2,
              marginTop: -node.size / 2,
              borderRadius: node.radius,
              '--r': `${node.rot}deg`,
              '--hy': `${node.hoverY}px`,
              '--hr': `${node.hoverRot}deg`,
            } as CSSProperties
          }
        />
      ))}
    </>
  )
}
