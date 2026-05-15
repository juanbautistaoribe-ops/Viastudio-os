'use client'

import { Bell, Plus, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

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

interface HeaderProps {
  actions?: React.ReactNode
}

export function Header({ actions }: HeaderProps) {
  const pathname = usePathname()
  const base = '/' + (pathname.split('/')[1] ?? '')
  const meta = PAGE_TITLES[base] ?? { title: 'ViaStudio OS', description: '' }

  return (
    <header
      className="flex items-center justify-between h-14 px-6 shrink-0"
      style={{
        borderBottom: '1px solid var(--color-border-subtle)',
        background: 'var(--color-surface)',
      }}
    >
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        <h1
          className="text-sm font-semibold tracking-tight"
          style={{ color: 'var(--color-text)' }}
        >
          {meta.title}
        </h1>
        {meta.description && (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {meta.description}
          </p>
        )}
      </motion.div>

      <div className="flex items-center gap-2">
        {actions}

        <button
          className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-2)' }}
        >
          <Bell size={16} />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--color-primary)' }}
          />
        </button>
      </div>
    </header>
  )
}
