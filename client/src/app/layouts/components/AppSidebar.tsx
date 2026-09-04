import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'

export function AppSidebar() {
  const location = useLocation()
  const isHomeActive = location.pathname === '/'
  const isWorkspacesActive = location.pathname.startsWith('/workspaces')
  const isBillingActive = location.pathname.startsWith('/billing')

  const homeRef = useRef<HTMLAnchorElement>(null)
  const workspacesRef = useRef<HTMLAnchorElement>(null)
  const billingRef = useRef<HTMLAnchorElement>(null)
  const [highlightY, setHighlightY] = useState(0)

  useLayoutEffect(() => {
    const el = isHomeActive ? homeRef.current : isWorkspacesActive ? workspacesRef.current : billingRef.current
    if (el) setHighlightY(el.offsetTop)
  }, [isHomeActive, isWorkspacesActive, isBillingActive])

  return (
    <nav className="relative w-14 bg-white border-r border-line flex flex-col items-center py-4 gap-1.5">
      <div
        className="absolute left-1/2 top-0 w-9 h-9 rounded-[9px] bg-[#32664d] transition-transform duration-300 ease-out"
        style={{ transform: `translate(-50%, ${highlightY}px)` }}
      />

      <Link
        ref={homeRef}
        to="/"
        title="Home"
        aria-label="Home"
        className={cn(
          'relative z-10 w-9 h-9 flex items-center justify-center rounded-[9px] transition-colors',
          isHomeActive
            ? 'border-2 border-black bg-[#32664d] text-[#f5f5ef]'
            : 'border-[1.5px] border-[#ddddc4] text-slate hover:bg-cream-soft',
        )}
      >
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
        </svg>
      </Link>

      <div className="w-6 h-px bg-line my-0.5" />

      <Link
        ref={workspacesRef}
        to="/workspaces"
        title="Workspaces"
        aria-label="Workspaces"
        className={cn(
          'relative z-10 w-9 h-9 flex items-center justify-center rounded-[9px] transition-colors',
          isWorkspacesActive
            ? 'border-2 border-black bg-[#32664d] text-[#f5f5ef]'
            : 'border-[1.5px] border-[#ddddc4] text-slate hover:bg-cream-soft',
        )}
      >
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 10h16M10 10v10" />
        </svg>
      </Link>

      <div className="w-6 h-px bg-line my-0.5" />

      <Link
        ref={billingRef}
        to="/billing"
        title="Billing"
        aria-label="Billing"
        className={cn(
          'relative z-10 w-9 h-9 flex items-center justify-center rounded-[9px] transition-colors',
          isBillingActive
            ? 'border-2 border-black bg-[#32664d] text-[#f5f5ef]'
            : 'border-[1.5px] border-[#ddddc4] text-slate hover:bg-cream-soft',
        )}
      >
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      </Link>
    </nav>
  )
}