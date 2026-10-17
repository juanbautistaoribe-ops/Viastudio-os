import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

function normalize(expense: any) {
  return { ...expense, type: expense.type.toLowerCase() }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      ...(body.date && { date: new Date(body.date) }),
      ...(body.concept && { concept: body.concept }),
      ...(body.category !== undefined && { category: body.category || 'General' }),
      ...(body.type && { type: body.type.toUpperCase() as any }),
      ...(body.clientId !== undefined && { clientId: body.clientId || null }),
      ...(body.amount !== undefined && { amount: Number(body.amount) }),
      ...(body.currency && { currency: body.currency }),
      ...(body.exchangeRate !== undefined && { exchangeRate: body.exchangeRate ? Number(body.exchangeRate) : null }),
      ...(body.recurring !== undefined && { recurring: Boolean(body.recurring) }),
      ...(body.notes !== undefined && { notes: body.notes || null }),
    },
    include: { client: { select: { id: true, name: true, company: true } } },
  })

  return NextResponse.json(normalize(expense))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.expense.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
