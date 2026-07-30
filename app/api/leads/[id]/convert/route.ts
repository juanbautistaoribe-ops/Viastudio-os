import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const lead = await prisma.lead.findUnique({ where: { id } })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    if (lead.status === 'WON') return NextResponse.json({ error: 'Lead already won' }, { status: 400 })

    const [client] = await prisma.$transaction([
      prisma.client.create({
        data: {
          name: lead.name,
          company: lead.company,
          email: lead.email ?? '',
          phone: lead.phone ?? null,
          website: lead.website ?? null,
          status: 'ACTIVE',
          monthlyValue: lead.potentialValue ?? 0,
          currency: lead.currency ?? 'ARS',
          services: lead.services ?? [],
          startDate: new Date(),
          notes: lead.notes ?? null,
          tags: lead.tags ?? [],
        },
      }),
      prisma.lead.update({
        where: { id },
        data: { status: 'WON' },
      }),
    ])

    logActivity('LEAD_WON', `Lead convertido a cliente: ${lead.company}`, user.id, {
      entityId: id,
      entityType: 'lead',
      clientId: client.id,
    })

    return NextResponse.json({ client, leadId: id })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
