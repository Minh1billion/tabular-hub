import { PropsWithChildren, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'

export const TopbarSlotContext = createContext<HTMLElement | null>(null)

export function TopbarPortal({ children }: PropsWithChildren) {
  const slot = useContext(TopbarSlotContext)
  return slot ? createPortal(children, slot) : null
}
