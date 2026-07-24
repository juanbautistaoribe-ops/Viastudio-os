'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react'
import { cn, formatCurrency, getGrowthColor } from '@/lib/utils'

function useCountUp(target: number, duration = 900, delay = 0) {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0) { setCurrent(0); return }
    let startTime: number | null = null
    const startVal = 0

    const timeoutId = setTimeout(() => {
      function step(timestamp: number) {
        if (!startTime) startTime = timestamp
        const elapsed = timestamp - startTime
        const progress = Math.min(elapsed / duration, 1)
        // ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setCurrent(Math.round(startVal + (target - startVal) * eased))
        if (progress < 1) rafRef.current = requestAnimationFrame(step)
      }
      rafRef.current = requestAnimationFrame(step)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
      cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, delay])

  return current
}

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  growth?: number
  growthLabel?: string
  isCurrency?: boolean
  currency?: string
  className?: string
  delay?: number
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = 'var(--color-primary)',
  growth,
  growthLabel = 'vs mes anterior',
  isCurrency,
  currency = 'USD',
  className,
  delay = 0,
}: StatCardProps) {
  const numericValue = typeof value === 'number' ? value : Number(value)
  const animated = useCountUp(numericValue, 900, delay * 1000)

  const displayValue = typeof value === 'string'
    ? value
    : isCurrency
      ? formatCurrency(animated, currency)
      : animated

  const GrowthIcon = growth === undefined ? null
    : growth > 0 ? TrendingUp
    : growth < 0 ? TrendingDown
    : Minus

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={cn('card card-hover p-5', className)}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-medium" style={{ color: 'var(--color-text-2)' }}>
          {title}
        </p>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${iconColor}18`, color: iconColor }}
        >
          <Icon size={15} strokeWidth={2} />
        </div>
      </div>

      <div className="space-y-1">
        <p
          className="text-2xl font-bold tracking-tight tabular-nums"
          style={{ color: 'var(--color-text)' }}
        >
          {displayValue}
        </p>

        {growth !== undefined && GrowthIcon && (
          <div className="flex items-center gap-1">
            <GrowthIcon
              size={12}
              className={cn(getGrowthColor(growth))}
              strokeWidth={2.5}
            />
            <span className={cn('text-xs font-medium', getGrowthColor(growth))}>
              {growth > 0 ? '+' : ''}{growth}%
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {growthLabel}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
