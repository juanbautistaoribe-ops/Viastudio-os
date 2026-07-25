import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'

export const maxDuration = 30

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: { contacts: true },
    })
    const normalized = clients.map(c => ({
      ...c,
      status: c.status.toLowerCase(),
      services: c.services.map(s => s.toLowerCase()),
    }))
    return NextResponse.json(normalized)
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

    const body = await req.json()
    const client = await prisma.client.create({
      data: {
        name: body.name,
        company: body.company,
        email: body.email,
        phone: body.phone ?? null,
        website: body.website ?? null,
        status: body.status ?? 'ACTIVE',
        services: body.services ?? [],
        monthlyValue: body.monthlyValue ?? 0,
        currency: body.currency ?? 'ARS',
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        industry: body.industry ?? null,
        country: body.country ?? null,
        tags: body.tags ?? [],
        notes: body.notes ?? null,
        planType: body.planType ?? null,
        planNotes: body.planNotes ?? null,
      },
    })
    logActivity('CLIENT_CREATED', `Cliente agregado: ${client.company}`, user.id, { entityId: client.id, entityType: 'client', clientId: client.id })
    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
