import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isYesterday, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  if (currency === 'ARS') {
    return '$' + new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }
  return 'US$' + new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string, fmt = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isToday(d)) return 'Hoy'
  if (isYesterday(d)) return 'Ayer'
  if (isTomorrow(d)) return 'Mañana'
  return format(d, fmt, { locale: es })
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: es })
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'd MMM', { locale: es })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, "d MMM yyyy · HH:mm", { locale: es })
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}

export function randomId(): string {
  return Math.random().toString(36).slice(2, 11)
}

export function getGrowthColor(value: number): string {
  if (value > 0) return 'text-emerald-400'
  if (value < 0) return 'text-red-400'
  return 'text-gray-400'
}

export function getGrowthPrefix(value: number): string {
  return value > 0 ? '+' : ''
}

const STATUS_COLORS: Record<string, string> = {
  active: 'badge-success', ACTIVE: 'badge-success',
  inactive: 'badge-muted', INACTIVE: 'badge-muted',
  churned: 'badge-danger', CHURNED: 'badge-danger',
  backlog: 'badge-muted', BACKLOG: 'badge-muted',
  todo: 'badge-info', TODO: 'badge-info',
  in_progress: 'badge-primary', IN_PROGRESS: 'badge-primary',
  review: 'badge-warning', REVIEW: 'badge-warning',
  done: 'badge-success', DONE: 'badge-success',
  cancelled: 'badge-danger', CANCELLED: 'badge-danger',
  new: 'badge-info', NEW: 'badge-info',
  contacted: 'badge-primary', CONTACTED: 'badge-primary',
  qualified: 'badge-warning', QUALIFIED: 'badge-warning',
  proposal: 'badge-primary', PROPOSAL: 'badge-primary',
  negotiation: 'badge-warning', NEGOTIATION: 'badge-warning',
  won: 'badge-success', WON: 'badge-success',
  lost: 'badge-danger', LOST: 'badge-danger',
}

export function getStatusBadgeClass(status: string): string {
  return STATUS_COLORS[status] ?? 'badge-muted'
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo', ACTIVE: 'Activo',
  inactive: 'Inactivo', INACTIVE: 'Inactivo',
  churned: 'Perdido', CHURNED: 'Perdido',
  backlog: 'Backlog', BACKLOG: 'Backlog',
  todo: 'Por hacer', TODO: 'Por hacer',
  in_progress: 'En progreso', IN_PROGRESS: 'En progreso',
  review: 'En revisión', REVIEW: 'En revisión',
  done: 'Completado', DONE: 'Completado',
  cancelled: 'Cancelado', CANCELLED: 'Cancelado',
  new: 'Nuevo', NEW: 'Nuevo',
  contacted: 'Contactado', CONTACTED: 'Contactado',
  qualified: 'Calificado', QUALIFIED: 'Calificado',
  proposal: 'Propuesta', PROPOSAL: 'Propuesta',
  negotiation: 'Negociación', NEGOTIATION: 'Negociación',
  won: 'Ganado', WON: 'Ganado',
  lost: 'Perdido', LOST: 'Perdido',
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-blue-400',
}

export function getPriorityColor(priority: string): string {
  return PRIORITY_COLORS[priority] ?? 'text-gray-400'
}

export function generateAvatarColor(name: string): string {
  const colors = [
    '#6F2BFA', '#3B82F6', '#22C55E', '#F59E0B',
    '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
