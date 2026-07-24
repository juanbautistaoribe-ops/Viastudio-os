'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Globe, Mail, ExternalLink, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/shared/avatar'
import { formatCurrency, getStatusBadgeClass, getStatusLabel } from '@/lib/utils'
import type { Client } from '@/types'

const SERVICE_LABELS: Record<string, string> = {
  social_media: 'Social', SOCIAL_MEDIA: 'Social',
  paid_ads: 'Paid Ads', PAID_ADS: 'Paid Ads',
  seo: 'SEO', SEO: 'SEO',
  content: 'Contenido', CONTENT: 'Contenido',
  email: 'Email', EMAIL: 'Email',
  branding: 'Branding', BRANDING: 'Branding',
  web: 'Web', WEB: 'Web',
  consulting: 'Consultoría', CONSULTING: 'Consultoría',
  strategy: 'Estrategia', STRATEGY: 'Estrategia',
}

interface ClientCardProps {
  client: Client
  delay?: number
  onEdit?: (client: Client) => void
  onDelete?: (client: Client) => void
}

export function ClientCard({ client, delay = 0, onEdit, onDelete }: ClientCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className="card card-hover p-5 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar name={client.company} size="md" />
          <div>
            <Link
              href={`/crm/${client.id}`}
              className="text-sm font-semibold block hover:opacity-80 transition-opacity"
              style={{ color: 'var(--color-text)' }}
            >
              {client.company}
            </Link>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {client.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`badge ${getStatusBadgeClass(client.status)}`}>
            {getStatusLabel(client.status)}
          </span>

          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.preventDefault(); setMenuOpen(v => !v) }}
              className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <MoreHorizontal size={14} />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-8 z-20 w-36 rounded-xl py-1 shadow-xl"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <button
                  onClick={() => { setMenuOpen(false); onEdit?.(client) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ color: 'var(--color-text)' }}
                >
                  <Pencil size={12} />
                  Editar
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete?.(client) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ color: 'var(--color-danger)' }}
                >
                  <Trash2 size={12} />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="flex flex-wrap gap-1 mb-4">
        {client.services.slice(0, 3).map((service) => (
          <span key={service} className="badge badge-muted">
            {SERVICE_LABELS[service] ?? service}
          </span>
        ))}
        {client.services.length > 3 && (
          <span className="badge badge-muted">+{client.services.length - 3}</span>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: '1px solid var(--color-border-subtle)' }}
      >
        <div>
          <p className="text-xs font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
            {formatCurrency(client.monthlyValue)}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            /mes
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <a
            href={`mailto:${client.email}`}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-3)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Mail size={12} />
          </a>
          {client.website && (
            <a
              href={`https://${client.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-3)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <Globe size={12} />
            </a>
          )}
          <Link
            href={`/crm/${client.id}`}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-3)' }}
          >
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
