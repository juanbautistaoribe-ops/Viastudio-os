import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { APP_URL, notifyJuanba } from '@/lib/proposals'
import { monthLabel } from '@/lib/meta-reports'
import type { ReportData } from '@/lib/meta'
import { ReportView } from './view'

// Public monthly Meta Ads report (no login). The bot sends the link to the client.

export const dynamic = 'force-dynamic'

const BOT_UA = /whatsapp|facebookexternalhit|bot|crawler|spider|preview|slack|telegram|discord/i

async function load(slug: string) {
  return prisma.metaReport.findUnique({ where: { slug }, include: { client: true } })
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = await load((await params).slug)
  if (!r) return { title: 'Reporte' }
  const title = `Reporte de ${monthLabel(r.period)} · ${r.client.company}`
  return {
    metadataBase: new URL(APP_URL),
    title: { absolute: title },
    description: 'Resultados de tus anuncios en Facebook e Instagram, por ViaStudio',
    openGraph: { title, description: 'Resultados de tus anuncios en Facebook e Instagram', siteName: 'ViaStudio', type: 'website' },
    robots: { index: false, follow: false },
  }
}

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const report = await load((await params).slug)
  if (!report) notFound()

  // Real views by the client: after it was sent, not link previews, not Juanba logged into the app
  const ua = (await headers()).get('user-agent') ?? ''
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (report.status !== 'borrador' && !BOT_UA.test(ua) && !user) {
    const first = !report.firstViewedAt
    await prisma.metaReport.update({
      where: { id: report.id },
      data: { viewCount: { increment: 1 }, ...(first && { firstViewedAt: new Date(), status: 'visto' }) },
    })
    if (first) await notifyJuanba(`👀 ${report.client.company} abrió el reporte de ${monthLabel(report.period)}.`)
  }

  return <ReportView company={report.client.company} period={report.period} data={report.data as unknown as ReportData} summary={report.summary} />
}
