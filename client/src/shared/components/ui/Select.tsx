import { KeyboardEvent, ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/lib/cn'
import { CheckIcon, ChevronIcon, SearchIcon } from './icons'

export interface SelectOption {
  value: string
  label: string
  icon?: ReactNode
}

interface SelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  searchable?: boolean
  loading?: boolean
}

interface MenuPosition {
  left: number
  width: number
  top?: number
  bottom?: number
  maxHeight: number
}

const MENU_MAX = 260
const GAP = 6
const EDGE = 8

export function Select({ value, options, onChange, placeholder = 'Select…', emptyText = 'No options', searchable, loading }: SelectProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState<MenuPosition | null>(null)

  const showSearch = searchable ?? options.length > 6
  const selected = options.find((option) => option.value === value)
  const missing = value !== '' && !selected

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((option) => option.label.toLowerCase().includes(q)) : options
  }, [options, query])

  function close(refocus = false) {
    setOpen(false)
    setQuery('')
    if (refocus) triggerRef.current?.focus()
  }

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const below = window.innerHeight - rect.bottom - GAP - EDGE
    const above = rect.top - GAP - EDGE
    const up = below < Math.min(MENU_MAX, 160) && above > below
    const maxHeight = Math.min(MENU_MAX, up ? above : below)
    setPosition(
      up
        ? { left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + GAP, maxHeight }
        : { left: rect.left, width: rect.width, top: rect.bottom + GAP, maxHeight },
    )
    setActive(Math.max(0, options.findIndex((option) => option.value === value)))
    setOpen(true)
  }

  function choose(option: SelectOption) {
    onChange(option.value)
    close(true)
  }

  useLayoutEffect(() => {
    if (!open) return
    if (showSearch) searchRef.current?.focus()
    else menuRef.current?.focus()
  }, [open, showSearch])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active, visible])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      close()
    }
    const onScroll = (e: Event) => {
      if (!menuRef.current?.contains(e.target as Node)) close()
    }
    const onResize = () => close()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  function onTriggerKey(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu()
    }
  }

  function onMenuKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close(true)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(visible.length - 1, i + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActive(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActive(Math.max(0, visible.length - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const option = visible[active]
      if (option) choose(option)
    } else if (event.key === 'Tab') {
      close()
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn('sel-trigger', open && 'open', missing && 'missing')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onTriggerKey}
      >
        {selected?.icon && <span className="sel-ico">{selected.icon}</span>}
        <span className={cn('sel-val', !value && 'ph')}>{selected?.label ?? (value || placeholder)}</span>
        {missing && <span className="sel-flag">missing</span>}
        <ChevronIcon className="sel-chev" />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            tabIndex={-1}
            className="sel-menu"
            style={{ left: position.left, width: position.width, top: position.top, bottom: position.bottom, maxHeight: position.maxHeight }}
            onKeyDown={onMenuKey}
          >
            {showSearch && (
              <div className="sel-search">
                <SearchIcon />
                <input
                  ref={searchRef}
                  value={query}
                  placeholder="Search…"
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setActive(0)
                  }}
                />
              </div>
            )}
            <div ref={listRef} className="sel-list" role="listbox">
              {loading && <div className="sel-empty">Loading…</div>}
              {!loading && visible.length === 0 && <div className="sel-empty">{query ? `No match for “${query}”` : emptyText}</div>}
              {!loading &&
                visible.map((option, index) => (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={option.value === value}
                    data-index={index}
                    className={cn('sel-opt', index === active && 'active', option.value === value && 'on')}
                    onMouseMove={() => active !== index && setActive(index)}
                    onClick={() => choose(option)}
                  >
                    {option.icon && <span className="sel-ico">{option.icon}</span>}
                    <span className="sel-txt">{option.label}</span>
                    {option.value === value && <CheckIcon className="sel-check" />}
                  </div>
                ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
