import { ComponentType, SVGProps } from 'react'
import { Hotkey, HotkeyHandler } from '@/shared/hooks/useHotkeys'
import {
  CloseIcon,
  CopyIcon,
  DockIcon,
  DuplicateIcon,
  FitIcon,
  HandIcon,
  KeyboardIcon,
  MoreIcon,
  MouseIcon,
  NodesIcon,
  PanelIcon,
  PasteIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  RedoIcon,
  SelectBoxIcon,
  TrashIcon,
  UndoIcon,
  ZoomIcon,
} from '@/shared/components/ui/icons'

export type IconType = ComponentType<SVGProps<SVGSVGElement>>

export type ShortcutGroup = 'General' | 'Canvas'

export const GROUP_ICONS: Record<ShortcutGroup | 'Mouse', IconType> = {
  General: KeyboardIcon,
  Canvas: NodesIcon,
  Mouse: MouseIcon,
}

interface ShortcutDef {
  label: string
  group: ShortcutGroup
  icon: IconType
  combos: string[]
  show?: string[]
}

export const SHORTCUTS = {
  run: { label: 'Run pipeline', group: 'General', icon: PlayIcon, combos: ['mod+enter'] },
  sidebar: { label: 'Toggle tools sidebar', group: 'General', icon: PanelIcon, combos: ['mod+b'] },
  panel: { label: 'Toggle bottom panel', group: 'General', icon: DockIcon, combos: ['mod+j'] },
  undo: { label: 'Undo', group: 'Canvas', icon: UndoIcon, combos: ['mod+z'] },
  redo: { label: 'Redo', group: 'Canvas', icon: RedoIcon, combos: ['mod+shift+z', 'mod+y'], show: ['mod+shift+z'] },
  copy: { label: 'Copy selected nodes', group: 'Canvas', icon: CopyIcon, combos: ['mod+c'] },
  paste: { label: 'Paste nodes', group: 'Canvas', icon: PasteIcon, combos: ['mod+v'] },
  duplicate: { label: 'Duplicate selected nodes', group: 'Canvas', icon: DuplicateIcon, combos: ['mod+d'] },
  remove: { label: 'Delete selection', group: 'Canvas', icon: TrashIcon, combos: ['delete', 'backspace'], show: ['delete'] },
  rename: { label: 'Rename selected node', group: 'Canvas', icon: PencilIcon, combos: ['f2', 'enter'], show: ['f2'] },
  fit: { label: 'Fit whole pipeline in view', group: 'Canvas', icon: FitIcon, combos: ['shift+1'] },
  zoomSelected: { label: 'Zoom to selected node', group: 'Canvas', icon: ZoomIcon, combos: ['shift+2'] },
  deselect: { label: 'Clear selection', group: 'Canvas', icon: CloseIcon, combos: ['escape'] },
} satisfies Record<string, ShortcutDef>

export type ShortcutId = keyof typeof SHORTCUTS

export const MOUSE_HINTS: { label: string; icon: IconType; keys: string[] }[] = [
  { label: 'Select several nodes with a box', icon: SelectBoxIcon, keys: ['shift', 'Drag'] },
  { label: 'Add or remove from selection', icon: PlusIcon, keys: ['mod', 'Click'] },
  { label: 'Zoom canvas', icon: ZoomIcon, keys: ['Scroll'] },
  { label: 'Pan canvas', icon: HandIcon, keys: ['Drag empty space'] },
  { label: 'Node or connection menu', icon: MoreIcon, keys: ['Right-click'] },
]

export function bind(id: ShortcutId, handler: HotkeyHandler, allowInInput = false): Hotkey[] {
  return SHORTCUTS[id].combos.map((combo) => ({ combo, handler, allowInInput }))
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

const CAPS: Record<string, string> = {
  mod: isMac ? '⌘' : 'Ctrl',
  shift: isMac ? '⇧' : 'Shift',
  alt: isMac ? '⌥' : 'Alt',
  enter: 'Enter',
  delete: 'Del',
  backspace: '⌫',
  escape: 'Esc',
}

export function formatKey(token: string) {
  const lower = token.toLowerCase()
  return CAPS[lower] ?? (token.length === 1 ? token.toUpperCase() : token)
}

export function formatCombo(combo: string) {
  return combo.split('+').map(formatKey)
}
