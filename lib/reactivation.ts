import { prisma } from '@/lib/prisma'
import { notifyJuanba, sendToLead } from '@/lib/proposals'
import { serviceFromText, type ServiceKey } from '@/lib/services'

// Cold leads: people who talked to the bot and stopped answering after the follow-ups ("frio",
// stored as LOST so they don't inflate the pipeline) and open leads with no movement in weeks.
// Once a month Juanba gets the list; nothing is sent until he approves it.

const TZ = 'America/Argentina/Buenos_Aires'
const STALE_DAYS = 21 // open lead without changes for this long counts as cold
const FRIO_MIN_DAYS = 10 // give a chat that just went cold some rest before writing again
const COOLDOWN_DAYS = 60 // never reactivate the same lead twice within this window
const MAX_REACTIVATIONS = 2 // per lead, ever
const MAX_BATCH = 20 // WhatsApp blocks numbers that send in bursts
const REPLY_WINDOW_DAYS = 30 // a message within this window after a reactivation counts as a reply
const EXCLUDED_PHONES = (process.env.BOT_EXCLUDED_PHONES ?? '5493482323255').split(',').map((p) => p.trim())

const DAY = 24 * 60 * 60 * 1000
const REAC_TAG = /^reac-(\d{4}-\d{2}-\d{2})$/

const TEMA: Record<ServiceKey, string> = {
  'plan-unico': 'el manejo de tus redes',
  'solo-anuncios': 'los anuncios en Instagram y Facebook',
  'web-estandar': 'tu página web',
  'web-compleja': 'tu tienda online',
  'branding': 'la identidad de tu marca',
  'chatbot': 'un chatbot para tu WhatsApp',
  'consultoria': 'la consultoría de marketing',
  'desayuno': 'el Análisis Desayuno de tu Instagram',
}
const TAG_TO_SERVICE: Record<string, ServiceKey> = {
  'plan-unico': 'plan-unico', 'solo-anuncios': 'solo-anuncios', 'web': 'web-estandar', 'branding': 'branding', 'chatbot': 'chatbot', 'consultoria': 'consultoria', 'desayuno': 'desayuno',
}
const SERVICE_TAG: Record<ServiceKey, string> = {
  'plan-unico': 'plan-unico', 'solo-anuncios': 'solo-anuncios', 'web-estandar': 'web', 'web-compleja': 'web', 'branding': 'branding', 'chatbot': 'chatbot', 'consultoria': 'consultoria', 'desayuno': 'desayuno',
}
const ENUM_TO_SERVICE: Record<string, ServiceKey> = {
  WEB: 'web-estandar', BRANDING: 'branding', CONSULTING: 'consultoria', PAID_ADS: 'solo-anuncios', CONTENT: 'plan-unico', SOCIAL_MEDIA: 'plan-unico',
}

type Lead = NonNullable<Awaited<ReturnType<typeof prisma.lead.findFirst>>>

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ })
const shortDate = (d: Date) => d.toLocaleDateString('es-AR', { timeZone: TZ, day: 'numeric', month: 'numeric' })
const digits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '')

function reactivationDates(lead: Lead) {
  return lead.tags.map((t) => t.match(REAC_TAG)?.[1]).filter(Boolean).map((d) => new Date(`${d}T12:00:00-03:00`))
}

function serviceOf(lead: Lead): ServiceKey | null {
  for (const t of lead.tags) if (TAG_TO_SERVICE[t]) return TAG_TO_SERVICE[t]
  for (const s of lead.services) if (ENUM_TO_SERVICE[s]) return ENUM_TO_SERVICE[s]
  return serviceFromText(lead.notes ?? '')
}

// "Lead WhatsApp" or a bare number is not a name to greet with
function firstName(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? ''
  return /^(lead|whatsapp|\+?\d+)$/i.test(first) ? '' : first
}

export function reactivationMessage(lead: Lead, template?: string) {
  const service = serviceOf(lead)
  const nombre = firstName(lead.name)
  const tema = service ? TEMA[service] : ''
  if (template) {
    return template.replace(/\{nombre\}/g, nombre).replace(/\{tema\}/g, tema || 'tu negocio').replace(/ +([,!?])/g, '$1').trim()
  }
  return [
    `¡Hola${nombre ? ` ${nombre}` : ''}! 👋 ¿Cómo va? Te escribo de ViaStudio: hace un tiempo ${tema ? `nos consultaste por ${tema}` : 'hablamos sobre tu negocio'}.`,
    '¿Lo seguís pensando? Si querés lo retomamos: contame en qué quedaste y vemos la mejor opción para vos.',
  ].join(' ')
}

export async function coldCandidates(now = new Date()) {
  const leads = await prisma.lead.findMany({
    where: {
      phone: { not: null },
      clientId: null,
      OR: [
        { status: 'LOST', tags: { has: 'frio' }, updatedAt: { lt: new Date(now.getTime() - FRIO_MIN_DAYS * DAY) } },
        { status: { in: ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'] }, updatedAt: { lt: new Date(now.getTime() - STALE_DAYS * DAY) } },
      ],
    },
    orderBy: [{ potentialValue: 'desc' }, { updatedAt: 'desc' }],
  })
  // A proposal still being followed up is not cold
  const liveProposals = await prisma.proposal.findMany({
    where: { leadId: { in: leads.map((l) => l.id) }, status: { in: ['enviada', 'vista'] }, sentAt: { gte: new Date(now.getTime() - 30 * DAY) } },
    select: { leadId: true },
  })
  const withProposal = new Set(liveProposals.map((p) => p.leadId))
  return leads
    .filter((l) => {
      if (EXCLUDED_PHONES.includes(digits(l.phone)) || withProposal.has(l.id) || l.tags.includes('no-reactivar')) return false
      const dates = reactivationDates(l)
      return dates.length < MAX_REACTIVATIONS && dates.every((d) => now.getTime() - d.getTime() > COOLDOWN_DAYS * DAY)
    })
    .slice(0, MAX_BATCH)
}

function describe(lead: Lead) {
  const service = serviceOf(lead)
  const who = lead.company && lead.company !== lead.name ? `${lead.name} (${lead.company})` : lead.name
  const estado = lead.tags.includes('frio') ? 'no respondió al bot' : `${lead.status.toLowerCase()}, sin movimiento`
  return `• ${who}${service ? ` · ${TEMA[service]}` : ''} · ${estado} desde el ${shortDate(lead.updatedAt)}`
}

// Results of the reactivations sent in the last `days` days
export async function reactivationReport(days = 45, now = new Date()) {
  const leads = await prisma.lead.findMany({ where: { tags: { has: 'reactivado' } } })
  const recent = leads.filter((l) => reactivationDates(l).some((d) => now.getTime() - d.getTime() <= days * DAY))
  const replied = recent.filter((l) => l.tags.includes('reac-respondio'))
  return {
    enviados: recent.length,
    respondieron: replied.length,
    quienes_respondieron: replied.map((l) => l.name),
    sin_respuesta: recent.filter((l) => !l.tags.includes('reac-respondio')).map((l) => l.name),
  }
}

export async function reactivationProposal() {
  const leads = await coldCandidates()
  if (!leads.length) return { total: 0, mensaje: null }
  const last = await reactivationReport(45)
  const ejemplo = reactivationMessage(leads[0])
  const mensaje = [
    `❄️ Reactivación de leads fríos: ${leads.length === 1 ? 'encontré 1 persona que habló' : `encontré ${leads.length} personas que hablaron`} con nosotros y ${leads.length === 1 ? 'quedó' : 'quedaron'} sin cerrar:`,
    leads.map(describe).join('\n'),
    `Les mandaría un mensaje así, con su nombre y lo que consultó:\n\n"${ejemplo}"`,
    last.enviados ? `La última tanda: ${last.enviados} enviados, ${last.respondieron} respondieron.` : '',
    'Si está bien decime "mandales". Podés sacar a alguno ("mandales menos Ana") o pasarme otro texto.',
  ].filter(Boolean).join('\n\n')
  return { total: leads.length, mensaje, leads: leads.map((l) => ({ id: l.id, nombre: l.name, empresa: l.company, mensaje: reactivationMessage(l) })) }
}

// First Monday of the month (called every morning by n8n): sends Juanba the list to approve
export async function monthlyReactivationCheck(now = new Date()) {
  const local = new Date(now.toLocaleString('en-US', { timeZone: TZ }))
  if (local.getDay() !== 1 || local.getDate() > 7) return { enviado: false }
  const proposal = await reactivationProposal()
  if (!proposal.mensaje) return { enviado: false }
  await notifyJuanba(proposal.mensaje)
  return { enviado: true, total: proposal.total }
}

export async function sendReactivation(opts: { excluir?: string[]; mensaje?: string }, matches: (q: string, ...f: string[]) => boolean) {
  const excluded = (opts.excluir ?? []).filter(Boolean)
  const leads = (await coldCandidates()).filter((l) => !excluded.some((q) => matches(q, l.name, l.company)))
  if (!leads.length) throw new Error('No hay leads fríos para reactivar')

  const owner = await prisma.profile.findFirst({ orderBy: { createdAt: 'asc' } })
  const day = today()
  const sent: string[] = []
  const failed: string[] = []
  for (const lead of leads) {
    const text = reactivationMessage(lead, opts.mensaje)
    try {
      await sendToLead(`${digits(lead.phone)}@c.us`, text, 'reactivacion')
    } catch {
      failed.push(lead.name)
      continue
    }
    sent.push(lead.name)
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        tags: Array.from(new Set([...lead.tags, 'reactivado', `reac-${day}`])),
        notes: `${lead.notes ?? ''}\n\n↻ ${shortDate(new Date())}: reactivación enviada por WhatsApp: "${text}"`.trim(),
      },
    })
    if (owner) {
      await prisma.activity.create({
        data: { type: 'COMMENT_ADDED', title: `Reactivación enviada: ${lead.company || lead.name}`, userId: owner.id, entityId: lead.id, entityType: 'lead' },
      }).catch(() => {})
    }
    // Space the messages out (Green API also queues them)
    await new Promise((r) => setTimeout(r, 1500))
  }
  return { enviados: sent.length, a_quienes: sent, fallidos: failed, excluidos: excluded }
}

// The bot gave up on a chat (3 follow-ups without an answer): it goes to Leads as a cold lead
export async function registerColdChat(input: { phone: string; nombre?: string; textoLead?: string; textoBot?: string }) {
  const phone = digits(input.phone)
  if (!phone || EXCLUDED_PHONES.includes(phone)) return { skipped: true }
  const existing = await prisma.lead.findFirst({ where: { phone: { endsWith: phone.slice(-10) } }, orderBy: { createdAt: 'desc' } })
  if (existing) return { skipped: true, id: existing.id }

  const service = serviceFromText(`${input.textoLead ?? ''} ${input.textoBot ?? ''}`)
  const nombre = input.nombre?.trim() || `WhatsApp ${phone}`
  const lead = await prisma.lead.create({
    data: {
      name: nombre,
      company: nombre,
      phone,
      status: 'LOST',
      source: 'ADS',
      priority: 'LOW',
      potentialValue: 0,
      currency: 'ARS',
      tags: ['whatsapp-bot', 'frio', ...(service ? [SERVICE_TAG[service]] : [])],
      notes: [
        `❄️ Habló con el bot de WhatsApp y dejó de responder después de los seguimientos (${shortDate(new Date())}).`,
        input.textoLead && `Su último mensaje: "${input.textoLead.slice(0, 300)}"`,
        input.textoBot && `Lo último que le dijo el bot: "${input.textoBot.slice(0, 300)}"`,
        `WhatsApp: https://wa.me/${phone}`,
      ].filter(Boolean).join('\n'),
    },
  })
  const owner = await prisma.profile.findFirst({ orderBy: { createdAt: 'asc' } })
  if (owner) {
    await prisma.activity.create({
      data: { type: 'LEAD_LOST', title: `Lead frío del bot: ${nombre}`, userId: owner.id, entityId: lead.id, entityType: 'lead' },
    }).catch(() => {})
  }
  return { created: true, id: lead.id }
}

// A message from a recently reactivated lead: back into the pipeline and Juanba finds out
export async function registerReactivationReply(phone: string, text: string, now = new Date()) {
  const p = digits(phone)
  if (!p) return null
  const lead = await prisma.lead.findFirst({
    where: { phone: { endsWith: p.slice(-10) }, tags: { has: 'reactivado' }, NOT: { tags: { has: 'reac-respondio' } } },
    orderBy: { updatedAt: 'desc' },
  })
  if (!lead) return null
  const last = Math.max(...reactivationDates(lead).map((d) => d.getTime()))
  if (!Number.isFinite(last) || now.getTime() - last > REPLY_WINDOW_DAYS * DAY) return null

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: lead.status === 'LOST' ? 'CONTACTED' : lead.status,
      tags: Array.from(new Set([...lead.tags.filter((t) => t !== 'frio'), 'reac-respondio'])),
      notes: `${lead.notes ?? ''}\n\n💬 ${shortDate(now)}: respondió a la reactivación: "${text.slice(0, 300)}"`.trim(),
      nextAction: 'Respondió a la reactivación: seguir la conversación',
      nextActionDate: now,
    },
  })
  const owner = await prisma.profile.findFirst({ orderBy: { createdAt: 'asc' } })
  if (owner) {
    await prisma.activity.create({
      data: { type: 'COMMENT_ADDED', title: `Respondió a la reactivación: ${lead.company || lead.name}`, userId: owner.id, entityId: lead.id, entityType: 'lead' },
    }).catch(() => {})
  }
  await notifyJuanba(`🔥 ${lead.name}${lead.company && lead.company !== lead.name ? ` (${lead.company})` : ''} respondió a la reactivación:\n\n"${text.slice(0, 300)}"\n\nEl bot ya le está respondiendo. Lo pasé a Contactado en Leads.\nwa.me/${p}`)
  return { id: lead.id }
}
