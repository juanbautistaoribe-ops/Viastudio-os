'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Mail, Phone, Globe, MapPin, Calendar,
  CheckSquare, DollarSign, FileText, Users,
  Clock, Tag, ChevronLeft, ChevronRight, Plus, Loader2, Pencil, Trash2
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Avatar } from '@/components/shared/avatar'
import { NewTaskModal } from '@/components/tasks/new-task-modal'
import { NewEventModal } from '@/components/calendar/new-event-modal'
import { formatCurrency, formatDate, formatDateShort, formatDateTime, getStatusBadgeClass, getStatusLabel, getPriorityColor } from '@/lib/utils'
import type { CalendarEvent, EventType } from '@/types'

const SERVICE_LABELS: Record<string, string> = {
  social_media: 'Social Media', paid_ads: 'Paid Ads', seo: 'SEO',
  content: 'Contenido', email: 'Email Marketing', branding: 'Branding',
  web: 'Web', consulting: 'Consultoría', strategy: 'Estrategia',
}

const EVENT_CONFIG: Record<string, { color: string; label: string }> = {
  meeting:     { color: '#6F2BFA', label: 'Reunión' },
  deadline:    { color: '#EF4444', label: 'Entrega' },
  publication: { color: '#F59E0B', label: 'Publicación' },
  followup:    { color: '#3B82F6', label: 'Seguimiento' },
  internal:    { color: '#22C55E', label: 'Interno' },
  other:       { color: '#8B5CF6', label: 'Otro' },
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#3B82F6',
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay() }
function sameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [client, setClient] = useState<any>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'resumen' | 'calendario'>('resumen')

  // Calendar state
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [clientRes, eventsRes] = await Promise.all([
        fetch(`/api/clients/${id}`),
        fetch('/api/events'),
      ])
      if (!clientRes.ok) { notFound(); return }
      const [clientData, eventsData] = await Promise.all([clientRes.json(), eventsRes.json()])
      setClient(clientData)
      const clientEvents = (Array.isArray(eventsData) ? eventsData : []).filter((e: any) => e.clientId === id)
      setEvents(clientEvents)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    </div>
  )

  if (!client) return null

  // Calendar helpers
  const tasks = (client.tasks ?? []).filter((t: any) => t.dueDate)
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDay(currentYear, currentMonth)

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  const itemsForDate = (date: Date) => {
    const dayTasks = tasks.filter((t: any) => sameDay(new Date(t.dueDate), date))
    const dayEvents = events.filter((e: any) => sameDay(new Date(e.startDate), date))
    return { dayTasks, dayEvents }
  }

  const { dayTasks: selectedTasks, dayEvents: selectedEvents } = itemsForDate(selectedDate)

  const handleTaskSaved = () => loadData()
  const handleEventCreated = (ev: CalendarEvent) => setEvents(prev => [...prev, ev])
  const handleEventUpdated = (ev: CalendarEvent) => setEvents(prev => prev.map(e => e.id === ev.id ? ev : e))
  const handleEventDelete = async (ev: CalendarEvent) => {
    if (!confirm(`¿Eliminar "${ev.title}"?`)) return
    await fetch(`/api/events/${ev.id}`, { method: 'DELETE' })
    setEvents(prev => prev.filter(e => e.id !== ev.id))
  }

  const selectedDateStr = selectedDate ? selectedDate.toISOString().slice(0, 10) : ''

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header />

      <main className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="p-6 pb-0" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <Link href="/crm" className="flex items-center gap-1.5 text-xs mb-4 w-fit" style={{ color: 'var(--color-text-muted)' }}>
            <ArrowLeft size={12} /> Volver al CRM
          </Link>

          <div className="flex items-start gap-4 pb-4">
            <Avatar name={client.company} size="xl" />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{client.company}</h2>
                <span className={`badge ${getStatusBadgeClass(client.status?.toLowerCase())}`}>
                  {getStatusLabel(client.status?.toLowerCase())}
                </span>
              </div>
              <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
                {client.name}{client.industry ? ` · ${client.industry}` : ''}
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-2)' }}>
                    <Mail size={13} /> {client.email}
                  </a>
                )}
                {client.phone && (
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-2)' }}>
                    <Phone size={13} /> {client.phone}
                  </span>
                )}
                {client.website && (
                  <a href={`https://${client.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-2)' }}>
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
            {/* MRR */}
            <div className="text-right shrink-0">
              <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Valor mensual</p>
              <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
                {formatCurrency(client.monthlyValue ?? 0, client.currency ?? 'ARS')}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>/mes</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {(['resumen', 'calendario'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-2 text-xs font-medium capitalize transition-all border-b-2"
                style={{
                  color: tab === t ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  borderColor: tab === t ? 'var(--color-primary)' : 'transparent',
                  background: 'transparent',
                }}
              >
                {t === 'resumen' ? 'Resumen' : 'Calendario'}
              </button>
            ))}
          </div>
        </div>

        {/* ── RESUMEN TAB ── */}
        {tab === 'resumen' && (
          <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-5">
              {/* Services */}
              {client.services?.length > 0 && (
                <Section title="Servicios" icon={CheckSquare}>
                  <div className="flex flex-wrap gap-2">
                    {client.services.map((s: string) => (
                      <span key={s} className="badge badge-primary text-xs px-3 py-1">
                        {SERVICE_LABELS[s] ?? s}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Tasks */}
              <Section title="Tareas relacionadas" icon={CheckSquare}>
                {tasks.length === 0 ? (
                  <p className="text-xs py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>Aún no hay tareas para este cliente.</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.slice(0, 6).map((task: any) => (
                      <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)' }}>
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[task.priority?.toLowerCase()] ?? '#F59E0B' }} />
                        <p className="flex-1 text-xs font-medium" style={{ color: 'var(--color-text)' }}>{task.title}</p>
                        <span className={`badge ${getStatusBadgeClass(task.status?.toLowerCase())}`}>{getStatusLabel(task.status?.toLowerCase())}</span>
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
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-2)' }}>{client.notes}</p>
                </Section>
              )}

              {/* Tags */}
              {client.tags?.length > 0 && (
                <Section title="Etiquetas" icon={Tag}>
                  <div className="flex flex-wrap gap-1.5">
                    {client.tags.map((tag: string) => <span key={tag} className="badge badge-muted">{tag}</span>)}
                  </div>
                </Section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="card p-4 space-y-3">
                <h4 className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Detalles</h4>
                {[
                  { label: 'Cliente desde', value: client.startDate ? formatDate(client.startDate) : '—', icon: Calendar },
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

              <div className="card p-4 space-y-2">
                <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Acciones rápidas</h4>
                {[
                  { label: 'Ver calendario', icon: Calendar, action: () => setTab('calendario') },
                  { label: 'Crear tarea', icon: CheckSquare, action: () => setTaskModalOpen(true) },
                  { label: 'Nuevo evento', icon: Calendar, action: () => setEventModalOpen(true) },
                  { label: 'Agregar contacto', icon: Users, action: () => {} },
                ].map(({ label, icon: Icon, action }) => (
                  <button key={label} onClick={action} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left" style={{ color: 'var(--color-text-2)', background: 'var(--color-surface-2)' }}>
                    <Icon size={13} style={{ color: 'var(--color-primary)' }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CALENDARIO TAB ── */}
        {tab === 'calendario' && (
          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0, height: 'calc(100vh - 180px)' }}>
            {/* Grid */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </h2>
                <div className="flex items-center gap-2">
                  <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}>
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    onClick={() => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); setSelectedDate(today) }}
                    className="px-3 py-1 rounded-lg text-xs font-medium"
                    style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}
                  >
                    Hoy
                  </button>
                  <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}>
                    <ChevronRight size={15} />
                  </button>
                  <div className="w-px h-5 mx-1" style={{ background: 'var(--color-border-subtle)' }} />
                  <button
                    onClick={() => setTaskModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    <Plus size={12} /> Tarea
                  </button>
                  <button
                    onClick={() => setEventModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)', border: '1px solid var(--color-border-subtle)' }}
                  >
                    <Plus size={12} /> Evento
                  </button>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#6F2BFA' }} />
                  <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Tareas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#22C55E' }} />
                  <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Eventos</span>
                </div>
              </div>

              <div className="grid grid-cols-7 mb-2">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold py-2" style={{ color: 'var(--color-text-muted)' }}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-px">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-24 rounded-lg" style={{ background: 'var(--color-surface-2)' }} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const date = new Date(currentYear, currentMonth, day)
                  const isToday = sameDay(date, today)
                  const isSelected = sameDay(date, selectedDate)
                  const { dayTasks, dayEvents } = itemsForDate(date)
                  const hasItems = dayTasks.length + dayEvents.length > 0

                  return (
                    <motion.button
                      key={day}
                      onClick={() => setSelectedDate(date)}
                      whileHover={{ scale: 1.01 }}
                      className="h-24 p-2 rounded-lg text-left transition-all relative overflow-hidden"
                      style={{
                        background: isSelected ? 'rgba(111,43,250,0.12)' : 'var(--color-surface-2)',
                        border: isSelected
                          ? '1px solid rgba(111,43,250,0.35)'
                          : isToday
                            ? '1px solid rgba(111,43,250,0.4)'
                            : '1px solid transparent',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full"
                          style={{ background: isToday ? 'var(--color-primary)' : 'transparent', color: isToday ? 'white' : 'var(--color-text)' }}
                        >
                          {day}
                        </span>
                        {hasItems && <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-primary)' }} />}
                      </div>
                      <div className="space-y-0.5">
                        {dayTasks.slice(0, 2).map((task: any) => (
                          <div key={task.id} className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] truncate" style={{ background: 'rgba(111,43,250,0.15)', color: '#a78bfa' }}>
                            <CheckSquare size={7} className="shrink-0" />
                            <span className="truncate">{task.title}</span>
                          </div>
                        ))}
                        {dayEvents.slice(0, dayTasks.length >= 2 ? 0 : 2 - dayTasks.length).map((ev: any) => {
                          const cfg = EVENT_CONFIG[ev.type] ?? EVENT_CONFIG.other
                          return (
                            <div key={ev.id} className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] truncate" style={{ background: `${cfg.color}20`, color: cfg.color }}>
                              <div className="w-1 h-1 rounded-full shrink-0" style={{ background: cfg.color }} />
                              <span className="truncate">{ev.title}</span>
                            </div>
                          )
                        })}
                        {dayTasks.length + dayEvents.length > 2 && (
                          <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>+{dayTasks.length + dayEvents.length - 2} más</span>
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Day sidebar */}
            <div className="w-72 shrink-0 overflow-y-auto p-4" style={{ borderLeft: '1px solid var(--color-border-subtle)' }}>
              <p className="text-xs font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
                {formatDateShort(selectedDate)}
              </p>

              {selectedTasks.length === 0 && selectedEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar size={28} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
                  <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>Sin items este día</p>
                  <button onClick={() => setTaskModalOpen(true)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}>
                    + Agregar tarea
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedTasks.map((task: any) => (
                    <div key={task.id} className="p-3 rounded-xl" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)', borderLeft: `3px solid ${PRIORITY_COLOR[task.priority?.toLowerCase()] ?? '#6F2BFA'}` }}>
                      <div className="flex items-start gap-2">
                        <CheckSquare size={12} className="shrink-0 mt-0.5" style={{ color: '#a78bfa' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>{task.title}</p>
                          <span className={`badge mt-1 ${getStatusBadgeClass(task.status?.toLowerCase())}`}>{getStatusLabel(task.status?.toLowerCase())}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {selectedEvents.map((ev: any) => {
                    const cfg = EVENT_CONFIG[ev.type] ?? EVENT_CONFIG.other
                    return (
                      <motion.div key={ev.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="p-3 rounded-xl group relative" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)', borderLeft: `3px solid ${cfg.color}` }}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold mb-1 flex-1" style={{ color: 'var(--color-text)' }}>{ev.title}</p>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                            <button onClick={() => setEditingEvent(ev)} className="w-5 h-5 rounded flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                              <Pencil size={10} />
                            </button>
                            <button onClick={() => handleEventDelete(ev)} className="w-5 h-5 rounded flex items-center justify-center" style={{ color: '#EF4444' }}>
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>
                        <span className="badge" style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>{cfg.label}</span>
                        {!ev.allDay && (
                          <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                            <Clock size={9} /> {formatDateTime(ev.startDate)}
                          </p>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <NewTaskModal
        open={taskModalOpen}
        defaultClientId={id}
        defaultDueDate={selectedDateStr}
        onClose={() => setTaskModalOpen(false)}
        onSaved={handleTaskSaved}
      />
      <NewEventModal
        open={eventModalOpen}
        defaultDate={selectedDate}
        defaultClientId={id}
        onClose={() => setEventModalOpen(false)}
        onCreated={handleEventCreated}
      />
      <NewEventModal
        open={!!editingEvent}
        event={editingEvent}
        defaultClientId={id}
        onClose={() => setEditingEvent(null)}
        onUpdated={handleEventUpdated}
      />
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} style={{ color: 'var(--color-primary)' }} />
        <h4 className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{title}</h4>
      </div>
      {children}
    </div>
  )
}
