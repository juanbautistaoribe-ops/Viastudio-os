'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { TaskCard } from './task-card'
import type { Task, TaskStatus } from '@/types'

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'backlog',     label: 'Backlog',      color: '#555575' },
  { id: 'todo',        label: 'Por hacer',    color: '#3B82F6' },
  { id: 'in_progress', label: 'En progreso',  color: '#6F2BFA' },
  { id: 'review',      label: 'En revisión',  color: '#F59E0B' },
  { id: 'done',        label: 'Completado',   color: '#22C55E' },
]

interface KanbanBoardProps {
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onStatusChange: (taskId: string, status: TaskStatus) => void
}

export function KanbanBoard({ tasks, onEdit, onDelete, onStatusChange }: KanbanBoardProps) {
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const dragId = useRef<string | null>(null)

  const handleDragStart = (id: string) => { dragId.current = id }
  const handleDragOver = (e: React.DragEvent, colId: string) => { e.preventDefault(); setDragOverCol(colId) }
  const handleDrop = (colId: string) => {
    const id = dragId.current
    if (!id) return
    const task = tasks.find(t => t.id === id)
    if (task && task.status !== colId) onStatusChange(id, colId as TaskStatus)
    setDragOverCol(null)
    dragId.current = null
  }

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id)
        const isDragOver = dragOverCol === col.id
        return (
          <div
            key={col.id}
            className="flex flex-col shrink-0 w-72"
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={() => handleDrop(col.id)}
          >
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{col.label}</span>
              <span className="flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}>
                {colTasks.length}
              </span>
            </div>

            <div
              className="flex-1 rounded-xl p-2 space-y-2 min-h-32 transition-colors"
              style={{
                background: isDragOver ? `${col.color}12` : 'var(--color-surface-2)',
                border: isDragOver ? `1.5px dashed ${col.color}` : '1px solid var(--color-border-subtle)',
              }}
            >
              {colTasks.length === 0 ? (
                <div className="flex items-center justify-center h-20 rounded-lg text-xs border border-dashed" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                  Sin tareas
                </div>
              ) : (
                colTasks.map((task, i) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    delay={i * 0.04}
                    compact
                    onEdit={() => onEdit(task)}
                    onDelete={() => onDelete(task)}
                    onDragStart={() => handleDragStart(task.id)}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
