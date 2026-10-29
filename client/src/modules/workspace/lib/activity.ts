import { WorkspaceListItem } from '../types'

export type WorkspaceSort = 'recent' | 'name'

const ACCESSED_STORAGE_KEY = 'tabular-hub:workspaces:accessed'

function readAccessedMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(ACCESSED_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

export function touchWorkspace(workspaceId: string): void {
  if (!workspaceId) return
  try {
    const map = readAccessedMap()
    map[workspaceId] = Date.now()
    localStorage.setItem(ACCESSED_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Storage unavailable (private mode)
  }
}

export function lastAccessedAt(workspaceId: string): number {
  const map = readAccessedMap()
  return map[workspaceId] ?? 0
}

/** Most recent moment the user touched the workspace: an access, an edit/save, or a pipeline run. */
export function lastActivityAt(workspace: WorkspaceListItem): number {
  const edited = new Date(workspace.updated_at ?? workspace.created_at).getTime()
  const ran = workspace.last_run ? new Date(workspace.last_run.created_at).getTime() : 0
  const accessed = lastAccessedAt(workspace.id)
  return Math.max(edited, ran, accessed)
}

export function nodeCount(workspace: WorkspaceListItem): number {
  return workspace.spec?.nodes?.length ?? 0
}

export function sortWorkspaces(workspaces: WorkspaceListItem[], sort: WorkspaceSort): WorkspaceListItem[] {
  const sorted = [...workspaces]
  if (sort === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }))
  } else {
    sorted.sort((a, b) => lastActivityAt(b) - lastActivityAt(a))
  }
  return sorted
}

const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.35],
  ['month', 12],
  ['year', Infinity],
]

/** "just now", "5 minutes ago", "yesterday", "3 weeks ago"… */
export function formatRelative(value: string | number, now = Date.now()): string {
  let delta = (new Date(value).getTime() - now) / 1000
  if (Math.abs(delta) < 45) return 'just now'
  for (const [unit, size] of STEPS) {
    if (Math.abs(delta) < size) return RELATIVE.format(Math.round(delta), unit)
    delta /= size
  }
  return RELATIVE.format(Math.round(delta), 'year')
}

export function formatAbsolute(value: string | number): string {
  return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

