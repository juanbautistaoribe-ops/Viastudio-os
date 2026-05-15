'use client'

import { useState, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { ClientCard } from '@/components/crm/client-card'
import { ClientFilters } from '@/components/crm/client-filters'
import { ClientTable } from '@/components/crm/client-table'
import { EmptyState } from '@/components/shared/empty-state'
import { MOCK_CLIENTS } from '@/lib/mock-data'
import type { ClientStatus, ViewMode } from '@/types'
import { Users } from 'lucide-react'

export default function CRMPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const filtered = useMemo(() => {
    return MOCK_CLIENTS.filter((c) => {
      const matchSearch =
        !search ||
        c.company.toLowerCase().includes(search.toLowerCase()) ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Summary bar */}
        <div className="flex items-center gap-6 mb-5">
          {[
            { label: 'Total', value: MOCK_CLIENTS.length, color: 'var(--color-text)' },
            { label: 'Activos', value: MOCK_CLIENTS.filter(c => c.status === 'active').length, color: 'var(--color-success)' },
            { label: 'Prospectos', value: MOCK_CLIENTS.filter(c => c.status === 'prospect').length, color: 'var(--color-info)' },
            {
              label: 'MRR',
              value: `$${(MOCK_CLIENTS.reduce((a, c) => a + c.monthlyValue, 0) / 1000).toFixed(1)}k`,
              color: 'var(--color-accent)',
            },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
              <p className="text-lg font-bold tabular-nums" style={{ color }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-5">
          <ClientFilters
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onNew={() => {}}
          />
        </div>

        {/* Content */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No se encontraron clientes"
            description="Intenta ajustar tu búsqueda o filtros."
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filtered.map((client, i) => (
              <ClientCard key={client.id} client={client} delay={i * 0.04} />
            ))}
          </div>
        ) : (
          <ClientTable clients={filtered} />
        )}
      </main>
    </div>
  )
}
