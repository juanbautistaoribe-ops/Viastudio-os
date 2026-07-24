'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, DollarSign, CheckSquare, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { formatCurrency } from '@/lib/utils'
import type { DashboardStats } from '@/types'

function useCountUp(target: number, duration = 900, delayMs = 0) {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0) { setCurrent(0); return }
    let startTime: number | null = null
    const timeoutId = setTimeout(() => {
      function step(timestamp: number) {
        if (!startTime) startTime = timestamp
        const progress = Math.min((timestamp - startTime) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setCurrent(Math.round(target * eased))
        if (progress < 1) rafRef.current = requestAnimationFrame(step)
      }
      rafRef.current = requestAnimationFrame(step)
    }, delayMs)
    return () => { clearTimeout(timeoutId); cancelAnimationFrame(rafRef.current) }
  }, [target, duration, delayMs])

  return current
}

function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="h-3 w-24 rounded" style={{ background: 'var(--color-surface-3)' }} />
        <div className="w-8 h-8 rounded-lg" style={{ background: 'var(--color-surface-3)' }} />
      </div>
      <div className="h-8 w-20 rounded" style={{ background: 'var(--color-surface-3)' }} />
      <div className="h-3 w-28 rounded mt-2" style={{ background: 'var(--color-surface-3)' }} />
    </div>
  )
}

interface KPIGridProps {
  stats: DashboardStats
  loading?: boolean
}

export function KPIGrid({ stats, loading }: KPIGridProps) {
  const arsAnimated = useCountUp(stats.monthlyRevenueARS, 900, 50)
  const usdAnimated = useCountUp(stats.monthlyRevenueUSD, 900, 50)

  if (loading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        title="Clientes Activos"
        value={stats.activeClients}
        icon={Users}
        iconColor="#6F2BFA"
        growth={stats.activeClientsGrowth}
        delay={0}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="card card-hover p-5"
      >
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-2)' }}>
            Facturación Mensual
          </p>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: '#22C55E18', color: '#22C55E' }}
          >
            <DollarSign size={15} strokeWidth={2} />
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Pesos</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
              {formatCurrency(arsAnimated, 'ARS')}
            </p>
          </div>
          <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '8px' }}>
            <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Dólares</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
              {formatCurrency(usdAnimated, 'USD')}
            </p>
          </div>
        </div>
      </motion.div>

      <StatCard
        title="Tareas Abiertas"
        value={stats.pendingTasks}
        icon={CheckSquare}
        iconColor="#F59E0B"
        growth={undefined}
        growthLabel={`${stats.criticalTasks} críticas`}
        delay={0.1}
      />
      <StatCard
        title="Valor del Pipeline"
        value={stats.leadsValue}
        icon={TrendingUp}
        iconColor="#3B82F6"
        growth={stats.leadsValueGrowth}
        isCurrency
        delay={0.15}
      />
    </div>
  )
}
