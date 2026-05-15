'use client'

import { Search, SlidersHorizontal, LayoutGrid, List, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ClientStatus, ViewMode } from '@/types'

const STATUS_OPTIONS: { value: ClientStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'prospect', label: 'Prospectos' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'churned', label: 'Perdidos' },
]

interface ClientFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  statusFilter: ClientStatus | 'all'
  onStatusChange: (v: ClientStatus | 'all') => void
  viewMode: ViewMode
  onViewModeChange: (v: ViewMode) => void
  onNew: () => void
}

export function ClientFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  viewMode,
  onViewModeChange,
  onNew,
}: ClientFiltersProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--color-text-muted)' }}
        />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input-base pl-8 py-1.5 text-xs"
          placeholder="Buscar clientes…"
        />
      </div>

      {/* Status filter */}
      <div
        className="flex items-center rounded-lg p-0.5 gap-0.5"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)' }}
      >
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onStatusChange(opt.value)}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-medium transition-all',
              statusFilter === opt.value
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-200'
            )}
            style={
              statusFilter === opt.value
                ? { background: 'var(--color-primary)' }
                : {}
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* View mode */}
      <div
        className="flex items-center rounded-lg p-0.5 gap-0.5"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)' }}
      >
        <button
          onClick={() => onViewModeChange('grid')}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-all"
          style={{
            background: viewMode === 'grid' ? 'var(--color-primary)' : 'transparent',
            color: viewMode === 'grid' ? 'white' : 'var(--color-text-muted)',
          }}
        >
          <LayoutGrid size={13} />
        </button>
        <button
          onClick={() => onViewModeChange('table')}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-all"
          style={{
            background: viewMode === 'table' ? 'var(--color-primary)' : 'transparent',
            color: viewMode === 'table' ? 'white' : 'var(--color-text-muted)',
          }}
        >
          <List size={13} />
        </button>
      </div>

      {/* New client */}
      <button
        onClick={onNew}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
        style={{ background: 'var(--color-primary)' }}
      >
        <Plus size={13} strokeWidth={2.5} />
        Nuevo Cliente
      </button>
    </div>
  )
}
