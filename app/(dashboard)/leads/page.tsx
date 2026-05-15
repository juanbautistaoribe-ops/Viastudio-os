'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Header } from '@/components/layout/header'
import { Avatar } from '@/components/shared/avatar'
import { EmptyState } from '@/components/shared/empty-state'
import { MOCK_LEADS } from '@/lib/mock-data'
import { formatCurrency, formatDate, getStatusBadgeClass, getStatusLabel } from '@/lib/utils'
import { Plus, Search, TrendingUp, Clock, MoreHorizontal, ArrowRight } from 'lucide-react'
import type { Lead, LeadStatus } from '@/types'

const PIPELINE_STAGES: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'new',         label: 'Nuevo',        color: '#3B82F6' },
  { id: 'contacted',   label: 'Contactado',   color: '#8B5CF6' },
  { id: 'qualified',   label: 'Calificado',   color: '#F59E0B' },
  { id: 'proposal',    label: 'Propuesta',    color: '#6F2BFA' },
  { id: 'negotiation', label: 'Negociación',  color: '#EC4899' },
  { id: 'won',         label: 'Ganado',       color: '#22C55E' },
]

const SOURCE_LABELS: Record<string, string> = {
  referral: 'Referido', inbound: 'Inbound', outbound: 'Outbound',
  social: 'Social', ads: 'Publicidad', event: 'Evento', other: 'Otro',
}

const PRIORITY_DOT: Record<string, string> = {
  high: '#EF4444', medium: '#F59E0B', low: '#3B82F6',
}

export default function LeadsPage() {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'pipeline' | 'list'>('pipeline')

  const filtered = useMemo(() => {
    return MOCK_LEADS.filter((l) =>
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.company.toLowerCase().includes(search.toLowerCase())
    )
  }, [search])

  const totalValue = MOCK_LEADS.reduce((a, l) => a + l.potentialValue, 0)
  const wonValue = MOCK_LEADS.filter(l => l.status === 'won').reduce((a, l) => a + l.potentialValue, 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        actions={
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={13} strokeWidth={2.5} /> Nuevo Lead
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Leads activos', value: MOCK_LEADS.filter(l => !['won','lost'].includes(l.status)).length, color: '#6F2BFA' },
            { label: 'Valor del pipeline', value: formatCurrency(totalValue), color: '#22C55E' },
            { label: 'Ganado este mes', value: formatCurrency(wonValue), color: '#F59E0B' },
            { label: 'Tasa de conversión', value: '32%', color: '#3B82F6' },
          ].map(({ label, value, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card p-4"
            >
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
              <p className="text-xl font-bold tabular-nums" style={{ color }}>{value}</p>
            </motion.div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-72">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-base pl-8 py-1.5 text-xs" placeholder="Buscar leads…" />
          </div>

          <div
            className="flex items-center rounded-lg p-0.5 gap-0.5"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)' }}
          >
            {([
              { value: 'pipeline' as const, label: 'Pipeline' },
              { value: 'list' as const, label: 'Lista' },
            ]).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setView(value)}
                className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                style={{
                  background: view === value ? 'var(--color-primary)' : 'transparent',
                  color: view === value ? 'white' : 'var(--color-text-muted)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Pipeline view */}
        {view === 'pipeline' && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map((stage) => {
              const stageLeads = filtered.filter((l) => l.status === stage.id)
              const stageValue = stageLeads.reduce((a, l) => a + l.potentialValue, 0)
              return (
                <div key={stage.id} className="flex flex-col shrink-0 w-72">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                        {stage.label}
                      </span>
                      <span
                        className="flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold"
                        style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}
                      >
                        {stageLeads.length}
                      </span>
                    </div>
                    {stageValue > 0 && (
                      <span className="text-[10px] font-semibold" style={{ color: stage.color }}>
                        {formatCurrency(stageValue)}
                      </span>
                    )}
                  </div>

                  <div
                    className="flex-1 rounded-xl p-2 space-y-2 min-h-24"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)' }}
                  >
                    {stageLeads.length === 0 ? (
                      <div
                        className="flex items-center justify-center h-16 rounded-lg text-[10px] border border-dashed"
                        style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
                      >
                        Soltar aquí
                      </div>
                    ) : (
                      stageLeads.map((lead, i) => (
                        <LeadCard key={lead.id} lead={lead} delay={i * 0.04} />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* List view */}
        {view === 'list' && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--color-border-subtle)' }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  {['Lead', 'Estado', 'Fuente', 'Valor', 'Próxima acción', ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, i) => (
                  <tr
                    key={lead.id}
                    className="group transition-colors"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border-subtle)' : undefined }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={lead.company} size="sm" />
                        <div>
                          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{lead.company}</p>
                          <p style={{ color: 'var(--color-text-muted)' }}>{lead.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${getStatusBadgeClass(lead.status)}`}>
                        {getStatusLabel(lead.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-2)' }}>
                      {SOURCE_LABELS[lead.source] ?? lead.source}
                    </td>
                    <td className="px-4 py-3 font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
                      {formatCurrency(lead.potentialValue)}
                    </td>
                    <td className="px-4 py-3">
                      {lead.nextAction ? (
                        <div>
                          <p className="truncate max-w-36" style={{ color: 'var(--color-text-2)' }}>{lead.nextAction}</p>
                          {lead.nextActionDate && (
                            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                              {formatDate(lead.nextActionDate)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        <MoreHorizontal size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

function LeadCard({ lead, delay = 0 }: { lead: Lead; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay }}
      className="rounded-xl p-3 cursor-pointer group"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderLeft: `3px solid ${PRIORITY_DOT[lead.priority]}`,
      }}
    >
      <div className="flex items-start justify-between mb-1.5">
        <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
          {lead.company}
        </p>
        <button
          className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <MoreHorizontal size={11} />
        </button>
      </div>
      <p className="text-[10px] mb-2" style={{ color: 'var(--color-text-muted)' }}>{lead.name}</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold" style={{ color: 'var(--color-success)' }}>
          {formatCurrency(lead.potentialValue)}
        </span>
        {lead.nextActionDate && (
          <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--color-text-muted)' }}>
            <Clock size={9} /> {formatDate(lead.nextActionDate)}
          </span>
        )}
      </div>
    </motion.div>
  )
}
