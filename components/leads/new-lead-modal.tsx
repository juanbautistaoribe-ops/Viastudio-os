'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { Lead } from '@/types'

const EMPTY_FORM = {
  name: '',
  company: '',
  email: '',
  phone: '',
  status: 'new',
  source: 'inbound',
  priority: 'medium',
  potentialValue: '',
  notes: '',
}

interface Props {
  open: boolean
  lead?: Lead | null
  onClose: () => void
  onCreated?: (lead: Lead) => void
  onUpdated?: (lead: Lead) => void
}

export function NewLeadModal({ open, lead, onClose, onCreated, onUpdated }: Props) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isEdit = !!lead

  useEffect(() => {
    if (open) {
      if (lead) {
        setForm({
          name: lead.name ?? '',
          company: lead.company ?? '',
          email: lead.email ?? '',
          phone: lead.phone ?? '',
          status: lead.status ?? 'new',
          source: lead.source ?? 'inbound',
          priority: lead.priority ?? 'medium',
          potentialValue: String(lead.potentialValue ?? ''),
          notes: lead.notes ?? '',
        })
      } else {
        setForm(EMPTY_FORM)
      }
    }
  }, [open, lead])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.company || !form.email) return
    setLoading(true)
    try {
      const payload = {
        ...form,
        potentialValue: parseFloat(form.potentialValue) || 0,
      }
      if (isEdit && lead) {
        const res = await fetch(`/api/leads/${lead.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const updated = await res.json()
          onUpdated?.(updated)
          onClose()
        }
      } else {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const created = await res.json()
          onCreated?.(created)
          onClose()
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const labelClass = 'block text-xs font-medium mb-1'
  const inputClass = 'input-base text-xs py-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        ref={ref}
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
            {isEdit ? 'Editar Lead' : 'Nuevo Lead'}
          </h2>
          <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: 'var(--color-text-muted)' }}>Nombre *</label>
              <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Juan García" required />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--color-text-muted)' }}>Empresa *</label>
              <input className={inputClass} value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Empresa S.A." required />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: 'var(--color-text-muted)' }}>Email *</label>
            <input type="email" className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@empresa.com" required />
          </div>

          <div>
            <label className={labelClass} style={{ color: 'var(--color-text-muted)' }}>Teléfono</label>
            <input className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+54 11 0000-0000" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass} style={{ color: 'var(--color-text-muted)' }}>Estado</label>
              <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="new">Nuevo</option>
                <option value="contacted">Contactado</option>
                <option value="qualified">Calificado</option>
                <option value="proposal">Propuesta</option>
                <option value="negotiation">Negociación</option>
                <option value="won">Ganado</option>
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--color-text-muted)' }}>Fuente</label>
              <select className={inputClass} value={form.source} onChange={(e) => set('source', e.target.value)}>
                <option value="inbound">Inbound</option>
                <option value="referral">Referido</option>
                <option value="outbound">Outbound</option>
                <option value="social">Social</option>
                <option value="ads">Publicidad</option>
                <option value="event">Evento</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--color-text-muted)' }}>Prioridad</label>
              <select className={inputClass} value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: 'var(--color-text-muted)' }}>Valor potencial (ARS)</label>
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.potentialValue}
              onChange={(e) => set('potentialValue', e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className={labelClass} style={{ color: 'var(--color-text-muted)' }}>Notas</label>
            <textarea
              className={inputClass}
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Información adicional…"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
