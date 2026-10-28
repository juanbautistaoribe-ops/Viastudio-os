import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isWebhookAuthorized } from '@/lib/webhook-auth'
import { logActivity } from '@/lib/activity'
import { getDolarBlue } from '@/lib/dolar'
import { onboardingDraft, startOnboarding } from '@/lib/onboarding'
import { botMetrics } from '@/lib/bot-metrics'
import { buildItems, createProposal, dueFollowups, followupMessage, notifyJuanba, proposalMessage, proposalSummary, proposalUrl, sendToLead, writeCopy, type ServiceInput } from '@/lib/proposals'
import { adAccounts, metaConfigured } from '@/lib/meta'
import { buildReports, lastPeriod, monthlyReportsCheck, reportsProposal, reportUrl, sendReports } from '@/lib/meta-reports'
import { monthlyReactivationCheck, reactivationProposal, reactivationReport, sendReactivation } from '@/lib/reactivation'
import { buildPlan, createProduction, formatProposal, isLastBusinessDay, nextPeriod, periodOf, type Override } from '@/lib/production'

export const maxDuration = 60 // reactivation sends up to 20 spaced messages

// Internal WhatsApp assistant (n8n): one endpoint, `action` picks the operation.
// Confirmation of important changes happens in the agent conversation, before it calls this.

type Body = Record<string, unknown>

const LEAD_STATUS = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const
const TASK_PRIORITY = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const
const EXPENSE_CATEGORIES = ['General', 'Sueldos', 'Herramientas', 'Freelance', 'Impuestos', 'Marketing', 'Infraestructura', 'Contador', 'Otro']

function str(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function num(value: unknown) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''))
  return Number.isFinite(n) ? n : null
}

// Dates from the agent: without a timezone they are Argentina time (the server runs in UTC);
// a bare day means 10:00
function date(value: unknown) {
  let s = str(value)
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s = `${s}T10:00:00-03:00`
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) s = `${s}-03:00`
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

// Case- and accent-insensitive match
function norm(s: string | null | undefined) {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Punctuation is ignored: the agent often passes names as shown in notices, e.g. "Titi (Lostikislocos)"
function matches(q: string, ...fields: (string | null | undefined | string[])[]) {
  const clean = (s: string) => norm(s).replace(/[^\p{L}\p{N}\s]/gu, ' ')
  const words = clean(q).split(/\s+/).filter(Boolean)
  const hay = clean(fields.flat().join(' '))
  return words.every((w) => hay.includes(w))
}

const TZ = 'America/Argentina/Buenos_Aires'
const EVENT_TYPES = ['MEETING', 'DEADLINE', 'PUBLICATION', 'FOLLOWUP', 'INTERNAL', 'OTHER'] as const
const REMINDER_MINUTES = 20

function currentPeriod() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ }).slice(0, 7)
}

// "2026-9" or "2026-09" → "2026-09"; anything else → ''
function normPeriod(p: string) {
  const m = p.match(/^(\d{4})-(\d{1,2})$/)
  return m && Number(m[2]) >= 1 && Number(m[2]) <= 12 ? `${m[1]}-${m[2].padStart(2, '0')}` : ''
}

// Report month: last month by default. The model sometimes guesses the wrong year ("2025-10"),
// so a month more than a year back, or still to come, is moved to its latest occurrence up to now
function reportPeriod(p: string) {
  const last = lastPeriod()
  const period = normPeriod(p)
  if (!period) return last
  const current = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).slice(0, 7)
  if (period <= current && period > `${Number(current.slice(0, 4)) - 1}${current.slice(4)}`) return period
  const month = period.slice(5)
  const sameYear = `${current.slice(0, 4)}-${month}`
  return sameYear <= current ? sameYear : `${Number(current.slice(0, 4)) - 1}-${month}`
}

// First instant of the month and of the next one, Argentina time
function periodRange(period: string) {
  const [y, m] = period.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  return { start: new Date(`${period}-01T00:00:00-03:00`), end: new Date(`${next}-01T00:00:00-03:00`) }
}

function monthName(period: string) {
  const p = normPeriod(period)
  return p ? new Date(`${p}-15T12:00:00-03:00`).toLocaleDateString('es-AR', { timeZone: TZ, month: 'long' }) : period
}

// Start/end of today in Argentina (UTC-3, no DST), as UTC instants
function todayRangeAR() {
  const ymd = new Date().toLocaleDateString('en-CA', { timeZone: TZ })
  const start = new Date(`${ymd}T00:00:00-03:00`)
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) }
}

function hora(d: Date) {
  return d.toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
}

function money(amount: number, currency: string) {
  return currency === 'USD'
    ? `US$${new Intl.NumberFormat('en-US').format(amount)}`
    : `$${new Intl.NumberFormat('es-AR').format(amount)}`
}

function eventOut(e: Awaited<ReturnType<typeof prisma.calendarEvent.findFirst>>) {
  if (!e) return null
  return {
    id: e.id, titulo: e.title, tipo: e.type.toLowerCase(), inicio: e.startDate, fin: e.endDate, todo_el_dia: e.allDay,
    lugar: e.location, link: e.meetingUrl, descripcion: e.description, hora_ar: e.allDay ? null : hora(e.startDate),
  }
}

async function owner() {
  return prisma.profile.findFirst({ orderBy: { createdAt: 'asc' } })
}

function leadOut(l: Awaited<ReturnType<typeof prisma.lead.findFirst>>) {
  if (!l) return null
  return {
    id: l.id, nombre: l.name, negocio: l.company, estado: l.status.toLowerCase(), prioridad: l.priority.toLowerCase(),
    valor: l.potentialValue, moneda: l.currency, servicios: l.services, telefono: l.phone,
    proxima_accion: l.nextAction, proxima_fecha: l.nextActionDate, tags: l.tags,
    notas: l.notes ? l.notes.slice(-400) : null, creado: l.createdAt,
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function pickOne<T>(found: T[], label: string, describe: (x: T) => string, q: string): T {
  if (found.length === 1) return found[0]
  if (!found.length) throw new Error(`No encontré ${label} "${q}"`)
  throw new Error(`Hay ${found.length} ${label}s que coinciden con "${q}": ${found.slice(0, 5).map(describe).join(' / ')}. Preguntale a Juanba cuál.`)
}

// Lead by id, or by name/business/phone (open leads first)
async function findLead(b: Body, key = 'id') {
  const id = str(b[key]) || str(b.leadId) || str(b.id)
  if (UUID.test(id)) {
    const lead = await prisma.lead.findUnique({ where: { id } })
    if (lead) return lead
  }
  const q = str(b.q) || str(b.nombre) || str(b.lead) || (UUID.test(id) ? '' : id)
  if (!q) throw new Error('Decime de qué lead se trata (nombre o negocio)')
  const leads = await prisma.lead.findMany({ orderBy: { updatedAt: 'desc' }, take: 300 })
  const hits = leads.filter((l) => matches(q, l.name, l.company, l.phone))
  const open = hits.filter((l) => !['WON', 'LOST'].includes(l.status))
  return pickOne(open.length ? open : hits, 'lead', (l) => `${l.name} (${l.company}, ${l.status.toLowerCase()})`, q)
}

async function findClient(b: Body) {
  const id = str(b.id) || str(b.clientId)
  if (UUID.test(id)) {
    const client = await prisma.client.findUnique({ where: { id } })
    if (client) return client
  }
  const q = str(b.q) || str(b.nombre) || str(b.cliente) || (UUID.test(id) ? '' : id)
  if (!q) throw new Error('Decime de qué cliente se trata')
  const clients = await prisma.client.findMany()
  return pickOne(clients.filter((c) => matches(q, c.name, c.company)), 'cliente', (c) => `${c.company} (${c.name})`, q)
}

async function findTask(b: Body) {
  const id = str(b.id)
  if (UUID.test(id)) {
    const task = await prisma.task.findUnique({ where: { id } })
    if (task) return task
  }
  const q = str(b.q) || str(b.titulo) || str(b.title) || (UUID.test(id) ? '' : id)
  if (!q) throw new Error('Decime qué tarea')
  const tasks = await prisma.task.findMany({ where: { status: { notIn: ['DONE', 'CANCELLED'] } }, take: 200 })
  return pickOne(tasks.filter((t) => matches(q, t.title)), 'tarea', (t) => t.title, q)
}

async function findEvent(b: Body) {
  const id = str(b.id)
  if (UUID.test(id)) {
    const event = await prisma.calendarEvent.findUnique({ where: { id } })
    if (event) return event
  }
  const q = str(b.q) || str(b.titulo) || (UUID.test(id) ? '' : id)
  if (!q) throw new Error('Decime qué evento')
  const events = await prisma.calendarEvent.findMany({ where: { startDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, orderBy: { startDate: 'asc' }, take: 100 })
  return pickOne(events.filter((e) => matches(q, e.title, e.location)), 'evento', (e) => `${e.title} (${hora(e.startDate)})`, q)
}

async function findProposal(b: Body) {
  const id = str(b.id)
  const slug = str(b.slug) || (str(b.link).match(/\/p\/([A-Za-z0-9_-]+)/)?.[1] ?? '') || (id.match(/\/p\/([A-Za-z0-9_-]+)/)?.[1] ?? '')
  const proposal = slug
    ? await prisma.proposal.findUnique({ where: { slug } })
    : id ? await prisma.proposal.findUnique({ where: { id } }) ?? await prisma.proposal.findUnique({ where: { slug: id } }) : null
  if (!proposal) throw new Error('Propuesta no encontrada: pasame el link de la propuesta')
  return proposal
}

function productionPeriod(b: Body) {
  const p = str(b.period)
  if (/^\d{4}-\d{2}$/.test(p)) return p
  const now = new Date()
  const day = Number(now.toLocaleDateString('en-CA', { timeZone: TZ }).slice(8, 10))
  return day >= 20 ? nextPeriod(periodOf(now)) : periodOf(now)
}

function productionOptions(b: Body) {
  const exclude = Array.isArray(b.exclude) ? b.exclude.map(str).filter(Boolean) : []
  const overrides = Array.isArray(b.overrides) ? (b.overrides as Override[]).filter((o) => o && str(o.cliente)) : []
  return { exclude, overrides }
}

const actions: Record<string, (b: Body) => Promise<unknown>> = {
  async summary() {
    const period = currentPeriod()
    const now = new Date()
    const [leads, clients, tasks, incomes, expenses, blue] = await Promise.all([
      prisma.lead.findMany(),
      prisma.client.findMany({ where: { status: 'ACTIVE' } }),
      prisma.task.findMany({ where: { status: { notIn: ['DONE', 'CANCELLED'] } } }),
      prisma.income.findMany({ where: { period } }),
      prisma.expense.findMany({ where: { date: { gte: new Date(`${period}-01T00:00:00-03:00`) } } }),
      getDolarBlue(),
    ])
    const open = leads.filter((l) => !['WON', 'LOST'].includes(l.status))
    const sum = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((a, x) => a + f(x), 0)
    const byCur = <T extends { currency: string }>(arr: T[], f: (x: T) => number) => ({
      ARS: sum(arr.filter((x) => x.currency !== 'USD'), f),
      USD: sum(arr.filter((x) => x.currency === 'USD'), f),
    })
    return {
      periodo: period,
      leads_abiertos: open.length,
      leads_por_estado: Object.fromEntries(LEAD_STATUS.map((s) => [s.toLowerCase(), leads.filter((l) => l.status === s).length])),
      pipeline: byCur(open, (l) => l.potentialValue),
      clientes_activos: clients.length,
      facturacion_mensual_clientes: byCur(clients, (c) => c.monthlyValue),
      tareas_abiertas: tasks.length,
      tareas_vencidas: tasks.filter((t) => t.dueDate && t.dueDate < now).length,
      ingresos_del_mes: byCur(incomes, (i) => i.amount),
      cobrado_del_mes: byCur(incomes.filter((i) => i.status === 'COLLECTED'), (i) => i.amount),
      gastos_del_mes: byCur(expenses, (e) => e.amount),
      dolar_blue_venta: blue?.venta ?? null,
    }
  },

  async dolar() {
    const blue = await getDolarBlue()
    if (!blue) throw new Error('No pude obtener la cotización del dólar ahora')
    return { blue_venta: blue.venta, blue_compra: blue.compra, actualizado: blue.fecha }
  },

  // Commercial proposals with a public link. Created as draft; Juanba reviews it and sends the link himself
  async 'proposals.create'(b) {
    const proposal = await createProposal({
      leadId: str(b.leadId) || str(b.lead) ? (await findLead(b, 'leadId')).id : undefined,
      nombre: str(b.nombre) || undefined,
      negocio: str(b.negocio) || undefined,
      servicios: (Array.isArray(b.servicios) ? b.servicios : []) as ServiceInput[],
      plazo: str(b.plazo) || undefined,
      notas: str(b.notas) || undefined,
      formaDePago: str(b.formaDePago) || undefined,
      validezDias: num(b.validezDias) ?? undefined,
    })
    return { ok: true, id: proposal.id, ...proposalSummary(proposal) }
  },

  async 'proposals.update'(b) {
    const existing = await findProposal(b)
    const items = Array.isArray(b.servicios) && b.servicios.length ? buildItems(b.servicios as ServiceInput[]) : null
    const regenerate = b.regenerar === true || !!items || !!str(b.notas)
    const lead = existing.leadId ? await prisma.lead.findUnique({ where: { id: existing.leadId } }) : null
    const copy = regenerate
      ? await writeCopy({ nombre: existing.clientName, negocio: existing.business, contexto: lead?.notes?.slice(-1500) ?? '', items: items ?? (existing.items as never), notas: str(b.notas) || undefined })
      : null
    const validezDias = num(b.validezDias)
    const updated = await prisma.proposal.update({
      where: { id: existing.id },
      data: {
        ...(items && { items: items as unknown as object }),
        ...(copy && { diagnosis: copy.diagnostico, solution: copy.solucion, notes: copy.titulo }),
        ...(str(b.plazo) && { timeline: str(b.plazo) }),
        ...(str(b.formaDePago) && { paymentTerms: str(b.formaDePago) }),
        ...(validezDias && { validUntil: new Date(Date.now() + validezDias * 24 * 60 * 60 * 1000) }),
        ...(b.stopFollowups === true && { stopFollowups: true }),
      },
    })
    return { ok: true, id: updated.id, ...proposalSummary(updated) }
  },

  // Juanba sent the link to the lead: views count from now on and the lead moves to "proposal"
  // The bot sends the proposal link to the lead's WhatsApp (Juanba confirms the message first)
  async 'proposals.send'(b) {
    const proposal = await findProposal(b)
    const lead = proposal.leadId ? await prisma.lead.findUnique({ where: { id: proposal.leadId } }) : null
    const phone = str(b.telefono).replace(/\D/g, '') || lead?.phone
    if (!phone) throw new Error('No tengo el teléfono del lead: pasame el número')
    const chatId = `${phone}@c.us`
    const message = str(b.mensaje) || proposalMessage(proposal)
    await sendToLead(chatId, message)
    await prisma.proposal.update({ where: { id: proposal.id }, data: { sentToChat: chatId } })
    return actions['proposals.mark_sent']({ id: proposal.id, enviadoPorBot: true })
  },

  // Called every 30 min by n8n: proposal follow-ups that are due (Mon–Sat, 9 to 21)
  async 'proposals.followups'() {
    const local = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
    if (local.getDay() === 0 || local.getHours() < 9 || local.getHours() >= 21) return { enviados: 0 }
    const due = await dueFollowups()
    for (const p of due) {
      await sendToLead(p.sentToChat!, followupMessage(p))
      await prisma.proposal.update({ where: { id: p.id }, data: { followups: { increment: 1 }, lastFollowupAt: new Date() } })
      await notifyJuanba(`📨 Le hice seguimiento (${p.followups + 1}/2) a la propuesta de ${p.clientName}${p.business ? ` (${p.business})` : ''}. ${p.viewCount > 0 ? `La abrió ${p.viewCount} ${p.viewCount === 1 ? 'vez' : 'veces'}.` : 'Todavía no la abrió.'}`)
    }
    return { enviados: due.length }
  },

  async 'proposals.mark_sent'(b) {
    const proposal = await prisma.proposal.update({ where: { id: (await findProposal(b)).id }, data: { status: 'enviada', sentAt: new Date() } })
    if (proposal.leadId) {
      const lead = await prisma.lead.findUnique({ where: { id: proposal.leadId } })
      if (lead && ['NEW', 'CONTACTED', 'QUALIFIED'].includes(lead.status)) {
        const today = new Date().toLocaleDateString('es-AR', { timeZone: TZ })
        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: 'PROPOSAL', notes: `${lead.notes ?? ''}\n\n📄 ${today}: propuesta enviada ${proposalUrl(proposal.slug)}`.trim() },
        })
      }
    }
    return { ok: true, id: proposal.id, ...proposalSummary(proposal) }
  },

  async 'proposals.delete'(b) {
    const proposal = await prisma.proposal.delete({ where: { id: (await findProposal(b)).id } })
    return { ok: true, eliminada: `${proposal.clientName}${proposal.business ? ` (${proposal.business})` : ''}` }
  },

  async 'proposals.list'(b) {
    const q = str(b.q)
    const proposals = await prisma.proposal.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
    const found = proposals.filter((p) => (!str(b.leadId) || p.leadId === str(b.leadId)) && (!q || matches(q, p.clientName, p.business))).slice(0, 10)
    return { total: found.length, propuestas: found.map((p) => ({ id: p.id, ...proposalSummary(p) })) }
  },

  // Cold leads. Nothing goes out until Juanba approves the list ("mandales")
  // auto: the daily 7:00 run (n8n "Run Reactivation Check") also drives the monthly Meta reports
  async 'reactivation.propose'(b) {
    if (b.auto === true) {
      const reports = await monthlyReportsCheck().catch((error) => ({ error: String(error) }))
      return { ...(await monthlyReactivationCheck()), reportes: reports }
    }
    return reactivationProposal()
  },

  // Ad accounts the Meta token can read, with the client each one is linked to (or the likely match)
  async 'meta.accounts'() {
    if (!metaConfigured()) throw new Error('Todavía no está conectado Meta: falta cargar META_ACCESS_TOKEN en Vercel')
    const [accounts, clients] = await Promise.all([adAccounts(), prisma.client.findMany({ where: { status: 'ACTIVE' } })])
    const linkedTo = (id: string) => clients.find((c) => c.metaAdAccountId === id)
    const guess = (name: string, business: string | null) =>
      clients.filter((c) => !c.metaAdAccountId && [c.company, c.name].some((n) => matches(n, name) || (business && matches(n, business))))
    return {
      cuentas: accounts.map((a) => ({
        id: a.id, nombre: a.name, portafolio: a.business, estado: a.status, moneda: a.currency,
        cliente: linkedTo(a.id)?.company ?? null,
        ...(!linkedTo(a.id) && { posible_cliente: guess(a.name, a.business).map((c) => c.company)[0] ?? null }),
      })),
      clientes_sin_cuenta: clients.filter((c) => !c.metaAdAccountId).map((c) => c.company),
    }
  },

  // links: [{"cliente":"Kleist","cuenta":"act_123"}]; cuenta "" unlinks
  async 'meta.link'(b) {
    const links = Array.isArray(b.links) ? b.links as Body[] : [{ cliente: b.cliente, cuenta: b.cuenta }]
    const accounts = metaConfigured() ? await adAccounts() : []
    const done: string[] = []
    for (const l of links) {
      const client = await findClient({ q: str(l.cliente) })
      const q = str(l.cuenta)
      const account = q ? accounts.find((a) => a.id === q || a.id === `act_${q}`) ?? pickOne(accounts.filter((a) => matches(q, a.name)), 'cuenta', (a) => `${a.name} (${a.id})`, q) : null
      await prisma.client.update({ where: { id: client.id }, data: { metaAdAccountId: account?.id ?? null } })
      done.push(account ? `${client.company} → ${account.name}` : `${client.company} sin cuenta`)
    }
    return { ok: true, vinculados: done }
  },

  // Builds (or rebuilds) the drafts and returns the list for Juanba. Default: last month
  async 'reports.propose'(b) {
    const period = reportPeriod(str(b.period))
    const only = str(b.cliente) ? [(await findClient({ q: str(b.cliente) })).id] : undefined
    const { failed } = await buildReports(period, only)
    const proposal = await reportsProposal(period)
    return { ...proposal, no_se_pudieron_armar: failed }
  },

  async 'reports.send'(b) {
    const period = reportPeriod(str(b.period))
    const excluir = Array.isArray(b.excluir) ? b.excluir.map(str).filter(Boolean) : str(b.excluir) ? [str(b.excluir)] : []
    return sendReports(period, excluir, matches)
  },

  async 'reports.status'(b) {
    const period = normPeriod(str(b.period)) || lastPeriod()
    const reports = await prisma.metaReport.findMany({ where: { period }, include: { client: { select: { company: true } } } })
    return { periodo: period, reportes: reports.map((r) => ({ cliente: r.client.company, estado: r.status, vistas: r.viewCount, link: reportUrl(r.slug) })) }
  },

  async 'reactivation.send'(b) {
    const excluir = Array.isArray(b.excluir) ? b.excluir.map((x) => str(x)).filter(Boolean) : str(b.excluir) ? [str(b.excluir)] : []
    return sendReactivation({ excluir, mensaje: str(b.mensaje) || undefined }, matches)
  },

  async 'reactivation.report'(b) {
    return reactivationReport(num(b.dias) ?? 45)
  },

  // Monthly production. Default period: next month from the 20th on, otherwise the current one
  async 'production.propose'(b) {
    if (b.auto === true) {
      // Daily 7:00 call: only on the last business day, and only if next month isn't loaded yet
      if (!(await isLastBusinessDay())) return { mensaje: null }
      const period = nextPeriod(periodOf(new Date()))
      const plan = await buildPlan(period)
      if (!plan.items.length) return { mensaje: null }
      return { mensaje: formatProposal(plan) }
    }
    const plan = await buildPlan(productionPeriod(b), productionOptions(b))
    return { periodo: plan.period, mensaje: formatProposal(plan), tareas: plan.items.reduce((a, i) => a + i.tasks.length, 0) }
  },

  async 'production.create'(b) {
    const o = await owner()
    if (!o) throw new Error('No hay perfil de usuario')
    const plan = await buildPlan(productionPeriod(b), productionOptions(b))
    const created = await createProduction(plan, o.id)
    if (created) logActivity('TASK_CREATED', `Producción de ${plan.mes} cargada: ${created} tareas`, o.userId)
    return { ok: true, periodo: plan.period, tareas_creadas: created, clientes: plan.items.map((i) => i.cliente), para_revisar: plan.warnings, sin_tareas_nuevas: plan.skipped }
  },

  async 'production.status'(b) {
    const period = productionPeriod(b)
    const tasks = await prisma.task.findMany({ where: { tags: { has: `prod-${period}` } }, include: { client: { select: { company: true } } } })
    return {
      periodo: period,
      cargada: tasks.length > 0,
      tareas: tasks.length,
      hechas: tasks.filter((t) => t.status === 'DONE').length,
      clientes: [...new Set(tasks.map((t) => t.client?.company).filter(Boolean))],
    }
  },

  // Bot funnel per ad/service. Default: current month
  async 'bot.metrics'(b) {
    const days = num(b.days)
    const to = new Date()
    const from = days ? new Date(to.getTime() - days * 24 * 60 * 60 * 1000) : new Date(`${currentPeriod()}-01T00:00:00-03:00`)
    return botMetrics(from, to)
  },

  async 'leads.search'(b) {
    const q = str(b.q)
    const status = str(b.status).toUpperCase()
    // days: leads that came in recently (1 = today, Argentina time)
    const days = num(b.days)
    const since = days ? new Date(todayRangeAR().start.getTime() - (days - 1) * 24 * 60 * 60 * 1000) : null
    const leads = await prisma.lead.findMany({ where: since ? { createdAt: { gte: since } } : undefined, orderBy: { updatedAt: 'desc' }, take: 300 })
    const found = leads
      .filter((l) => (status ? l.status === status : true))
      .filter((l) => !q || matches(q, l.name, l.company, l.notes, l.tags, l.services, l.phone))
      .slice(0, since ? 30 : 10)
    return { total: found.length, leads: found.map(leadOut) }
  },

  // Juanba confirms first (test leads, spam, duplicates). Its proposals and activity go with it
  async 'leads.delete'(b) {
    const lead = await findLead(b)
    await prisma.proposal.deleteMany({ where: { leadId: lead.id } })
    await prisma.activity.deleteMany({ where: { entityId: lead.id } })
    await prisma.lead.delete({ where: { id: lead.id } })
    return { ok: true, eliminado: `${lead.name}${lead.company && lead.company !== lead.name ? ` (${lead.company})` : ''}` }
  },

  async 'leads.update'(b) {
    const lead = await findLead(b)
    const id = lead.id
    const status = str(b.status).toUpperCase()
    if (status && !LEAD_STATUS.includes(status as typeof LEAD_STATUS[number])) throw new Error(`Estado inválido: ${status}`)
    const note = str(b.note)
    const today = new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
    const value = num(b.potentialValue)
    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...(status && { status: status as typeof LEAD_STATUS[number] }),
        ...(note && { notes: lead.notes ? `${lead.notes}\n\n🗣️ ${today}: ${note}` : `🗣️ ${today}: ${note}` }),
        ...(str(b.nextAction) && { nextAction: str(b.nextAction) }),
        ...(date(b.nextActionDate) && { nextActionDate: date(b.nextActionDate) }),
        ...(value !== null && { potentialValue: value }),
        ...(['ARS', 'USD'].includes(str(b.currency).toUpperCase()) && { currency: str(b.currency).toUpperCase() }),
      },
    })
    const o = await owner()
    if (o && status === 'WON') logActivity('LEAD_WON', `Lead ganado: ${updated.company}`, o.userId, { entityId: id, entityType: 'lead' })
    const onboarding = status === 'WON' ? await startOnboarding(id).catch(() => null) : null
    if (o && status === 'LOST') logActivity('LEAD_LOST', `Lead perdido: ${updated.company}`, o.userId, { entityId: id, entityType: 'lead' })
    return { ok: true, lead: leadOut(updated), ...(onboarding?.created && { onboarding: `${onboarding.created} tareas de arranque creadas; le avisé a Juanba con el borrador de bienvenida` }) }
  },

  async 'leads.convert'(b) {
    const lead = await findLead(b)
    const id = lead.id
    if (lead.status === 'WON') throw new Error('El lead ya está ganado')
    const value = num(b.monthlyValue)
    const [client] = await prisma.$transaction([
      prisma.client.create({
        data: {
          name: lead.name,
          company: lead.company,
          email: lead.email ?? '',
          phone: lead.phone ?? null,
          website: lead.website ?? null,
          status: 'ACTIVE',
          monthlyValue: value ?? lead.potentialValue ?? 0,
          currency: str(b.currency).toUpperCase() === 'USD' ? 'USD' : str(b.currency) ? 'ARS' : lead.currency ?? 'ARS',
          services: lead.services ?? [],
          startDate: new Date(),
          notes: lead.notes ?? null,
          tags: lead.tags ?? [],
        },
      }),
      prisma.lead.update({ where: { id }, data: { status: 'WON' } }),
    ])
    const o = await owner()
    if (o) logActivity('LEAD_WON', `Lead convertido a cliente: ${lead.company}`, o.userId, { entityId: id, entityType: 'lead', clientId: client.id })
    await startOnboarding(id, client.id).catch(() => null)
    return { ok: true, cliente: { id: client.id, nombre: client.name, negocio: client.company, valor_mensual: client.monthlyValue, moneda: client.currency } }
  },

  // Welcome message for a new client: Juanba approves the text, then the bot sends it
  async 'onboarding.preview'(b) {
    const { lead, services, mensaje } = await onboardingDraft((await findLead(b, 'leadId')).id)
    return { lead: lead.name, telefono: lead.phone, servicios: services, mensaje }
  },

  async 'onboarding.send'(b) {
    const { lead, mensaje } = await onboardingDraft((await findLead(b, 'leadId')).id)
    if (!lead.phone) throw new Error('El lead no tiene teléfono cargado')
    const text = str(b.mensaje) || mensaje
    await sendToLead(`${lead.phone}@c.us`, text)
    const today = new Date().toLocaleDateString('es-AR', { timeZone: TZ })
    await prisma.lead.update({ where: { id: lead.id }, data: { notes: `${lead.notes ?? ''}\n\n👋 ${today}: bienvenida enviada por el bot`.trim() } })
    return { ok: true, enviado_a: lead.name }
  },

  // Manual start (e.g. a client closed outside the pipeline); does nothing if it already ran
  async 'onboarding.start'(b) {
    const result = await startOnboarding((await findLead(b, 'leadId')).id, str(b.clientId) || null)
    return result.already ? { ok: true, aviso: 'El onboarding de este lead ya estaba creado' } : { ok: true, tareas_creadas: result.created }
  },

  async 'clients.search'(b) {
    const q = str(b.q)
    const clients = await prisma.client.findMany({ orderBy: { company: 'asc' } })
    const found = clients.filter((c) => !q || matches(q, c.name, c.company, c.industry, c.phone)).slice(0, q ? 10 : 50)
    return {
      total: found.length,
      clientes: found.map((c) => ({ id: c.id, nombre: c.name, negocio: c.company, rubro: c.industry, estado: c.status.toLowerCase(), valor_mensual: c.monthlyValue, moneda: c.currency, plan: c.planType, detalle_plan: c.planNotes, baja_desde: c.endDate })),
    }
  },

  // One client's file: plan, payments, open work, this month's production, upcoming events
  async 'clients.detail'(b) {
    const c = await findClient(b)
    const { start } = todayRangeAR()
    const period = currentPeriod()
    const [tasks, incomes, events] = await Promise.all([
      prisma.task.findMany({ where: { clientId: c.id, status: { notIn: ['DONE', 'CANCELLED'] } }, orderBy: { dueDate: 'asc' } }),
      prisma.income.findMany({ where: { clientId: c.id }, orderBy: { createdAt: 'desc' }, take: 6 }),
      prisma.calendarEvent.findMany({ where: { clientId: c.id, startDate: { gte: start } }, orderBy: { startDate: 'asc' }, take: 5 }),
    ])
    const prod = await prisma.task.findMany({ where: { clientId: c.id, tags: { has: `prod-${period}` } }, select: { status: true } })
    const owed = incomes.filter((i) => i.status !== 'COLLECTED')
    return {
      cliente: c.company, contacto: c.name, telefono: c.phone || null, estado: c.status.toLowerCase(), rubro: c.industry,
      abono: money(c.monthlyValue, c.currency), plan: c.planType, detalle_plan: c.planNotes,
      cliente_desde: c.startDate, baja_desde: c.endDate,
      debe: owed.length ? owed.map((i) => `${monthName(i.period)}: ${money(i.amount, i.currency)}${i.status === 'OVERDUE' ? ' (vencido)' : ''}`) : 'Nada',
      ultimos_pagos: incomes.filter((i) => i.status === 'COLLECTED').slice(0, 3).map((i) => ({ periodo: normPeriod(i.period) || i.period, monto: money(i.amount, i.currency), cobrado_el: i.collectedAt })),
      produccion_del_mes: prod.length ? `${prod.filter((t) => t.status === 'DONE').length} de ${prod.length} hechas` : 'No cargada',
      tareas_abiertas: tasks.length,
      tareas_vencidas: tasks.filter((t) => t.dueDate && t.dueDate < start).length,
      proximas_tareas: tasks.slice(0, 5).map((t) => ({ titulo: t.title, vence: t.dueDate })),
      proximos_eventos: events.map((e) => ({ titulo: e.title, inicio: e.startDate, hora_ar: e.allDay ? null : hora(e.startDate) })),
      notas: c.notes ? c.notes.slice(-500) : null,
    }
  },

  // Client plan (what monthly production is built from) and notes
  async 'clients.update'(b) {
    const client = await findClient(b)
    const id = client.id
    const planType = str(b.planType).toLowerCase()
    if (planType && !['unico', 'personalizado'].includes(planType)) throw new Error('planType debe ser "unico" o "personalizado"')
    // endDate: "YYYY-MM-DD" schedules the end (first day without service); cancelEnd clears it
    const endDate = date(str(b.endDate) ? `${str(b.endDate).slice(0, 10)}T00:00:00-03:00` : '')
    const endNote = endDate
      ? `📅 Baja programada desde el ${endDate.toLocaleDateString('es-AR', { timeZone: TZ })}${str(b.reason) ? `: ${str(b.reason)}` : ''}`
      : b.cancelEnd === true ? '📅 Baja programada cancelada' : ''
    const notes = [str(b.notes), endNote].filter(Boolean).join('\n')
    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...(endDate && { endDate }),
        ...(b.cancelEnd === true && { endDate: null }),
        ...(planType && { planType }),
        ...(str(b.phone) && { phone: str(b.phone) }),
        ...(str(b.planNotes) && { planNotes: str(b.planNotes) }),
        ...(notes && { notes: client.notes ? `${client.notes}\n\n${notes}` : notes }),
      },
    })
    return { ok: true, cliente: { id: updated.id, negocio: updated.company, plan: updated.planType, detalle_plan: updated.planNotes, baja_desde: updated.endDate } }
  },

  async 'tasks.list'(b) {
    const q = str(b.q)
    const all = str(b.status) === 'all'
    const tasks = await prisma.task.findMany({
      where: all ? undefined : { status: { notIn: ['DONE', 'CANCELLED'] } },
      include: { client: { select: { company: true } } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    })
    const found = tasks.filter((t) => !q || matches(q, t.title, t.description, t.client?.company)).slice(0, 15)
    return {
      total: found.length,
      tareas: found.map((t) => ({ id: t.id, titulo: t.title, estado: t.status.toLowerCase(), prioridad: t.priority.toLowerCase(), vence: t.dueDate, cliente: t.client?.company ?? null })),
    }
  },

  async 'tasks.create'(b) {
    const title = str(b.title)
    if (!title) throw new Error('Falta el título de la tarea')
    const o = await owner()
    if (!o) throw new Error('No hay perfil de usuario para asignar la tarea')
    const priority = str(b.priority).toUpperCase()
    const task = await prisma.task.create({
      data: {
        title,
        description: str(b.description) || null,
        priority: TASK_PRIORITY.includes(priority as typeof TASK_PRIORITY[number]) ? priority as typeof TASK_PRIORITY[number] : 'MEDIUM',
        dueDate: date(b.dueDate),
        clientId: str(b.clientId) || null,
        createdById: o.id,
        assigneeId: o.id,
        tags: ['whatsapp'],
      },
    })
    logActivity('TASK_CREATED', `Tarea creada por WhatsApp: ${title}`, o.userId, { entityId: task.id, entityType: 'task', clientId: task.clientId ?? undefined })
    return { ok: true, tarea: { id: task.id, titulo: task.title, vence: task.dueDate, prioridad: task.priority.toLowerCase() } }
  },

  async 'tasks.complete'(b) {
    const task = await prisma.task.update({ where: { id: (await findTask(b)).id }, data: { status: 'DONE' } })
    const o = await owner()
    if (o) logActivity('TASK_COMPLETED', `Tarea completada: ${task.title}`, o.userId, { entityId: task.id, entityType: 'task' })
    return { ok: true, tarea: { id: task.id, titulo: task.title } }
  },

  async 'income.create'(b) {
    const amount = num(b.amount)
    const concept = str(b.concept)
    if (!amount || !concept) throw new Error('Faltan monto o concepto')
    const collected = str(b.status).toLowerCase() !== 'invoiced'
    const income = await prisma.income.create({
      data: {
        clientId: str(b.clientId) || null,
        period: /^\d{4}-\d{2}$/.test(str(b.period)) ? str(b.period) : currentPeriod(),
        concept,
        amount,
        currency: str(b.currency).toUpperCase() === 'USD' ? 'USD' : 'ARS',
        exchangeRate: num(b.exchangeRate) ?? (await getDolarBlue())?.venta ?? null,
        status: collected ? 'COLLECTED' : 'INVOICED',
        collectedAt: collected ? new Date() : null,
        notes: str(b.notes) || 'Cargado por WhatsApp',
      },
    })
    const o = await owner()
    if (o) logActivity('INCOME_CREATED', `Ingreso registrado: ${concept}`, o.userId, { entityId: income.id, entityType: 'income', clientId: income.clientId ?? undefined })
    return { ok: true, ingreso: { id: income.id, concepto: concept, monto: income.amount, moneda: income.currency, estado: income.status.toLowerCase(), periodo: income.period } }
  },

  async 'income.list'(b) {
    const q = str(b.q)
    const status = str(b.status).toUpperCase()
    const period = /^\d{4}-\d{2}$/.test(str(b.period)) ? str(b.period) : currentPeriod()
    const incomes = await prisma.income.findMany({
      where: { period, ...(['INVOICED', 'COLLECTED', 'OVERDUE'].includes(status) && { status: status as 'INVOICED' | 'COLLECTED' | 'OVERDUE' }) },
      include: { client: { select: { name: true, company: true } } },
      orderBy: { createdAt: 'asc' },
    })
    const found = incomes.filter((i) => !q || matches(q, i.concept, i.client?.company, i.client?.name, i.notes))
    return {
      periodo: period,
      total: found.length,
      ingresos: found.map((i) => ({ id: i.id, cliente: i.client?.company ?? null, concepto: i.concept, monto: i.amount, moneda: i.currency, estado: i.status.toLowerCase(), cobrado_el: i.collectedAt })),
    }
  },

  // Expected billing for a month: active clients' monthly fee (minus those whose end date has passed
  // by then) plus incomes already loaded for that month that aren't a client's monthly fee
  async 'income.forecast'(b) {
    const period = normPeriod(str(b.period)) || currentPeriod()
    const { start, end } = periodRange(period)
    const [clients, incomes, blue] = await Promise.all([
      prisma.client.findMany({ where: { status: 'ACTIVE' }, orderBy: { monthlyValue: 'desc' } }),
      prisma.income.findMany({ where: { period }, include: { client: { select: { company: true } } } }),
      getDolarBlue(),
    ])
    const billed = clients.filter((c) => c.startDate < end && (!c.endDate || c.endDate > start))
    const ended = clients.filter((c) => c.endDate && c.endDate <= start)
    const billedIds = new Set(billed.map((c) => c.id))
    // A loaded income from a billed client counts as its monthly fee, not as extra
    const extras = incomes.filter((i) => !i.clientId || !billedIds.has(i.clientId))
    const total = (rows: { amount: number; currency: string }[]) => ({
      ARS: rows.filter((r) => r.currency !== 'USD').reduce((a, r) => a + r.amount, 0),
      USD: rows.filter((r) => r.currency === 'USD').reduce((a, r) => a + r.amount, 0),
    })
    const totals = total([...billed.map((c) => ({ amount: c.monthlyValue, currency: c.currency })), ...extras])
    return {
      periodo: period,
      abonos_mensuales: billed.map((c) => ({ cliente: c.company, monto: c.monthlyValue, moneda: c.currency })),
      clientes_sin_valor_cargado: billed.filter((c) => !c.monthlyValue).map((c) => c.company),
      extras_ya_cargados: extras.map((i) => ({ cliente: i.client?.company ?? null, concepto: i.concept, monto: i.amount, moneda: i.currency, estado: i.status.toLowerCase() })),
      no_se_facturan_por_baja: ended.map((c) => c.company),
      total: totals,
      dolar_blue_venta: blue?.venta ?? null,
      total_en_pesos: blue ? Math.round(totals.ARS + totals.USD * blue.venta) : null,
    }
  },

  // Everything billed and not collected, any month, grouped by client; plus active clients with
  // nothing loaded for the current month (not billed yet)
  async 'income.pending'() {
    const period = currentPeriod()
    const [pending, clients, loaded] = await Promise.all([
      prisma.income.findMany({ where: { status: { in: ['INVOICED', 'OVERDUE'] } }, include: { client: { select: { company: true } } }, orderBy: { period: 'asc' } }),
      prisma.client.findMany({ where: { status: 'ACTIVE' } }),
      prisma.income.findMany({ where: { period }, select: { clientId: true } }),
    ])
    const byClient = new Map<string, typeof pending>()
    for (const i of pending) {
      const key = i.client?.company ?? i.concept
      byClient.set(key, [...(byClient.get(key) ?? []), i])
    }
    const billedIds = new Set(loaded.map((i) => i.clientId))
    return {
      deben: [...byClient.entries()].map(([cliente, items]) => ({
        cliente,
        total: money(items.reduce((a, i) => a + i.amount, 0), items[0].currency),
        ingresos: items.map((i) => ({ id: i.id, periodo: normPeriod(i.period), concepto: i.concept, monto: i.amount, moneda: i.currency, estado: i.status === 'OVERDUE' ? 'vencido' : 'facturado' })),
      })),
      total: { ARS: pending.filter((i) => i.currency !== 'USD').reduce((a, i) => a + i.amount, 0), USD: pending.filter((i) => i.currency === 'USD').reduce((a, i) => a + i.amount, 0) },
      sin_facturar_este_mes: clients.filter((c) => !billedIds.has(c.id) && c.monthlyValue > 0).map((c) => ({ cliente: c.company, abono: money(c.monthlyValue, c.currency) })),
    }
  },

  // Payment reminder to a client over WhatsApp. preview:true returns the text without sending;
  // Juanba approves it in the conversation before the real send
  async 'income.remind'(b) {
    const client = await findClient({ ...b, q: str(b.cliente) || str(b.q) })
    const pending = await prisma.income.findMany({ where: { clientId: client.id, status: { in: ['INVOICED', 'OVERDUE'] } }, orderBy: { period: 'asc' } })
    if (!pending.length) throw new Error(`${client.company} no tiene ingresos pendientes de cobro`)
    const contacts = await prisma.contact.findMany({ where: { clientId: client.id }, orderBy: { isPrimary: 'desc' } })
    const phone = (client.phone || contacts.find((c) => c.phone)?.phone || '').replace(/\D/g, '')
    const total = money(pending.reduce((a, i) => a + i.amount, 0), pending[0].currency)
    const months = [...new Set(pending.map((i) => monthName(i.period)))].join(' y ')
    const mensaje = str(b.mensaje)
      || `¡Hola ${client.name.trim().split(/\s+/)[0]}! 👋 ¿Cómo va? Te escribo para recordarte el pago de ${months} (${total}). Cuando lo hagas, mandame el comprobante por acá así lo registro. ¡Gracias!`
    if (b.preview === true || !phone) {
      return { cliente: client.company, telefono: phone || null, mensaje, ...(!phone && { falta: 'No tiene teléfono cargado: pedile el número a Juanba y guardalo con clients.update (phone)' }) }
    }
    await sendToLead(`${phone}@c.us`, mensaje, 'cobro')
    const today = new Date().toLocaleDateString('es-AR', { timeZone: TZ })
    await prisma.income.updateMany({ where: { id: { in: pending.map((i) => i.id) } }, data: { notes: `Recordatorio de pago enviado el ${today}` } })
    return { ok: true, enviado_a: client.company, mensaje }
  },

  async 'expense.list'(b) {
    const period = normPeriod(str(b.period)) || currentPeriod()
    const { start, end } = periodRange(period)
    const q = str(b.q)
    const expenses = await prisma.expense.findMany({ where: { date: { gte: start, lt: end } }, include: { client: { select: { company: true } } }, orderBy: { date: 'asc' } })
    const found = expenses.filter((e) => (!q || matches(q, e.concept, e.category, e.client?.company, e.notes)) && (!str(b.category) || norm(e.category) === norm(str(b.category))))
    const byCategory: Record<string, number> = {}
    for (const e of found) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount * (e.currency === 'USD' ? e.exchangeRate ?? 0 : 1)
    return {
      periodo: period,
      total: found.length,
      gastos: found.map((e) => ({ id: e.id, fecha: e.date, concepto: e.concept, categoria: e.category, monto: e.amount, moneda: e.currency, fijo: e.type === 'FIXED', recurrente: e.recurring, cliente: e.client?.company ?? null })),
      por_categoria_en_pesos: byCategory,
    }
  },

  // Month P&L in pesos (USD at each record's exchange rate, or today's blue)
  async 'finance.month'(b) {
    const period = normPeriod(str(b.period)) || currentPeriod()
    const { start, end } = periodRange(period)
    const [incomes, expenses, blue] = await Promise.all([
      prisma.income.findMany({ where: { period: { in: [period, period.replace(/-0(\d)$/, '-$1')] } } }),
      prisma.expense.findMany({ where: { date: { gte: start, lt: end } } }),
      getDolarBlue(),
    ])
    const ars = (r: { amount: number; currency: string; exchangeRate: number | null }) => r.currency === 'USD' ? r.amount * (r.exchangeRate ?? blue?.venta ?? 0) : r.amount
    const sum = <T,>(arr: T[], f: (x: T) => number) => Math.round(arr.reduce((a, x) => a + f(x), 0))
    const facturado = sum(incomes, ars)
    const cobrado = sum(incomes.filter((i) => i.status === 'COLLECTED'), ars)
    const gastos = sum(expenses, ars)
    return {
      periodo: period,
      facturado,
      cobrado,
      pendiente_de_cobro: facturado - cobrado,
      gastos,
      ganancia_si_cobras_todo: facturado - gastos,
      ganancia_con_lo_cobrado: cobrado - gastos,
      margen: facturado ? `${Math.round(((facturado - gastos) / facturado) * 100)}%` : null,
      aclaracion: 'Todo en pesos. Solo cuenta ingresos y gastos cargados en ViaStudio OS.',
    }
  },

  async 'income.collect'(b) {
    const ids = (Array.isArray(b.ids) ? b.ids : [b.id]).map(str).filter(Boolean)
    if (!ids.length) throw new Error('Faltan los ids de los ingresos')
    const collectedAt = date(b.collectedAt) ?? new Date()
    const { count } = await prisma.income.updateMany({ where: { id: { in: ids } }, data: { status: 'COLLECTED', collectedAt } })
    if (!count) throw new Error('No encontré esos ingresos')
    const updated = await prisma.income.findMany({ where: { id: { in: ids } }, include: { client: { select: { company: true } } } })
    return { ok: true, marcados: count, ingresos: updated.map((i) => ({ cliente: i.client?.company ?? null, concepto: i.concept, monto: i.amount, moneda: i.currency })) }
  },

  async 'events.list'(b) {
    const { start } = todayRangeAR()
    const from = date(b.from) ?? start
    const to = date(b.to) ?? new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000)
    const q = str(b.q)
    const events = await prisma.calendarEvent.findMany({ where: { startDate: { gte: from, lt: to } }, orderBy: { startDate: 'asc' }, take: 50 })
    const found = events.filter((e) => !q || matches(q, e.title, e.description, e.location)).slice(0, 15)
    return { total: found.length, eventos: found.map(eventOut) }
  },

  async 'events.create'(b) {
    const title = str(b.title)
    const startDate = date(b.startDate)
    if (!title || !startDate) throw new Error('Faltan título o fecha de inicio')
    const o = await owner()
    if (!o) throw new Error('No hay perfil de usuario')
    const type = str(b.type).toUpperCase()
    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description: str(b.description) || null,
        type: EVENT_TYPES.includes(type as typeof EVENT_TYPES[number]) ? type as typeof EVENT_TYPES[number] : 'MEETING',
        startDate,
        endDate: date(b.endDate) ?? new Date(startDate.getTime() + 60 * 60 * 1000),
        allDay: b.allDay === true,
        location: str(b.location) || null,
        meetingUrl: str(b.meetingUrl) || null,
        clientId: str(b.clientId) || null,
        attendees: [],
        createdById: o.id,
      },
    })
    return { ok: true, evento: eventOut(event) }
  },

  async 'events.update'(b) {
    const existing = await findEvent(b)
    const id = existing.id
    const startDate = date(b.startDate)
    const endDate = date(b.endDate)
    const duration = existing.endDate.getTime() - existing.startDate.getTime()
    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(str(b.title) && { title: str(b.title) }),
        ...(str(b.description) && { description: str(b.description) }),
        ...(startDate && { startDate, endDate: endDate ?? new Date(startDate.getTime() + duration) }),
        ...(!startDate && endDate && { endDate }),
        ...(str(b.location) && { location: str(b.location) }),
        ...(str(b.meetingUrl) && { meetingUrl: str(b.meetingUrl) }),
      },
    })
    return { ok: true, evento: eventOut(event) }
  },

  async 'events.delete'(b) {
    const event = await prisma.calendarEvent.delete({ where: { id: (await findEvent(b)).id } })
    return { ok: true, eliminado: event.title }
  },

  // Morning brief, ready to send by WhatsApp
  async 'agenda.today'() {
    const { start, end } = todayRangeAR()
    const [events, tasksToday, overdue, leads, pending, blue] = await Promise.all([
      prisma.calendarEvent.findMany({ where: { startDate: { gte: start, lt: end } }, orderBy: { startDate: 'asc' } }),
      prisma.task.findMany({ where: { status: { notIn: ['DONE', 'CANCELLED'] }, dueDate: { gte: start, lt: end } }, orderBy: { dueDate: 'asc' } }),
      prisma.task.findMany({ where: { status: { notIn: ['DONE', 'CANCELLED'] }, dueDate: { lt: start } }, orderBy: { dueDate: 'asc' } }),
      prisma.lead.findMany({ where: { status: { notIn: ['WON', 'LOST'] }, nextActionDate: { lt: end } }, orderBy: { nextActionDate: 'asc' } }),
      prisma.income.findMany({ where: { period: currentPeriod(), status: { in: ['INVOICED', 'OVERDUE'] } } }),
      getDolarBlue(),
    ])
    // Scheduled ends (bajas programadas): the client stops being active on its end date
    const ended = await prisma.client.findMany({ where: { status: 'ACTIVE', endDate: { lte: new Date() } } })
    if (ended.length) await prisma.client.updateMany({ where: { id: { in: ended.map((c) => c.id) } }, data: { status: 'CHURNED' } })
    const upcomingEnds = await prisma.client.findMany({
      where: { status: 'ACTIVE', endDate: { gt: new Date(), lte: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) } },
      orderBy: { endDate: 'asc' },
    })
    const fecha = new Date().toLocaleDateString('es-AR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })
    const list = <T,>(items: T[], f: (x: T) => string, max = 8) =>
      [...items.slice(0, max).map((x) => `• ${f(x)}`), ...(items.length > max ? [`• y ${items.length - max} más`] : [])].join('\n')

    const parts = [`☀️ Buen día, Juanba! Hoy es ${fecha}.`]
    parts.push(events.length
      ? `📅 Agenda\n${list(events, (e) => `${e.allDay ? 'Todo el día' : hora(e.startDate)} ${e.title}${e.location ? ` (${e.location})` : ''}`)}`
      : '📅 Sin reuniones agendadas.')
    const prodToday = tasksToday.filter((t) => t.tags.includes('produccion'))
    const otherToday = tasksToday.filter((t) => !t.tags.includes('produccion'))
    if (otherToday.length) parts.push(`✅ Tareas de hoy\n${list(otherToday, (t) => `${t.title}${t.dueDate ? ` (${hora(t.dueDate)})` : ''}`)}`)
    if (prodToday.length) parts.push(`🎬 Entregas de producción de hoy (${prodToday.length})\n${list(prodToday, (t) => t.title, 12)}`)
    if (overdue.length) parts.push(`⚠️ Tareas vencidas\n${list(overdue, (t) => t.title, 5)}`)
    if (leads.length) {
      parts.push(`🔥 Leads para seguir\n${list(leads, (l) => `${l.name}${l.company && l.company !== l.name ? ` (${l.company})` : ''}: ${l.nextAction ?? 'seguimiento'}${l.potentialValue ? ` · ${money(l.potentialValue, l.currency)}` : ''}`, 6)}`)
    }
    if (pending.length) {
      const ars = pending.filter((i) => i.currency !== 'USD').reduce((a, i) => a + i.amount, 0)
      const usd = pending.filter((i) => i.currency === 'USD').reduce((a, i) => a + i.amount, 0)
      const totals = [ars && money(ars, 'ARS'), usd && money(usd, 'USD')].filter(Boolean).join(' + ')
      parts.push(`💰 Pendiente de cobro este mes: ${pending.length} ${pending.length === 1 ? 'ingreso' : 'ingresos'} (${totals}).`)
    }
    if (ended.length) parts.push(`👋 Desde hoy ${ended.length === 1 ? 'deja' : 'dejan'} de ser ${ended.length === 1 ? 'cliente' : 'clientes'} (baja programada): ${ended.map((c) => c.company).join(', ')}. ${ended.length === 1 ? 'Lo pasé' : 'Los pasé'} a Perdido en el CRM.`)
    if (upcomingEnds.length) parts.push(`📅 Bajas próximas: ${upcomingEnds.map((c) => `${c.company} (${c.endDate!.toLocaleDateString('es-AR', { timeZone: TZ, day: 'numeric', month: 'numeric' })})`).join(', ')}`)
    if (blue) parts.push(`💵 Dólar blue: ${money(blue.venta, 'ARS')}`)
    if (!events.length && !tasksToday.length && !overdue.length && !leads.length) parts.push('Día libre de pendientes. Si querés agendar algo, decímelo. 🙌')
    return { mensaje: parts.join('\n\n') }
  },

  // Bot leads still "qualified" ~3h after the handoff (nextActionDate is set to +2h by the lead webhook).
  // Each lead is reminded once (tag `recordado`). Mon–Sat, 9 to 21 Argentina time.
  async 'reminders.uncontacted'() {
    const now = new Date()
    const local = new Date(now.toLocaleString('en-US', { timeZone: TZ }))
    if (local.getDay() === 0 || local.getHours() < 9 || local.getHours() >= 21) return { total: 0, mensaje: null }
    const leads = await prisma.lead.findMany({
      where: {
        status: 'QUALIFIED',
        tags: { has: 'whatsapp-bot' },
        NOT: { tags: { has: 'recordado' } },
        nextActionDate: { lte: new Date(now.getTime() - 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'asc' },
    })
    if (!leads.length) return { total: 0, mensaje: null }
    await Promise.all(leads.map((l) => prisma.lead.update({ where: { id: l.id }, data: { tags: [...l.tags, 'recordado'] } })))
    const lines = leads.map((l) => {
      const servicio = l.tags.find((t) => ['web', 'chatbot', 'plan-unico', 'branding', 'solo-anuncios', 'consultoria', 'desayuno'].includes(t))
      return `• ${l.name}${l.company && l.company !== l.name ? ` (${l.company})` : ''}${servicio ? ` · ${servicio}` : ''}${l.potentialValue ? ` · ${money(l.potentialValue, l.currency)}` : ''}${l.phone ? `\n  wa.me/${l.phone}` : ''}`
    })
    return {
      total: leads.length,
      mensaje: `⏰ ${leads.length === 1 ? 'Lead derivado que todavía no contactaste' : `${leads.length} leads derivados que todavía no contactaste`}:\n\n${lines.join('\n')}\n\nCuando le escribas, decime "ya contacté a ${leads[0].name.split(' ')[0]}" y lo marco como contactado.`,
    }
  },

  // Items starting in the 5-minute window that ends REMINDER_MINUTES from now (called every 5 min)
  async 'reminders.due'() {
    const step = 5 * 60 * 1000
    const base = Math.floor(Date.now() / step) * step
    const from = new Date(base + (REMINDER_MINUTES - 5) * 60 * 1000)
    const to = new Date(base + REMINDER_MINUTES * 60 * 1000)
    const [events, tasks] = await Promise.all([
      prisma.calendarEvent.findMany({ where: { allDay: false, startDate: { gt: from, lte: to } }, orderBy: { startDate: 'asc' } }),
      prisma.task.findMany({ where: { status: { notIn: ['DONE', 'CANCELLED'] }, dueDate: { gt: from, lte: to }, NOT: { tags: { has: 'produccion' } } }, orderBy: { dueDate: 'asc' } }),
    ])
    const mensajes = [
      ...events.map((e) => [
        `⏰ En ${REMINDER_MINUTES} min (${hora(e.startDate)}): ${e.title}`,
        e.location && `📍 ${e.location}`,
        e.meetingUrl && `🔗 ${e.meetingUrl}`,
      ].filter(Boolean).join('\n')),
      ...tasks.map((t) => `⏰ En ${REMINDER_MINUTES} min (${hora(t.dueDate!)}): ${t.title}`),
    ]
    return { total: mensajes.length, mensajes }
  },

  async 'expense.create'(b) {
    const amount = num(b.amount)
    const concept = str(b.concept)
    if (!amount || !concept) throw new Error('Faltan monto o concepto')
    const category = EXPENSE_CATEGORIES.find((c) => norm(c) === norm(str(b.category))) ?? 'General'
    const expense = await prisma.expense.create({
      data: {
        date: date(b.date) ?? new Date(),
        concept,
        category,
        type: str(b.type).toLowerCase() === 'direct' ? 'DIRECT' : 'FIXED',
        clientId: str(b.clientId) || null,
        amount,
        currency: str(b.currency).toUpperCase() === 'USD' ? 'USD' : 'ARS',
        exchangeRate: num(b.exchangeRate) ?? (await getDolarBlue())?.venta ?? null,
        recurring: b.recurring === true,
        notes: str(b.notes) || 'Cargado por WhatsApp',
      },
    })
    const o = await owner()
    if (o) logActivity('EXPENSE_CREATED', `Gasto registrado: ${concept}`, o.userId, { entityId: expense.id, entityType: 'expense' })
    return { ok: true, gasto: { id: expense.id, concepto: concept, monto: expense.amount, moneda: expense.currency, categoria: category } }
  },
}

export async function POST(req: NextRequest) {
  if (!isWebhookAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Body
  try {
    const raw = await req.json()
    // The agent sometimes sends the payload as a JSON string
    body = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const action = str(body.action)
  const handler = actions[action]
  if (!handler) {
    return NextResponse.json({ error: `Acción desconocida: ${action}`, acciones: Object.keys(actions) }, { status: 400 })
  }

  try {
    return NextResponse.json(await handler(body))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error'
    console.error(error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
