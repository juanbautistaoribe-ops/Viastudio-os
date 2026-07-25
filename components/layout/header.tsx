'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { formatRelativeTime } from '@/lib/utils'
import type { Activity, ActivityType } from '@/types'

const PAGE_TITLES: Record<string, { title: string; description: string }> = {
  '/dashboard': { title: 'Dashboard', description: 'Resumen de la agencia' },
  '/crm': { title: 'CRM', description: 'Clientes y contactos' },
  '/tasks': { title: 'Tareas', description: 'Proyectos y trabajo' },
  '/leads': { title: 'Leads', description: 'Pipeline y oportunidades' },
  '/calendar': { title: 'Calendario', description: 'Agenda y eventos' },
  '/sops': { title: 'SOPs', description: 'Docs y procesos' },
  '/ai': { title: 'Centro IA', description: 'Impulsado por Claude' },
  '/settings': { title: 'Configuración', description: 'Cuenta y preferencias' },
}

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  client_created:   '#3B82F6',
  client_updated:   '#8B5CF6',
  task_created:     '#6F2BFA',
  task_completed:   '#22C55E',
  lead_created:     '#F59E0B',
  lead_won:         '#22C55E',
  lead_lost:        '#6B7280',
  doc_created:      '#EC4899',
  comment_added:    '#06B6D4',
  payment_received: '#22C55E',
}

interface HeaderProps {
  actions?: React.ReactNode
}

export function Header({ actions }: HeaderProps) {
  const pathname = usePathname()
  const base = '/' + (pathname.split('/')[1] ?? '')
  const meta = PAGE_TITLES[base] ?? { title: 'ViaStudio OS', description: '' }

  const [notifOpen, setNotifOpen] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [unread, setUnread] = useState(0)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setActivities(data)
          setUnread(data.length > 0 ? Math.min(data.length, 9) : 0)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    if (notifOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  return (
    <header
      className="flex items-center justify-between h-14 px-6 shrink-0"
      style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-surface)' }}
    >
      <motion.div key={pathname} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
        <h1 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>{meta.title}</h1>
        {meta.description && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{meta.description}</p>}
      </motion.div>

      <div className="flex items-center gap-2">
        {actions}

        <div className="relative" ref={bellRef}>
          <button
            onClick={() => { setNotifOpen(v => !v); setUnread(0) }}
            className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-2)', background: notifOpen ? 'var(--color-surface-3)' : 'transparent' }}
          >
            <Bell size={16} />
            {unread > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5"
                style={{ background: 'var(--color-primary)' }}
              >
                {unread}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-10 z-50 w-80 rounded-2xl shadow-2xl overflow-hidden"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)' }}
              >
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Actividad reciente</p>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {activities.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell size={24} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sin actividad todavía</p>
                    </div>
                  ) : (
                    activities.map((activity) => {
                      const color = ACTIVITY_COLORS[activity.type as ActivityType] ?? '#6F2BFA'
                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 px-4 py-3 transition-colors"
                          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                        >
                          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}20` }}>
                            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{activity.title}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                              {formatRelativeTime(activity.createdAt)}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
