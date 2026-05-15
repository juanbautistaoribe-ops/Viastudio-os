import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/layout/providers'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'ViaStudio OS',
    template: '%s · ViaStudio OS',
  },
  description: 'The operating system for your marketing agency.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full" style={{ background: 'var(--color-bg)' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
