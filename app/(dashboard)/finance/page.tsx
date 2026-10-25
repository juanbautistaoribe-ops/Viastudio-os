'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  DollarSign, Pencil, Trash2, AlertCircle, RefreshCw, Sheet,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { IncomeModal } from '@/components/finance/income-modal'
import { ExpenseModal } from '@/components/finance/expense-modal'
import type { Income, Expense, FinanceSummary, Client } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}
// "US$" so dollars can't be mistaken for pesos (en-US formatting writes just "$")
function fmtUSD(n: number) {
  return `${n < 0 ? '-' : ''}US$${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.abs(n))}`
}
function fmtPct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

const INCOME_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  invoiced: { label: 'Facturado', cls: 'badge-warning' },
  collected: { label: 'Cobrado', cls: 'badge-success' },
  overdue: { label: 'Vencido', cls: 'badge-danger' },
}

const EXPENSE_TYPE_LABELS: Record<string, { label: string; cls: string }> = {
  direct: { label: 'Directo', cls: 'badge-info' },
  fixed: { label: 'Fijo', cls: 'badge-muted' },
}

function periodLabel(period: string) {
  const [year, month] = period.split('-').map(Number)
  return new Date(year, month - 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

function prevPeriod(period: string) {
  const [year, month] = period.split('-').map(Number)
  const d = new Date(year, month - 2)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function nextPeriod(period: string) {
  const [year, month] = period.split('-').map(Number)
  const d = new Date(year, month)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ─── Margin Card ─────────────────────────────────────────────────────────────

function MarginCard({ label, ars, usd, pct, sub }: { label: string; ars: number; usd: number; pct?: number; sub?: string }) {
  const positive = usd >= 0
  return (
    <div className="card p-4 flex flex-col gap-1">
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="text-lg font-bold" style={{ color: positive ? 'var(--color-text)' : '#EF4444' }}>{fmtUSD(usd)}</p>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtARS(ars)}</p>
      {pct !== undefined && (
        <span className={`text-xs font-semibold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>{fmtPct(pct)}</span>
      )}
      {sub && <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'resumen' | 'ingresos' | 'gastos'

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('resumen')
  const [period, setPeriod] = useState(currentPeriod)

  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [incomes, setIncomes] = useState<Income[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name' | 'company'>[]>([])

  const [loadingSum, setLoadingSum] = useState(false)
  const [loadingInc, setLoadingInc] = useState(false)
  const [loadingExp, setLoadingExp] = useState(false)
  const [exportingSheet, setExportingSheet] = useState(false)

  const [incomeModal, setIncomeModal] = useState(false)
  const [editIncome, setEditIncome] = useState<Income | null>(null)
  const [expenseModal, setExpenseModal] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)

  const loadSummary = useCallback(async () => {
    setLoadingSum(true)
    try {
      const r = await fetch(`/api/finance/summary?period=${period}`)
      setSummary(await r.json())
    } finally { setLoadingSum(false) }
  }, [period])

  const loadIncomes = useCallback(async () => {
    setLoadingInc(true)
    try {
      const r = await fetch(`/api/finance/income?period=${period}`)
      setIncomes(await r.json())
    } finally { setLoadingInc(false) }
  }, [period])

  const loadExpenses = useCallback(async () => {
    setLoadingExp(true)
    try {
      const r = await fetch(`/api/finance/expenses?period=${period}`)
      setExpenses(await r.json())
    } finally { setLoadingExp(false) }
  }, [period])

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setClients(data.map((c: any) => ({ id: c.id, name: c.name, company: c.company })))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    loadSummary()
    loadIncomes()
    loadExpenses()
  }, [period, loadSummary, loadIncomes, loadExpenses])

  function refresh() { loadSummary(); loadIncomes(); loadExpenses() }

  async function exportToSheets() {
    setExportingSheet(true)
    try {
      const r = await fetch('/api/integrations/google/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      })
      const data = await r.json()
      if (data.url) window.open(data.url, '_blank')
      else if (data.error === 'Google not connected') alert('Conectá Google Sheets primero en Configuración → Integraciones')
    } finally {
      setExportingSheet(false)
    }
  }

  async function deleteIncome(id: string) {
    if (!confirm('¿Eliminar este ingreso?')) return
    await fetch(`/api/finance/income/${id}`, { method: 'DELETE' })
    refresh()
  }
  async function deleteExpense(id: string) {
    if (!confirm('¿Eliminar este gasto?')) return
    await fetch(`/api/finance/expenses/${id}`, { method: 'DELETE' })
    refresh()
  }

  // ── Header actions ─────────────────────────────────────────────────────────
  const actions = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => { setEditIncome(null); setIncomeModal(true) }}
        className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5"
      >
        <Plus size={14} /> Ingreso
      </button>
      <button
        onClick={() => { setEditExpense(null); setExpenseModal(true) }}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
        style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)', border: '1px solid var(--color-border-subtle)' }}
      >
        <Plus size={14} /> Gasto
      </button>
      <button
        onClick={exportToSheets}
        disabled={exportingSheet}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
        style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)', border: '1px solid var(--color-border-subtle)' }}
        title="Exportar a Google Sheets"
      >
        <Sheet size={14} />
      </button>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <Header actions={actions} />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 animate-page">

        {/* Period selector */}
        <div className="flex items-center gap-3">
          <button onClick={() => setPeriod(prevPeriod)} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}>
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold capitalize" style={{ color: 'var(--color-text)' }}>{periodLabel(period)}</span>
          <button onClick={() => setPeriod(nextPeriod)} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}>
            <ChevronRight size={14} />
          </button>
          {period !== currentPeriod() && (
            <button onClick={() => setPeriod(currentPeriod())} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}>
              Hoy
            </button>
          )}
          <button onClick={refresh} className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg transition-colors" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}>
            <RefreshCw size={12} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-surface-2)' }}>
          {(['resumen', 'ingresos', 'gastos'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 text-xs font-medium py-1.5 rounded-lg capitalize transition-all"
              style={tab === t
                ? { background: 'var(--color-surface-3)', color: 'var(--color-text)' }
                : { color: 'var(--color-text-muted)' }
              }
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── RESUMEN ─────────────────────────────────────────────────────── */}
        {tab === 'resumen' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {loadingSum ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => <div key={i} className="card p-4 h-24 shimmer" />)}
              </div>
            ) : summary ? (
              <>
                {/* KPI grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MarginCard label="Ingresos" ars={summary.totalIncome} usd={summary.totalIncomeUSD} />
                  <MarginCard label="Margen bruto" ars={summary.grossMargin} usd={summary.grossMarginUSD} pct={summary.grossMarginPct} />
                  <MarginCard label="Margen operativo" ars={summary.operatingMargin} usd={summary.operatingMarginUSD} pct={summary.operatingMarginPct} />
                  <MarginCard label="Margen neto (Juanba)" ars={summary.netMargin} usd={summary.netMarginUSD} pct={summary.netMarginPct} />
                </div>

                {/* Costos breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="card p-4">
                    <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Costos directos</p>
                    <p className="text-base font-bold text-red-400">{fmtUSD(summary.directCostsUSD)}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtARS(summary.directCosts)}</p>
                  </div>
                  <div className="card p-4">
                    <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Gastos fijos</p>
                    <p className="text-base font-bold text-red-400">{fmtUSD(summary.fixedCostsUSD)}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtARS(summary.fixedCosts)}</p>
                  </div>
                  <div className="card p-4">
                    <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Sueldos</p>
                    <p className="text-base font-bold text-red-400">{fmtUSD(summary.salariesUSD)}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtARS(summary.salaries)}</p>
                  </div>
                </div>

                {/* Rentabilidad por cliente */}
                {summary.clientProfitability.length > 0 && (
                  <div className="card overflow-hidden">
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Rentabilidad por cliente</p>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
                      {summary.clientProfitability.map(c => (
                        <div key={c.clientId} className="flex items-center gap-3 px-4 py-2.5">
                          <p className="flex-1 text-xs font-medium" style={{ color: 'var(--color-text)' }}>{c.clientName}</p>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtUSD(c.income)} ingresos</p>
                          <p className="text-xs text-red-400">{fmtUSD(c.costs)} costos</p>
                          <p className={`text-xs font-bold ${c.margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtUSD(c.margin)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cuentas por cobrar */}
                {summary.receivables.length > 0 && (
                  <div className="card overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <AlertCircle size={14} className="text-amber-400" />
                      <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Cuentas por cobrar</p>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
                      {summary.receivables.map((r, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                          <p className="flex-1 text-xs font-medium" style={{ color: 'var(--color-text)' }}>{r.clientName}</p>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Período {r.since}</p>
                          <p className="text-xs font-bold text-amber-400">
                            {r.currency === 'USD' ? fmtUSD(r.amount) : fmtARS(r.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary.clientProfitability.length === 0 && summary.receivables.length === 0 && (
                  <div className="card p-8 text-center">
                    <DollarSign size={32} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Sin datos para este período</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Cargá ingresos y gastos para ver el resumen</p>
                  </div>
                )}
              </>
            ) : null}
          </motion.div>
        )}

        {/* ── INGRESOS ────────────────────────────────────────────────────── */}
        {tab === 'ingresos' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loadingInc ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="card h-12 shimmer" />)}</div>
            ) : incomes.length === 0 ? (
              <div className="card p-8 text-center">
                <TrendingUp size={32} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Sin ingresos en este período</p>
                <button className="btn-primary text-xs px-4 py-1.5 mt-3" onClick={() => { setEditIncome(null); setIncomeModal(true) }}>
                  <Plus size={13} className="inline mr-1" /> Cargar ingreso
                </button>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      {['Concepto', 'Cliente', 'Monto', 'Moneda', 'Estado', ''].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {incomes.map(inc => {
                      const st = INCOME_STATUS_LABELS[inc.status] ?? { label: inc.status, cls: 'badge-muted' }
                      return (
                        <tr key={inc.id} className="transition-colors" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                          <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--color-text)' }}>{inc.concept}</td>
                          <td className="px-4 py-2.5" style={{ color: 'var(--color-text-muted)' }}>{inc.client?.name ?? '—'}</td>
                          <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--color-text)' }}>
                            {inc.currency === 'USD' ? fmtUSD(inc.amount) : fmtARS(inc.amount)}
                          </td>
                          <td className="px-4 py-2.5" style={{ color: 'var(--color-text-muted)' }}>{inc.currency}</td>
                          <td className="px-4 py-2.5"><span className={`badge ${st.cls}`}>{st.label}</span></td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => { setEditIncome(inc); setIncomeModal(true) }} className="w-6 h-6 flex items-center justify-center rounded transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => deleteIncome(inc.id)} className="w-6 h-6 flex items-center justify-center rounded transition-colors text-red-400">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* ── GASTOS ──────────────────────────────────────────────────────── */}
        {tab === 'gastos' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loadingExp ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="card h-12 shimmer" />)}</div>
            ) : expenses.length === 0 ? (
              <div className="card p-8 text-center">
                <TrendingDown size={32} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Sin gastos en este período</p>
                <button className="flex items-center gap-1 text-xs px-4 py-1.5 mt-3 mx-auto rounded-lg transition-colors" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }} onClick={() => { setEditExpense(null); setExpenseModal(true) }}>
                  <Plus size={13} /> Cargar gasto
                </button>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      {['Concepto', 'Categoría', 'Cliente', 'Monto', 'Tipo', ''].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(exp => {
                      const tp = EXPENSE_TYPE_LABELS[exp.type] ?? { label: exp.type, cls: 'badge-muted' }
                      return (
                        <tr key={exp.id} className="transition-colors" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                          <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--color-text)' }}>
                            {exp.concept}
                            {exp.recurring && <span className="ml-1 badge badge-muted text-[10px]">recurrente</span>}
                          </td>
                          <td className="px-4 py-2.5" style={{ color: 'var(--color-text-muted)' }}>{exp.category}</td>
                          <td className="px-4 py-2.5" style={{ color: 'var(--color-text-muted)' }}>{exp.client?.name ?? '—'}</td>
                          <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--color-text)' }}>
                            {exp.currency === 'USD' ? fmtUSD(exp.amount) : fmtARS(exp.amount)}
                          </td>
                          <td className="px-4 py-2.5"><span className={`badge ${tp.cls}`}>{tp.label}</span></td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => { setEditExpense(exp); setExpenseModal(true) }} className="w-6 h-6 flex items-center justify-center rounded transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => deleteExpense(exp.id)} className="w-6 h-6 flex items-center justify-center rounded transition-colors text-red-400">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <IncomeModal
        open={incomeModal}
        income={editIncome}
        clients={clients}
        onClose={() => { setIncomeModal(false); setEditIncome(null) }}
        onSaved={refresh}
      />
      <ExpenseModal
        open={expenseModal}
        expense={editExpense}
        clients={clients}
        onClose={() => { setExpenseModal(false); setEditExpense(null) }}
        onSaved={refresh}
      />
    </div>
  )
}
