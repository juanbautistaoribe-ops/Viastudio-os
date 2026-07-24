'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { KPIGrid } from '@/components/dashboard/kpi-grid'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { UpcomingTasks } from '@/components/dashboard/upcoming-tasks'
import { ClientsOverview } from '@/components/dashboard/clients-overview'
import { UpcomingEvents } from '@/components/dashboard/upcoming-events'
import { AISummaryWidget } from '@/components/dashboard/ai-summary-widget'
import type { DashboardStats, Client, Task, CalendarEvent, Activity } from '@/types'

const EMPTY_STATS: DashboardStats = {
  activeClients: 0,
  activeClientsGrowth: 0,
  monthlyRevenue: 0,
  monthlyRevenueARS: 0,
  monthlyRevenueUSD: 0,
  monthlyRevenueGrowth: 0,
  pendingTasks: 0,
  criticalTasks: 0,
  activeLeads: 0,
  leadsValue: 0,
  leadsValueGrowth: 0,
  upcomingEvents: 0,
  tasksCompletedThisWeek: 0,
  newClientsThisMonth: 0,
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [clients, setClients] = useState<Client[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(data => {
        if (data.stats) setStats(data.stats)
        if (data.clients) setClients(data.clients)
        if (data.tasks) setTasks(data.tasks)
        if (data.events) setEvents(data.events)
        if (data.activities) setActivities(data.activities)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <KPIGrid stats={stats} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <AISummaryWidget />
          </div>
          <UpcomingEvents events={events} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <UpcomingTasks tasks={tasks} />
          <RecentActivity activities={activities} />
          <ClientsOverview clients={clients} />
        </div>
      </main>
    </div>
  )
}
