const WORKSPACE_ACCENT_COLORS = [
  'var(--brand)',
  'var(--accent-teal)',
  'var(--accent-clay)',
  'var(--accent-plum)',
  'var(--accent-gold)',
  'var(--accent-olive)',
]

export function workspaceColorFor(id: string): string {
  const index = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return WORKSPACE_ACCENT_COLORS[index % WORKSPACE_ACCENT_COLORS.length]
}