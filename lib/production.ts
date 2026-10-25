import { prisma } from '@/lib/prisma'

// Monthly production plan per client: weekly tasks built from each client's plan.
// "unico" = Plan Único (fixed deliverables); "personalizado" = parsed from the client's plan notes.

const TZ_OFFSET = '-03:00'
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

type Kind = 'reels' | 'placas' | 'creativos' | 'anuncios' | 'historias'
type Deliverables = Partial<Record<Kind, number>>
type Extras = { metricas?: boolean; consultoria?: boolean }

const PLAN_UNICO: Deliverables = { reels: 4, placas: 14, anuncios: 3 }
const LABEL: Record<Kind, [string, string]> = {
  reels: ['reel', 'reels'], placas: ['placa', 'placas'], creativos: ['creativo', 'creativos'], anuncios: ['anuncio', 'anuncios'], historias: ['historia', 'historias'],
}
const KEYWORDS: Record<Kind, RegExp> = {
  reels: /reels?|videos?/,
  placas: /placas?|posteos?|posts?|flyers?|carruseles?/,
  creativos: /creativos?|piezas?/,
  anuncios: /anuncios?|pautas?|campanas?|ads/,
  historias: /historias?|stories/,
}

export type Override = { cliente: string } & Deliverables
export type PlanOptions = { exclude?: string[]; overrides?: Override[] }

function norm(s: string | null | undefined) {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// "4 pautas y 4 videos" → { anuncios: 4, reels: 4 }; "16 reels" → { reels: 16 }
export function parsePlanNotes(notes: string | null): { deliverables: Deliverables; extras: Extras; understood: boolean } {
  const text = norm(notes)
  const deliverables: Deliverables = {}
  for (const m of text.matchAll(/(\d+)\s*([a-z]+)/g)) {
    const kind = (Object.keys(KEYWORDS) as Kind[]).find((k) => KEYWORDS[k].test(m[2]))
    if (kind) deliverables[kind] = (deliverables[kind] ?? 0) + Number(m[1])
  }
  const extras: Extras = { metricas: /metricas|reporte/.test(text), consultoria: /consultori|reunion/.test(text) }
  const understood = Object.keys(deliverables).length > 0 || !!extras.metricas || !!extras.consultoria
  return { deliverables, extras, understood }
}

// Split n items over k weeks as evenly as possible (bigger chunks first)
function split(n: number, k: number) {
  return Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0))
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10)
}

function nthWeekday(year: number, month: number, weekday: number, n: number) {
  const first = new Date(Date.UTC(year, month, 1))
  const offset = (weekday - first.getUTCDay() + 7) % 7
  return new Date(Date.UTC(year, month, 1 + offset + (n - 1) * 7))
}

const holidayCache = new Map<number, { fecha: string; nombre: string }[]>()

export async function holidays(year: number) {
  if (holidayCache.has(year)) return holidayCache.get(year)!
  try {
    const res = await fetch(`https://api.argentinadatos.com/v1/feriados/${year}`, { next: { revalidate: 86400 } })
    const list = res.ok ? ((await res.json()) as { fecha: string; nombre: string }[]) : []
    holidayCache.set(year, list)
    return list
  } catch {
    return []
  }
}

// Argentine commercial dates worth planning content for
export function specialDates(year: number, month: number): { fecha: string; nombre: string }[] {
  const d = (day: number) => ymd(new Date(Date.UTC(year, month, day)))
  const list: Record<number, { fecha: string; nombre: string }[]> = {
    0: [{ fecha: d(1), nombre: 'Año Nuevo / rebajas de verano' }],
    1: [{ fecha: d(14), nombre: 'San Valentín' }, { fecha: d(23), nombre: 'Vuelta a clases' }],
    2: [{ fecha: d(1), nombre: 'Vuelta a clases' }, { fecha: d(8), nombre: 'Día de la Mujer' }],
    4: [{ fecha: d(1), nombre: 'Día del Trabajador' }, { fecha: ymd(nthWeekday(year, 4, 1, 2)), nombre: 'Hot Sale (aprox.)' }, { fecha: d(25), nombre: '25 de Mayo' }],
    5: [{ fecha: ymd(nthWeekday(year, 5, 0, 3)), nombre: 'Día del Padre' }],
    6: [{ fecha: d(20), nombre: 'Día del Amigo' }, { fecha: d(15), nombre: 'Vacaciones de invierno (aprox.)' }],
    7: [{ fecha: ymd(nthWeekday(year, 7, 0, 3)), nombre: 'Día de las Infancias' }],
    8: [{ fecha: d(21), nombre: 'Día de la Primavera y del Estudiante' }],
    9: [{ fecha: ymd(nthWeekday(year, 9, 0, 3)), nombre: 'Día de la Madre' }, { fecha: d(31), nombre: 'Halloween' }],
    10: [{ fecha: ymd(nthWeekday(year, 10, 1, 1)), nombre: 'Cyber Monday (aprox.)' }, { fecha: ymd(nthWeekday(year, 10, 5, 4)), nombre: 'Black Friday' }],
    11: [{ fecha: d(8), nombre: 'Armado del arbolito / inicio de fiestas' }, { fecha: d(24), nombre: 'Navidad' }, { fecha: d(31), nombre: 'Fin de año' }],
  }
  return (list[month] ?? []).sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// Delivery days: each Friday of the month at 12:00 AR; a holiday moves it to the previous business day
async function deliveryDays(year: number, month: number) {
  const hol = new Set((await holidays(year)).map((h) => h.fecha))
  const days: Date[] = []
  for (let day = 1; day <= 31; day++) {
    const date = new Date(Date.UTC(year, month, day))
    if (date.getUTCMonth() !== month) break
    if (date.getUTCDay() !== 5) continue
    const due = new Date(date)
    while (hol.has(ymd(due)) || due.getUTCDay() === 0 || due.getUTCDay() === 6) due.setUTCDate(due.getUTCDate() - 1)
    days.push(new Date(`${ymd(due)}T12:00:00${TZ_OFFSET}`))
  }
  return days
}

function describe(d: Deliverables) {
  return (Object.keys(LABEL) as Kind[])
    .filter((k) => d[k])
    .map((k) => `${d[k]} ${LABEL[k][d[k] === 1 ? 0 : 1]}`)
    .join(' + ')
}

export function periodOf(date: Date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).slice(0, 7)
}

export function nextPeriod(period: string) {
  const [y, m] = period.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

export async function buildPlan(period: string, opts: PlanOptions = {}) {
  const [year, month1] = period.split('-').map(Number)
  const month = month1 - 1
  const [clients, days, hol, existing] = await Promise.all([
    prisma.client.findMany({ where: { status: 'ACTIVE' }, orderBy: { company: 'asc' } }),
    deliveryDays(year, month),
    holidays(year),
    prisma.task.findMany({ where: { tags: { has: `prod-${period}` } }, select: { clientId: true } }),
  ])
  const already = new Set(existing.map((t) => t.clientId))
  const matchesName = (q: string, c: { id: string; name: string; company: string }) =>
    q === c.id || norm(c.company).includes(norm(q)) || norm(c.name).includes(norm(q))
  const excluded = (opts.exclude ?? []).filter(Boolean)

  const items: { clientId: string; cliente: string; plan: string; deliverables: Deliverables; extras: Extras; hasta?: string; tasks: { title: string; description: string; dueDate: Date }[] }[] = []
  const warnings: string[] = []
  const skipped: string[] = []

  for (const c of clients) {
    if (excluded.some((q) => matchesName(q, c))) { skipped.push(`${c.company} (excluido)`); continue }
    if (already.has(c.id)) { skipped.push(`${c.company} (ya tiene la producción cargada)`); continue }
    // Scheduled end: no production from that date on (mid-month ends keep the earlier weeks)
    const clientDays = c.endDate ? days.filter((d) => d < c.endDate!) : days
    if (!clientDays.length) { skipped.push(`${c.company} (baja desde el ${c.endDate!.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'numeric' })})`); continue }

    const override = (opts.overrides ?? []).find((o) => matchesName(o.cliente, c))
    let deliverables: Deliverables
    let extras: Extras = {}
    let plan: string
    if (c.planType === 'unico') {
      deliverables = PLAN_UNICO
      plan = 'Plan Único'
    } else if (c.planType === 'personalizado') {
      const parsed = parsePlanNotes(c.planNotes)
      if (!parsed.understood && !override) {
        warnings.push(`${c.company}: el detalle del plan${c.planNotes ? ` ("${c.planNotes}")` : ''} no dice qué entregables lleva. Completalo en el CRM (ej. "4 reels y 4 placas") o decime cuántos.`)
        continue
      }
      deliverables = parsed.deliverables
      extras = parsed.extras
      plan = 'personalizado'
    } else if (override) {
      deliverables = {}
      plan = 'personalizado'
    } else {
      warnings.push(`${c.company}: no tiene tipo de plan cargado en el CRM.`)
      continue
    }
    // An override only changes the kinds it mentions (0 removes one)
    if (override) {
      const changed = (Object.keys(LABEL) as Kind[]).filter((k) => override[k] !== undefined && override[k] !== null)
      deliverables = { ...deliverables, ...Object.fromEntries(changed.map((k) => [k, Number(override[k])])) }
      for (const k of changed) if (!deliverables[k]) delete deliverables[k]
      plan = `${plan}, ajustado`
    }

    const weeks = clientDays.length
    const perKind = Object.fromEntries((Object.keys(deliverables) as Kind[]).map((k) => [k, split(deliverables[k] ?? 0, weeks)])) as Record<Kind, number[]>
    const tasks = clientDays.flatMap((due, i) => {
      const week: Deliverables = Object.fromEntries((Object.keys(perKind) as Kind[]).filter((k) => perKind[k][i]).map((k) => [k, perKind[k][i]]))
      const out: { title: string; description: string; dueDate: Date }[] = []
      if (Object.keys(week).length) {
        out.push({
          title: `${c.company} · Semana ${i + 1}: ${describe(week)}`,
          description: `Producción de ${MESES[month]} (${plan}). Guion, grabación/diseño, edición, carga y publicación.`,
          dueDate: due,
        })
      }
      if (extras.consultoria) out.push({ title: `${c.company} · Consultoría semanal`, description: `Reunión de consultoría de la semana ${i + 1}.`, dueDate: due })
      return out
    })
    if (extras.metricas && clientDays.length) {
      tasks.push({ title: `${c.company} · Reporte de métricas de ${MESES[month]}`, description: 'Armar y enviar el reporte de métricas del mes.', dueDate: clientDays[clientDays.length - 1] })
    }
    const hasta = c.endDate && clientDays.length < days.length
      ? `baja el ${c.endDate.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'numeric' })}: todo en ${clientDays.length} ${clientDays.length === 1 ? 'semana' : 'semanas'}`
      : undefined
    if (tasks.length) items.push({ clientId: c.id, cliente: c.company, plan, deliverables, extras, hasta, tasks })
  }

  const feriados = hol.filter((h) => h.fecha.startsWith(period))
  return { period, mes: MESES[month], year, entregas: days, items, warnings, skipped, feriados, fechas: specialDates(year, month) }
}

const fmtDay = (fecha: string) => `${Number(fecha.slice(8, 10))}/${Number(fecha.slice(5, 7))}`

export function formatProposal(plan: Awaited<ReturnType<typeof buildPlan>>) {
  const total = plan.items.reduce((a, i) => a + i.tasks.length, 0)
  const lines = [
    `🎬 Producción de ${plan.mes} — propuesta`,
    `Entregas los viernes: ${plan.entregas.map((d) => fmtDay(d.toISOString().slice(0, 10))).join(', ')} (${plan.entregas.length} semanas)`,
    '',
    ...plan.items.map((i) => {
      const extra = [i.extras.consultoria && 'consultoría semanal', i.extras.metricas && 'reporte de métricas'].filter(Boolean).join(' + ')
      return `• ${i.cliente} (${i.plan}): ${[describe(i.deliverables), extra].filter(Boolean).join(' + ')}${i.hasta ? ` ⚠️ ${i.hasta}` : ''}`
    }),
  ]
  if (plan.warnings.length) lines.push('', '⚠️ Para revisar:', ...plan.warnings.map((w) => `• ${w}`))
  if (plan.skipped.length) lines.push('', `Sin tareas nuevas: ${plan.skipped.join(', ')}`)
  if (plan.feriados.length) lines.push('', `📅 Feriados: ${plan.feriados.map((f) => `${fmtDay(f.fecha)} ${f.nombre}`).join(' · ')}`)
  if (plan.fechas.length) lines.push(`📌 Fechas comerciales: ${plan.fechas.map((f) => `${fmtDay(f.fecha)} ${f.nombre}`).join(' · ')}. Sumá piezas especiales para los clientes que les sirva.`)
  lines.push('', `Total: ${total} tareas. ¿Las cargo así? Respondé "dale" o pedime cambios (ej. "sin Kleist", "a JV solo 4 reels").`)
  return lines.join('\n')
}

export async function createProduction(plan: Awaited<ReturnType<typeof buildPlan>>, createdById: string) {
  let created = 0
  for (const item of plan.items) {
    await prisma.task.createMany({
      data: item.tasks.map((t) => ({
        title: t.title,
        description: t.description,
        dueDate: t.dueDate,
        clientId: item.clientId,
        createdById,
        assigneeId: createdById,
        priority: 'MEDIUM' as const,
        tags: ['produccion', `prod-${plan.period}`],
      })),
    })
    created += item.tasks.length
  }
  return created
}

// Today is the last business day of its month (Mon–Fri, not a holiday, next business day falls in another month)
export async function isLastBusinessDay(now = new Date()) {
  const today = new Date(`${now.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })}T12:00:00Z`)
  const hol = new Set([...(await holidays(today.getUTCFullYear())), ...(await holidays(today.getUTCFullYear() + 1))].map((h) => h.fecha))
  const isBusiness = (d: Date) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !hol.has(ymd(d))
  if (!isBusiness(today)) return false
  const next = new Date(today)
  do next.setUTCDate(next.getUTCDate() + 1)
  while (!isBusiness(next))
  return next.getUTCMonth() !== today.getUTCMonth()
}
