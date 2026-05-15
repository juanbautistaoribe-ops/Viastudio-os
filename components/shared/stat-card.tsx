'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react'
import { cn, formatCurrency, getGrowthColor } from '@/lib/utils'

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
  const displayValue = isCurrency
    ? formatCurrency(Number(value), currency)
    : value

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
