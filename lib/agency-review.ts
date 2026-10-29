import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { getDolarBlue } from '@/lib/dolar'
import { botMetrics } from '@/lib/bot-metrics'
import { APP_URL, notifyJuanba } from '@/lib/proposals'
import type { ReportData } from '@/lib/meta'

// Agency review, twice a month (days 3 and 17): how the agency is doing, a verdict on every client
// and the 3 actions for the next two weeks. Saved as a document (Documentos → "Informes de agencia")
// and summarized to Juanba over WhatsApp.

const TZ = 'America/Argentina/Buenos_Aires'
const DAY = 24 * 60 * 60 * 1000
export const REVIEW_CATEGORY = 'Informes de agencia'
// Fees are paid in arrears: October's is due on November 6th
const DUE_DAY = 6

// "2026-10" → "2026-11-06" (Argentina day)
function dueDay(period: string) {
  const [y, m] = period.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  return `${next}-${String(DUE_DAY).padStart(2, '0')}`
}

// End of the due day
const dueDate = (period: string) => new Date(`${dueDay(period)}T23:59:59-03:00`)

export function reviewUrl(id: string) {
  return `${APP_URL}/informes/${id}`
}

const today = (now: Date) => now.toLocaleDateString('en-CA', { timeZone: TZ })

// "2026-9" → "2026-09"
const normPeriod = (p: string) => p.replace(/^(\d{4})-(\d)$/, '$1-0$2')

function monthsBack(now: Date, n: number) {
  const [y, m] = today(now).slice(0, 7).split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 15))
    return d.toISOString().slice(0, 7)
  }).reverse()
}

const round = (n: number) => Math.round(n)
const pct = (part: number, total: number) => total ? Math.round((part / total) * 100) : 0

// Everything the analyst reads, in pesos (USD at each record's rate, or today's blue)
export async function agencySnapshot(now = new Date()) {
  const months = monthsBack(now, 6)
  const since60 = new Date(now.getTime() - 60 * DAY)
  const since90 = new Date(now.getTime() - 90 * DAY)
  const sinceMonths = new Date(`${months[0]}-01T00:00:00-03:00`)

  const [blue, clients, incomes, expenses, tasks, events, reports, leads, proposals, bot, previous] = await Promise.all([
    getDolarBlue(),
    prisma.client.findMany({ where: { OR: [{ status: 'ACTIVE' }, { updatedAt: { gte: new Date(now.getTime() - 180 * DAY) } }] }, orderBy: { monthlyValue: 'desc' } }),
    prisma.income.findMany({ orderBy: { period: 'asc' } }),
    prisma.expense.findMany({ where: { date: { gte: sinceMonths } } }),
    prisma.task.findMany({ where: { OR: [{ createdAt: { gte: since60 } }, { dueDate: { gte: since60 } }] }, select: { clientId: true, status: true, dueDate: true, tags: true } }),
    prisma.calendarEvent.findMany({ where: { startDate: { gte: since60, lte: now }, clientId: { not: null } }, select: { clientId: true, type: true } }),
    prisma.metaReport.findMany({ orderBy: { period: 'desc' } }),
    prisma.lead.findMany({ where: { createdAt: { gte: since90 } }, select: { source: true, status: true, potentialValue: true, currency: true, tags: true } }),
    prisma.proposal.findMany({ where: { createdAt: { gte: since90 } }, select: { status: true, sentAt: true, firstViewedAt: true, acceptedAt: true } }),
    botMetrics(new Date(now.getTime() - 30 * DAY), now).catch(() => null),
    prisma.document.findFirst({ where: { category: REVIEW_CATEGORY }, orderBy: { createdAt: 'desc' } }),
  ])

  const rate = blue?.venta ?? 0
  const ars = (r: { amount: number; currency: string; exchangeRate?: number | null }) => r.currency === 'USD' ? r.amount * (r.exchangeRate ?? rate) : r.amount
  const fee = (c: { monthlyValue: number; currency: string }) => ars({ amount: c.monthlyValue, currency: c.currency })

  const active = clients.filter((c) => c.status === 'ACTIVE')
  const mrr = active.reduce((a, c) => a + fee(c), 0)
  const recent = incomes.filter((i) => months.includes(normPeriod(i.period)))
  // Old drafts were never meant to go out; only the latest month's draft is still pending review
  const latestPeriod = reports[0]?.period
  const meaningful = reports.filter((r) => r.status !== 'borrador' || r.period === latestPeriod)

  const clientes = active.map((c) => {
    const own = recent.filter((i) => i.clientId === c.id)
    const ownTasks = tasks.filter((t) => t.clientId === c.id)
    const report = meaningful.filter((r) => r.clientId === c.id).slice(0, 2)
    const direct = expenses.filter((e) => e.clientId === c.id && e.date >= since90).reduce((a, e) => a + ars(e), 0)
    return {
      cliente: c.company,
      contacto: c.name,
      abono_pesos: round(fee(c)),
      porcentaje_de_la_facturacion: pct(fee(c), mrr),
      plan: c.planType,
      detalle_del_plan: c.planNotes?.slice(0, 300) || null,
      servicios: c.services,
      cargado_en_el_sistema_desde: c.startDate.toISOString().slice(0, 10),
      termina: c.endDate ? c.endDate.toISOString().slice(0, 10) : null,
      notas: c.notes?.slice(0, 400) || null,
      cobros: own.map((i) => {
        const due = dueDate(normPeriod(i.period))
        const late = (at: Date) => Math.max(0, Math.ceil((at.getTime() - due.getTime()) / DAY))
        return {
          mes: normPeriod(i.period),
          monto_pesos: round(ars(i)),
          vence: dueDay(normPeriod(i.period)),
          ...(i.status === 'COLLECTED'
            ? { estado: 'cobrado', dias_de_atraso: i.collectedAt ? late(i.collectedAt) : null }
            : now > due
              ? { estado: 'vencido', dias_de_atraso: late(now) }
              : { estado: 'todavía no vence' }),
          recordatorio_enviado: /Recordatorio de pago/.test(i.notes ?? ''),
        }
      }),
      tareas_ultimos_60_dias: {
        total: ownTasks.length,
        hechas: ownTasks.filter((t) => t.status === 'DONE').length,
        vencidas_sin_hacer: ownTasks.filter((t) => t.dueDate && t.dueDate < now && !['DONE', 'CANCELLED'].includes(t.status)).length,
        fuera_de_la_produccion_mensual: ownTasks.filter((t) => !t.tags.some((g) => g.startsWith('prod-'))).length,
      },
      reuniones_ultimos_60_dias: events.filter((e) => e.clientId === c.id && e.type === 'MEETING').length,
      gastos_directos_ultimos_90_dias_pesos: round(direct),
      cuenta_de_meta_vinculada: Boolean(c.metaAdAccountId),
      anuncios_meta: report.map((r) => {
        const d = r.data as unknown as ReportData
        return {
          mes: r.period,
          inversion: round(d.current.spend),
          moneda: d.account.currency,
          resultados: `${d.current.results} ${d.resultLabel}`,
          costo_por_resultado: d.current.costPerResult ? round(d.current.costPerResult) : null,
          costo_por_resultado_mes_anterior: d.previous.costPerResult ? round(d.previous.costPerResult) : null,
          reporte: r.status === 'visto' ? 'enviado y abierto' : r.status === 'enviado' ? 'enviado, no lo abrió' : 'borrador, Juanba todavía no lo revisó',
        }
      }),
    }
  })

  const top3 = [...active].sort((a, b) => fee(b) - fee(a)).slice(0, 3)
  const won = leads.filter((l) => l.status === 'WON')

  return {
    hoy: today(now),
    datos_desde: incomes[0] ? normPeriod(incomes[0].period) : null,
    dolar_blue: rate || null,
    agencia: {
      clientes_activos: active.length,
      facturacion_mensual_por_abonos: round(mrr),
      abono_promedio: active.length ? round(mrr / active.length) : 0,
      top_3_clientes: top3.map((c) => c.company),
      top_3_porcentaje_de_la_facturacion: pct(top3.reduce((a, c) => a + fee(c), 0), mrr),
      terminan_en_los_proximos_60_dias: active.filter((c) => c.endDate && c.endDate.getTime() - now.getTime() < 60 * DAY).map((c) => `${c.company} (${c.endDate!.toISOString().slice(0, 10)})`),
      bajas_ultimos_6_meses: clients.filter((c) => c.status !== 'ACTIVE').map((c) => c.company),
      deuda_vencida_pesos: round(incomes.filter((i) => i.status !== 'COLLECTED' && now > dueDate(normPeriod(i.period))).reduce((a, i) => a + ars(i), 0)),
      a_cobrar_que_todavia_no_vence_pesos: round(incomes.filter((i) => i.status !== 'COLLECTED' && now <= dueDate(normPeriod(i.period))).reduce((a, i) => a + ars(i), 0)),
      meses: months.map((m) => {
        const inc = recent.filter((i) => normPeriod(i.period) === m)
        const exp = expenses.filter((e) => e.date.toLocaleDateString('en-CA', { timeZone: TZ }).slice(0, 7) === m)
        const facturado = inc.reduce((a, i) => a + ars(i), 0)
        const gastos = exp.reduce((a, e) => a + ars(e), 0)
        return {
          mes: m,
          facturado: round(facturado),
          cobrado: round(inc.filter((i) => i.status === 'COLLECTED').reduce((a, i) => a + ars(i), 0)),
          gastos_fijos: round(exp.filter((e) => e.type === 'FIXED').reduce((a, e) => a + ars(e), 0)),
          gastos_directos: round(exp.filter((e) => e.type === 'DIRECT').reduce((a, e) => a + ars(e), 0)),
          margen: facturado ? `${pct(facturado - gastos, facturado)}%` : null,
        }
      }).filter((m) => m.facturado || m.gastos_fijos || m.gastos_directos),
    },
    comercial_ultimos_90_dias: {
      leads: leads.length,
      por_origen: Object.entries(leads.reduce<Record<string, number>>((a, l) => ({ ...a, [l.source]: (a[l.source] ?? 0) + 1 }), {})).map(([o, n]) => `${o}: ${n}`),
      por_estado: Object.entries(leads.reduce<Record<string, number>>((a, l) => ({ ...a, [l.status]: (a[l.status] ?? 0) + 1 }), {})).map(([s, n]) => `${s}: ${n}`),
      ganados: won.length,
      valor_ganado_pesos: round(won.reduce((a, l) => a + ars({ amount: l.potentialValue, currency: l.currency }), 0)),
      propuestas: { creadas: proposals.length, enviadas: proposals.filter((p) => p.sentAt).length, vistas: proposals.filter((p) => p.firstViewedAt).length, aceptadas: proposals.filter((p) => p.acceptedAt).length },
      bot_de_ventas_ultimos_30_dias: bot,
    },
    clientes,
    informe_anterior: previous ? { fecha: previous.createdAt.toISOString().slice(0, 10), contenido: previous.content.slice(0, 4000) } : null,
  }
}

const VERDICTS = ['muy bueno', 'bueno', 'a revisar', 'problema'] as const

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    titular: { type: 'string', description: 'Cómo viene la agencia en 1 o 2 oraciones, con el número más importante.' },
    bien: { type: 'array', items: { type: 'string' }, description: 'Lo que está saliendo bien, 2 a 4 puntos, cada uno con su dato.' },
    mal: { type: 'array', items: { type: 'string' }, description: 'Lo que está saliendo mal o es un riesgo, 2 a 4 puntos, cada uno con su dato.' },
    clientes: {
      type: 'array',
      description: 'Todos los clientes activos, del peor al mejor veredicto.',
      items: {
        type: 'object',
        properties: {
          cliente: { type: 'string' },
          veredicto: { type: 'string', enum: VERDICTS },
          en_una_linea: { type: 'string', description: 'El motivo en menos de 15 palabras, para el resumen de WhatsApp.' },
          motivo: { type: 'string', description: 'Por qué, con los datos concretos (abono, pagos, carga de trabajo, resultados). 1 o 2 oraciones.' },
          sugerencia: { type: 'string', description: 'Qué hacer con este cliente. Vacío si no hace falta nada.' },
        },
        required: ['cliente', 'veredicto', 'en_una_linea', 'motivo', 'sugerencia'],
        additionalProperties: false,
      },
    },
    acciones: {
      type: 'array',
      description: 'Exactamente 3 acciones para las próximas dos semanas, de mayor a menor impacto.',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string', description: 'La acción en una frase corta, con a quién y cuánto.' },
          por_que: { type: 'string', description: 'El dato que la justifica y qué se gana. 1 o 2 oraciones.' },
          como: { type: 'array', items: { type: 'string' }, description: 'Pasos concretos, 2 a 4.' },
          mensaje: { type: 'string', description: 'Si la acción implica escribirle a alguien, el mensaje de WhatsApp listo para mandar, en la voz de Juanba. Si no, vacío.' },
        },
        required: ['titulo', 'por_que', 'como', 'mensaje'],
        additionalProperties: false,
      },
    },
    seguimiento: { type: 'string', description: 'Qué pasó con las acciones del informe anterior, según los datos. Vacío si no hay informe anterior.' },
    faltan_datos: { type: 'array', items: { type: 'string' }, description: 'Datos que faltan cargar para que el análisis sea más fino, en orden de importancia. Máximo 3.' },
  },
  required: ['titular', 'bien', 'mal', 'clientes', 'acciones', 'seguimiento', 'faltan_datos'],
  additionalProperties: false,
} as const

type Review = {
  titular: string
  bien: string[]
  mal: string[]
  clientes: { cliente: string; veredicto: (typeof VERDICTS)[number]; en_una_linea: string; motivo: string; sugerencia: string }[]
  acciones: { titulo: string; por_que: string; como: string[]; mensaje: string }[]
  seguimiento: string
  faltan_datos: string[]
}

const SYSTEM = `Sos el analista de negocio de ViaStudio, una agencia de marketing chica de Reconquista (Santa Fe, Argentina) que lleva Juanba, su dueño. Cada dos semanas le escribís un informe sobre cómo viene la agencia, como lo haría un socio con experiencia en agencias: directo, honesto y práctico. Le hablás a Juanba en español rioplatense con voseo.

Qué evaluás:
- La agencia: facturación, cobranza, margen, dependencia de pocos clientes, bajas, cómo entran clientes nuevos (leads, propuestas, bot de ventas).
- Cada cliente, por cuatro cosas: si es rentable (abono frente al trabajo que da y los gastos directos), si paga bien (puntualidad, deudas, recordatorios), si le estamos dando resultados (anuncios de Meta: costo por resultado y tendencia, si abre los reportes) porque eso predice si se queda, y si tiene potencial de crecer (venderle más o subirle el abono).
- Los veredictos: "muy bueno", "bueno", "a revisar" o "problema". Si un cliente es malo, decilo claro y explicá por qué con números (por ejemplo: paga el abono más bajo, se atrasa, da más trabajo que el resto). Juanba quiere la verdad, no consuelo.

Reglas:
- Usá solo los datos que te pasan. Separá lo que es un dato de lo que es una inferencia ("parece", "probablemente"). No inventes causas, cifras de inflación ni comparaciones con el mercado.
- Si los datos son pocos o no alcanzan para juzgar algo (por ejemplo, un solo mes de cobros, ningún gasto cargado), decilo y no saques conclusiones fuertes de ahí. Un dato que falta no es un dato malo: un cobro sin marcar puede ser un pago que Juanba no registró.
- Los abonos se pagan mes vencido: el de un mes vence el día 6 del mes siguiente (el de octubre, el 6 de noviembre). Un abono que "todavía no vence" no es deuda ni atraso: no lo trates como problema ni mandes a reclamarlo antes de tiempo; como mucho, un aviso amable unos días antes del vencimiento. El atraso se cuenta desde el vencimiento.
- ViaStudio OS es nuevo: "datos_desde" es el primer mes con datos y antes no hay nada. "cargado_en_el_sistema_desde" es cuándo se cargó el cliente, no cuándo empezó a trabajar con la agencia.
- Reportes de Meta: se arman solos el día 1 con el mes anterior, para los clientes con "cuenta_de_meta_vinculada", y Juanba los revisa antes de mandarlos. Un cliente vinculado sin reporte todavía es porque se vinculó hace poco: no es un problema.
- Las acciones son exactamente 3, para las próximas dos semanas, concretas (a quién, cuánto, cuándo) y que Juanba pueda hacer él mismo o con su asistente de WhatsApp (que puede mandar recordatorios de pago, armar propuestas, crear tareas y mandar mensajes). Priorizá lo que más plata mueve o más riesgo saca. No repitas una acción del informe anterior si los datos muestran que ya se hizo.
- Si hay informe anterior, en "seguimiento" decí qué cambió desde entonces.
- Escribí corto: frases simples, sin relleno, sin jerga de consultor, sin negritas ni markdown. Montos en pesos con punto de miles ($350.000).`

export async function writeReview(snapshot: Awaited<ReturnType<typeof agencySnapshot>>): Promise<Review> {
  const client = new Anthropic({ timeout: 240_000, maxRetries: 1 })
  const stream = client.beta.messages.stream({
    model: 'claude-opus-5-5',
    max_tokens: 32000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high', format: { type: 'json_schema', schema: REVIEW_SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content: `Datos de ViaStudio al ${snapshot.hoy}:\n\n${JSON.stringify(snapshot, null, 1)}` }],
  } as Parameters<typeof client.beta.messages.stream>[0])
  const response = await stream.finalMessage()
  if (response.stop_reason === 'refusal') throw new Error('El modelo no quiso escribir el informe')
  if (response.stop_reason === 'max_tokens') throw new Error('El informe quedó cortado')
  const text = response.content.find((b) => b.type === 'text')
  if (!text || text.type !== 'text') throw new Error('El informe vino vacío')
  return JSON.parse(text.text) as Review
}

const ICON: Record<Review['clientes'][number]['veredicto'], string> = { 'muy bueno': '🟢', 'bueno': '🟢', 'a revisar': '🟡', 'problema': '🔴' }
const money = (n: number) => `$${n.toLocaleString('es-AR')}`

export function toMarkdown(r: Review, s: Awaited<ReturnType<typeof agencySnapshot>>) {
  const a = s.agencia
  const last = a.meses.at(-1)
  return [
    `# Cómo viene la agencia`,
    r.titular,
    `## Números`,
    `- Clientes activos: ${a.clientes_activos}, abono promedio ${money(a.abono_promedio)}`,
    `- Facturación por abonos: ${money(a.facturacion_mensual_por_abonos)} por mes`,
    last ? `- ${last.mes}: facturado ${money(last.facturado)}, cobrado ${money(last.cobrado)}${last.margen ? `, margen ${last.margen}` : ''}` : '',
    `- Deuda vencida: ${money(a.deuda_vencida_pesos)}. A cobrar que todavía no vence: ${money(a.a_cobrar_que_todavia_no_vence_pesos)}`,
    `- Los 3 clientes más grandes (${a.top_3_clientes.join(', ')}) son el ${a.top_3_porcentaje_de_la_facturacion}% de la facturación`,
    `## Lo que está bien`,
    ...r.bien.map((b) => `- ${b}`),
    `## Lo que está mal`,
    ...r.mal.map((m) => `- ${m}`),
    `## Las 3 acciones de esta quincena`,
    ...r.acciones.flatMap((x, i) => [
      `### ${i + 1}. ${x.titulo}`,
      x.por_que,
      ...x.como.map((c, j) => `${j + 1}. ${c}`),
      ...(x.mensaje ? ['Mensaje sugerido:', x.mensaje.split('\n').map((l) => `> ${l}`).join('\n')] : []),
    ]),
    `## Clientes`,
    ...r.clientes.flatMap((c) => [`### ${ICON[c.veredicto]} ${c.cliente}: ${c.veredicto}`, c.motivo, ...(c.sugerencia ? [`Qué hacer: ${c.sugerencia}`] : [])]),
    ...(r.seguimiento ? [`## Desde el informe anterior`, r.seguimiento] : []),
    ...(r.faltan_datos.length ? [`## Para que el análisis sea más fino`, ...r.faltan_datos.map((f) => `- ${f}`)] : []),
  ].filter(Boolean).join('\n\n')
}

// Short on purpose: the worst ones only (clients already leaving don't count), the detail is behind the link
export function toWhatsApp(r: Review, url: string, leaving: string[] = []) {
  const flagged = r.clientes
    .filter((c) => (c.veredicto === 'problema' || c.veredicto === 'a revisar') && !leaving.includes(c.cliente))
    .sort((a, b) => Number(b.veredicto === 'problema') - Number(a.veredicto === 'problema'))
    .slice(0, 3)
  return [
    `🧭 Informe de la agencia`,
    r.titular,
    `Las 3 acciones de esta quincena:\n${r.acciones.map((x, i) => `${i + 1}. ${x.titulo}`).join('\n')}`,
    flagged.length ? `Clientes a mirar:\n${flagged.map((c) => `${ICON[c.veredicto]} ${c.cliente}: ${c.en_una_linea}`).join('\n')}` : '',
    `El informe completo, con el paso a paso y los mensajes listos:\n${url}`,
    'Si querés profundizar en algo, preguntame.',
  ].filter(Boolean).join('\n\n')
}

// Edition of the fortnight: days 3–16 → "a", 17 onwards → "b"
function editionOf(now: Date) {
  const d = today(now)
  return `agencia-${d.slice(0, 7)}-${Number(d.slice(8, 10)) >= 17 ? 'b' : 'a'}`
}

export async function buildReview(now = new Date()) {
  const owner = await prisma.profile.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!owner) throw new Error('No hay perfil de usuario')
  const snapshot = await agencySnapshot(now)
  const review = await writeReview(snapshot)
  const date = new Date(`${snapshot.hoy}T12:00:00-03:00`).toLocaleDateString('es-AR', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' })
  const doc = await prisma.document.create({
    data: {
      title: `Informe de la agencia · ${date}`,
      content: toMarkdown(review, snapshot),
      type: 'RESOURCE',
      category: REVIEW_CATEGORY,
      tags: [editionOf(now)],
      authorId: owner.id,
    },
  })
  await notifyJuanba(toWhatsApp(review, reviewUrl(doc.id), snapshot.clientes.filter((c) => c.termina).map((c) => c.cliente)))
  return { id: doc.id, url: reviewUrl(doc.id) }
}

// Daily 7:00 run: on the 3rd and the 17th (or the next days, if a run was missed), build the review once
export async function agencyReviewCheck(now = new Date()) {
  const day = Number(today(now).slice(8, 10))
  if (!((day >= 3 && day <= 7) || (day >= 17 && day <= 21)) || !process.env.ANTHROPIC_API_KEY) return { generado: false }
  const done = await prisma.document.findFirst({ where: { category: REVIEW_CATEGORY, tags: { has: editionOf(now) } } })
  if (done) return { generado: false }
  try {
    return { generado: true, ...(await buildReview(now)) }
  } catch (error) {
    console.error('agency review', error)
    await notifyJuanba(`⚠️ No pude armar el informe de la agencia: ${error instanceof Error ? error.message : 'error'}. Pedímelo de nuevo más tarde.`)
    return { generado: false }
  }
}

export async function latestReview() {
  return prisma.document.findFirst({ where: { category: REVIEW_CATEGORY }, orderBy: { createdAt: 'desc' } })
}
