'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Avatar } from '@/components/shared/avatar'
import { formatCurrency, getStatusBadgeClass, getStatusLabel } from '@/lib/utils'
import type { Client } from '@/types'

interface ClientsOverviewProps {
  clients: Client[]
}

export function ClientsOverview({ clients }: ClientsOverviewProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Clientes Activos
        </h3>
        <Link
          href="/crm"
          className="flex items-center gap-1 text-xs transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Ver todos <ArrowUpRight size={11} />
        </Link>
      </div>

      <div className="space-y-1">
        {clients.filter(c => c.status === 'active').slice(0, 5).map((client, i) => (
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
          >
            <Link
              href={`/crm/${client.id}`}
              className="flex items-center gap-3 py-2 px-2 rounded-lg transition-colors group"
            >
              <Avatar name={client.company} size="sm" />
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-medium truncate"
                  style={{ color: 'var(--color-text)' }}
                >
                  {client.company}
                </p>
                <p
                  className="text-[10px] truncate"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {client.services.slice(0, 2).map(s => s.replace('_', ' ')).join(' · ')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p
                  className="text-xs font-semibold tabular-nums"
                  style={{ color: 'var(--color-text)' }}
                >
                  {formatCurrency(client.monthlyValue)}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>/mo</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
