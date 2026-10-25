import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// Activity of the n8n WhatsApp bot, measured by the leads it created (tag `whatsapp-bot`)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ymd = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
  const startOfMonth = new Date(`${ymd.slice(0, 7)}-01T00:00:00-03:00`)

  const [last, thisMonth] = await Promise.all([
    prisma.lead.findFirst({ where: { tags: { has: 'whatsapp-bot' } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    prisma.lead.count({ where: { tags: { has: 'whatsapp-bot' }, createdAt: { gte: startOfMonth } } }),
  ])

  return NextResponse.json({ lastLeadAt: last?.createdAt ?? null, leadsThisMonth: thisMonth })
}
