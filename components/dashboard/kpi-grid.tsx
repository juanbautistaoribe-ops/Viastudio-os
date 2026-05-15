'use client'

import { Users, DollarSign, CheckSquare, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
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
      <StatCard
        title="Facturación Mensual"
        value={stats.monthlyRevenue}
        icon={DollarSign}
        iconColor="#22C55E"
        growth={stats.monthlyRevenueGrowth}
        isCurrency
        delay={0.05}
      />
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
