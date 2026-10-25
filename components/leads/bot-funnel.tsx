'use client'

import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type Row = {
  fuente: string
  conversaciones: number
  derivados: number
  descartados: number
  frios: number
  ganados: number
  valor_ganado: { ARS: number; USD: number }
  tasa_derivacion: number
  tasa_cierre: number
}

// WhatsApp bot funnel per ad/service, last 30 days
export function BotFunnel() {
  const [data, setData] = useState<{ total: Row; por_fuente: Row[] } | null>(null)

  useEffect(() => {
    fetch('/api/bot/metrics?days=30')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.total) setData(d) })
      .catch(() => {})
  }, [])

  if (!data) return null

  const won = (r: Row) => [
    r.valor_ganado.ARS ? formatCurrency(r.valor_ganado.ARS, 'ARS') : '',
    r.valor_ganado.USD ? formatCurrency(r.valor_ganado.USD, 'USD') : '',
  ].filter(Boolean).join(' + ') || '—'

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle size={14} style={{ color: '#25D366' }} />
        <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Bot de WhatsApp · últimos 30 días</p>
        <p className="text-[10px] ml-auto" style={{ color: 'var(--color-text-muted)' }}>
          {data.total.conversaciones} conversaciones → {data.total.derivados} derivados ({data.total.tasa_derivacion}%) → {data.total.ganados} ganados
        </p>
      </div>

      {data.por_fuente.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Todavía no hay conversaciones registradas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: 'var(--color-text-muted)' }}>
                {['Anuncio / servicio', 'Conversaciones', 'Derivados', 'Ganados', 'Valor ganado', 'Descartados', 'Fríos'].map((h, i) => (
                  <th key={h} className={`font-medium pb-2 ${i ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.por_fuente.map((r) => (
                <tr key={r.fuente} style={{ borderTop: '1px solid var(--color-border-subtle)', color: 'var(--color-text-2)' }}>
                  <td className="py-1.5" style={{ color: 'var(--color-text)' }}>{r.fuente}</td>
                  <td className="text-right tabular-nums">{r.conversaciones}</td>
                  <td className="text-right tabular-nums">{r.derivados} <span style={{ color: 'var(--color-text-muted)' }}>({r.tasa_derivacion}%)</span></td>
                  <td className="text-right tabular-nums">{r.ganados}</td>
                  <td className="text-right tabular-nums">{won(r)}</td>
                  <td className="text-right tabular-nums">{r.descartados}</td>
                  <td className="text-right tabular-nums">{r.frios}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
