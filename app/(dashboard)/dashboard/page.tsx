import { Header } from '@/components/layout/header'
import { KPIGrid } from '@/components/dashboard/kpi-grid'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { UpcomingTasks } from '@/components/dashboard/upcoming-tasks'
import { ClientsOverview } from '@/components/dashboard/clients-overview'
import { UpcomingEvents } from '@/components/dashboard/upcoming-events'
import {
  MOCK_STATS,
  MOCK_ACTIVITIES,
  MOCK_TASKS,
  MOCK_CLIENTS,
  MOCK_EVENTS,
} from '@/lib/mock-data'
import { AISummaryWidget } from '@/components/dashboard/ai-summary-widget'

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPIs */}
        <KPIGrid stats={MOCK_STATS} />

        {/* Row 2: AI Summary + Events */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <AISummaryWidget />
          </div>
          <UpcomingEvents events={MOCK_EVENTS} />
        </div>

        {/* Row 3: Tasks + Activity + Clients */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <UpcomingTasks tasks={MOCK_TASKS} />
          <RecentActivity activities={MOCK_ACTIVITIES} />
          <ClientsOverview clients={MOCK_CLIENTS} />
        </div>
      </main>
    </div>
  )
}
