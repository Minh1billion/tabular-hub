import { useEffect, useState } from 'react'
import { cn } from '@/shared/lib/cn'

interface AvatarProps {
  name: string
  imageUrl?: string | null
  size?: number
  className?: string
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function Avatar({ name, imageUrl, size = 28, className }: AvatarProps) {
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [imageUrl])

  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className={cn(
          'rounded-full object-cover shrink-0 ring-1 ring-black/10 bg-cream-soft',
          className,
        )}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-br from-[#1b573f] to-brand-deep text-brand-tint flex items-center justify-center font-headline font-semibold shrink-0 ring-1 ring-black/15 shadow-inner select-none',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }}
    >
      {getInitials(name)}
    </div>
  )
}

