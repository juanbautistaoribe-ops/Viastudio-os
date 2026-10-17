import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

function normalize(income: any) {
  return { ...income, status: income.status.toLowerCase() }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const income = await prisma.income.update({
    where: { id },
    data: {
      ...(body.clientId !== undefined && { clientId: body.clientId || null }),
      ...(body.period && { period: body.period }),
      ...(body.concept && { concept: body.concept }),
      ...(body.amount !== undefined && { amount: Number(body.amount) }),
      ...(body.currency && { currency: body.currency }),
      ...(body.exchangeRate !== undefined && { exchangeRate: body.exchangeRate ? Number(body.exchangeRate) : null }),
      ...(body.status && { status: body.status.toUpperCase() as any }),
      ...(body.collectedAt !== undefined && { collectedAt: body.collectedAt ? new Date(body.collectedAt) : null }),
      ...(body.notes !== undefined && { notes: body.notes || null }),
    },
    include: { client: { select: { id: true, name: true, company: true } } },
  })

  return NextResponse.json(normalize(income))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.income.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
