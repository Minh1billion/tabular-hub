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
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
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
        className={cn('avatar', className)}
      />
    )
  }
  return (
    <div className={cn('avatar', className)} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {getInitials(name)}
    </div>
  )
}
