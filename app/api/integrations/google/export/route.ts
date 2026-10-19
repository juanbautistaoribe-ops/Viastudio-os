import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getValidAccessToken } from '@/lib/google-tokens'

function toUSD(amount: number, currency: string, exchangeRate?: number | null) {
  if (currency === 'USD') return amount
  if (!exchangeRate || exchangeRate === 0) return 0
  return amount / exchangeRate
}

function fmt(n: number) { return Math.round(n * 100) / 100 }

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { period } = await req.json()
  if (!period) return NextResponse.json({ error: 'period required' }, { status: 400 })

  const token = await getValidAccessToken(user.id)
  if (!token) return NextResponse.json({ error: 'Google not connected' }, { status: 403 })

  const [year, month] = period.split('-').map(Number)
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0, 23, 59, 59)

  const [incomes, expenses] = await Promise.all([
    prisma.income.findMany({ where: { period }, include: { client: { select: { name: true } } } }),
    prisma.expense.findMany({ where: { date: { gte: from, lte: to } }, include: { client: { select: { name: true } } } }),
  ])

  const totalIncomeUSD = incomes.reduce((s, i) => s + toUSD(i.amount, i.currency, i.exchangeRate), 0)
  const directExpenses = expenses.filter(e => e.type === 'DIRECT')
  const fixedExpenses = expenses.filter(e => e.type === 'FIXED' && e.category !== 'Sueldos')
  const salaryExpenses = expenses.filter(e => e.type === 'FIXED' && e.category === 'Sueldos')
  const directCostsUSD = directExpenses.reduce((s, e) => s + toUSD(e.amount, e.currency, e.exchangeRate), 0)
  const fixedCostsUSD = fixedExpenses.reduce((s, e) => s + toUSD(e.amount, e.currency, e.exchangeRate), 0)
  const salariesUSD = salaryExpenses.reduce((s, e) => s + toUSD(e.amount, e.currency, e.exchangeRate), 0)
  const grossMarginUSD = totalIncomeUSD - directCostsUSD
  const operatingMarginUSD = grossMarginUSD - fixedCostsUSD
  const netMarginUSD = operatingMarginUSD - salariesUSD

  const periodLabel = new Date(year, month - 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  // Build sheet values
  const values: (string | number)[][] = [
    [`Resumen Financiero — ${periodLabel}`],
    [],
    ['Métrica', 'USD'],
    ['Ingresos', fmt(totalIncomeUSD)],
    ['Costos directos', fmt(directCostsUSD)],
    ['Margen bruto', fmt(grossMarginUSD)],
    ['Gastos fijos', fmt(fixedCostsUSD)],
    ['Margen operativo', fmt(operatingMarginUSD)],
    ['Sueldos', fmt(salariesUSD)],
    ['Margen neto', fmt(netMarginUSD)],
    [],
    ['Ingresos detalle'],
    ['Concepto', 'Cliente', 'Monto', 'Moneda', 'Estado'],
    ...incomes.map(i => [i.concept, i.client?.name ?? '—', i.amount, i.currency, i.status]),
    [],
    ['Gastos detalle'],
    ['Concepto', 'Categoría', 'Tipo', 'Monto', 'Moneda'],
    ...expenses.map(e => [e.concept, e.category, e.type, e.amount, e.currency]),
  ]

  // Check if a sheet for this period already exists (stored in Integration metadata via notes hack)
  // Simple approach: always create a new sheet named by period
  const sheetTitle = `ViaStudio Finanzas ${period}`

  // Create the spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { title: sheetTitle },
      sheets: [{ properties: { title: periodLabel } }],
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    return NextResponse.json({ error: 'Failed to create sheet', detail: err }, { status: 500 })
  }

  const sheet = await createRes.json()
  const spreadsheetId = sheet.spreadsheetId
  const sheetName = encodeURIComponent(periodLabel)

  // Write data
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:F200?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    }
  )

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
  return NextResponse.json({ url: sheetUrl })
}
