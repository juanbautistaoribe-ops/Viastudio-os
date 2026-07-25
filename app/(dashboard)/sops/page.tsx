'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Header } from '@/components/layout/header'
import { EmptyState } from '@/components/shared/empty-state'
import { NewDocumentModal } from '@/components/sops/new-document-modal'
import {
  Search, Plus, Star, FileText, BookOpen, CheckSquare,
  Layers, Hash, File, Clock, Eye, Loader2, Pencil, Trash2, Check, X
} from 'lucide-react'
import type { Document, DocType } from '@/types'
import { formatRelativeTime } from '@/lib/utils'

const DOC_ICONS: Record<DocType, typeof FileText> = {
  sop: FileText, guide: BookOpen, template: Layers,
  checklist: CheckSquare, prompt: Hash, resource: File,
}

const DOC_COLORS: Record<DocType, string> = {
  sop: '#6F2BFA', guide: '#3B82F6', template: '#F59E0B',
  checklist: '#22C55E', prompt: '#EC4899', resource: '#8B5CF6',
}

const TYPES: { value: DocType | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'sop', label: 'SOPs' },
  { value: 'guide', label: 'Guías' },
  { value: 'template', label: 'Plantillas' },
  { value: 'checklist', label: 'Checklists' },
  { value: 'prompt', label: 'Prompts' },
  { value: 'resource', label: 'Recursos' },
]

export default function SOPsPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedType, setSelectedType] = useState<DocType | 'all'>('all')
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [editingDoc, setEditingDoc] = useState<Document | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    fetch('/api/documents')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setDocs(list)
        if (list.length > 0) setSelectedDoc(list[0])
      })
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => ['All', ...Array.from(new Set(docs.map(d => d.category)))], [docs])

  const filtered = useMemo(() => docs.filter((d) => {
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase())
    const matchCategory = selectedCategory === 'All' || d.category === selectedCategory
    const matchType = selectedType === 'all' || d.type === selectedType
    return matchSearch && matchCategory && matchType
  }), [docs, search, selectedCategory, selectedType])

  const handleCreated = (doc: Document) => {
    setDocs((prev) => [doc, ...prev])
    setSelectedDoc(doc)
  }

  const handleUpdated = (doc: Document) => {
    setDocs((prev) => prev.map(d => d.id === doc.id ? doc : d))
    if (selectedDoc?.id === doc.id) setSelectedDoc(doc)
    setEditingDoc(null)
  }

  const toggleFavorite = async (doc: Document) => {
    const updated = { ...doc, isFavorite: !doc.isFavorite }
    setDocs((prev) => prev.map(d => d.id === doc.id ? updated : d))
    if (selectedDoc?.id === doc.id) setSelectedDoc(updated)
    await fetch(`/api/documents/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFavorite: updated.isFavorite }),
    })
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`¿Eliminar "${doc.title}"?`)) return
    await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
    const remaining = docs.filter(d => d.id !== doc.id)
    setDocs(remaining)
    if (selectedDoc?.id === doc.id) setSelectedDoc(remaining[0] ?? null)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        actions={
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'var(--color-primary)' }}>
            <Plus size={13} strokeWidth={2.5} /> Nuevo Doc
          </button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 flex flex-col shrink-0 overflow-hidden" style={{ borderRight: '1px solid var(--color-border-subtle)' }}>
          <div className="p-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-base pl-8 py-1.5 text-xs" placeholder="Buscar docs…" />
            </div>
          </div>

          <div className="p-3 space-y-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Categoría</p>
              <div className="space-y-0.5">
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className="w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all"
                    style={{ background: selectedCategory === cat ? 'rgba(111,43,250,0.12)' : 'transparent', color: selectedCategory === cat ? 'var(--color-accent)' : 'var(--color-text-2)' }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Tipo</p>
              <div className="space-y-0.5">
                {TYPES.map(({ value, label }) => (
                  <button key={value} onClick={() => setSelectedType(value)} className="w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all"
                    style={{ background: selectedType === value ? 'rgba(111,43,250,0.12)' : 'transparent', color: selectedType === value ? 'var(--color-accent)' : 'var(--color-text-2)' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>No se encontraron documentos</p>
            ) : (
              filtered.map((doc, i) => {
                const Icon = DOC_ICONS[doc.type] ?? FileText
                const color = DOC_COLORS[doc.type] ?? '#6F2BFA'
                const isSelected = selectedDoc?.id === doc.id
                return (
                  <motion.button
                    key={doc.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => { setSelectedDoc(doc); setEditingDoc(null) }}
                    className="w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all mb-1 group"
                    style={{ background: isSelected ? 'rgba(111,43,250,0.12)' : 'transparent', border: isSelected ? '1px solid rgba(111,43,250,0.2)' : '1px solid transparent' }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}18`, color }}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: isSelected ? 'var(--color-text)' : 'var(--color-text-2)' }}>{doc.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{doc.category}</span>
                        <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--color-text-muted)' }}><Eye size={9} /> {doc.views}</span>
                      </div>
                    </div>
                    {doc.isFavorite && <Star size={11} fill="currentColor" className="shrink-0" style={{ color: '#F59E0B' }} />}
                  </motion.button>
                )
              })
            )}
          </div>
        </div>

        {/* Document viewer / editor */}
        <div className="flex-1 overflow-y-auto">
          {editingDoc ? (
            <DocEditor
              doc={editingDoc}
              onSave={handleUpdated}
              onCancel={() => setEditingDoc(null)}
            />
          ) : selectedDoc ? (
            <DocViewer
              doc={selectedDoc}
              onToggleFavorite={toggleFavorite}
              onEdit={() => setEditingDoc(selectedDoc)}
              onDelete={() => handleDelete(selectedDoc)}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <EmptyState icon={FileText} title="Selecciona un documento" description="Elige un documento de la barra lateral para verlo." />
            </div>
          )}
        </div>
      </div>

      <NewDocumentModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />
    </div>
  )
}

function DocViewer({ doc, onToggleFavorite, onEdit, onDelete }: {
  doc: Document
  onToggleFavorite: (doc: Document) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const Icon = DOC_ICONS[doc.type] ?? FileText
  const color = DOC_COLORS[doc.type] ?? '#6F2BFA'
  const lines = (doc.content ?? '').split('\n')

  return (
    <motion.div key={doc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="max-w-3xl mx-auto p-8">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, color }}>
            <Icon size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{doc.title}</h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{doc.category}</span>
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}><Clock size={10} /> Actualizado {formatRelativeTime(doc.updatedAt)}</span>
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}><Eye size={10} /> {doc.views} vistas</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}>
            <Pencil size={11} /> Editar
          </button>
          <button onClick={() => onToggleFavorite(doc)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-surface-3)', color: '#F59E0B' }}>
            {doc.isFavorite ? <Star size={13} fill="currentColor" /> : <Star size={13} />}
          </button>
          <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-surface-3)', color: '#EF4444' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {doc.tags && doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          {doc.tags.map((tag) => <span key={tag} className="badge badge-muted">{tag}</span>)}
        </div>
      )}

      <div className="prose-like space-y-3">
        {lines.map((line, i) => {
          if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold mt-6 mb-2" style={{ color: 'var(--color-text)' }}>{line.slice(2)}</h1>
          if (line.startsWith('## ')) return <h2 key={i} className="text-base font-semibold mt-5 mb-2" style={{ color: 'var(--color-text)' }}>{line.slice(3)}</h2>
          if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-semibold mt-4 mb-1" style={{ color: 'var(--color-text)' }}>{line.slice(4)}</h3>
          if (line.startsWith('- [ ] ')) return (
            <label key={i} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-text-2)' }}>
              <input type="checkbox" className="rounded" />{line.slice(6)}
            </label>
          )
          if (line.startsWith('- ') || line.startsWith('* ')) return (
            <p key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-2)' }}>
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: color }} />{line.slice(2)}
            </p>
          )
          if (/^\d+\. /.test(line)) return (
            <p key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-2)' }}>
              <span className="shrink-0 font-semibold" style={{ color }}>{line.match(/^\d+/)?.[0]}.</span>{line.replace(/^\d+\. /, '')}
            </p>
          )
          if (line.startsWith('|')) return (
            <div key={i} className="text-xs overflow-x-auto">
              <div className="flex gap-4 px-3 py-1.5 rounded" style={{ background: i === lines.findIndex(l => l.startsWith('|')) ? 'var(--color-surface-3)' : 'transparent', color: 'var(--color-text-2)' }}>
                {line.split('|').filter(Boolean).map((cell, j) => <span key={j} className="flex-1 truncate">{cell.trim()}</span>)}
              </div>
            </div>
          )
          if (line === '' || line === '---') return <div key={i} className="h-2" />
          return <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}>{line}</p>
        })}
      </div>
    </motion.div>
  )
}

function DocEditor({ doc, onSave, onCancel }: {
  doc: Document
  onSave: (doc: Document) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(doc.title)
  const [content, setContent] = useState(doc.content ?? '')
  const [category, setCategory] = useState(doc.category ?? '')
  const [type, setType] = useState<DocType>(doc.type)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category, type }),
      })
      if (res.ok) onSave(await res.json())
    } finally {
      setSaving(false)
    }
  }

  const color = DOC_COLORS[type] ?? '#6F2BFA'
  const Icon = DOC_ICONS[type] ?? FileText

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, color }}>
            <Icon size={20} />
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-bold bg-transparent border-b outline-none"
            style={{ color: 'var(--color-text)', borderColor: 'var(--color-border-subtle)' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}>
            <X size={11} /> Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
            <Check size={11} /> {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value as DocType)} className="input-base text-xs py-1">
            <option value="sop">SOP</option>
            <option value="guide">Guía</option>
            <option value="template">Plantilla</option>
            <option value="checklist">Checklist</option>
            <option value="prompt">Prompt</option>
            <option value="resource">Recurso</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Categoría</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className="input-base text-xs py-1" placeholder="General" />
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full rounded-xl p-4 text-sm leading-relaxed outline-none resize-none"
        style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border-subtle)',
          color: 'var(--color-text-2)',
          fontFamily: 'monospace',
          fontSize: '13px',
          minHeight: '480px',
        }}
        placeholder="Escribí el contenido en markdown…"
      />
    </motion.div>
  )
}
