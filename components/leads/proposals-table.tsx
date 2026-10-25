'use client'

import { useState } from 'react'
import { Copy, ExternalLink, Check } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export type ProposalRow = {
  id: string
  url: string
  leadId: string | null
  cliente: string
  negocio: string | null
  servicios: string[]
  status: 'borrador' | 'enviada' | 'vista' | 'aceptada'
  vencida: boolean
  vistas: number
  seguimientos: number
  porBot: boolean
  consulta: boolean
  creada: string
  enviada: string | null
  aceptada: string | null
  validaHasta: string | null
}

const STATUS: Record<ProposalRow['status'], { label: string; color: string }> = {
  borrador: { label: 'Borrador', color: '#8B8BAF' },
  enviada: { label: '📄 Enviada', color: '#3B82F6' },
  vista: { label: '👀 Vista', color: '#9E68F2' },
  aceptada: { label: '✅ Aceptada', color: '#22C55E' },
}

export function proposalBadge(p: ProposalRow) {
  if (p.vencida) return { label: '⏳ Vencida', color: '#F59E0B' }
  const s = STATUS[p.status] ?? STATUS.borrador
  return p.status === 'vista' && p.vistas > 1 ? { ...s, label: `${s.label} ×${p.vistas}` } : s
}

export function ProposalsTable({ proposals }: { proposals: ProposalRow[] }) {
  const [copied, setCopied] = useState<string | null>(null)

  if (!proposals.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Todavía no hay propuestas</p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Pedíselas al asistente por WhatsApp: &quot;armale la propuesta a…&quot;</p>
      </div>
    )
  }

  async function copy(p: ProposalRow) {
    try {
      await navigator.clipboard.writeText(p.url)
      setCopied(p.id)
      setTimeout(() => setCopied(null), 1500)
    } catch {}
  }

  return (
    <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--color-border-subtle)' }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border-subtle)' }}>
            {['Cliente', 'Servicios', 'Estado', 'Seguimiento', 'Fecha', ''].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {proposals.map((p) => {
            const badge = proposalBadge(p)
            return (
              <tr key={p.id} style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                <td className="px-4 py-3">
                  <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{p.negocio || p.cliente}</p>
                  {p.negocio && <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{p.cliente}</p>}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-2)' }}>
                  {p.servicios.map((s) => <p key={s}>{s}</p>)}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap" style={{ background: `${badge.color}22`, color: badge.color }}>{badge.label}</span>
                </td>
                <td className="px-4 py-3 text-[10px]" style={{ color: 'var(--color-text-2)' }}>
                  {p.consulta && <p>💬 Te escribió por la consulta</p>}
                  {p.porBot && <p>Enviada por el bot · {p.seguimientos}/2 seguimientos</p>}
                  {!p.porBot && p.enviada && <p>Enviada por vos</p>}
                  {!p.enviada && <p style={{ color: 'var(--color-text-muted)' }}>Sin enviar</p>}
                </td>
                <td className="px-4 py-3 text-[10px] whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                  <p>Creada {formatDate(p.creada)}</p>
                  {p.validaHasta && p.status !== 'aceptada' && <p>Vale hasta {formatDate(p.validaHasta)}</p>}
                  {p.aceptada && <p>Aceptada {formatDate(p.aceptada)}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <a href={p.url} target="_blank" rel="noreferrer" className="w-7 h-7 rounded-md flex items-center justify-center" style={{ color: 'var(--color-text-2)' }} title="Abrir">
                      <ExternalLink size={13} />
                    </a>
                    <button onClick={() => copy(p)} className="w-7 h-7 rounded-md flex items-center justify-center" style={{ color: copied === p.id ? 'var(--color-success)' : 'var(--color-text-2)' }} title="Copiar link">
                      {copied === p.id ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
