'use client'

import { useState, useMemo, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { ClientCard } from '@/components/crm/client-card'
import { ClientFilters } from '@/components/crm/client-filters'
import { ClientTable } from '@/components/crm/client-table'
import { EmptyState } from '@/components/shared/empty-state'
import { NewClientModal } from '@/components/crm/new-client-modal'
import type { Client, ClientStatus, ViewMode } from '@/types'
import { Users } from 'lucide-react'

export default function CRMPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  function loadClients() {
    setLoading(true)
    fetch('/api/clients')
      .then(r => r.json())
      .then(data => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadClients() }, [])

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch =
        !search ||
        c.company.toLowerCase().includes(search.toLowerCase()) ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [clients, search, statusFilter])

  const stats = useMemo(() => ({
    total: clients.length,
    active: clients.filter(c => c.status === 'active' || c.status === 'ACTIVE').length,
    prospects: clients.filter(c => c.status === 'prospect' || c.status === 'PROSPECT').length,
    mrr: clients.reduce((a, c) => a + (c.monthlyValue ?? 0), 0),
  }), [clients])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-6 mb-5">
          {[
            { label: 'Total', value: stats.total, color: 'var(--color-text)' },
            { label: 'Activos', value: stats.active, color: 'var(--color-success)' },
            { label: 'Prospectos', value: stats.prospects, color: 'var(--color-info)' },
            { label: 'MRR', value: `$${(stats.mrr / 1000).toFixed(1)}k`, color: 'var(--color-accent)' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
              <p className="text-lg font-bold tabular-nums" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        <div className="mb-5">
          <ClientFilters
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onNew={() => setShowNew(true)}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={clients.length === 0 ? 'Aún no hay clientes' : 'No se encontraron clientes'}
            description={clients.length === 0 ? 'Agregá tu primer cliente para empezar.' : 'Intenta ajustar tu búsqueda o filtros.'}
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
      <NewClientModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={loadClients}
      />
    </div>
  )
}
