'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, CheckCircle2 } from 'lucide-react'
import type { Client } from '@/types'

const SERVICES = [
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'PAID_ADS', label: 'Paid Ads' },
  { value: 'SEO', label: 'SEO' },
  { value: 'CONTENT', label: 'Contenido' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'BRANDING', label: 'Branding' },
  { value: 'WEB', label: 'Web' },
  { value: 'CONSULTING', label: 'Consultoría' },
  { value: 'STRATEGY', label: 'Estrategia' },
]

const STATUSES = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'PROSPECT', label: 'Prospecto' },
  { value: 'INACTIVE', label: 'Inactivo' },
  { value: 'CHURNED', label: 'Perdido' },
]

const PLAN_UNICO_ITEMS = [
  '12 piezas/mes (carruseles, fotos e historias)',
  '3 reels con guión',
  '3 pautas en Meta',
  'Programación de contenido',
  'Medición y presentación de métricas',
]

const EMPTY_FORM = {
  name: '', company: '', email: '', phone: '', website: '',
  industry: '', country: '', monthlyValue: '', currency: 'ARS',
  services: [] as string[], status: 'ACTIVE',
  planType: '' as '' | 'unico' | 'personalizado',
  planNotes: '',
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
  client?: Client | null
}

export function NewClientModal({ open, onClose, onCreated, client }: Props) {
  const isEdit = !!client
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (open && client) {
      setForm({
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone ?? '',
        website: client.website ?? '',
        industry: client.industry ?? '',
        country: client.country ?? '',
        monthlyValue: String(client.monthlyValue ?? ''),
        currency: client.currency ?? 'ARS',
        services: client.services.map(s => (s as string).toUpperCase()),
        status: (client.status as string).toUpperCase(),
        planType: (client.planType as '' | 'unico' | 'personalizado') ?? '',
        planNotes: client.planNotes ?? '',
      })
    } else if (!open) {
      setForm(EMPTY_FORM)
      setError('')
    }
  }, [open, client])

  function toggleService(val: string) {
    setForm(f => ({
      ...f,
      services: f.services.includes(val) ? f.services.filter(s => s !== val) : [...f.services, val],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const url = isEdit ? `/api/clients/${client!.id}` : '/api/clients'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          monthlyValue: parseFloat(form.monthlyValue) || 0,
          planType: form.planType || null,
          planNotes: form.planNotes || null,
        }),
      })
      if (!res.ok) throw new Error('Error al guardar cliente')
      setForm(EMPTY_FORM)
      onCreated()
      onClose()
    } catch {
      setError('No se pudo guardar el cliente. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg rounded-2xl p-6 overflow-y-auto max-h-[90vh]"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
                {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-danger)' }}>
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>Nombre contacto *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-base text-sm" placeholder="Ana García" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>Empresa *</label>
                  <input required value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="input-base text-sm" placeholder="Acme S.A." />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>Email *</label>
                <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-base text-sm" placeholder="ana@acme.com" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>Teléfono</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-base text-sm" placeholder="+54 11 1234 5678" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>Website</label>
                  <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className="input-base text-sm" placeholder="acme.com" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>Industria</label>
                  <input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} className="input-base text-sm" placeholder="Tecnología" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>País</label>
                  <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="input-base text-sm" placeholder="AR" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>Valor mensual</label>
                  <div className="flex gap-2">
                    <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="input-base text-sm w-24 shrink-0">
                      <option value="ARS">$ ARS</option>
                      <option value="USD">US$ USD</option>
                    </select>
                    <input type="number" min="0" value={form.monthlyValue} onChange={e => setForm(f => ({ ...f, monthlyValue: e.target.value }))} className="input-base text-sm flex-1" placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>Estado</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-base text-sm">
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Plan */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-2)' }}>Plan</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { value: 'unico', label: 'Plan Único' },
                    { value: 'personalizado', label: 'Personalizado' },
                  ].map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, planType: p.value as 'unico' | 'personalizado' }))}
                      className="py-2 px-3 rounded-lg text-xs font-medium transition-all text-left"
                      style={form.planType === p.value
                        ? { background: 'var(--color-primary)', color: 'white' }
                        : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-subtle)' }
                      }
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {form.planType === 'unico' && (
                  <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>Incluye por mes</p>
                    {PLAN_UNICO_ITEMS.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 size={12} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                        <span className="text-xs" style={{ color: 'var(--color-text-2)' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                )}

                {form.planType === 'personalizado' && (
                  <textarea
                    className="input-base text-sm w-full resize-none"
                    rows={3}
                    placeholder="Ej: 8 piezas/mes, 5 reels, 2 pautas, sin métricas…"
                    value={form.planNotes}
                    onChange={e => setForm(f => ({ ...f, planNotes: e.target.value }))}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-2)' }}>Servicios</label>
                <div className="flex flex-wrap gap-1.5">
                  {SERVICES.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => toggleService(s.value)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                      style={form.services.includes(s.value)
                        ? { background: 'var(--color-primary)', color: 'white' }
                        : { background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-subtle)' }
                      }
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ background: 'var(--color-primary)' }}>
                  {loading ? <Loader2 size={14} className="animate-spin" /> : isEdit ? 'Guardar cambios' : 'Crear cliente'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
