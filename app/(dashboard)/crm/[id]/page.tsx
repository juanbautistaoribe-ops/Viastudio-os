'use client'

import { use } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Mail, Phone, Globe, MapPin, Calendar,
  Edit, MoreHorizontal, CheckSquare, DollarSign, FileText, Users,
  Clock, Tag
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Avatar } from '@/components/shared/avatar'
import { MOCK_CLIENTS, MOCK_TASKS } from '@/lib/mock-data'
import { formatCurrency, formatDate, getStatusBadgeClass, getStatusLabel, getPriorityColor } from '@/lib/utils'

const SERVICE_LABELS: Record<string, string> = {
  social_media: 'Social Media', paid_ads: 'Paid Ads', seo: 'SEO',
  content: 'Contenido', email: 'Email Marketing', branding: 'Branding',
  web: 'Web', consulting: 'Consultoría', strategy: 'Estrategia',
}

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const client = MOCK_CLIENTS.find((c) => c.id === id)

  if (!client) notFound()

  const clientTasks = MOCK_TASKS.filter((t) => t.clientId === client.id || !t.clientId).slice(0, 4)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header />

      <main className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div
          className="p-6 pb-0"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
        >
          <Link
            href="/crm"
            className="flex items-center gap-1.5 text-xs mb-4 w-fit transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <ArrowLeft size={12} /> Volver al CRM
          </Link>

          <div className="flex items-start gap-4 pb-5">
            <Avatar name={client.company} size="xl" />

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                  {client.company}
                </h2>
                <span className={`badge ${getStatusBadgeClass(client.status)}`}>
                  {getStatusLabel(client.status)}
                </span>
              </div>
              <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
                {client.name} · {client.industry}
              </p>

              <div className="flex items-center gap-4 flex-wrap">
                <a
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: 'var(--color-text-2)' }}
                >
                  <Mail size={13} /> {client.email}
                </a>
                {client.phone && (
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-2)' }}>
                    <Phone size={13} /> {client.phone}
                  </span>
                )}
                {client.website && (
                  <a
                    href={`https://${client.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: 'var(--color-text-2)' }}
                  >
                    <Globe size={13} /> {client.website}
                  </a>
                )}
                {client.country && (
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-2)' }}>
                    <MapPin size={13} /> {client.country}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}
              >
                <Edit size={12} /> Editar
              </button>
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}
              >
                <MoreHorizontal size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="xl:col-span-2 space-y-5">
            {/* Services */}
            <Section title="Servicios" icon={CheckSquare}>
              <div className="flex flex-wrap gap-2">
                {client.services.map((s) => (
                  <span key={s} className="badge badge-primary text-xs px-3 py-1">
                    {SERVICE_LABELS[s] ?? s}
                  </span>
                ))}
              </div>
            </Section>

            {/* Tasks */}
            <Section title="Tareas relacionadas" icon={CheckSquare}>
              {clientTasks.length === 0 ? (
                <p className="text-xs py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
                  Aún no hay tareas para este cliente.
                </p>
              ) : (
                <div className="space-y-2">
                  {clientTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)' }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: task.priority === 'critical' ? '#EF4444' : task.priority === 'high' ? '#F97316' : '#F59E0B' }}
                      />
                      <p className="flex-1 text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                        {task.title}
                      </p>
                      <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                      {task.dueDate && (
                        <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                          <Clock size={10} /> {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Notes */}
            {client.notes && (
              <Section title="Notas" icon={FileText}>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-2)' }}>
                  {client.notes}
                </p>
              </Section>
            )}

            {/* Tags */}
            {client.tags.length > 0 && (
              <Section title="Etiquetas" icon={Tag}>
                <div className="flex flex-wrap gap-1.5">
                  {client.tags.map((tag) => (
                    <span key={tag} className="badge badge-muted">{tag}</span>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Revenue */}
            <div
              className="p-4 rounded-xl"
              style={{ background: 'linear-gradient(135deg, rgba(111,43,250,0.08) 0%, var(--color-surface) 100%)', border: '1px solid rgba(111,43,250,0.15)' }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Valor mensual</p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
                {formatCurrency(client.monthlyValue)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>/mes</p>
            </div>

            {/* Details */}
            <div className="card p-4 space-y-3">
              <h4 className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Detalles</h4>
              {[
                { label: 'Cliente desde', value: formatDate(client.startDate), icon: Calendar },
                { label: 'Industria', value: client.industry ?? '—', icon: Tag },
                { label: 'País', value: client.country ?? '—', icon: MapPin },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon size={13} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-xs flex-1" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="card p-4 space-y-2">
              <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Acciones rápidas</h4>
              {[
                { label: 'Crear tarea', icon: CheckSquare },
                { label: 'Agregar pago', icon: DollarSign },
                { label: 'Nuevo documento', icon: FileText },
                { label: 'Agregar contacto', icon: Users },
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left"
                  style={{ color: 'var(--color-text-2)', background: 'var(--color-surface-2)' }}
                >
                  <Icon size={13} style={{ color: 'var(--color-primary)' }} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof CheckSquare
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} style={{ color: 'var(--color-primary)' }} />
        <h4 className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
          {title}
        </h4>
      </div>
      {children}
    </div>
  )
}
