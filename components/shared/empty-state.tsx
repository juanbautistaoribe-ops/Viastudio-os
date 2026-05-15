import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}
      >
        <Icon size={22} strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
        {title}
      </h3>
      {description && (
        <p className="text-xs mb-4 max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
