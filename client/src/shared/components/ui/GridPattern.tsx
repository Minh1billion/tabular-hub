import { SVGProps, useId } from 'react'
import { cn } from '@/shared/lib/cn'

interface GridPatternProps extends SVGProps<SVGSVGElement> {
  cellSize?: number
  strokeColor?: string
  strokeWidth?: number
}

export function GridPattern({
  cellSize = 24,
  strokeColor = 'var(--line, #E2E5E0)',
  strokeWidth = 1,
  className,
  ...props
}: GridPatternProps) {
  const patternId = useId()

  return (
    <svg
      aria-hidden="true"
      className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <pattern id={patternId} width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
          <path
            d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}