'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Header } from '@/components/layout/header'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Search, Plus, Star, StarOff, FileText, BookOpen, CheckSquare,
  List, Layers, Hash, File, ArrowRight, Clock, Eye
} from 'lucide-react'
import type { DocType } from '@/types'
import { formatRelativeTime } from '@/lib/utils'

const DOC_ICONS: Record<DocType, typeof FileText> = {
  sop: FileText,
  guide: BookOpen,
  template: Layers,
  checklist: CheckSquare,
  prompt: Hash,
  resource: File,
}

const DOC_COLORS: Record<DocType, string> = {
  sop: '#6F2BFA',
  guide: '#3B82F6',
  template: '#F59E0B',
  checklist: '#22C55E',
  prompt: '#EC4899',
  resource: '#8B5CF6',
}

const MOCK_DOCS = [
  {
    id: 'd1', title: 'Client Onboarding SOP', type: 'sop' as DocType,
    category: 'Operations', tags: ['onboarding', 'clients'], isFavorite: true,
    views: 42, updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    content: `# Client Onboarding Process\n\n## Step 1: Initial Setup\n\n- Create client profile in CRM\n- Send welcome email\n- Schedule kick-off call\n\n## Step 2: Access & Tools\n\n- Share access credentials\n- Set up project folder\n- Add to Slack workspace\n\n## Step 3: Strategy Session\n\n- Review goals and KPIs\n- Confirm deliverables\n- Set reporting cadence`,
  },
  {
    id: 'd2', title: 'Monthly Reporting Template', type: 'template' as DocType,
    category: 'Reporting', tags: ['reporting', 'monthly'], isFavorite: true,
    views: 28, updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    content: `# Monthly Report Template\n\n## Executive Summary\n\n[2-3 sentences summarizing the month]\n\n## Key Metrics\n\n| Metric | This Month | Last Month | Change |\n|--------|------------|------------|--------|\n| Reach  | -          | -          | -      |\n\n## Highlights\n\n- Achievement 1\n- Achievement 2\n\n## Next Month Priorities\n\n1. Priority 1\n2. Priority 2`,
  },
  {
    id: 'd3', title: 'Content Creation Checklist', type: 'checklist' as DocType,
    category: 'Content', tags: ['content', 'social'], isFavorite: false,
    views: 19, updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    content: `# Content Creation Checklist\n\n- [ ] Confirm content brief with client\n- [ ] Research hashtags\n- [ ] Write caption copy\n- [ ] Design visual/graphic\n- [ ] Internal review\n- [ ] Client approval\n- [ ] Schedule post\n- [ ] Monitor first 24h engagement`,
  },
  {
    id: 'd4', title: 'Social Media Strategy Guide', type: 'guide' as DocType,
    category: 'Strategy', tags: ['social', 'strategy'], isFavorite: false,
    views: 55, updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
    content: `# Social Media Strategy Framework\n\nThis guide covers the standard approach for building a social media strategy for new clients.\n\n## Audit Phase\n\n1. Analyze existing accounts\n2. Benchmark competitors\n3. Identify content gaps\n\n## Strategy Phase\n\n1. Define target audience personas\n2. Set SMART goals\n3. Select key platforms\n\n## Execution Phase\n\n1. Build content calendar\n2. Create content pillars\n3. Set KPIs and tracking`,
  },
  {
    id: 'd5', title: 'ChatGPT Prompts Library', type: 'prompt' as DocType,
    category: 'AI Tools', tags: ['ai', 'prompts', 'tools'], isFavorite: true,
    views: 67, updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    content: `# Prompt Library\n\n## Caption Writing\n\nWrite 5 Instagram captions for [BRAND] promoting [PRODUCT]. Tone: [TONE]. Include a CTA. Max 150 words each.\n\n## Strategy\n\nYou are a senior social media strategist. Analyze [BRAND]'s current strategy and provide 3 specific recommendations to improve [METRIC].\n\n## Email Subject Lines\n\nGenerate 10 email subject lines for [CAMPAIGN]. Target audience: [AUDIENCE]. Goal: maximize open rate.`,
  },
]

const CATEGORIES = ['All', ...Array.from(new Set(MOCK_DOCS.map(d => d.category)))]
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
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedType, setSelectedType] = useState<DocType | 'all'>('all')
  const [selectedDoc, setSelectedDoc] = useState(MOCK_DOCS[0])
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  const filtered = useMemo(() => {
    return MOCK_DOCS.filter((d) => {
      const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase())
      const matchCategory = selectedCategory === 'All' || d.category === selectedCategory
      const matchType = selectedType === 'all' || d.type === selectedType
      const matchFav = !favoritesOnly || d.isFavorite
      return matchSearch && matchCategory && matchType && matchFav
    })
  }, [search, selectedCategory, selectedType, favoritesOnly])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        actions={
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={13} strokeWidth={2.5} /> Nuevo Doc
          </button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className="w-72 flex flex-col shrink-0 overflow-hidden"
          style={{ borderRight: '1px solid var(--color-border-subtle)' }}
        >
          {/* Search */}
          <div className="p-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-base pl-8 py-1.5 text-xs"
                placeholder="Buscar docs…"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="p-3 space-y-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Categoría
              </p>
              <div className="space-y-0.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all"
                    style={{
                      background: selectedCategory === cat ? 'rgba(111,43,250,0.12)' : 'transparent',
                      color: selectedCategory === cat ? 'var(--color-accent)' : 'var(--color-text-2)',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Tipo
              </p>
              <div className="space-y-0.5">
                {TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedType(value)}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all"
                    style={{
                      background: selectedType === value ? 'rgba(111,43,250,0.12)' : 'transparent',
                      color: selectedType === value ? 'var(--color-accent)' : 'var(--color-text-2)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Doc list */}
          <div className="flex-1 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                No se encontraron documentos
              </p>
            ) : (
              filtered.map((doc, i) => {
                const Icon = DOC_ICONS[doc.type]
                const color = DOC_COLORS[doc.type]
                const isSelected = selectedDoc?.id === doc.id
                return (
                  <motion.button
                    key={doc.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setSelectedDoc(doc)}
                    className="w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all mb-1"
                    style={{
                      background: isSelected ? 'rgba(111,43,250,0.12)' : 'transparent',
                      border: isSelected ? '1px solid rgba(111,43,250,0.2)' : '1px solid transparent',
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${color}18`, color }}
                    >
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: isSelected ? 'var(--color-text)' : 'var(--color-text-2)' }}>
                        {doc.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                          {doc.category}
                        </span>
                        <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          <Eye size={9} /> {doc.views}
                        </span>
                      </div>
                    </div>
                    {doc.isFavorite && (
                      <Star size={11} fill="currentColor" className="shrink-0" style={{ color: '#F59E0B' }} />
                    )}
                  </motion.button>
                )
              })
            )}
          </div>
        </div>

        {/* Document viewer */}
        <div className="flex-1 overflow-y-auto">
          {selectedDoc ? (
            <DocViewer doc={selectedDoc} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <EmptyState icon={FileText} title="Selecciona un documento" description="Elige un documento de la barra lateral para verlo." />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DocViewer({ doc }: { doc: typeof MOCK_DOCS[0] }) {
  const Icon = DOC_ICONS[doc.type]
  const color = DOC_COLORS[doc.type]

  const lines = doc.content.split('\n')

  return (
    <motion.div
      key={doc.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="max-w-3xl mx-auto p-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${color}18`, color }}
          >
            <Icon size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              {doc.title}
            </h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {doc.category}
              </span>
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                <Clock size={10} /> Actualizado {formatRelativeTime(doc.updatedAt)}
              </span>
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                <Eye size={10} /> {doc.views} vistas
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}
          >
            Editar
          </button>
          <button
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--color-surface-3)', color: '#F59E0B' }}
          >
            {doc.isFavorite ? <Star size={13} fill="currentColor" /> : <Star size={13} />}
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {doc.tags.map((tag) => (
          <span key={tag} className="badge badge-muted">{tag}</span>
        ))}
      </div>

      {/* Content rendered */}
      <div className="prose-like space-y-3">
        {lines.map((line, i) => {
          if (line.startsWith('# ')) return (
            <h1 key={i} className="text-xl font-bold mt-6 mb-2" style={{ color: 'var(--color-text)' }}>
              {line.slice(2)}
            </h1>
          )
          if (line.startsWith('## ')) return (
            <h2 key={i} className="text-base font-semibold mt-5 mb-2" style={{ color: 'var(--color-text)' }}>
              {line.slice(3)}
            </h2>
          )
          if (line.startsWith('### ')) return (
            <h3 key={i} className="text-sm font-semibold mt-4 mb-1" style={{ color: 'var(--color-text)' }}>
              {line.slice(4)}
            </h3>
          )
          if (line.startsWith('- [ ] ')) return (
            <label key={i} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-text-2)' }}>
              <input type="checkbox" className="rounded" />
              {line.slice(6)}
            </label>
          )
          if (line.startsWith('- ') || line.startsWith('* ')) return (
            <p key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-2)' }}>
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
              {line.slice(2)}
            </p>
          )
          if (/^\d+\. /.test(line)) return (
            <p key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-2)' }}>
              <span className="shrink-0 font-semibold" style={{ color }}>{line.match(/^\d+/)?.[0]}.</span>
              {line.replace(/^\d+\. /, '')}
            </p>
          )
          if (line.startsWith('|')) return (
            <div key={i} className="text-xs overflow-x-auto">
              <div className="flex gap-4 px-3 py-1.5 rounded" style={{
                background: i === lines.findIndex(l => l.startsWith('|')) ? 'var(--color-surface-3)' : 'transparent',
                color: 'var(--color-text-2)',
              }}>
                {line.split('|').filter(Boolean).map((cell, j) => (
                  <span key={j} className="flex-1 truncate">{cell.trim()}</span>
                ))}
              </div>
            </div>
          )
          if (line === '' || line === '---') return <div key={i} className="h-2" />
          return (
            <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}>
              {line}
            </p>
          )
        })}
      </div>
    </motion.div>
  )
}
