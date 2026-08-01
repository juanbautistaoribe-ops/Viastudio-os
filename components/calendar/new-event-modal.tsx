'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { CalendarEvent } from '@/types'

const EMPTY_FORM = {
  title: '',
  description: '',
  type: 'meeting',
  startDate: '',
  endDate: '',
  allDay: false,
}

interface Props {
  open: boolean
  event?: CalendarEvent | null
  defaultDate?: Date | null
  defaultClientId?: string
  onClose: () => void
  onCreated?: (event: CalendarEvent) => void
  onUpdated?: (event: CalendarEvent) => void
}

export function NewEventModal({ open, event, defaultDate, defaultClientId, onClose, onCreated, onUpdated }: Props) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isEdit = !!event

  useEffect(() => {
    if (open) {
      if (event) {
        const start = new Date(event.startDate)
        const end = new Date(event.endDate)
        const toLocal = (d: Date) => {
          const off = d.getTimezoneOffset() * 60000
          return new Date(d.getTime() - off).toISOString().slice(0, 16)
        }
        setForm({
          title: event.title ?? '',
          description: event.description ?? '',
          type: event.type ?? 'meeting',
          startDate: toLocal(start),
          endDate: toLocal(end),
          allDay: event.allDay ?? false,
        })
      } else {
        const dateStr = defaultDate
          ? (() => {
              const off = defaultDate.getTimezoneOffset() * 60000
              return new Date(defaultDate.getTime() - off).toISOString().slice(0, 16)
            })()
          : ''
        setForm({ ...EMPTY_FORM, startDate: dateStr, endDate: dateStr })
      }
    }
  }, [open, event, defaultDate])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  const set = (field: string, value: string | boolean) => setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.startDate) return
    setLoading(true)
    try {
      const payload = { ...form, endDate: form.endDate || form.startDate, clientId: defaultClientId ?? undefined }
      if (isEdit && event) {
        const res = await fetch(`/api/events/${event.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) { onUpdated?.(await res.json()); onClose() }
      } else {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) { onCreated?.(await res.json()); onClose() }
      }
    } finally {
      setLoading(false)
    }
  }

  const labelClass = 'block text-xs font-medium mb-1'
  const inputClass = 'input-base text-xs py-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div ref={ref} className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{isEdit ? 'Editar Evento' : 'Nuevo Evento'}</h2>
          <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelClass} style={{ color: 'var(--color-text-muted)' }}>Título *</label>
            <input className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Reunión con cliente…" required />
          </div>

          <div>
            <label className={labelClass} style={{ color: 'var(--color-text-muted)' }}>Tipo</label>
            <select className={inputClass} value={form.type} onChange={(e) => set('type', e.target.value)}>
              <option value="meeting">Reunión</option>
              <option value="deadline">Entrega</option>
              <option value="publication">Publicación</option>
              <option value="followup">Seguimiento</option>
              <option value="internal">Interno</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input id="allDay" type="checkbox" checked={form.allDay} onChange={(e) => set('allDay', e.target.checked)} className="rounded" />
            <label htmlFor="allDay" className="text-xs" style={{ color: 'var(--color-text-2)' }}>Todo el día</label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: 'var(--color-text-muted)' }}>Inicio *</label>
              <input
                type={form.allDay ? 'date' : 'datetime-local'}
                className={inputClass}
                value={form.allDay ? form.startDate.slice(0, 10) : form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--color-text-muted)' }}>Fin</label>
              <input
                type={form.allDay ? 'date' : 'datetime-local'}
                className={inputClass}
                value={form.allDay ? form.endDate.slice(0, 10) : form.endDate}
                onChange={(e) => set('endDate', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: 'var(--color-text-muted)' }}>Descripción</label>
            <textarea className={inputClass} rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Detalles del evento…" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}>Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
              {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
