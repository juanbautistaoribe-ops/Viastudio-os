import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'

export const maxDuration = 30

function normalize(income: any) {
  return {
    ...income,
    status: income.status.toLowerCase(),
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period')

  const incomes = await prisma.income.findMany({
    where: period ? { period } : undefined,
    include: { client: { select: { id: true, name: true, company: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(incomes.map(normalize))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { clientId, period, concept, amount, currency, exchangeRate, status, collectedAt, notes } = body

  const income = await prisma.income.create({
    data: {
      clientId: clientId || null,
      period,
      concept,
      amount: Number(amount),
      currency: currency ?? 'ARS',
      exchangeRate: exchangeRate ? Number(exchangeRate) : null,
      status: (status ?? 'INVOICED').toUpperCase() as any,
      collectedAt: collectedAt ? new Date(collectedAt) : null,
      notes: notes || null,
    },
    include: { client: { select: { id: true, name: true, company: true } } },
  })

  logActivity('INCOME_CREATED', `Ingreso registrado: ${concept}`, user.id, { entityId: income.id, entityType: 'income' })
  return NextResponse.json(normalize(income), { status: 201 })
}
