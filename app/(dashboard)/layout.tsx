import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full" style={{ background: 'var(--color-bg)' }}>
      {/* Sidebar — oculto en mobile */}
      <div className="hidden md:flex h-full">
        <Sidebar />
      </div>

      {/* Contenido principal */}
      <div className="animate-page flex flex-col flex-1 min-w-0 overflow-hidden pb-16 md:pb-0">
        {children}
      </div>

      {/* Nav mobile — solo visible en mobile */}
      <MobileNav />
    </div>
  )
}
