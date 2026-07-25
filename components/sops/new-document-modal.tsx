'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { Document, DocType } from '@/types'

const EMPTY_FORM = {
  title: '',
  type: 'sop' as DocType,
  category: '',
  content: '',
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (doc: Document) => void
}

export function NewDocumentModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setForm(EMPTY_FORM)
  }, [open])

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
    if (!form.title) return
    setLoading(true)
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          category: form.category || 'General',
          content: form.content,
        }),
      })
      if (res.ok) {
        const doc = await res.json()
        onCreated(doc)
        onClose()
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
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Nuevo Documento</h2>
          <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelClass} style={{ color: 'var(--color-text-muted)' }}>Título *</label>
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Nombre del documento…"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: 'var(--color-text-muted)' }}>Tipo</label>
              <select className={inputClass} value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="sop">SOP</option>
                <option value="guide">Guía</option>
                <option value="template">Plantilla</option>
                <option value="checklist">Checklist</option>
                <option value="prompt">Prompt</option>
                <option value="resource">Recurso</option>
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--color-text-muted)' }}>Categoría</label>
              <input
                className={inputClass}
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                placeholder="Operations, Content…"
              />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: 'var(--color-text-muted)' }}>Contenido</label>
            <textarea
              className={inputClass}
              rows={5}
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              placeholder="Escribí el contenido en markdown…"
              style={{ fontFamily: 'monospace', fontSize: '11px' }}
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
              {loading ? 'Guardando…' : 'Crear Documento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
