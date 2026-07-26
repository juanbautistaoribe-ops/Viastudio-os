'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, CheckSquare, TrendingUp, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/crm', label: 'CRM', icon: Users },
  { href: '/tasks', label: 'Tareas', icon: CheckSquare },
  { href: '/leads', label: 'Leads', icon: TrendingUp },
  { href: '/ai', label: 'IA', icon: Sparkles },
] as const

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden"
      style={{
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border-subtle)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors"
            style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.2 : 1.75} />
            <span className="text-[10px] font-medium">{label}</span>
            {isActive && (
              <span
                className="absolute bottom-0 w-8 h-0.5 rounded-full"
                style={{ background: 'var(--color-accent)' }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
