'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Header } from '@/components/layout/header'
import { Avatar } from '@/components/shared/avatar'
import { NewLeadModal } from '@/components/leads/new-lead-modal'
import { formatCurrency, formatDate, getStatusBadgeClass, getStatusLabel } from '@/lib/utils'
import { Plus, Search, Clock, MoreHorizontal, Loader2, UserCheck } from 'lucide-react'
import type { Lead, LeadStatus } from '@/types'

const PIPELINE_STAGES: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'new',         label: 'Nuevo',        color: '#3B82F6' },
  { id: 'contacted',   label: 'Contactado',   color: '#8B5CF6' },
  { id: 'qualified',   label: 'Calificado',   color: '#F59E0B' },
  { id: 'proposal',    label: 'Propuesta',    color: '#6F2BFA' },
  { id: 'negotiation', label: 'Negociación',  color: '#EC4899' },
  { id: 'won',         label: 'Ganado',       color: '#22C55E' },
  { id: 'lost',        label: 'Perdido',      color: '#6B7280' },
]

const SOURCE_LABELS: Record<string, string> = {
  referral: 'Referido', inbound: 'Inbound', outbound: 'Outbound',
  social: 'Social', ads: 'Publicidad', event: 'Evento', other: 'Otro',
}

const PRIORITY_DOT: Record<string, string> = {
  high: '#EF4444', medium: '#F59E0B', low: '#3B82F6',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'pipeline' | 'list'>('pipeline')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const dragLeadId = useRef<string | null>(null)

  useEffect(() => {
    fetch('/api/leads')
      .then((r) => r.json())
      .then((data) => setLeads(Array.isArray(data) ? data : []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return leads.filter((l) =>
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.company.toLowerCase().includes(search.toLowerCase())
    )
  }, [leads, search])

  const activeLeads = leads.filter(l => !['won', 'lost'].includes(l.status))
  const pipelineARS = activeLeads.filter(l => (l.currency ?? 'ARS') === 'ARS').reduce((a, l) => a + (l.potentialValue ?? 0), 0)
  const pipelineUSD = activeLeads.filter(l => l.currency === 'USD').reduce((a, l) => a + (l.potentialValue ?? 0), 0)
  const closedLeads = leads.filter(l => ['won', 'lost'].includes(l.status))
  const conversionRate = closedLeads.length > 0
    ? Math.round((leads.filter(l => l.status === 'won').length / closedLeads.length) * 100)
    : 0

  const handleCreated = (lead: Lead) => setLeads((prev) => [lead, ...prev])
  const handleUpdated = (updated: Lead) => setLeads((prev) => prev.map(l => l.id === updated.id ? updated : l))
  const handleConvert = async (lead: Lead) => {
    if (!confirm(`¿Convertir "${lead.company}" en cliente activo?`)) return
    const res = await fetch(`/api/leads/${lead.id}/convert`, { method: 'POST' })
    if (res.ok) {
      setLeads((prev) => prev.map(l => l.id === lead.id ? { ...l, status: 'won' as LeadStatus } : l))
    }
  }
  const handleDelete = async (lead: Lead) => {
    if (!confirm(`¿Eliminar el lead "${lead.company}"?`)) return
    await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
    setLeads((prev) => prev.filter(l => l.id !== lead.id))
  }

  // Drag & drop handlers
  const handleDragStart = (leadId: string) => { dragLeadId.current = leadId }
  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    setDragOverStage(stageId)
  }
  const handleDrop = async (stageId: string) => {
    const id = dragLeadId.current
    if (!id) return
    const lead = leads.find(l => l.id === id)
    if (!lead || lead.status === stageId) { setDragOverStage(null); dragLeadId.current = null; return }
    setLeads((prev) => prev.map(l => l.id === id ? { ...l, status: stageId as LeadStatus } : l))
    setDragOverStage(null)
    dragLeadId.current = null
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: stageId }),
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        actions={
          <button
            onClick={() => setModalOpen(true)}
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
            { label: 'Leads activos', value: activeLeads.length, color: '#6F2BFA' },
            { label: 'Pipeline ARS', value: formatCurrency(pipelineARS, 'ARS'), color: '#22C55E' },
            { label: 'Pipeline USD', value: formatCurrency(pipelineUSD, 'USD'), color: '#F59E0B' },
            { label: 'Tasa de conversión', value: `${conversionRate}%`, color: '#3B82F6' },
          ].map(({ label, value, color }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-4">
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
          <div className="flex items-center rounded-lg p-0.5 gap-0.5" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)' }}>
            {([{ value: 'pipeline' as const, label: 'Pipeline' }, { value: 'list' as const, label: 'Lista' }]).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setView(value)}
                className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                style={{ background: view === value ? 'var(--color-primary)' : 'transparent', color: view === value ? 'white' : 'var(--color-text-muted)' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
          </div>
        )}

        {!loading && leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No hay leads todavía</p>
            <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'var(--color-primary)' }}>
              <Plus size={13} strokeWidth={2.5} /> Agregar primer lead
            </button>
          </div>
        )}

        {/* Pipeline view */}
        {!loading && leads.length > 0 && view === 'pipeline' && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map((stage) => {
              const stageLeads = filtered.filter((l) => l.status === stage.id)
              const stageValue = stageLeads.reduce((a, l) => a + (l.potentialValue ?? 0), 0)
              const isDragOver = dragOverStage === stage.id
              return (
                <div
                  key={stage.id}
                  className="flex flex-col shrink-0 w-72"
                  onDragOver={(e) => handleDragOver(e, stage.id)}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={() => handleDrop(stage.id)}
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{stage.label}</span>
                      <span className="flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}>
                        {stageLeads.length}
                      </span>
                    </div>
                    {stageValue > 0 && (
                      <span className="text-[10px] font-semibold" style={{ color: stage.color }}>
                        {stageLeads[0]?.currency === 'USD' ? formatCurrency(stageValue, 'USD') : formatCurrency(stageValue, 'ARS')}
                      </span>
                    )}
                  </div>

                  <div
                    className="flex-1 rounded-xl p-2 space-y-2 min-h-24 transition-colors"
                    style={{
                      background: isDragOver ? `${stage.color}15` : 'var(--color-surface-2)',
                      border: isDragOver ? `1.5px dashed ${stage.color}` : '1px solid var(--color-border-subtle)',
                    }}
                  >
                    {stageLeads.length === 0 ? (
                      <div className="flex items-center justify-center h-16 rounded-lg text-[10px] border border-dashed" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                        Soltar aquí
                      </div>
                    ) : (
                      stageLeads.map((lead, i) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          delay={i * 0.04}
                          onEdit={() => setEditingLead(lead)}
                          onDelete={() => handleDelete(lead)}
                          onConvert={() => handleConvert(lead)}
                          onDragStart={() => handleDragStart(lead.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* List view */}
        {!loading && leads.length > 0 && view === 'list' && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border-subtle)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  {['Lead', 'Estado', 'Fuente', 'Valor', 'Próxima acción', ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, i) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    isLast={i === filtered.length - 1}
                    onEdit={() => setEditingLead(lead)}
                    onDelete={() => handleDelete(lead)}
                    onConvert={() => handleConvert(lead)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <NewLeadModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />
      <NewLeadModal open={!!editingLead} lead={editingLead} onClose={() => setEditingLead(null)} onUpdated={handleUpdated} />
    </div>
  )
}

function LeadCard({ lead, delay = 0, onEdit, onDelete, onConvert, onDragStart }: {
  lead: Lead; delay?: number
  onEdit: () => void; onDelete: () => void; onConvert: () => void; onDragStart: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay }}
      draggable
      onDragStart={onDragStart}
      className="rounded-xl p-3 cursor-grab active:cursor-grabbing group"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderLeft: `3px solid ${PRIORITY_DOT[lead.priority] ?? '#F59E0B'}`,
      }}
    >
      <div className="flex items-start justify-between mb-1.5">
        <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{lead.company}</p>
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v) }}
            className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <MoreHorizontal size={11} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-20 rounded-xl shadow-xl py-1 w-44" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)' }}>
              {lead.status !== 'won' && lead.status !== 'lost' && (
                <button onClick={() => { setMenuOpen(false); onConvert() }} className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-1.5 hover:bg-[rgba(255,255,255,0.05)]" style={{ color: '#22C55E' }}>
                  <UserCheck size={11} /> Convertir a cliente
                </button>
              )}
              <button onClick={() => { setMenuOpen(false); onEdit() }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-[rgba(255,255,255,0.05)]" style={{ color: 'var(--color-text-2)' }}>Editar</button>
              <button onClick={() => { setMenuOpen(false); onDelete() }} className="w-full text-left px-3 py-1.5 text-xs" style={{ color: '#EF4444' }}>Eliminar</button>
            </div>
          )}
        </div>
      </div>
      <p className="text-[10px] mb-2" style={{ color: 'var(--color-text-muted)' }}>{lead.name}</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold" style={{ color: 'var(--color-success)' }}>{formatCurrency(lead.potentialValue ?? 0, lead.currency ?? 'ARS')}</span>
        {lead.nextActionDate && (
          <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--color-text-muted)' }}>
            <Clock size={9} /> {formatDate(lead.nextActionDate)}
          </span>
        )}
      </div>
    </motion.div>
  )
}

function LeadRow({ lead, isLast, onEdit, onDelete, onConvert }: {
  lead: Lead; isLast: boolean; onEdit: () => void; onDelete: () => void; onConvert: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <tr className="group transition-colors" style={{ borderBottom: !isLast ? '1px solid var(--color-border-subtle)' : undefined }}>
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
        <span className={`badge ${getStatusBadgeClass(lead.status)}`}>{getStatusLabel(lead.status)}</span>
      </td>
      <td className="px-4 py-3" style={{ color: 'var(--color-text-2)' }}>
        {SOURCE_LABELS[lead.source] ?? lead.source}
      </td>
      <td className="px-4 py-3 font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
        {formatCurrency(lead.potentialValue ?? 0, lead.currency ?? 'ARS')}
      </td>
      <td className="px-4 py-3">
        {lead.nextAction ? (
          <div>
            <p className="truncate max-w-36" style={{ color: 'var(--color-text-2)' }}>{lead.nextAction}</p>
            {lead.nextActionDate && (
              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{formatDate(lead.nextActionDate)}</p>
            )}
          </div>
        ) : (
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 rounded-xl shadow-xl py-1 w-44" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)' }}>
              {lead.status !== 'won' && lead.status !== 'lost' && (
                <button onClick={() => { setMenuOpen(false); onConvert() }} className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-1.5 hover:bg-[rgba(255,255,255,0.05)]" style={{ color: '#22C55E' }}>
                  <UserCheck size={11} /> Convertir a cliente
                </button>
              )}
              <button onClick={() => { setMenuOpen(false); onEdit() }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-[rgba(255,255,255,0.05)]" style={{ color: 'var(--color-text-2)' }}>Editar</button>
              <button onClick={() => { setMenuOpen(false); onDelete() }} className="w-full text-left px-3 py-1.5 text-xs" style={{ color: '#EF4444' }}>Eliminar</button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}
