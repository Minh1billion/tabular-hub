import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="font-mono text-xs text-muted tracking-wide">404</div>
      <h1 className="font-headline font-semibold text-2xl">Page not found</h1>
      <p className="text-sm text-slate max-w-sm">
        The page you're looking for doesn't exist or hasn't been built yet.
      </p>
      <Link
        to="/workspaces"
        className="mt-2 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand-hover transition-colors"
      >
        Back to workspaces
      </Link>
    </div>
  )
}
