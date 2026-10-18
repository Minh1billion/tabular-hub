import { useEffect, useRef } from 'react'

export type HotkeyHandler = (event: KeyboardEvent) => boolean | void

export interface Hotkey {
  combo: string
  handler: HotkeyHandler
  allowInInput?: boolean
}

function matches(event: KeyboardEvent, combo: string) {
  const parts = combo.toLowerCase().split('+')
  const key = parts[parts.length - 1]
  const mods = parts.slice(0, -1)
  if (mods.includes('mod') !== (event.ctrlKey || event.metaKey)) return false
  if (mods.includes('alt') !== event.altKey) return false
  if (key === '?') return event.key === '?' || (event.code === 'Slash' && event.shiftKey)
  if (mods.includes('shift') !== event.shiftKey) return false
  if (/^\d$/.test(key)) return event.code === `Digit${key}`
  return event.key.toLowerCase() === key
}

export function useHotkeys(hotkeys: Hotkey[]) {
  const ref = useRef(hotkeys)
  ref.current = hotkeys

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing || document.querySelector('.overlay')) return
      const editable = event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')
      for (const hotkey of ref.current) {
        if (editable && !hotkey.allowInInput) continue
        if (!matches(event, hotkey.combo)) continue
        if (hotkey.handler(event) === false) continue
        event.preventDefault()
        return
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])
}
