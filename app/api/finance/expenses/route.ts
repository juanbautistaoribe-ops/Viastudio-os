import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'

export const maxDuration = 30

function normalize(expense: any) {
  return { ...expense, type: expense.type.toLowerCase() }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') // "2024-01"

  let where = {}
  if (period) {
    const [year, month] = period.split('-').map(Number)
    const from = new Date(year, month - 1, 1)
    const to = new Date(year, month, 0, 23, 59, 59)
    where = { date: { gte: from, lte: to } }
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: { client: { select: { id: true, name: true, company: true } } },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(expenses.map(normalize))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { date, concept, category, type, clientId, amount, currency, exchangeRate, recurring, notes } = body

  const expense = await prisma.expense.create({
    data: {
      date: new Date(date),
      concept,
      category: category || 'General',
      type: type.toUpperCase() as any,
      clientId: clientId || null,
      amount: Number(amount),
      currency: currency ?? 'ARS',
      exchangeRate: exchangeRate ? Number(exchangeRate) : null,
      recurring: Boolean(recurring),
      notes: notes || null,
    },
    include: { client: { select: { id: true, name: true, company: true } } },
  })

  logActivity('EXPENSE_CREATED', `Gasto registrado: ${concept}`, user.id, { entityId: expense.id, entityType: 'expense' })
  return NextResponse.json(normalize(expense), { status: 201 })
}
