import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

const FRAN_SHARE = 0.5

function toUSD(amount: number, currency: string, exchangeRate?: number | null): number {
  if (currency === 'USD') return amount
  if (!exchangeRate || exchangeRate === 0) return 0
  return amount / exchangeRate
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const period = searchParams.get('period') ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [year, month] = period.split('-').map(Number)
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0, 23, 59, 59)

  const [incomes, expenses] = await Promise.all([
    prisma.income.findMany({
      where: { period },
      include: { client: { select: { id: true, name: true, company: true } } },
    }),
    prisma.expense.findMany({
      where: { date: { gte: from, lte: to } },
      include: { client: { select: { id: true, name: true, company: true } } },
    }),
  ])

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0)
  const totalIncomeUSD = incomes.reduce((s, i) => s + toUSD(i.amount, i.currency, i.exchangeRate), 0)

  const directCosts = expenses.filter(e => e.type === 'DIRECT').reduce((s, e) => s + e.amount, 0)
  const directCostsUSD = expenses.filter(e => e.type === 'DIRECT').reduce((s, e) => s + toUSD(e.amount, e.currency, e.exchangeRate), 0)

  const fixedCosts = expenses.filter(e => e.type === 'FIXED').reduce((s, e) => s + e.amount, 0)
  const fixedCostsUSD = expenses.filter(e => e.type === 'FIXED').reduce((s, e) => s + toUSD(e.amount, e.currency, e.exchangeRate), 0)

  const grossMarginUSD = totalIncomeUSD - directCostsUSD
  const operatingMarginUSD = grossMarginUSD - fixedCostsUSD
  const franShareUSD = operatingMarginUSD * FRAN_SHARE
  const netMarginUSD = operatingMarginUSD - franShareUSD

  // Keep ARS totals for display (using raw ARS amounts)
  const grossMargin = totalIncome - directCosts
  const operatingMargin = grossMargin - fixedCosts
  const franShare = operatingMargin * FRAN_SHARE
  const netMargin = operatingMargin - franShare

  // ── Rentabilidad por cliente ──────────────────────────────────────────────
  const clientMap = new Map<string, { clientName: string; income: number; costs: number }>()

  for (const income of incomes) {
    if (!income.clientId || !income.client) continue
    const key = income.clientId
    const cur = clientMap.get(key) ?? { clientName: income.client.name, income: 0, costs: 0 }
    cur.income += toUSD(income.amount, income.currency, income.exchangeRate)
    clientMap.set(key, cur)
  }
  for (const expense of expenses) {
    if (!expense.clientId || !expense.client || expense.type !== 'DIRECT') continue
    const key = expense.clientId
    const cur = clientMap.get(key) ?? { clientName: expense.client.name, income: 0, costs: 0 }
    cur.costs += toUSD(expense.amount, expense.currency, expense.exchangeRate)
    clientMap.set(key, cur)
  }

  const clientProfitability = Array.from(clientMap.entries())
    .map(([clientId, { clientName, income, costs }]) => ({
      clientId,
      clientName,
      income,
      costs,
      margin: income - costs,
    }))
    .sort((a, b) => b.margin - a.margin)

  // ── Cuentas por cobrar (facturado, no cobrado) ────────────────────────────
  const receivables = incomes
    .filter(i => i.status === 'INVOICED' || i.status === 'OVERDUE')
    .filter(i => i.clientId && i.client)
    .map(i => ({
      clientId: i.clientId!,
      clientName: i.client!.name,
      amount: i.amount,
      currency: i.currency,
      since: i.period,
    }))

  return NextResponse.json({
    period,
    totalIncome,
    totalIncomeUSD,
    directCosts,
    directCostsUSD,
    grossMargin,
    grossMarginUSD,
    grossMarginPct: totalIncomeUSD > 0 ? (grossMarginUSD / totalIncomeUSD) * 100 : 0,
    fixedCosts,
    fixedCostsUSD,
    operatingMargin,
    operatingMarginUSD,
    operatingMarginPct: totalIncomeUSD > 0 ? (operatingMarginUSD / totalIncomeUSD) * 100 : 0,
    franShare,
    franShareUSD,
    netMargin,
    netMarginUSD,
    netMarginPct: totalIncomeUSD > 0 ? (netMarginUSD / totalIncomeUSD) * 100 : 0,
    clientProfitability,
    receivables,
  })
}
