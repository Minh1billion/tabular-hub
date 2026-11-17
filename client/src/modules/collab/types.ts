export type LockKind = 'node' | 'edge'

export interface LockTarget {
  kind: LockKind
  id: string
}

export interface CollabUser {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
}

export interface LockEntry extends LockTarget {
  user_id: string
  conn_id: string
}

export interface LockHolder {
  userId: string
  name: string
  avatarUrl: string | null
  color: string
}

export type CollabStatus = 'connecting' | 'open' | 'closed'

export type ServerMessage =
  | {
      type: 'hello'
      conn_id: string
      user: CollabUser
      spec_version: number
      heartbeat_seconds: number
      lock_ttl_seconds: number
      users: CollabUser[]
      locks: LockEntry[]
    }
  | { type: 'sync'; users: CollabUser[]; locks: LockEntry[] }
  | { type: 'presence.joined'; user: CollabUser }
  | { type: 'presence.left'; user_id: string }
  | ({ type: 'lock.acquired' } & LockEntry)
  | ({ type: 'lock.released' } & LockEntry)
  | ({ type: 'lock.denied'; reason: string } & Partial<LockEntry> & LockTarget)
  | ({ type: 'lock.lost' } & LockTarget)
  | { type: 'spec.updated'; version: number; spec: unknown; actor_id: string }
  | { type: 'kicked'; reason: string }
  | { type: 'pong' }
  | { type: 'error'; message: string }

export function lockKey(kind: LockKind, id: string) {
  return `${kind}:${id}`
}

export function targetKey(target: LockTarget) {
  return lockKey(target.kind, target.id)
}
