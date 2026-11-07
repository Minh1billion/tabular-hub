import { ReactNode, SVGProps } from 'react'
import { CategoryIcon } from './category'

const TINT = { fill: 'currentColor', fillOpacity: 0.16 } as const
const FAINT = { opacity: 0.32 } as const
const DASH = { strokeDasharray: '2 2.4' } as const

const dbBody = (
  <>
    <ellipse cx="8" cy="6" rx="5" ry="2" />
    <path d="M3 6v12c0 1.1 2.2 2 5 2s5-.9 5-2V6" />
    <path d="M3 12c0 1.1 2.2 2 5 2s5-.9 5-2" />
  </>
)

const DB_FETCH = (
  <>
    {dbBody}
    <path d="M14.5 12H21M18.5 9.5 21 12l-2.5 2.5" />
  </>
)

const DB_PUSH = (
  <>
    {dbBody}
    <path d="M21 12h-6.5M17 9.5 14.5 12 17 14.5" />
  </>
)

const GLYPHS: Record<string, ReactNode> = {
  select: (
    <>
      <rect x="3.5" y="4" width="4.5" height="16" rx="1.2" />
      <rect x="9.75" y="4" width="4.5" height="16" rx="1.2" {...TINT} />
      <rect x="16" y="4" width="4.5" height="16" rx="1.2" />
    </>
  ),
  drop: (
    <>
      <rect x="3.5" y="4" width="4.5" height="16" rx="1.2" />
      <rect x="9.75" y="4" width="4.5" height="16" rx="1.2" {...DASH} />
      <rect x="16" y="4" width="4.5" height="16" rx="1.2" />
    </>
  ),
  limit: (
    <>
      <path d="M4 5h16M4 10h16" />
      <path d="M4 15h16" {...DASH} />
      <path d="M4 20h8" {...FAINT} />
    </>
  ),
  head: (
    <>
      <path d="M4 5h16M4 10h16" />
      <path d="M4 15h16M4 20h16" {...FAINT} />
    </>
  ),
  tail: (
    <>
      <path d="M4 5h16M4 10h16" {...FAINT} />
      <path d="M4 15h16M4 20h16" />
    </>
  ),
  explode: (
    <>
      <rect x="3.5" y="9.5" width="5" height="5" rx="1.2" {...TINT} />
      <path d="M8.5 12h3M11.5 12l5-6M11.5 12h5M11.5 12l5 6M16.5 6h4M16.5 12h4M16.5 18h4" />
    </>
  ),
  group_by: (
    <>
      <path d="M4 6h5M4 12h5M4 18h5M9 6c3.5 0 3.5 6 7 6M9 18c3.5 0 3.5-6 7-6" />
      <rect x="16" y="9.5" width="4.5" height="5" rx="1.2" {...TINT} />
    </>
  ),
  log: (
    <>
      <path d="M4 4v16h16" />
      <path d="M7 17c1.5-5 5-8 12-9" />
    </>
  ),
  zscore_normalize: (
    <>
      <path d="M3.5 19.5h17M5.5 19.5c2.5 0 3.2-13 6.5-13s4 13 6.5 13" />
      <path d="M12 6.5v13" {...DASH} {...FAINT} />
    </>
  ),
  minmax_normalize: (
    <>
      <path d="M4 6v12M20 6v12M7 12h10M8 9l3 3-3 3M16 9l-3 3 3 3" />
    </>
  ),
  fill_mean: (
    <>
      <rect x="6.5" y="8.5" width="11" height="7" rx="1.5" {...TINT} {...DASH} />
      <path d="M3.5 12h17" />
    </>
  ),
  fill_null: (
    <>
      <rect x="4" y="6" width="16" height="12" rx="2" {...TINT} {...DASH} />
      <path d="M12 9.5v5M9.5 12h5" />
    </>
  ),
  drop_nulls: (
    <>
      <rect x="4" y="6" width="16" height="12" rx="2" {...DASH} />
      <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
    </>
  ),
  drop_duplicates: (
    <>
      <path d="M5.5 15.5v-9a2 2 0 0 1 2-2h9" />
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" {...TINT} />
      <path d="M11.5 14.5h6" />
    </>
  ),
  rename: (
    <>
      <rect x="3" y="7" width="18" height="10" rx="2.2" />
      <path d="M7.5 12h3.5M15 9.5v5" />
    </>
  ),
  sort: <path d="M4 6h11M4 12h7M4 18h3M18 7v11M15.5 15.5 18 18l2.5-2.5" />,
  cast: <path d="M4 8.5h14M15 5.5l3 3-3 3M20 15.5H6M9 12.5l-3 3 3 3" />,
  abs: <path d="M6 4.5v15M18 4.5v15M9.5 8l2.5 8.5L14.5 8" />,
  round: <path d="M4 19h5.5a6.5 6.5 0 0 0 6.5-6.5V6M13 6h6" />,
  clip: <path d="M4 5h16M4 19h16M9 8.5l3 3 3-3M9 15.5l3-3 3 3" />,
  sqrt: <path d="M3.5 13h3l3.2 6.5L15 5h5.5" />,
  power: <path d="M4.5 11l7 9M11.5 11l-7 9M14.5 5.8a2.1 2.1 0 0 1 4.2 0c0 1.6-4.2 2.4-4.2 4.7h4.4" />,
  fill_forward: (
    <>
      <path d="M12 4v12M8.5 12.5 12 16l3.5-3.5" />
      <path d="M7 20h10" {...DASH} />
    </>
  ),
  fill_backward: (
    <>
      <path d="M12 20V8M8.5 11.5 12 8l3.5 3.5" />
      <path d="M7 4h10" {...DASH} />
    </>
  ),
  str_case: (
    <>
      <path d="M3 18l4-11 4 11M4.6 14h4.8" />
      <circle cx="17" cy="15" r="3" />
      <path d="M20 12v6" />
    </>
  ),
  str_strip: <path d="M7 4.5H4.5v15H7M17 4.5h2.5v15H17M9 12h6" />,
  str_replace: (
    <>
      <rect x="3" y="8" width="6" height="8" rx="1.5" />
      <rect x="15" y="8" width="6" height="8" rx="1.5" {...TINT} />
      <path d="M10.5 12h3m-1.4-1.6 1.4 1.6-1.4 1.6" />
    </>
  ),
  rank: (
    <>
      <rect x="3.5" y="13" width="5" height="7.5" rx=".8" />
      <rect x="9.5" y="6" width="5" height="14.5" rx=".8" {...TINT} />
      <rect x="15.5" y="10" width="5" height="10.5" rx=".8" />
    </>
  ),
  cumulative_sum: <path d="M4 19.5h4v-4h4v-4h4v-4h4" />,
  shift: <path d="M4 7h8M4 12h8M4 17h8M15 12h5M17.8 9.5 20.3 12l-2.5 2.5" />,
  add_row_index: <path d="M9 4.5 7 19.5M17 4.5l-2 15M4.5 9.5h15M4 14.5h15" />,
  bin: <path d="M3.5 20.5v-5h4.2v5M7.7 20.5v-9h4.2v9M11.9 20.5v-14h4.2v14M16.1 20.5v-8h4.4v8M3 20.5h18" />,
  extract_regex: (
    <path d="M8 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H8M16 5h1.5A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5H16M12 9v6M9.4 10.5l5.2 3M14.6 10.5l-5.2 3" />
  ),
  parse_date: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.2" />
      <path d="M4 10.5h16M8.5 3.5V7M15.5 3.5V7M8 15h5" />
    </>
  ),
  date_part: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.2" />
      <path d="M4 10.5h16M8.5 3.5V7M15.5 3.5V7" />
      <rect x="13" y="13.5" width="4" height="4" rx=".8" {...TINT} />
    </>
  ),
  unpivot: (
    <>
      <rect x="3.5" y="3.5" width="17" height="4.5" rx="1.2" />
      <path d="M9.2 3.5V8M14.8 3.5V8M12 10.5v4M10 12.5l2 2 2-2M8 17.5h8M8 20.5h8" />
    </>
  ),
  map_values: (
    <>
      <circle cx="6" cy="7" r="2.2" />
      <circle cx="17" cy="17" r="2.2" {...TINT} />
      <path d="M8.2 7H14a3 3 0 0 1 3 3v4.8M15.4 13.2l1.6 1.6 1.6-1.6" />
    </>
  ),
  filter: <path d="M4 5.5h16l-6.2 7.6v5.9L10.2 17v-3.9Z" {...TINT} />,
  derive: <path d="M13.5 4.5c-2.3 0-3.5 1.1-3.5 3.5v12M7 11.5h7.5M16 14l4.5 5.5M20.5 14 16 19.5" />,

  union: (
    <>
      <rect x="4" y="4" width="16" height="6" rx="1.8" />
      <rect x="4" y="14" width="16" height="6" rx="1.8" {...TINT} />
      <path d="M12 10.2v3.6" />
    </>
  ),
  join: (
    <>
      <circle cx="9" cy="12" r="5.5" fill="currentColor" fillOpacity={0.1} />
      <circle cx="15" cy="12" r="5.5" fill="currentColor" fillOpacity={0.1} />
    </>
  ),
}

interface NodeIconProps {
  type: string
  category?: string
  className?: string
}

export function NodeIcon({ type, category = 'Transform', className }: NodeIconProps) {
  const glyph = GLYPHS[type] ?? (type.startsWith('fetch_') ? DB_FETCH : type.startsWith('push_') ? DB_PUSH : undefined)
  if (!glyph) return <CategoryIcon category={category} className={className} />
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {glyph}
    </svg>
  )
}

const actionProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function PencilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...actionProps} {...props}>
      <path d="M4.5 19.5h3.8L19 8.8 15.2 5 4.5 15.7Z" />
      <path d="m12.8 7.4 3.8 3.8" />
    </svg>
  )
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...actionProps} {...props}>
      <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10.5 11v5M13.5 11v5" />
    </svg>
  )
}
