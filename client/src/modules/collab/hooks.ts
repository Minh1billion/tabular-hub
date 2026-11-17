import { useCallback, useEffect, useRef, useState } from 'react'
import { wsUrl } from '@/shared/lib/api-client'
import { CollabStatus, CollabUser, LockEntry, LockTarget, ServerMessage, targetKey } from './types'

const CLOSE_UNAUTHORIZED = 4401
const CLOSE_REMOVED = 4403
const CLOSE_NOT_FOUND = 4404
const MAX_BACKOFF_MS = 15000
const RENEW_THROTTLE_MS = 4000

interface UseCollabOptions {
  workspaceId: string
  enabled: boolean
  onSpecUpdated: (version: number, spec: unknown, actorId: string) => void
  onHello: (specVersion: number) => void
  onAccessLost: () => void
  onLockDenied: (target: LockTarget) => void
}

export function useCollab(options: UseCollabOptions) {
  const { workspaceId, enabled } = options
  const [status, setStatus] = useState<CollabStatus>('connecting')
  const [me, setMe] = useState<CollabUser | null>(null)
  const [connId, setConnId] = useState<string | null>(null)
  const [users, setUsers] = useState<CollabUser[]>([])
  const [locks, setLocks] = useState<LockEntry[]>([])

  const optionsRef = useRef(options)
  optionsRef.current = options
  const socketRef = useRef<WebSocket | null>(null)
  const desiredRef = useRef(new Map<string, LockTarget>())
  const lastRenewRef = useRef(0)

  const send = useCallback((message: Record<string, unknown>) => {
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
  }, [])

  useEffect(() => {
    if (!enabled || !workspaceId) return

    let disposed = false
    let retries = 0
    let socket: WebSocket | null = null
    let heartbeat: ReturnType<typeof setInterval> | null = null
    let reconnect: ReturnType<typeof setTimeout> | null = null

    function stopHeartbeat() {
      if (heartbeat) clearInterval(heartbeat)
      heartbeat = null
    }

    function handle(message: ServerMessage) {
      switch (message.type) {
        case 'hello':
          retries = 0
          setStatus('open')
          setMe(message.user)
          setConnId(message.conn_id)
          setUsers(message.users)
          setLocks(message.locks)
          stopHeartbeat()
          heartbeat = setInterval(() => send({ type: 'heartbeat' }), message.heartbeat_seconds * 1000)
          desiredRef.current.forEach((target) => send({ type: 'lock.acquire', ...target }))
          optionsRef.current.onHello(message.spec_version)
          break
        case 'sync':
          setUsers(message.users)
          setLocks(message.locks)
          break
        case 'presence.joined':
          setUsers((current) => [...current.filter((user) => user.id !== message.user.id), message.user])
          break
        case 'presence.left':
          setUsers((current) => current.filter((user) => user.id !== message.user_id))
          setLocks((current) => current.filter((lock) => lock.user_id !== message.user_id))
          break
        case 'lock.acquired':
          setLocks((current) => [
            ...current.filter((lock) => !(lock.kind === message.kind && lock.id === message.id)),
            { kind: message.kind, id: message.id, user_id: message.user_id, conn_id: message.conn_id },
          ])
          break
        case 'lock.released':
          setLocks((current) =>
            current.filter(
              (lock) => !(lock.kind === message.kind && lock.id === message.id && lock.conn_id === message.conn_id),
            ),
          )
          break
        case 'lock.denied':
          desiredRef.current.delete(targetKey(message))
          optionsRef.current.onLockDenied({ kind: message.kind, id: message.id })
          break
        case 'lock.lost':
          if (desiredRef.current.has(targetKey(message))) send({ type: 'lock.acquire', kind: message.kind, id: message.id })
          break
        case 'spec.updated':
          optionsRef.current.onSpecUpdated(message.version, message.spec, message.actor_id)
          break
        case 'kicked':
          optionsRef.current.onAccessLost()
          break
        default:
          break
      }
    }

    function connect() {
      if (disposed) return
      setStatus('connecting')
      const next = new WebSocket(wsUrl(`/ws/workspaces/${workspaceId}`))
      socket = next
      socketRef.current = next

      next.onmessage = (event) => {
        try {
          handle(JSON.parse(event.data) as ServerMessage)
        } catch {
          return
        }
      }

      next.onclose = (event) => {
        stopHeartbeat()
        if (socketRef.current === next) socketRef.current = null
        setStatus('closed')
        setConnId(null)
        setLocks([])
        if (disposed) return
        if (event.code === CLOSE_REMOVED) {
          optionsRef.current.onAccessLost()
          return
        }
        if (event.code === CLOSE_UNAUTHORIZED || event.code === CLOSE_NOT_FOUND) return
        const delay = Math.min(1000 * 2 ** retries, MAX_BACKOFF_MS) * (0.75 + Math.random() * 0.5)
        retries += 1
        reconnect = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      disposed = true
      stopHeartbeat()
      if (reconnect) clearTimeout(reconnect)
      socketRef.current = null
      socket?.close()
      setUsers([])
      setLocks([])
      setMe(null)
      setConnId(null)
    }
  }, [workspaceId, enabled, send])

  const syncSelection = useCallback(
    (targets: LockTarget[]) => {
      const next = new Map(targets.map((target) => [targetKey(target), target]))
      next.forEach((target, key) => {
        if (!desiredRef.current.has(key)) send({ type: 'lock.acquire', ...target })
      })
      desiredRef.current.forEach((target, key) => {
        if (!next.has(key)) send({ type: 'lock.release', ...target })
      })
      desiredRef.current = next
      lastRenewRef.current = Date.now()
    },
    [send],
  )

  const touch = useCallback(() => {
    if (desiredRef.current.size === 0) return
    const now = Date.now()
    if (now - lastRenewRef.current < RENEW_THROTTLE_MS) return
    lastRenewRef.current = now
    send({ type: 'lock.renew' })
  }, [send])

  return { status, me, connId, users, locks, syncSelection, touch }
}
