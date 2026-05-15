'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowUpRight, Clock, AlertTriangle, Users, Bell } from 'lucide-react'
import { formatDateTime, formatDateShort } from '@/lib/utils'
import type { CalendarEvent, EventType } from '@/types'

const EVENT_CONFIG: Record<EventType, { color: string; icon: typeof Clock }> = {
  meeting:     { color: '#6F2BFA', icon: Users },
  deadline:    { color: '#EF4444', icon: AlertTriangle },
  publication: { color: '#F59E0B', icon: Bell },
  followup:    { color: '#3B82F6', icon: Bell },
  internal:    { color: '#22C55E', icon: Users },
  other:       { color: '#8B5CF6', icon: Clock },
}

interface UpcomingEventsProps {
  events: CalendarEvent[]
}

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Próximos Eventos
        </h3>
        <Link
          href="/calendar"
          className="flex items-center gap-1 text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Calendario <ArrowUpRight size={11} />
        </Link>
      </div>

      <div className="space-y-2">
        {events.slice(0, 3).map((event, i) => {
          const cfg = EVENT_CONFIG[event.type]
          const Icon = cfg.icon
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div
                className="w-1 h-8 rounded-full shrink-0"
                style={{ background: cfg.color }}
              />
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${cfg.color}18`, color: cfg.color }}
              >
                <Icon size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>
                  {event.title}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {event.allDay ? formatDateShort(event.startDate) : formatDateTime(event.startDate)}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
