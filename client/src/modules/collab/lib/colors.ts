const PALETTE = ['#d9480f', '#1c7ed6', '#2f9e44', '#9c36b5', '#c2255c', '#e8590c', '#0c8599', '#5f3dc4']

export function userColor(userId: string) {
  let hash = 0
  for (let i = 0; i < userId.length; i += 1) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

export function userLabel(user: { display_name: string | null; email: string }) {
  return user.display_name || user.email
}
