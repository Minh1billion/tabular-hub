import { cn } from '@/shared/lib/cn'
import { oauthLoginUrl } from '@/shared/lib/api-client'
import { OAuthProvider } from '../types'

const providerConfig: Record<OAuthProvider, { label: string; className: string }> = {
  google: {
    label: 'Continue with Google',
    className: 'bg-white border border-line text-ink hover:border-[#c7ccc4] hover:bg-cream-soft',
  },
  github: {
    label: 'Continue with GitHub',
    className: 'bg-brand-deep border border-brand-deep text-[#eff3ec] hover:bg-[#0e3325]',
  },
}

function GoogleIcon() {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3a7.15 7.15 0 0 1-10.66-3.76H1.4v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.41 14.34a7.2 7.2 0 0 1 0-4.6V6.63H1.4a12 12 0 0 0 0 10.82l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.35.6 4.6 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.4 6.63l4.01 3.11A7.15 7.15 0 0 1 12 4.76Z"
      />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 16 16" fill="#EFF3EC">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

const icons: Record<OAuthProvider, () => JSX.Element> = {
  google: GoogleIcon,
  github: GitHubIcon,
}

interface OAuthButtonProps {
  provider: OAuthProvider
}

export function OAuthButton({ provider }: OAuthButtonProps) {
  const { label, className } = providerConfig[provider]
  const Icon = icons[provider]

  return (
    <a
      href={oauthLoginUrl(provider)}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-[13px] rounded-[10px] font-medium text-sm cursor-pointer transition-all active:scale-[0.98]',
        className,
      )}
    >
      <Icon />
      <span className="flex-1 text-left">{label}</span>
    </a>
  )
}