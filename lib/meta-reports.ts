import Anthropic from '@anthropic-ai/sdk'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { waPhone } from '@/lib/utils'
import { APP_URL, money, notifyJuanba, sendToLead } from '@/lib/proposals'
import { accountReport, metaConfigured, previousPeriod, type ReportData } from '@/lib/meta'

const TZ = 'America/Argentina/Buenos_Aires'

export function reportUrl(slug: string) {
  return `${APP_URL}/r/${slug}`
}

export function monthLabel(period: string) {
  return new Date(`${period}-15T12:00:00-03:00`).toLocaleDateString('es-AR', { timeZone: TZ, month: 'long' })
}

// Report month by default: the one that just ended
export function lastPeriod(now = new Date()) {
  return previousPeriod(now.toLocaleDateString('en-CA', { timeZone: TZ }).slice(0, 7))
}

export const fmtMoney = (amount: number, currency: string) => money(Math.round(amount), currency === 'USD' ? 'USD' : 'ARS')

// % change vs last month; null when there's nothing to compare
export function change(cur: number, prev: number) {
  return prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null
}

const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    resumen: { type: 'string', description: 'Cómo le fue a la cuenta este mes, empezando por lo que funcionó, con los números clave y la comparación con el mes anterior. 2 a 4 oraciones.' },
    proximo_mes: { type: 'string', description: 'Qué vamos a hacer el mes que viene para seguir creciendo: potenciar lo que funcionó y mejorar lo que no. Concreto y basado en los datos. 1 o 2 oraciones.' },
  },
  required: ['resumen', 'proximo_mes'],
  additionalProperties: false,
} as const

const SYSTEM = `Escribís el resumen del reporte mensual de anuncios de Meta (Facebook e Instagram) que ViaStudio, una agencia de marketing de Reconquista (Argentina), le manda a su cliente.
Español rioplatense con voseo, cercano y claro, para un dueño de negocio que no sabe de marketing: nada de siglas (CTR, CPM, CPC) ni jerga.
Enfocate en lo que funcionó: arrancá por los logros del mes (los resultados conseguidos, el anuncio o la campaña que mejor anduvo, lo que mejoró respecto del mes anterior, a cuánta gente se llegó) y dales el protagonismo. Que se note el valor del trabajo sin sonar a venta ni exagerar: tono profesional y natural, sin superlativos vacíos ("¡excelente!", "increíble").
Si algo vino peor, no lo escondas pero tampoco lo pongas al frente: mencionalo en una frase, sin dramatizar, y llevalo a "proximo_mes" como lo que vamos a mejorar.
Usá solo los números que te pasan. No inventes causas que no se ven en los datos, no prometas resultados y nunca presentes como bueno algo que los números no respaldan.
Montos en pesos con punto de miles ($85.000) o en dólares como US$120.`

function fallbackSummary(d: ReportData) {
  const c = d.current
  const cpr = c.costPerResult ? `, a ${fmtMoney(c.costPerResult, d.account.currency)} cada una` : ''
  return {
    resumen: `En ${monthLabel(d.period)} invertimos ${fmtMoney(c.spend, d.account.currency)} y conseguimos ${c.results} ${d.resultLabel}${cpr}. Los anuncios llegaron a ${c.reach.toLocaleString('es-AR')} personas.`,
    proximo_mes: '',
  }
}

async function writeSummary(clientName: string, d: ReportData) {
  if (!process.env.ANTHROPIC_API_KEY || d.current.spend === 0) return fallbackSummary(d)
  const cur = d.account.currency
  const line = (label: string, m: ReportData['current']) =>
    `${label}: inversión ${fmtMoney(m.spend, cur)}, ${m.results} ${d.resultLabel}, costo por resultado ${m.costPerResult ? fmtMoney(m.costPerResult, cur) : '-'}, alcance ${m.reach} personas, ${m.clicks} clics al link, frecuencia ${m.frequency.toFixed(1)}`
  try {
    const client = new Anthropic({ timeout: 35_000, maxRetries: 0 })
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SUMMARY_SCHEMA } },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          `Cliente: ${clientName}. Mes del reporte: ${monthLabel(d.period)}. El resultado principal de sus anuncios son ${d.resultLabel}.`,
          line(`Este mes (${monthLabel(d.period)})`, d.current),
          line(`Mes anterior (${monthLabel(previousPeriod(d.period))})`, d.previous),
          d.campaigns.length ? `Campañas:\n${d.campaigns.map((c) => `- ${c.name}: ${fmtMoney(c.spend, cur)}, ${c.results} ${d.resultLabel}`).join('\n')}` : '',
          d.topAds.length ? `Mejores anuncios:\n${d.topAds.map((a) => `- ${a.name}: ${a.results} ${d.resultLabel}${a.costPerResult ? ` a ${fmtMoney(a.costPerResult, cur)}` : ''}`).join('\n')}` : '',
        ].filter(Boolean).join('\n\n'),
      }],
    } as Parameters<typeof client.beta.messages.create>[0])
    if (!('content' in response) || response.stop_reason === 'refusal') return fallbackSummary(d)
    const text = response.content.find((b) => b.type === 'text')
    if (!text || text.type !== 'text') return fallbackSummary(d)
    const parsed = JSON.parse(text.text) as { resumen: string; proximo_mes: string }
    return parsed.resumen ? parsed : fallbackSummary(d)
  } catch (error) {
    console.error('meta report summary', error)
    return fallbackSummary(d)
  }
}

// Creates (or rebuilds, while still a draft) the report of each client with a linked ad account
export async function buildReports(period: string, only?: string[]) {
  const clients = await prisma.client.findMany({
    where: { status: 'ACTIVE', metaAdAccountId: { not: null }, ...(only?.length && { id: { in: only } }) },
    orderBy: { company: 'asc' },
  })
  const built: { cliente: string; slug: string }[] = []
  const failed: { cliente: string; error: string }[] = []
  const skipped: string[] = []
  // A few at a time: one by one, ten clients would go past the request time limit
  const queue = [...clients]
  const worker = async () => {
    for (let c = queue.shift(); c; c = queue.shift()) await buildOne(c)
  }
  const buildOne = async (c: (typeof clients)[number]) => {
    const existing = await prisma.metaReport.findUnique({ where: { clientId_period: { clientId: c.id, period } } })
    if (existing && existing.status !== 'borrador') { skipped.push(c.company); return }
    try {
      const data = await accountReport(c.metaAdAccountId!, period)
      const s = await writeSummary(c.company, data)
      const summary = [s.resumen, s.proximo_mes].filter(Boolean).join('\n\n')
      const report = existing
        ? await prisma.metaReport.update({ where: { id: existing.id }, data: { data: data as unknown as object, summary } })
        : await prisma.metaReport.create({ data: { slug: randomBytes(9).toString('base64url'), clientId: c.id, period, data: data as unknown as object, summary } })
      built.push({ cliente: c.company, slug: report.slug })
    } catch (error) {
      failed.push({ cliente: c.company, error: error instanceof Error ? error.message : 'Error' })
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
  return { built, failed, skipped }
}

type Row = Awaited<ReturnType<typeof reportsOf>>[number]

async function reportsOf(period: string) {
  return prisma.metaReport.findMany({ where: { period }, include: { client: { include: { contacts: true } } }, orderBy: { client: { company: 'asc' } } })
}

// Who gets a client's report: the client's own WhatsApp plus every contact with a phone (e.g. owner and partner),
// each greeted by name. The same number only once
function recipients(client: Row['client']) {
  const people = [{ name: client.name, phone: phoneOf(client.phone) }, ...client.contacts.map((c) => ({ name: c.name, phone: phoneOf(c.phone) }))]
  return people.filter((p, i) => p.phone && people.findIndex((q) => q.phone === p.phone) === i)
}

const firstName = (name: string) => name.trim().split(/\s+/)[0]

function oneLine(r: Row) {
  const d = r.data as unknown as ReportData
  const c = d.current
  const delta = change(c.costPerResult ?? 0, d.previous.costPerResult ?? 0)
  const trend = c.costPerResult && delta !== null ? ` (${delta <= 0 ? '⬇️' : '⬆️'} ${Math.abs(delta)}% vs mes anterior)` : ''
  const res = c.spend ? `${fmtMoney(c.spend, d.account.currency)} → ${c.results} ${d.resultLabel}${c.costPerResult ? ` a ${fmtMoney(c.costPerResult, d.account.currency)}` : ''}${trend}` : 'sin inversión este mes'
  const to = recipients(r.client)
  return `• ${r.client.company}: ${res}${to.length > 1 ? ` (va a ${to.map((p) => firstName(p.name)).join(' y ')})` : ''}\n  ${reportUrl(r.slug)}`
}

export async function reportsProposal(period: string) {
  const reports = await reportsOf(period)
  const drafts = reports.filter((r) => r.status === 'borrador')
  if (!drafts.length) return { total: 0, mensaje: null }
  const noPhone = drafts.filter((r) => !recipients(r.client).length)
  return {
    total: drafts.length,
    mensaje: [
      `📊 Reportes de Meta de ${monthLabel(period)} listos (${drafts.length}). Revisalos:`,
      drafts.map(oneLine).join('\n'),
      noPhone.length ? `⚠️ Sin WhatsApp cargado: ${noPhone.map((r) => r.client.company).join(', ')}. Pasame el número para mandárselo.` : '',
      'Si están bien decime "mandalos" (o "menos X"). Si querés cambiar algo de un reporte, decime qué.',
    ].filter(Boolean).join('\n\n'),
  }
}

const phoneOf = waPhone

export function reportMessage(r: { slug: string; period: string }, name: string) {
  return `¡Hola ${firstName(name)}! 👋 Te paso el reporte de tus anuncios de ${monthLabel(r.period)}:\n\n${reportUrl(r.slug)}\n\nAhí vas a ver cuánto se invirtió, qué resultados trajo y qué hacemos el mes que viene. Cualquier duda, escribime.`
}

export async function sendReports(period: string, excluir: string[], matches: (q: string, ...f: string[]) => boolean) {
  const drafts = (await reportsOf(period)).filter((r) => r.status === 'borrador' && !excluir.some((q) => matches(q, r.client.company, r.client.name)))
  if (!drafts.length) throw new Error(`No hay reportes de ${monthLabel(period)} para mandar`)
  const sent: string[] = []
  const failed: string[] = []
  for (const r of drafts) {
    const to = recipients(r.client)
    if (!to.length) { failed.push(`${r.client.company} (sin teléfono)`); continue }
    const ok: string[] = []
    for (const p of to) {
      try {
        // Same chat state as a payment reminder: if the client replies, Juanba answers, not the sales bot
        await sendToLead(`${p.phone}@c.us`, reportMessage(r, p.name), 'cobro')
        ok.push(firstName(p.name))
      } catch {
        failed.push(`${r.client.company} (${firstName(p.name)})`)
      }
      await new Promise((res) => setTimeout(res, 1500))
    }
    if (ok.length) {
      await prisma.metaReport.update({ where: { id: r.id }, data: { status: 'enviado', sentAt: new Date() } })
      sent.push(to.length > 1 ? `${r.client.company} (${ok.join(' y ')})` : r.client.company)
    }
  }
  return { enviados: sent, fallaron: failed }
}

// Daily 7:00 run: in the first days of the month, if last month's reports weren't built yet, build them
// and send Juanba the list to review. Idempotent: once they exist it does nothing
export async function monthlyReportsCheck(now = new Date()) {
  const day = Number(now.toLocaleDateString('en-CA', { timeZone: TZ }).slice(8, 10))
  if (day > 5 || !metaConfigured()) return { enviado: false }
  const period = lastPeriod(now)
  // Per client: one report sent early (e.g. mid-month) must not stop everyone else's
  const missing = await prisma.client.findMany({
    where: { status: 'ACTIVE', metaAdAccountId: { not: null }, metaReports: { none: { period } } },
    select: { id: true },
  })
  if (!missing.length) return { enviado: false }
  const { failed } = await buildReports(period, missing.map((c) => c.id))
  const proposal = await reportsProposal(period)
  const errors = failed.length ? `\n\n⚠️ No pude armar: ${failed.map((f) => `${f.cliente} (${f.error})`).join(', ')}` : ''
  if (proposal.mensaje || errors) await notifyJuanba(`${proposal.mensaje ?? ''}${errors}`.trim())
  return { enviado: true, total: proposal.total }
}
