import { NodeDescriptor } from '../types'

export type NodeCategory = 'IO' | 'Transform' | 'Merge' | 'Custom'

export const CATEGORY_ORDER: NodeCategory[] = ['IO', 'Transform', 'Merge']

export function categoryOf(descriptor: NodeDescriptor): NodeCategory {
  if (descriptor.fan_in) return 'Merge'
  if (descriptor.type.startsWith('fetch_') || descriptor.type.startsWith('push_')) return 'IO'
  return 'Transform'
}

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  switch (category) {
    case 'IO':
      return (
        <svg className={className} {...common}>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M4 19h16" />
        </svg>
      )
    case 'Merge':
      return (
        <svg className={className} {...common}>
          <circle cx="6" cy="6" r="2" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="12" r="2" />
          <path d="M6 8v3a5 5 0 0 0 5 5h1" />
          <path d="M14 12h2" />
        </svg>
      )
    case 'Custom':
      return (
        <svg className={className} {...common}>
          <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />
        </svg>
      )
    default:
      return (
        <svg className={className} {...common}>
          <path d="M4 6h10" />
          <circle cx="17" cy="6" r="2" />
          <path d="M20 18H10" />
          <circle cx="7" cy="18" r="2" />
          <path d="M4 12h5M15 12h5" />
        </svg>
      )
  }
}
