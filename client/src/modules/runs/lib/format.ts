export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''

  const now = Date.now()
  const diffInSeconds = Math.max(0, Math.floor((now - date.getTime()) / 1000))

  if (diffInSeconds < 5) return 'just now'
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) return `${diffInDays}d ago`

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) return `${diffInMonths}mo ago`

  return `${Math.floor(diffInMonths / 12)}y ago`
}

export function formatDuration(run: {
  status: string
  created_at: string
  updated_at?: string
  cancelled_at?: string | null
}): string {
  if (run.status === 'queued') {
    return '—'
  }

  const startMs = new Date(run.created_at).getTime()
  if (isNaN(startMs)) return '—'

  if (run.status === 'running' || run.status === 'cancelling') {
    const elapsedMs = Math.max(0, Date.now() - startMs)
    if (elapsedMs < 1000) return '< 1s'
    if (elapsedMs < 60000) return `${(elapsedMs / 1000).toFixed(0)}s`
    const mins = Math.floor(elapsedMs / 60000)
    const secs = Math.floor((elapsedMs % 60000) / 1000)
    return `${mins}m ${secs}s`
  }

  const endMs = new Date(run.cancelled_at || run.updated_at || run.created_at).getTime()
  if (isNaN(endMs)) return '—'

  const diffMs = Math.max(0, endMs - startMs)
  if (diffMs < 1000) return '< 1s'
  if (diffMs < 60000) return `${(diffMs / 1000).toFixed(1)}s`

  const mins = Math.floor(diffMs / 60000)
  const secs = Math.floor((diffMs % 60000) / 1000)
  if (mins < 60) return `${mins}m ${secs}s`

  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}h ${remainingMins}m`
}

export function formatKind(kind: string): string {
  switch (kind?.toLowerCase()) {
    case 'pipeline':
      return 'Pipeline'
    case 'import':
      return 'Import'
    case 'export':
      return 'Export'
    default:
      return kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : 'Unknown'
  }
}
