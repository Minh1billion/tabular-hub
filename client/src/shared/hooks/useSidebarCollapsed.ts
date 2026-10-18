import { useCallback, useState } from 'react'

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false)
  const toggle = useCallback(() => setCollapsed((c) => !c), [])
  return { collapsed, toggle }
}
