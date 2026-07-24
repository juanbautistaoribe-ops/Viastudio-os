'use client'

import { motion } from 'framer-motion'
import { Users, DollarSign, CheckSquare, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { formatCurrency } from '@/lib/utils'
import type { DashboardStats } from '@/types'

interface KPIGridProps {
  stats: DashboardStats
}

export function KPIGrid({ stats }: KPIGridProps) {
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

      {/* Facturación split ARS / USD */}
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
              {formatCurrency(stats.monthlyRevenueARS, 'ARS')}
            </p>
          </div>
          <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '8px' }}>
            <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Dólares</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
              {formatCurrency(stats.monthlyRevenueUSD, 'USD')}
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
