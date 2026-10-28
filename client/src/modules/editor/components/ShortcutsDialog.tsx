import { Fragment } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { GROUP_ICONS, MOUSE_HINTS, SHORTCUTS, ShortcutGroup, formatCombo, formatKey } from '../shortcuts'

const GROUPS: ShortcutGroup[] = ['General', 'Canvas']

function Caps({ keys }: { keys: string[] }) {
  return (
    <span className="sc-combo">
      {keys.map((key) => (
        <kbd key={key}>{key}</kbd>
      ))}
    </span>
  )
}

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose} className="sc-modal">
      {GROUPS.map((group) => {
        const GroupIcon = GROUP_ICONS[group]
        return (
        <section key={group} className="sc-group">
          <h3>
            <GroupIcon />
            {group}
          </h3>
          <ul className="sc-list">
            {Object.values(SHORTCUTS)
              .filter((shortcut) => shortcut.group === group)
              .map((shortcut) => {
                const combos: readonly string[] = 'show' in shortcut ? shortcut.show : shortcut.combos
                const ShortcutIcon = shortcut.icon
                return (
                  <li key={shortcut.label}>
                    <span className="sc-label">
                      <i className="sc-ico">
                        <ShortcutIcon />
                      </i>
                      {shortcut.label}
                    </span>
                    <span className="sc-keys">
                      {combos.map((combo, index) => (
                        <Fragment key={combo}>
                          {index > 0 && <em>or</em>}
                          <Caps keys={formatCombo(combo)} />
                        </Fragment>
                      ))}
                    </span>
                  </li>
                )
              })}
          </ul>
        </section>
        )
      })}

      <section className="sc-group">
        <h3>
          <GROUP_ICONS.Mouse />
          Mouse
        </h3>
        <ul className="sc-list">
          {MOUSE_HINTS.map((hint) => (
            <li key={hint.label}>
              <span className="sc-label">
                <i className="sc-ico">
                  <hint.icon />
                </i>
                {hint.label}
              </span>
              <span className="sc-keys">
                <Caps keys={hint.keys.map(formatKey)} />
              </span>
            </li>
          ))}
        </ul>
      </section>

    </Modal>
  )
}
