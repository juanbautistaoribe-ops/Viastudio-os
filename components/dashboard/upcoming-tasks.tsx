'use client'

import { motion } from 'framer-motion'
import { AlertCircle, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { formatDate, getPriorityColor, getStatusBadgeClass, getStatusLabel } from '@/lib/utils'
import type { Task } from '@/types'

const PRIORITY_DOT: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#F59E0B',
  low: '#3B82F6',
}

interface UpcomingTasksProps {
  tasks: Task[]
}

export function UpcomingTasks({ tasks }: UpcomingTasksProps) {
  return (
    <div className="card p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Próximas Tareas
        </h3>
        <Link
          href="/tasks"
          className="flex items-center gap-1 text-xs transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Ver todas <ArrowUpRight size={11} />
        </Link>
      </div>

      <div className="space-y-1">
        {tasks.slice(0, 5).map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
          >
            <Link
              href={`/tasks?id=${task.id}`}
              className="flex items-center gap-3 py-2.5 px-2 rounded-lg transition-colors group"
              style={{ color: 'inherit' }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: PRIORITY_DOT[task.priority] }}
              />
              <p
                className="flex-1 text-xs font-medium truncate group-hover:opacity-80"
                style={{ color: 'var(--color-text)' }}
              >
                {task.title}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`badge ${getStatusBadgeClass(task.status)}`}
                >
                  {getStatusLabel(task.status)}
                </span>
                {task.dueDate && (
                  <span
                    className="text-[10px]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {formatDate(task.dueDate)}
                  </span>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
