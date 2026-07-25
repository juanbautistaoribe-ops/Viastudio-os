'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import type { Task } from '@/types'

const PRIORITIES = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Crítico' },
]

const STATUSES = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'Por hacer' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'review', label: 'En revisión' },
  { value: 'done', label: 'Completado' },
]

const EMPTY = { title: '', description: '', status: 'todo', priority: 'medium', dueDate: '' }

interface Props {
  open: boolean
  task?: Task | null
  onClose: () => void
  onSaved: () => void
}

export function NewTaskModal({ open, task, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY)
  const isEdit = !!task

  useEffect(() => {
    if (open) {
      if (task) {
        setForm({
          title: task.title ?? '',
          description: task.description ?? '',
          status: task.status ?? 'todo',
          priority: task.priority ?? 'medium',
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
        })
      } else {
        setForm(EMPTY)
      }
      setError('')
    }
  }, [open, task])

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('El título es obligatorio'); return }
    setLoading(true)
    setError('')
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
      }
      const res = isEdit && task
        ? await fetch(`/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

      if (!res.ok) throw new Error(await res.text())
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar la tarea')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                  {isEdit ? 'Editar Tarea' : 'Nueva Tarea'}
                </h2>
                <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-3)' }}>
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Título *</label>
                  <input className="input-base w-full" placeholder="Ej: Diseñar banner para campaña" value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Descripción</label>
                  <textarea className="input-base w-full resize-none" rows={3} placeholder="Descripción opcional…" value={form.description} onChange={e => set('description', e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Estado</label>
                    <select className="input-base w-full" value={form.status} onChange={e => set('status', e.target.value)}>
                      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Prioridad</label>
                    <select className="input-base w-full" value={form.priority} onChange={e => set('priority', e.target.value)}>
                      {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Fecha límite</label>
                  <input type="date" className="input-base w-full" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg text-xs font-medium" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-60" style={{ background: 'var(--color-primary)' }}>
                    {loading && <Loader2 size={13} className="animate-spin" />}
                    {isEdit ? 'Guardar cambios' : 'Crear Tarea'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
