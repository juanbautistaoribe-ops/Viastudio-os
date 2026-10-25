import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isWebhookAuthorized } from '@/lib/webhook-auth'
import { logActivity } from '@/lib/activity'

export const maxDuration = 30

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

function date(value: unknown) {
  const s = str(value)
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

// Case- and accent-insensitive match
function norm(s: string | null | undefined) {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function matches(q: string, ...fields: (string | null | undefined | string[])[]) {
  const words = norm(q).split(/\s+/).filter(Boolean)
  const hay = norm(fields.flat().join(' '))
  return words.every((w) => hay.includes(w))
}

function currentPeriod() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).slice(0, 7)
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

const actions: Record<string, (b: Body) => Promise<unknown>> = {
  async summary() {
    const period = currentPeriod()
    const now = new Date()
    const [leads, clients, tasks, incomes, expenses] = await Promise.all([
      prisma.lead.findMany(),
      prisma.client.findMany({ where: { status: 'ACTIVE' } }),
      prisma.task.findMany({ where: { status: { notIn: ['DONE', 'CANCELLED'] } } }),
      prisma.income.findMany({ where: { period } }),
      prisma.expense.findMany({ where: { date: { gte: new Date(`${period}-01T00:00:00-03:00`) } } }),
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
    }
  },

  async 'leads.search'(b) {
    const q = str(b.q)
    const status = str(b.status).toUpperCase()
    const leads = await prisma.lead.findMany({ orderBy: { updatedAt: 'desc' }, take: 300 })
    const found = leads
      .filter((l) => (status ? l.status === status : true))
      .filter((l) => !q || matches(q, l.name, l.company, l.notes, l.tags, l.services, l.phone))
      .slice(0, 10)
    return { total: found.length, leads: found.map(leadOut) }
  },

  async 'leads.update'(b) {
    const id = str(b.id)
    const lead = await prisma.lead.findUnique({ where: { id } })
    if (!lead) throw new Error('Lead no encontrado')
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
    if (o && status === 'LOST') logActivity('LEAD_LOST', `Lead perdido: ${updated.company}`, o.userId, { entityId: id, entityType: 'lead' })
    return { ok: true, lead: leadOut(updated) }
  },

  async 'leads.convert'(b) {
    const id = str(b.id)
    const lead = await prisma.lead.findUnique({ where: { id } })
    if (!lead) throw new Error('Lead no encontrado')
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
    return { ok: true, cliente: { id: client.id, nombre: client.name, negocio: client.company, valor_mensual: client.monthlyValue, moneda: client.currency } }
  },

  async 'clients.search'(b) {
    const q = str(b.q)
    const clients = await prisma.client.findMany({ orderBy: { company: 'asc' } })
    const found = clients.filter((c) => !q || matches(q, c.name, c.company, c.industry, c.phone)).slice(0, 10)
    return {
      total: found.length,
      clientes: found.map((c) => ({ id: c.id, nombre: c.name, negocio: c.company, rubro: c.industry, estado: c.status.toLowerCase(), valor_mensual: c.monthlyValue, moneda: c.currency })),
    }
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
    const task = await prisma.task.update({ where: { id: str(b.id) }, data: { status: 'DONE' } })
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

  async 'income.collect'(b) {
    const ids = (Array.isArray(b.ids) ? b.ids : [b.id]).map(str).filter(Boolean)
    if (!ids.length) throw new Error('Faltan los ids de los ingresos')
    const collectedAt = date(b.collectedAt) ?? new Date()
    const { count } = await prisma.income.updateMany({ where: { id: { in: ids } }, data: { status: 'COLLECTED', collectedAt } })
    if (!count) throw new Error('No encontré esos ingresos')
    const updated = await prisma.income.findMany({ where: { id: { in: ids } }, include: { client: { select: { company: true } } } })
    return { ok: true, marcados: count, ingresos: updated.map((i) => ({ cliente: i.client?.company ?? null, concepto: i.concept, monto: i.amount, moneda: i.currency })) }
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
