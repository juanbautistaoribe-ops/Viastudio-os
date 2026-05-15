'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Header } from '@/components/layout/header'
import { MOCK_EVENTS } from '@/lib/mock-data'
import { formatDateShort, formatDateTime } from '@/lib/utils'
import {
  ChevronLeft, ChevronRight, Plus, Users,
  AlertTriangle, Bell, CalendarDays, Clock
} from 'lucide-react'
import type { EventType } from '@/types'

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

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function CalendarPage() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(today)

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

  const eventsForDate = (date: Date) => {
    return MOCK_EVENTS.filter((e) => {
      const d = new Date(e.startDate)
      return d.getDate() === date.getDate() &&
        d.getMonth() === date.getMonth() &&
        d.getFullYear() === date.getFullYear()
    })
  }

  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        actions={
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={13} strokeWidth={2.5} /> Nuevo Evento
          </button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()) }}
                className="px-3 py-1 rounded-lg text-xs font-medium"
                style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}
              >
                Hoy
              </button>
              <button
                onClick={nextMonth}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map((day) => (
              <div
                key={day}
                className="text-center text-[10px] font-semibold py-2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-px">
            {/* Empty cells */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 rounded-lg" style={{ background: 'var(--color-surface-2)' }} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const date = new Date(currentYear, currentMonth, day)
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
              const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentMonth
              const events = eventsForDate(date)

              return (
                <motion.button
                  key={day}
                  onClick={() => setSelectedDate(date)}
                  whileHover={{ scale: 1.01 }}
                  className="h-24 p-2 rounded-lg text-left transition-all relative overflow-hidden"
                  style={{
                    background: isSelected ? 'rgba(111,43,250,0.12)' : 'var(--color-surface-2)',
                    border: isSelected
                      ? '1px solid rgba(111,43,250,0.25)'
                      : isToday
                        ? '1px solid rgba(111,43,250,0.4)'
                        : '1px solid transparent',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'text-white' : ''}`}
                      style={{
                        background: isToday ? 'var(--color-primary)' : 'transparent',
                        color: isToday ? 'white' : 'var(--color-text)',
                      }}
                    >
                      {day}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    {events.slice(0, 2).map((event) => {
                      const cfg = EVENT_CONFIG[event.type]
                      return (
                        <div
                          key={event.id}
                          className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] truncate"
                          style={{ background: `${cfg.color}20`, color: cfg.color }}
                        >
                          <div className="w-1 h-1 rounded-full shrink-0" style={{ background: cfg.color }} />
                          <span className="truncate">{event.title}</span>
                        </div>
                      )
                    })}
                    {events.length > 2 && (
                      <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                        +{events.length - 2} más
                      </span>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Event sidebar */}
        <div
          className="w-72 shrink-0 overflow-y-auto p-4"
          style={{ borderLeft: '1px solid var(--color-border-subtle)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={14} style={{ color: 'var(--color-primary)' }} />
            <h3 className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
              {selectedDate ? formatDateShort(selectedDate) : 'Events'}
            </h3>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays size={28} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sin eventos este día</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((event) => {
                const cfg = EVENT_CONFIG[event.type]
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 rounded-xl"
                    style={{
                      background: 'var(--color-surface-2)',
                      border: `1px solid var(--color-border-subtle)`,
                      borderLeft: `3px solid ${cfg.color}`,
                    }}
                  >
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                      {event.title}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="badge"
                        style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}
                      >
                        {cfg.label}
                      </span>
                    </div>
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

          {/* Upcoming section */}
          <div className="mt-6">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
              Próximos
            </h4>
            <div className="space-y-2">
              {MOCK_EVENTS.slice(0, 3).map((event) => {
                const cfg = EVENT_CONFIG[event.type]
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)' }}
                  >
                    <div
                      className="w-1 h-full min-h-6 rounded-full shrink-0 mt-0.5"
                      style={{ background: cfg.color }}
                    />
                    <div>
                      <p className="text-[11px] font-medium leading-tight" style={{ color: 'var(--color-text)' }}>
                        {event.title}
                      </p>
                      <p className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {formatDateShort(event.startDate)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
