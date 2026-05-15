'use client'

import { initials, generateAvatarColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE_CLASSES = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
  xl: 'w-14 h-14 text-lg',
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const bg = generateAvatarColor(name)

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', SIZE_CLASSES[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white shrink-0',
        SIZE_CLASSES[size],
        className
      )}
      style={{ background: bg }}
    >
      {initials(name)}
    </div>
  )
}
