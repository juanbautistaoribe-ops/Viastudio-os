export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-full flex items-center justify-center p-4"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(111,43,250,0.15) 0%, transparent 70%)',
        }}
      />
      <div className="relative z-10 w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}
