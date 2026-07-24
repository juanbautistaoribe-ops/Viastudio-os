'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'

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

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function NewClientModal({ open, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', company: '', email: '', phone: '', website: '',
    industry: '', country: '', monthlyValue: '', services: [] as string[],
  })

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
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          monthlyValue: parseFloat(form.monthlyValue) || 0,
          status: 'ACTIVE',
        }),
      })
      if (!res.ok) throw new Error('Error al crear cliente')
      setForm({ name: '', company: '', email: '', phone: '', website: '', industry: '', country: '', monthlyValue: '', services: [] })
      onCreated()
      onClose()
    } catch {
      setError('No se pudo crear el cliente. Intentá de nuevo.')
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
              <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Nuevo Cliente</h2>
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

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>Valor mensual (USD)</label>
                <input type="number" min="0" value={form.monthlyValue} onChange={e => setForm(f => ({ ...f, monthlyValue: e.target.value }))} className="input-base text-sm" placeholder="0" />
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
                  {loading ? <Loader2 size={14} className="animate-spin" /> : 'Crear cliente'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
