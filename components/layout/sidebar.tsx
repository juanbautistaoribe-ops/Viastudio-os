'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  BookOpen,
  Sparkles,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Command,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui'
import { useAuthStore } from '@/store/auth'
import { Avatar } from '@/components/shared/avatar'
import { initials, generateAvatarColor } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/crm', label: 'CRM', icon: Users },
  { href: '/tasks', label: 'Tareas', icon: CheckSquare },
  { href: '/leads', label: 'Leads', icon: TrendingUp },
  { href: '/calendar', label: 'Calendario', icon: Calendar },
  { href: '/sops', label: 'SOPs', icon: BookOpen },
  { href: '/ai', label: 'Centro IA', icon: Sparkles },
] as const

const BOTTOM_ITEMS = [
  { href: '/settings', label: 'Configuración', icon: Settings },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar, setCommandOpen } = useUIStore()
  const { profile, setProfile } = useAuthStore()

  const name = profile?.name ?? 'User'

  useEffect(() => {
    if (profile) return
    fetch('/api/settings/profile')
      .then(r => r.json())
      .then(data => {
        if (data.name) setProfile({ id: '', name: data.name, email: data.email ?? '', avatar: data.avatar, role: 'MEMBER' })
      })
      .catch(() => {})
  }, [])

  return (
    <div className="relative flex-shrink-0">
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border-subtle)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center h-14 px-4 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/via-logo.svg"
            alt="ViaStudio"
            className="logo-glow w-7 h-7 rounded-lg shrink-0 object-cover"
          />
          <AnimatePresence initial={false}>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="text-sm font-bold tracking-tight overflow-hidden whitespace-nowrap"
                style={{ color: 'var(--color-text)' }}
              >
                ViaStudio OS
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Search / Command */}
      <AnimatePresence initial={false}>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-3 pt-3 pb-1"
          >
            <button
              onClick={() => setCommandOpen(true)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-muted)',
              }}
            >
              <Search size={12} />
              <span className="flex-1 text-left">Buscar o ir a…</span>
              <span
                className="flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded"
                style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}
              >
                <Command size={9} />
                K

              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn('sidebar-item', isActive && 'active')}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon size={16} strokeWidth={isActive ? 2 : 1.75} className="shrink-0" />
              <AnimatePresence initial={false}>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {label === 'Centro IA' && !sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="ml-auto badge badge-primary"
                >
                  AI
                </motion.span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div
        className="px-2 py-2 space-y-0.5"
        style={{ borderTop: '1px solid var(--color-border-subtle)' }}
      >
        {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn('sidebar-item', isActive && 'active')}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon size={16} strokeWidth={isActive ? 2 : 1.75} className="shrink-0" />
              <AnimatePresence initial={false}>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )
        })}

        {/* Profile */}
        <div
          className="flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer transition-colors"
          style={{ color: 'var(--color-text-2)' }}
          title={sidebarCollapsed ? name : undefined}
        >
          <Avatar name={name} src={profile?.avatar ?? undefined} size="xs" className="shrink-0" />
          <AnimatePresence initial={false}>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <p className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--color-text)' }}>
                  {name}
                </p>
                <p className="text-[10px] whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                  {profile?.role ?? 'Miembro'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </motion.aside>

      {/* Collapse toggle — outside aside so overflow:hidden doesn't clip it */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-[56px] w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all"
        style={{
          background: 'var(--color-surface-3)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-2)',
        }}
      >
        {sidebarCollapsed
          ? <ChevronRight size={12} />
          : <ChevronLeft size={12} />
        }
      </button>
    </div>
  )
}
