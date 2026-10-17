'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { Income, Client } from '@/types'

interface Props {
  open: boolean
  income?: Income | null
  clients: Pick<Client, 'id' | 'name' | 'company'>[]
  onClose: () => void
  onSaved: () => void
}

const EMPTY = {
  clientId: '',
  period: '',
  concept: '',
  amount: '',
  currency: 'ARS',
  exchangeRate: '',
  status: 'invoiced',
  collectedAt: '',
  notes: '',
}

const currentPeriod = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function IncomeModal({ open, income, clients, onClose, onSaved }: Props) {
  const [form, setForm] = useState({ ...EMPTY, period: currentPeriod() })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (income) {
      setForm({
        clientId: income.clientId ?? '',
        period: income.period,
        concept: income.concept,
        amount: String(income.amount),
        currency: income.currency,
        exchangeRate: income.exchangeRate ? String(income.exchangeRate) : '',
        status: income.status,
        collectedAt: income.collectedAt ? new Date(income.collectedAt).toISOString().slice(0, 10) : '',
        notes: income.notes ?? '',
      })
    } else {
      setForm({ ...EMPTY, period: currentPeriod() })
    }
  }, [open, income])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.concept || !form.amount || !form.period) return
    setSaving(true)
    try {
      const url = income ? `/api/finance/income/${income.id}` : '/api/finance/income'
      const method = income ? 'PATCH' : 'POST'
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          exchangeRate: form.exchangeRate ? Number(form.exchangeRate) : null,
          collectedAt: form.collectedAt || null,
          clientId: form.clientId || null,
        }),
      })
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {income ? 'Editar ingreso' : 'Nuevo ingreso'}
                </h2>
                <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}>
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Período *</span>
                    <input
                      className="input-base text-xs"
                      placeholder="2024-01"
                      value={form.period}
                      onChange={e => set('period', e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Estado</span>
                    <select className="input-base text-xs" value={form.status} onChange={e => set('status', e.target.value)}>
                      <option value="invoiced">Facturado</option>
                      <option value="collected">Cobrado</option>
                      <option value="overdue">Vencido</option>
                    </select>
                  </label>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Concepto *</span>
                  <input className="input-base text-xs" placeholder="Fee mensual, Desayuno…" value={form.concept} onChange={e => set('concept', e.target.value)} />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Cliente</span>
                  <select className="input-base text-xs" value={form.clientId} onChange={e => set('clientId', e.target.value)}>
                    <option value="">Sin cliente</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Monto *</span>
                    <input className="input-base text-xs" type="number" placeholder="0" value={form.amount} onChange={e => set('amount', e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Moneda</span>
                    <select className="input-base text-xs" value={form.currency} onChange={e => set('currency', e.target.value)}>
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </label>
                </div>

                {form.currency === 'ARS' && (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Tipo de cambio (ARS/USD)</span>
                    <input className="input-base text-xs" type="number" placeholder="1200" value={form.exchangeRate} onChange={e => set('exchangeRate', e.target.value)} />
                  </label>
                )}

                {form.status === 'collected' && (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Fecha de cobro</span>
                    <input className="input-base text-xs" type="date" value={form.collectedAt} onChange={e => set('collectedAt', e.target.value)} />
                  </label>
                )}

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Notas</span>
                  <textarea className="input-base text-xs resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
                </label>
              </div>

              <div className="flex gap-2 pt-1">
                <button className="flex-1 text-xs py-2 rounded-lg transition-colors" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }} onClick={onClose}>
                  Cancelar
                </button>
                <button
                  className="flex-1 btn-primary text-xs py-2"
                  onClick={save}
                  disabled={saving || !form.concept || !form.amount || !form.period}
                >
                  {saving ? 'Guardando…' : income ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
