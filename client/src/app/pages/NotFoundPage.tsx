import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="rise card" style={{ padding: '32px 40px', maxWidth: 420 }}>
        <div className="kicker mb-2">404</div>
        <h1 className="m-0 mb-2 text-[24px] font-bold tracking-tight">Page not found</h1>
        <p className="m-0 mb-5 text-[14px] text-slate">The page you're looking for doesn't exist or hasn't been built yet.</p>
        <Link to="/workspaces">
          <Button>Back to workspaces</Button>
        </Link>
      </div>
    </div>
  )
}
