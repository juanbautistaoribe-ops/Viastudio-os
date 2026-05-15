'use client'

import { motion } from 'framer-motion'
import { Clock, CheckSquare, Paperclip, MessageSquare, MoreHorizontal } from 'lucide-react'
import { formatDate, getStatusBadgeClass, getPriorityColor, cn } from '@/lib/utils'
import type { Task } from '@/types'

const PRIORITY_BORDER: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#F59E0B',
  low: '#3B82F6',
}

interface TaskCardProps {
  task: Task
  delay?: number
  compact?: boolean
}

export function TaskCard({ task, delay = 0, compact = false }: TaskCardProps) {
  const completedChecklist = task.checklist.filter((c) => c.completed).length
  const totalChecklist = task.checklist.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay }}
      className="rounded-xl p-3.5 group cursor-pointer card-hover"
      style={{
        background: 'var(--color-surface)',
        border: `1px solid var(--color-border-subtle)`,
        borderLeft: `3px solid ${PRIORITY_BORDER[task.priority]}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p
          className={cn(
            'text-xs font-medium leading-snug',
            task.status === 'done' && 'line-through opacity-50'
          )}
          style={{ color: 'var(--color-text)' }}
        >
          {task.title}
        </p>
        <button
          className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <MoreHorizontal size={12} />
        </button>
      </div>

      {/* Tags */}
      {!compact && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="badge badge-muted">{tag}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 mt-2">
        {task.dueDate && (
          <span
            className="flex items-center gap-1 text-[10px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <Clock size={10} />
            {formatDate(task.dueDate)}
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {totalChecklist > 0 && (
            <span
              className="flex items-center gap-1 text-[10px]"
              style={{ color: completedChecklist === totalChecklist ? 'var(--color-success)' : 'var(--color-text-muted)' }}
            >
              <CheckSquare size={10} />
              {completedChecklist}/{totalChecklist}
            </span>
          )}
          {task.comments.length > 0 && (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              <MessageSquare size={10} />
              {task.comments.length}
            </span>
          )}
          {task.attachments.length > 0 && (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              <Paperclip size={10} />
              {task.attachments.length}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
