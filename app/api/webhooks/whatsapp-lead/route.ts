import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'

export const maxDuration = 30

// Receives qualified leads from the n8n WhatsApp bot.
// Auth: header `x-webhook-secret` must match LEADS_WEBHOOK_SECRET.

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

    const amount = parseAmount(str(body.inversion))
    const today = new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
    const notes = [
      `🤖 Calificado por el bot de WhatsApp (${today})`,
      body.industria && `Rubro: ${str(body.industria)}`,
      body.dolor && `Dolor: ${str(body.dolor)}`,
      body.inversion && `Inversión: ${str(body.inversion)}`,
      body.probo_antes && `Probó antes: ${str(body.probo_antes)}`,
      body.extra && `Notas: ${str(body.extra)}`,
      `WhatsApp: https://wa.me/${phone}`,
    ].filter(Boolean).join('\n')

    const nextActionDate = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const tags = ['whatsapp-bot', str(body.industria).toLowerCase()].filter(Boolean)

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
            nextAction: 'Llamar para coordinar propuesta',
            nextActionDate,
            ...(amount > 0 && { potentialValue: amount, priority: priorityFor(amount) }),
            tags: Array.from(new Set([...existing.tags, ...tags])),
          },
        })
      : await prisma.lead.create({
          data: {
            name: nombre,
            company: str(body.negocio) || nombre,
            phone,
            status: 'QUALIFIED',
            source: 'ADS',
            priority: priorityFor(amount),
            potentialValue: amount,
            currency: 'ARS',
            notes,
            nextAction: 'Llamar para coordinar propuesta',
            nextActionDate,
            tags,
            services: [],
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
