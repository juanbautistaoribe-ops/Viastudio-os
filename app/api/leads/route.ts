import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'

export const maxDuration = 30

async function getOrCreateProfile(userId: string, email: string) {
  let profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile) {
    const name = email ? email.split('@')[0] : userId.slice(0, 8)
    profile = await prisma.profile.create({
      data: { userId, name, email: email || `${userId}@placeholder.local` },
    })
  }
  return profile
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeLead(lead: any) {
  return {
    ...lead,
    status: lead.status?.toLowerCase(),
    source: lead.source?.toLowerCase(),
    priority: lead.priority?.toLowerCase(),
    services: (lead.services ?? []).map((s: string) => s.toLowerCase()),
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(leads.map(normalizeLead))
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await getOrCreateProfile(user.id, user.email ?? '')

    const body = await req.json()

    const lead = await prisma.lead.create({
      data: {
        name: body.name,
        company: body.company,
        email: body.email ?? null,
        phone: body.phone ?? null,
        website: body.website ?? null,
        status: (body.status ?? 'new').toUpperCase() as any,
        source: (body.source ?? 'inbound').toUpperCase() as any,
        priority: (body.priority ?? 'medium').toUpperCase() as any,
        potentialValue: body.potentialValue ?? 0,
        currency: body.currency ?? 'ARS',
        notes: body.notes ?? null,
        nextAction: body.nextAction ?? null,
        nextActionDate: body.nextActionDate ? new Date(body.nextActionDate) : null,
        tags: body.tags ?? [],
        services: [],
      },
    })

    logActivity('LEAD_CREATED', `Nuevo lead: ${lead.company}`, user.id, { entityId: lead.id, entityType: 'lead' })
    return NextResponse.json(normalizeLead(lead), { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
