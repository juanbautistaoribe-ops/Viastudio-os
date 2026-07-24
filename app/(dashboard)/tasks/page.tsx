'use client'

import { useState, useMemo, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { KanbanBoard } from '@/components/tasks/kanban-board'
import { TaskCard } from '@/components/tasks/task-card'
import { EmptyState } from '@/components/shared/empty-state'
import { NewTaskModal } from '@/components/tasks/new-task-modal'
import { Plus, Search, LayoutGrid, List, Loader2 } from 'lucide-react'
import { CheckSquare } from 'lucide-react'
import type { Task, ViewMode } from '@/types'
import { cn } from '@/lib/utils'

export default function TasksPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => { loadTasks() }, [])

  function loadTasks() {
    setLoading(true)
    fetch('/api/tasks')
      .then(r => r.json())
      .then(data => setTasks(Array.isArray(data) ? data : []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase())
      const matchPriority = priorityFilter === 'all' || (t.priority as string).toLowerCase() === priorityFilter
      return matchSearch && matchPriority
    })
  }, [tasks, search, priorityFilter])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={13} strokeWidth={2.5} />
            Nueva Tarea
          </button>
        }
      />

      <div className="flex items-center gap-3 px-6 py-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        <div className="relative flex-1 max-w-72">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-8 py-1.5 text-xs"
            placeholder="Buscar tareas…"
          />
        </div>

        <div
          className="flex items-center rounded-lg p-0.5 gap-0.5"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)' }}
        >
          {([
            { value: 'all', label: 'Todos' },
            { value: 'critical', label: 'Crítico' },
            { value: 'high', label: 'Alta' },
            { value: 'medium', label: 'Media' },
            { value: 'low', label: 'Baja' },
          ]).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPriorityFilter(value)}
              className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
              style={{
                background: priorityFilter === value ? 'var(--color-primary)' : 'transparent',
                color: priorityFilter === value ? 'white' : 'var(--color-text-muted)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          className="flex items-center rounded-lg p-0.5 gap-0.5"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)' }}
        >
          <button
            onClick={() => setViewMode('kanban')}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-all"
            style={{
              background: viewMode === 'kanban' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'kanban' ? 'white' : 'var(--color-text-muted)',
            }}
          >
            <LayoutGrid size={13} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-all"
            style={{
              background: viewMode === 'list' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'list' ? 'white' : 'var(--color-text-muted)',
            }}
          >
            <List size={13} />
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-hidden p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CheckSquare} title="No hay tareas" description="Creá la primera tarea con el botón de arriba." />
        ) : viewMode === 'kanban' ? (
          <KanbanBoard tasks={filtered} />
        ) : (
          <div className="space-y-2 overflow-y-auto h-full">
            {filtered.map((task, i) => (
              <TaskCard key={task.id} task={task} delay={i * 0.03} />
            ))}
          </div>
        )}
      </main>

      <NewTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={loadTasks}
      />
    </div>
  )
}
