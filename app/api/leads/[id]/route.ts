import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.company && { company: body.company }),
        ...(body.email && { email: body.email }),
        phone: body.phone ?? undefined,
        website: body.website ?? undefined,
        ...(body.status && { status: body.status.toUpperCase() as any }),
        ...(body.source && { source: body.source.toUpperCase() as any }),
        ...(body.priority && { priority: body.priority.toUpperCase() as any }),
        ...(body.potentialValue !== undefined && { potentialValue: body.potentialValue }),
        notes: body.notes ?? undefined,
        nextAction: body.nextAction ?? undefined,
        nextActionDate: body.nextActionDate ? new Date(body.nextActionDate) : undefined,
      },
    })

    return NextResponse.json(normalizeLead(lead))
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await prisma.lead.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
