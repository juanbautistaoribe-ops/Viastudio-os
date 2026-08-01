'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Header } from '@/components/layout/header'
import { Avatar } from '@/components/shared/avatar'
import { NewEventModal } from '@/components/calendar/new-event-modal'
import { formatDateShort, formatDateTime, generateAvatarColor } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Clock, Loader2, Pencil, Trash2, CheckSquare } from 'lucide-react'
import type { CalendarEvent, EventType, Client } from '@/types'

const EVENT_CONFIG: Record<EventType, { color: string; label: string }> = {
  meeting:     { color: '#6F2BFA', label: 'Reunión' },
  deadline:    { color: '#EF4444', label: 'Entrega' },
  publication: { color: '#F59E0B', label: 'Publicación' },
  followup:    { color: '#3B82F6', label: 'Seguimiento' },
  internal:    { color: '#22C55E', label: 'Interno' },
  other:       { color: '#8B5CF6', label: 'Otro' },
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate() }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay() }
function sameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

export default function CalendarPage() {
  const today = new Date()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(today)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/events').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
    ]).then(([eventsData, tasksData, clientsData]) => {
      setEvents(Array.isArray(eventsData) ? eventsData : [])
      setTasks(Array.isArray(tasksData) ? tasksData.filter((t: any) => t.dueDate) : [])
      setClients(Array.isArray(clientsData) ? clientsData : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Apply client filter
  const filteredEvents = useMemo(() =>
    selectedClientId ? events.filter(e => (e as any).clientId === selectedClientId) : events,
    [events, selectedClientId]
  )
  const filteredTasks = useMemo(() =>
    selectedClientId ? tasks.filter(t => t.clientId === selectedClientId) : tasks,
    [tasks, selectedClientId]
  )

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  const itemsForDate = (date: Date) => ({
    dayEvents: filteredEvents.filter(e => sameDay(new Date(e.startDate), date)),
    dayTasks: filteredTasks.filter(t => sameDay(new Date(t.dueDate), date)),
  })

  const { dayEvents: selectedEvents, dayTasks: selectedTasks } = selectedDate
    ? itemsForDate(selectedDate)
    : { dayEvents: [], dayTasks: [] }

  const upcomingEvents = [...filteredEvents]
    .filter(e => new Date(e.startDate) >= today)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 4)

  const handleCreated = (event: CalendarEvent) => setEvents(prev => [...prev, event])
  const handleUpdated = (updated: CalendarEvent) => setEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
  const handleDelete = async (event: CalendarEvent) => {
    if (!confirm(`¿Eliminar "${event.title}"?`)) return
    await fetch(`/api/events/${event.id}`, { method: 'DELETE' })
    setEvents(prev => prev.filter(e => e.id !== event.id))
  }

  const selectedClient = selectedClientId ? clients.find(c => c.id === selectedClientId) : null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        actions={
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'var(--color-primary)' }}>
            <Plus size={13} strokeWidth={2.5} /> Nuevo Evento
          </button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar grid */}
        <div className="flex-1 p-6 overflow-y-auto">

          {/* Month nav + client filter row */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              {MONTH_NAMES[currentMonth]} {currentYear}
              {selectedClient && (
                <span className="ml-2 text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}>
                  · {selectedClient.company}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}>
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()) }}
                className="px-3 py-1 rounded-lg text-xs font-medium"
                style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}
              >
                Hoy
              </button>
              <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Client filter chips */}
          {clients.length > 0 && (
            <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedClientId(null)}
                className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: !selectedClientId ? 'var(--color-primary)' : 'var(--color-surface-3)',
                  color: !selectedClientId ? 'white' : 'var(--color-text-muted)',
                  border: !selectedClientId ? 'none' : '1px solid var(--color-border-subtle)',
                }}
              >
                Todos
              </button>
              {clients.filter(c => c.status === 'active').map(client => {
                const isActive = selectedClientId === client.id
                const color = generateAvatarColor(client.company)
                return (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClientId(isActive ? null : client.id)}
                    title={client.company}
                    className="shrink-0 flex items-center gap-2 pl-1 pr-3 py-1 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: isActive ? `${color}25` : 'var(--color-surface-3)',
                      color: isActive ? color : 'var(--color-text-muted)',
                      border: isActive ? `1.5px solid ${color}60` : '1px solid var(--color-border-subtle)',
                    }}
                  >
                    <Avatar name={client.company} size="xs" />
                    <span className="hidden sm:block max-w-20 truncate">{client.company}</span>
                  </button>
                )
              })}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 mb-2">
                {DAY_NAMES.map(day => (
                  <div key={day} className="text-center text-[10px] font-semibold py-2" style={{ color: 'var(--color-text-muted)' }}>{day}</div>
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
                  const isSelected = selectedDate ? sameDay(date, selectedDate) : false
                  const { dayEvents, dayTasks } = itemsForDate(date)
                  const total = dayEvents.length + dayTasks.length

                  return (
                    <motion.button
                      key={day}
                      onClick={() => setSelectedDate(date)}
                      whileHover={{ scale: 1.01 }}
                      className="h-24 p-2 rounded-lg text-left transition-all relative overflow-hidden"
                      style={{
                        background: isSelected ? 'rgba(111,43,250,0.12)' : 'var(--color-surface-2)',
                        border: isSelected ? '1px solid rgba(111,43,250,0.25)' : isToday ? '1px solid rgba(111,43,250,0.4)' : '1px solid transparent',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full"
                          style={{ background: isToday ? 'var(--color-primary)' : 'transparent', color: isToday ? 'white' : 'var(--color-text)' }}
                        >
                          {day}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {dayTasks.slice(0, 1).map(task => (
                          <div key={task.id} className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] truncate" style={{ background: 'rgba(111,43,250,0.15)', color: '#a78bfa' }}>
                            <CheckSquare size={7} className="shrink-0" />
                            <span className="truncate">{task.title}</span>
                          </div>
                        ))}
                        {dayEvents.slice(0, dayTasks.length >= 1 ? 1 : 2).map(event => {
                          const cfg = EVENT_CONFIG[event.type as EventType] ?? EVENT_CONFIG.other
                          return (
                            <div key={event.id} className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] truncate" style={{ background: `${cfg.color}20`, color: cfg.color }}>
                              <div className="w-1 h-1 rounded-full shrink-0" style={{ background: cfg.color }} />
                              <span className="truncate">{event.title}</span>
                            </div>
                          )
                        })}
                        {total > 2 && (
                          <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>+{total - 2} más</span>
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0 overflow-y-auto p-4" style={{ borderLeft: '1px solid var(--color-border-subtle)' }}>
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={14} style={{ color: 'var(--color-primary)' }} />
            <h3 className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
              {selectedDate ? formatDateShort(selectedDate) : 'Eventos'}
            </h3>
          </div>

          {selectedTasks.length === 0 && selectedEvents.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays size={28} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sin items este día</p>
              <button onClick={() => setModalOpen(true)} className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}>
                + Agregar evento
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedTasks.map(task => (
                <div key={task.id} className="p-3 rounded-xl" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)', borderLeft: '3px solid #6F2BFA' }}>
                  <div className="flex items-start gap-2">
                    <CheckSquare size={12} className="shrink-0 mt-0.5" style={{ color: '#a78bfa' }} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{task.title}</p>
                      {task.client && (
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{task.client.company}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {selectedEvents.map(event => {
                const cfg = EVENT_CONFIG[event.type as EventType] ?? EVENT_CONFIG.other
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 rounded-xl group relative"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)', borderLeft: `3px solid ${cfg.color}` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{event.title}</p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                        <button onClick={() => setEditingEvent(event)} className="w-5 h-5 rounded flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                          <Pencil size={10} />
                        </button>
                        <button onClick={() => handleDelete(event)} className="w-5 h-5 rounded flex items-center justify-center" style={{ color: '#EF4444' }}>
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                    <span className="badge" style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>{cfg.label}</span>
                    {!event.allDay && (
                      <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                        <Clock size={9} /> {formatDateTime(event.startDate)}
                      </p>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}

          {upcomingEvents.length > 0 && (
            <div className="mt-6">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
                {selectedClientId ? 'Próximos de este cliente' : 'Próximos'}
              </h4>
              <div className="space-y-2">
                {upcomingEvents.map(event => {
                  const cfg = EVENT_CONFIG[event.type as EventType] ?? EVENT_CONFIG.other
                  return (
                    <div
                      key={event.id}
                      onClick={() => {
                        const d = new Date(event.startDate)
                        setSelectedDate(d)
                        setCurrentMonth(d.getMonth())
                        setCurrentYear(d.getFullYear())
                      }}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer"
                      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)' }}
                    >
                      <div className="w-1 min-h-6 rounded-full shrink-0 mt-0.5" style={{ background: cfg.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium leading-tight" style={{ color: 'var(--color-text)' }}>{event.title}</p>
                        <p className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{formatDateShort(event.startDate)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <NewEventModal
        open={modalOpen}
        defaultDate={selectedDate}
        defaultClientId={selectedClientId ?? undefined}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
      <NewEventModal
        open={!!editingEvent}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
        onUpdated={handleUpdated}
      />
    </div>
  )
}
