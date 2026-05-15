import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isYesterday, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
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

const STATUS_COLORS = {
  // Client
  active: 'badge-success',
  inactive: 'badge-muted',
  prospect: 'badge-info',
  churned: 'badge-danger',
  // Task
  backlog: 'badge-muted',
  todo: 'badge-info',
  in_progress: 'badge-primary',
  review: 'badge-warning',
  done: 'badge-success',
  cancelled: 'badge-danger',
  // Lead
  new: 'badge-info',
  contacted: 'badge-primary',
  qualified: 'badge-warning',
  proposal: 'badge-primary',
  negotiation: 'badge-warning',
  won: 'badge-success',
  lost: 'badge-danger',
} as const

export function getStatusBadgeClass(status: string): string {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? 'badge-muted'
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  prospect: 'Prospecto',
  churned: 'Perdido',
  backlog: 'Backlog',
  todo: 'Por hacer',
  in_progress: 'En progreso',
  review: 'En revisión',
  done: 'Completado',
  cancelled: 'Cancelado',
  new: 'Nuevo',
  contacted: 'Contactado',
  qualified: 'Calificado',
  proposal: 'Propuesta',
  negotiation: 'Negociación',
  won: 'Ganado',
  lost: 'Perdido',
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
