import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getDolarBlue } from '@/lib/dolar'

export const maxDuration = 30

// Records without their own exchange rate fall back to today's blue rate
let fallbackRate: number | null = null

function toUSD(amount: number, currency: string, exchangeRate?: number | null): number {
  if (currency === 'USD') return amount
  const rate = exchangeRate || fallbackRate
  if (!rate) return 0
  return amount / rate
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  fallbackRate = (await getDolarBlue())?.venta ?? null

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

  const directExpenses = expenses.filter(e => e.type === 'DIRECT')
  const fixedExpenses = expenses.filter(e => e.type === 'FIXED' && e.category !== 'Sueldos')
  const salaryExpenses = expenses.filter(e => e.type === 'FIXED' && e.category === 'Sueldos')

  const directCosts = directExpenses.reduce((s, e) => s + e.amount, 0)
  const directCostsUSD = directExpenses.reduce((s, e) => s + toUSD(e.amount, e.currency, e.exchangeRate), 0)

  const fixedCosts = fixedExpenses.reduce((s, e) => s + e.amount, 0)
  const fixedCostsUSD = fixedExpenses.reduce((s, e) => s + toUSD(e.amount, e.currency, e.exchangeRate), 0)

  const salaries = salaryExpenses.reduce((s, e) => s + e.amount, 0)
  const salariesUSD = salaryExpenses.reduce((s, e) => s + toUSD(e.amount, e.currency, e.exchangeRate), 0)

  const grossMarginUSD = totalIncomeUSD - directCostsUSD
  const operatingMarginUSD = grossMarginUSD - fixedCostsUSD
  const netMarginUSD = operatingMarginUSD - salariesUSD

  const grossMargin = totalIncome - directCosts
  const operatingMargin = grossMargin - fixedCosts
  const netMargin = operatingMargin - salaries

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
    salaries,
    salariesUSD,
    netMargin,
    netMarginUSD,
    netMarginPct: totalIncomeUSD > 0 ? (netMarginUSD / totalIncomeUSD) * 100 : 0,
    clientProfitability,
    receivables,
  })
}
