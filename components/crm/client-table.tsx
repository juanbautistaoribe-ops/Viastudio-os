'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight, MoreHorizontal } from 'lucide-react'
import { Avatar } from '@/components/shared/avatar'
import { formatCurrency, formatDate, getStatusBadgeClass, getStatusLabel } from '@/lib/utils'
import type { Client } from '@/types'

const SERVICE_LABELS: Record<string, string> = {
  social_media: 'Social',
  paid_ads: 'Paid Ads',
  seo: 'SEO',
  content: 'Content',
  email: 'Email',
  branding: 'Branding',
  web: 'Web',
  consulting: 'Consulting',
  strategy: 'Strategy',
}

interface ClientTableProps {
  clients: Client[]
}

export function ClientTable({ clients }: ClientTableProps) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--color-border-subtle)' }}
    >
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border-subtle)' }}>
            {['Cliente', 'Estado', 'Servicios', 'Valor Mensual', 'Desde', ''].map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 text-left font-semibold"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map((client, i) => (
            <motion.tr
              key={client.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="group transition-colors"
              style={{
                borderBottom: i < clients.length - 1 ? '1px solid var(--color-border-subtle)' : undefined,
              }}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={client.company} size="sm" />
                  <div>
                    <Link
                      href={`/crm/${client.id}`}
                      className="font-semibold hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {client.company}
                    </Link>
                    <p style={{ color: 'var(--color-text-muted)' }}>{client.name}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`badge ${getStatusBadgeClass(client.status)}`}>
                  {getStatusLabel(client.status)}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {client.services.slice(0, 2).map((s) => (
                    <span key={s} className="badge badge-muted">
                      {SERVICE_LABELS[s] ?? s}
                    </span>
                  ))}
                  {client.services.length > 2 && (
                    <span className="badge badge-muted">+{client.services.length - 2}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
                {formatCurrency(client.monthlyValue, client.currency ?? 'ARS')}
              </td>
              <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>
                {formatDate(client.startDate)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/crm/${client.id}`}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors"
                    style={{
                      background: 'var(--color-surface-3)',
                      color: 'var(--color-text-2)',
                    }}
                  >
                    Ver <ArrowUpRight size={10} />
                  </Link>
                  <button
                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                    style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-3)' }}
                  >
                    <MoreHorizontal size={13} />
                  </button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
