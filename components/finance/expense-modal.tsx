'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { Expense, Client } from '@/types'

interface Props {
  open: boolean
  expense?: Expense | null
  clients: Pick<Client, 'id' | 'name' | 'company'>[]
  onClose: () => void
  onSaved: () => void
}

const EMPTY = {
  date: '',
  concept: '',
  category: 'General',
  type: 'fixed',
  clientId: '',
  amount: '',
  currency: 'ARS',
  exchangeRate: '',
  recurring: false,
  notes: '',
}

const CATEGORIES = ['General', 'Herramientas', 'Freelance', 'Impuestos', 'Marketing', 'Infraestructura', 'Contador', 'Otro']

export function ExpenseModal({ open, expense, clients, onClose, onSaved }: Props) {
  const [form, setForm] = useState({ ...EMPTY, date: new Date().toISOString().slice(0, 10) })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (expense) {
      setForm({
        date: new Date(expense.date).toISOString().slice(0, 10),
        concept: expense.concept,
        category: expense.category,
        type: expense.type,
        clientId: expense.clientId ?? '',
        amount: String(expense.amount),
        currency: expense.currency,
        exchangeRate: expense.exchangeRate ? String(expense.exchangeRate) : '',
        recurring: expense.recurring,
        notes: expense.notes ?? '',
      })
    } else {
      setForm({ ...EMPTY, date: new Date().toISOString().slice(0, 10) })
    }
  }, [open, expense])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.concept || !form.amount || !form.date) return
    setSaving(true)
    try {
      const url = expense ? `/api/finance/expenses/${expense.id}` : '/api/finance/expenses'
      const method = expense ? 'PATCH' : 'POST'
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          exchangeRate: form.exchangeRate ? Number(form.exchangeRate) : null,
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
                  {expense ? 'Editar gasto' : 'Nuevo gasto'}
                </h2>
                <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}>
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Fecha *</span>
                    <input className="input-base text-xs" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Tipo</span>
                    <select className="input-base text-xs" value={form.type} onChange={e => set('type', e.target.value)}>
                      <option value="fixed">Fijo</option>
                      <option value="direct">Directo</option>
                    </select>
                  </label>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Concepto *</span>
                  <input className="input-base text-xs" placeholder="Vercel, editor freelance…" value={form.concept} onChange={e => set('concept', e.target.value)} />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Categoría</span>
                    <select className="input-base text-xs" value={form.category} onChange={e => set('category', e.target.value)}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  {form.type === 'direct' && (
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Cliente</span>
                      <select className="input-base text-xs" value={form.clientId} onChange={e => set('clientId', e.target.value)}>
                        <option value="">Sin cliente</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

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

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.recurring} onChange={e => set('recurring', e.target.checked)} className="rounded" />
                  <span className="text-xs" style={{ color: 'var(--color-text-2)' }}>Gasto recurrente</span>
                </label>

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
                  disabled={saving || !form.concept || !form.amount || !form.date}
                >
                  {saving ? 'Guardando…' : expense ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
