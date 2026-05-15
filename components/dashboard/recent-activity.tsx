'use client'

import { motion } from 'framer-motion'
import {
  CheckSquare, UserPlus, DollarSign, TrendingUp, FileText,
  MessageSquare, type LucideIcon
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { Activity, ActivityType } from '@/types'

const ACTIVITY_ICONS: Record<ActivityType, { icon: LucideIcon; color: string }> = {
  task_completed: { icon: CheckSquare, color: '#22C55E' },
  task_created: { icon: CheckSquare, color: '#6F2BFA' },
  client_created: { icon: UserPlus, color: '#3B82F6' },
  client_updated: { icon: UserPlus, color: '#8B5CF6' },
  lead_created: { icon: TrendingUp, color: '#F59E0B' },
  lead_won: { icon: TrendingUp, color: '#22C55E' },
  lead_lost: { icon: TrendingUp, color: '#EF4444' },
  doc_created: { icon: FileText, color: '#8B5CF6' },
  comment_added: { icon: MessageSquare, color: '#06B6D4' },
  payment_received: { icon: DollarSign, color: '#22C55E' },
}

interface RecentActivityProps {
  activities: Activity[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="card p-5 h-full">
      <h3
        className="text-sm font-semibold mb-4"
        style={{ color: 'var(--color-text)' }}
      >
        Actividad Reciente
      </h3>

      <div className="space-y-1">
        {activities.map((item, i) => {
          const meta = ACTIVITY_ICONS[item.type]
          const Icon = meta.icon
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
              className="flex items-start gap-3 py-2.5 px-2 rounded-lg transition-colors"
              style={{ cursor: 'default' }}
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `${meta.color}18`, color: meta.color }}
              >
                <Icon size={12} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-medium leading-tight"
                  style={{ color: 'var(--color-text)' }}
                >
                  {item.title}
                </p>
                {item.description && (
                  <p
                    className="text-xs mt-0.5 truncate"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {item.description}
                  </p>
                )}
              </div>
              <span
                className="text-[10px] shrink-0 mt-0.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {formatRelativeTime(item.createdAt)}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
