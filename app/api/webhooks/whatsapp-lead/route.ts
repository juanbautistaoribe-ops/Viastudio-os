import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'

export const maxDuration = 30

// Receives qualified leads from the n8n WhatsApp bot.
// Auth: header `x-webhook-secret` must match LEADS_WEBHOOK_SECRET.

type ServiceType =
  | 'SOCIAL_MEDIA' | 'PAID_ADS' | 'SEO' | 'CONTENT' | 'EMAIL'
  | 'BRANDING' | 'WEB' | 'CONSULTING' | 'STRATEGY'

// Bot service names → CRM services, monthly ARS value (0 = priced in USD, see notes) and tag
const SERVICES: { match: RegExp; services: ServiceType[]; value: number; tag: string }[] = [
  { match: /plan|contenido|redes/i, services: ['CONTENT', 'SOCIAL_MEDIA', 'PAID_ADS'], value: 400000, tag: 'plan-unico' },
  { match: /anuncio|ads|campa|publicidad/i, services: ['PAID_ADS'], value: 280000, tag: 'solo-anuncios' },
  { match: /web|p[aá]gina|sitio|landing|e-?commerce/i, services: ['WEB'], value: 0, tag: 'web' },
  { match: /brand|marca|logo/i, services: ['BRANDING'], value: 0, tag: 'branding' },
  { match: /bot|automatiz/i, services: [], value: 0, tag: 'chatbot' },
  { match: /consultor/i, services: ['CONSULTING', 'STRATEGY'], value: 150000, tag: 'consultoria' },
  { match: /desayuno|an[aá]lisis/i, services: ['STRATEGY'], value: 19000, tag: 'desayuno' },
]

function isAuthorized(req: NextRequest) {
  const expected = process.env.LEADS_WEBHOOK_SECRET
  const given = req.headers.get('x-webhook-secret')
  if (!expected || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// "$350.000 ARS/mes" → 350000
function parseAmount(text: string | undefined) {
  if (!text) return 0
  const match = text.replace(/\./g, '').replace(/,/g, '.').match(/\d+(\.\d+)?/)
  if (!match) return 0
  let value = parseFloat(match[0])
  if (/\b(k|mil)\b/i.test(text) && value < 10000) value *= 1000
  return value
}

function priorityFor(amount: number) {
  if (amount >= 400000) return 'HIGH'
  if (amount >= 150000) return 'MEDIUM'
  return 'LOW'
}

function str(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const phone = str(body.telefono).replace(/\D/g, '')
    const nombre = str(body.nombre) || 'Lead WhatsApp'
    if (!phone) return NextResponse.json({ error: 'telefono requerido' }, { status: 400 })

    // Complaints from current clients are not sales leads
    const tipo = str(body.tipo).toLowerCase() || 'venta'
    if (tipo === 'reclamo') return NextResponse.json({ ok: true, skipped: 'reclamo' })

    // New bot fields, with fallback to the previous handoff format
    const servicio = str(body.servicio)
    const rubro = str(body.rubro) || str(body.industria)
    const datosClave = str(body.datos_clave) || str(body.dolor)
    const inversion = str(body.inversion)
    const instagram = str(body.instagram).replace(/^@/, '')

    const matched = SERVICES.filter((s) => s.match.test(servicio))
    const services = Array.from(new Set(matched.flatMap((s) => s.services)))
    const serviceValue = Math.max(0, ...matched.map((s) => s.value))
    const amount = serviceValue || parseAmount(inversion)

    const today = new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
    const notes = [
      `🤖 ${tipo === 'desayuno' ? 'Pidió el Análisis Desayuno' : 'Calificado'} por el bot de WhatsApp (${today})`,
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

    // Same phone with an open lead → update it instead of duplicating
    const existing = await prisma.lead.findFirst({
      where: { phone, status: { notIn: ['WON', 'LOST'] } },
      orderBy: { createdAt: 'desc' },
    })

    const lead = existing
      ? await prisma.lead.update({
          where: { id: existing.id },
          data: {
            status: existing.status === 'NEW' || existing.status === 'CONTACTED' ? 'QUALIFIED' : existing.status,
            notes: existing.notes ? `${existing.notes}\n\n${notes}` : notes,
            nextAction,
            nextActionDate,
            ...(amount > 0 && { potentialValue: amount, priority: priorityFor(amount) }),
            ...(services.length > 0 && { services: Array.from(new Set([...existing.services, ...services])) }),
            ...(website && !existing.website && { website }),
            tags: Array.from(new Set([...existing.tags, ...tags])),
          },
        })
      : await prisma.lead.create({
          data: {
            name: nombre,
            company: str(body.negocio) || nombre,
            phone,
            website,
            status: 'QUALIFIED',
            source: 'ADS',
            priority: amount > 0 ? priorityFor(amount) : 'MEDIUM',
            potentialValue: amount,
            currency: 'ARS',
            notes,
            nextAction,
            nextActionDate,
            tags,
            services,
          },
        })

    // Activity feed needs a profile; attribute bot leads to the first (owner) profile
    if (!existing) {
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
