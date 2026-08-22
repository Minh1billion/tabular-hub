import { SVGProps } from 'react'
import { cn } from '@/shared/lib/cn'

interface NodeOverlayProps extends SVGProps<SVGSVGElement> {
  lineColor?: string
  nodeColor?: string
  accentColor?: string
}

const clusters = [
  {
    lines: [
      [120, 120, 120, 230],
      [120, 230, 220, 170],
      [220, 170, 220, 90],
    ],
    nodes: [
      [120, 120, 4],
      [120, 230, 4],
      [220, 90, 4],
    ],
    accent: [220, 170, 5],
  },
  {
    lines: [
      [940, 600, 940, 700],
      [940, 700, 1040, 640],
      [1040, 640, 1120, 700],
      [1120, 700, 1120, 620],
    ],
    nodes: [
      [940, 600, 4],
      [940, 700, 4],
      [1120, 700, 4],
      [1120, 620, 4],
    ],
    accent: [1040, 640, 5],
  },
  {
    lines: [
      [90, 600, 90, 700],
      [90, 700, 180, 650],
    ],
    nodes: [
      [90, 600, 4],
      [90, 700, 4],
      [180, 650, 4],
    ],
    accent: null,
  },
  {
    lines: [
      [1000, 90, 1080, 150],
      [1080, 150, 1080, 230],
    ],
    nodes: [
      [1000, 90, 4],
      [1080, 230, 4],
    ],
    accent: [1080, 150, 5],
  },
] as const

export function NodeOverlay({
  lineColor = '#D8DCD3',
  nodeColor = '#B9C3B4',
  accentColor = '#17A672',
  className,
  ...props
}: NodeOverlayProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g stroke={lineColor} strokeWidth={1.2} fill="none">
        {clusters.flatMap((cluster, ci) =>
          cluster.lines.map(([x1, y1, x2, y2], li) => (
            <line key={`${ci}-${li}`} x1={x1} y1={y1} x2={x2} y2={y2} />
          )),
        )}
      </g>
      <g fill={nodeColor}>
        {clusters.flatMap((cluster, ci) =>
          cluster.nodes.map(([cx, cy, r], ni) => (
            <circle key={`${ci}-${ni}`} cx={cx} cy={cy} r={r} />
          )),
        )}
      </g>
      <g fill={accentColor} opacity={0.55}>
        {clusters
          .filter((cluster) => cluster.accent)
          .map((cluster, i) => {
            const [cx, cy, r] = cluster.accent as [number, number, number]
            return <circle key={i} cx={cx} cy={cy} r={r * 0.5} />
          })}
      </g>
    </svg>
  )
}