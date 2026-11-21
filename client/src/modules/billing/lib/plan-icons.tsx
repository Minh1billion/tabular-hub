import { PlanTier } from '../types'

export const TIER_ACCENT: Record<PlanTier, string> = {
  free: 'var(--accent-olive)',
  pro: 'var(--accent-teal)',
  team: 'var(--accent-plum)',
}

const props = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function TierIcon({ tier }: { tier: PlanTier }) {
  if (tier === 'free') {
    return (
      <svg {...props}>
        <path d="M12 3c4 2 6 5 6 9a6 6 0 0 1-12 0c0-4 2-7 6-9Z" />
        <path d="M12 21v-9" />
      </svg>
    )
  }
  if (tier === 'pro') {
    return (
      <svg {...props}>
        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
      </svg>
    )
  }
  return (
    <svg {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M17 14c2.5 0 4 1.8 4 4.5" />
    </svg>
  )
}
