import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id },
      include: { contacts: true, tasks: true, payments: true },
    })
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(client)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.company && { company: body.company }),
        ...(body.email && { email: body.email }),
        phone: body.phone ?? undefined,
        website: body.website ?? undefined,
        ...(body.status && { status: body.status }),
        ...(body.services && { services: body.services }),
        ...(body.monthlyValue !== undefined && { monthlyValue: body.monthlyValue }),
        ...(body.currency && { currency: body.currency }),
        industry: body.industry ?? undefined,
        country: body.country ?? undefined,
        ...(body.tags && { tags: body.tags }),
        notes: body.notes ?? undefined,
      },
    })
    return NextResponse.json(client)
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
    await prisma.client.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
