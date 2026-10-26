import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isWebhookAuthorized } from '@/lib/webhook-auth'

export const maxDuration = 30

// Receives qualified leads (and post-handoff notes) from the n8n WhatsApp bot.

type ServiceType =
  | 'SOCIAL_MEDIA' | 'PAID_ADS' | 'SEO' | 'CONTENT' | 'EMAIL'
  | 'BRANDING' | 'WEB' | 'CONSULTING' | 'STRATEGY'
type Priority = 'HIGH' | 'MEDIUM' | 'LOW'

// Lead priority per service — what pays off best for the agency, not the ticket size. Edit freely.
const PRIORIDAD: Record<string, Priority> = {
  'web': 'HIGH',
  'chatbot': 'HIGH',
  'plan-unico': 'HIGH',
  'branding': 'MEDIUM',
  'solo-anuncios': 'MEDIUM',
  'consultoria': 'MEDIUM',
  'desayuno': 'LOW',
}

// Bot service names → CRM services and list price (the real price is negotiated later in the CRM)
const SERVICES: { match: RegExp; tag: string; services: ServiceType[]; value: number; currency: 'ARS' | 'USD' }[] = [
  { match: /plan|contenido|redes/i, tag: 'plan-unico', services: ['CONTENT', 'SOCIAL_MEDIA', 'PAID_ADS'], value: 400000, currency: 'ARS' },
  { match: /anuncio|\bads\b|campa|publicidad/i, tag: 'solo-anuncios', services: ['PAID_ADS'], value: 280000, currency: 'ARS' },
  { match: /web|p[aá]gina|sitio|landing|e-?commerce|tienda/i, tag: 'web', services: ['WEB'], value: 350, currency: 'USD' },
  { match: /brand|marca|logo/i, tag: 'branding', services: ['BRANDING'], value: 500, currency: 'USD' },
  { match: /bot|automatiz/i, tag: 'chatbot', services: [], value: 420, currency: 'USD' },
  { match: /consultor/i, tag: 'consultoria', services: ['CONSULTING', 'STRATEGY'], value: 150000, currency: 'ARS' },
  { match: /desayuno|an[aá]lisis/i, tag: 'desayuno', services: ['STRATEGY'], value: 19000, currency: 'ARS' },
]
const WEB_COMPLEJA_USD = 700

const RANK: Record<Priority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 }

// "$350.000 ARS/mes" → 350000
function parseAmount(text: string | undefined) {
  if (!text) return 0
  const match = text.replace(/\./g, '').replace(/,/g, '.').match(/\d+(\.\d+)?/)
  if (!match) return 0
  let value = parseFloat(match[0])
  if (/\b(k|mil)\b/i.test(text) && value < 10000) value *= 1000
  return value
}

function priorityForAmount(amount: number): Priority {
  if (amount >= 400000) return 'HIGH'
  if (amount >= 150000) return 'MEDIUM'
  return 'LOW'
}

function str(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function today() {
  return new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
}

// Main service of the lead: highest priority, then highest list price
function pickMain(servicio: string, datosClave: string) {
  const matched = SERVICES.filter((s) => s.match.test(servicio))
  const main = [...matched].sort((a, b) =>
    RANK[PRIORIDAD[b.tag] ?? 'MEDIUM'] - RANK[PRIORIDAD[a.tag] ?? 'MEDIUM'] || b.value - a.value)[0]
  if (!main) return { matched, main: null }
  const value = main.tag === 'web' && /venta online|e-?commerce|tienda/i.test(`${servicio} ${datosClave}`)
    ? WEB_COMPLEJA_USD
    : main.value
  return { matched, main: { ...main, value, priority: PRIORIDAD[main.tag] ?? 'MEDIUM' as Priority } }
}

export async function POST(req: NextRequest) {
  if (!isWebhookAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const phone = str(body.telefono).replace(/\D/g, '')
    if (!phone) return NextResponse.json({ error: 'telefono requerido' }, { status: 400 })

    const tipo = str(body.tipo).toLowerCase() || 'venta'

    // Complaints from current clients are not sales leads
    if (tipo === 'reclamo') return NextResponse.json({ ok: true, skipped: 'reclamo' })

    // A cold lead (LOST + "frio") that comes back is the same lead, not a new one
    const existing = await prisma.lead.findFirst({
      where: { phone, OR: [{ status: { notIn: ['WON', 'LOST'] } }, { status: 'LOST', tags: { has: 'frio' } }] },
      orderBy: { createdAt: 'desc' },
    })

    // Post-handoff news ("le parece caro", "tiene apuro"...) → appended to the open lead
    if (tipo === 'nota') {
      if (!existing) return NextResponse.json({ ok: true, skipped: 'sin lead abierto' })
      const nota = `📝 Novedad del bot (${today()}): ${str(body.nota)}`
      await prisma.lead.update({
        where: { id: existing.id },
        data: { notes: existing.notes ? `${existing.notes}\n\n${nota}` : nota },
      })
      return NextResponse.json({ ok: true, id: existing.id, updated: true })
    }

    // New bot fields, with fallback to the previous handoff format
    const nombre = str(body.nombre) || 'Lead WhatsApp'
    const servicio = str(body.servicio)
    const rubro = str(body.rubro) || str(body.industria)
    const datosClave = str(body.datos_clave) || str(body.dolor)
    const inversion = str(body.inversion)
    const instagram = str(body.instagram).replace(/^@/, '')

    const { matched, main } = pickMain(servicio, datosClave)
    const services = Array.from(new Set(matched.flatMap((s) => s.services)))
    const amount = main ? main.value : parseAmount(inversion)
    const currency = main ? main.currency : 'ARS'
    const priority: Priority = main ? main.priority : amount > 0 ? priorityForAmount(amount) : 'MEDIUM'

    const notes = [
      `🤖 ${tipo === 'desayuno' ? 'Pidió el Análisis Desayuno' : 'Calificado'} por el bot de WhatsApp (${today()})`,
      servicio && `Servicio: ${servicio}`,
      rubro && `Rubro: ${rubro}`,
      str(body.ciudad) && `Ciudad: ${str(body.ciudad)}`,
      instagram && `Instagram: @${instagram}`,
      inversion && `Inversión: ${inversion}`,
      datosClave && `Datos clave: ${datosClave}`,
      body.probo_antes && `Probó antes: ${str(body.probo_antes)}`,
      body.extra && `Notas: ${str(body.extra)}`,
      `WhatsApp: https://wa.me/${phone}`,
    ].filter(Boolean).join('\n')

    const nextAction = tipo === 'desayuno' ? 'Pasarle datos de pago del Análisis Desayuno' : 'Escribirle para avanzar con la propuesta'
    const nextActionDate = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const tags = Array.from(new Set([
      'whatsapp-bot',
      ...matched.map((s) => s.tag),
      rubro.toLowerCase(),
    ].filter(Boolean)))
    const website = instagram ? `https://instagram.com/${instagram}` : null

    let lead
    if (existing) {
      // An update never downgrades the lead: value/priority only change if the new service ranks higher
      const existingRank = RANK[existing.priority as Priority] ?? 1
      const upgrade = RANK[priority] > existingRank || (existing.potentialValue === 0 && amount > 0)
      lead = await prisma.lead.update({
        where: { id: existing.id },
        data: {
          status: ['NEW', 'CONTACTED', 'LOST'].includes(existing.status) ? 'QUALIFIED' : existing.status,
          notes: existing.notes ? `${existing.notes}\n\n${notes}` : notes,
          nextAction,
          nextActionDate,
          ...(upgrade && { potentialValue: amount, currency, priority }),
          ...(services.length > 0 && { services: Array.from(new Set([...existing.services, ...services])) }),
          ...(website && !existing.website && { website }),
          tags: Array.from(new Set([...existing.tags.filter((t) => t !== 'frio'), ...tags])),
        },
      })
    } else {
      lead = await prisma.lead.create({
        data: {
          name: nombre,
          company: str(body.negocio) || nombre,
          phone,
          website,
          status: 'QUALIFIED',
          source: 'ADS',
          priority,
          potentialValue: amount,
          currency,
          notes,
          nextAction,
          nextActionDate,
          tags,
          services,
        },
      })

      // Activity feed needs a profile; attribute bot leads to the first (owner) profile
      const owner = await prisma.profile.findFirst({ orderBy: { createdAt: 'asc' } })
      if (owner) {
        await prisma.activity.create({
          data: {
            type: 'LEAD_CREATED',
            title: `Nuevo lead (bot WhatsApp): ${lead.company}`,
            userId: owner.id,
            entityId: lead.id,
            entityType: 'lead',
          },
        }).catch(() => {})
      }
    }

    return NextResponse.json({ ok: true, id: lead.id, updated: !!existing }, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
