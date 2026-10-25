import Anthropic from '@anthropic-ai/sdk'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { SERVICES, serviceFromText, type Service } from '@/lib/services'
import { getDolarBlue } from '@/lib/dolar'

export const APP_URL = process.env.APP_URL ?? 'https://viastudio-os.vercel.app'
const NOTIFY_URL = process.env.N8N_NOTIFY_URL ?? 'https://bot.viastudiobot.uk/webhook/viastudio-notify'

export type ProposalItem = Service & { precioLista: number }

export type ServiceInput = { servicio: string; precio?: number; moneda?: 'ARS' | 'USD' }

export function proposalUrl(slug: string) {
  return `${APP_URL}/p/${slug}`
}

function slug() {
  // 12 url-safe chars: hard to guess, short enough to share
  return randomBytes(9).toString('base64url')
}

export function buildItems(inputs: ServiceInput[]): ProposalItem[] {
  return inputs.map((i) => {
    const key = serviceFromText(i.servicio)
    if (!key) throw new Error(`No reconozco el servicio "${i.servicio}"`)
    const s = SERVICES[key]
    return {
      ...s,
      precioLista: s.precio,
      precio: typeof i.precio === 'number' && i.precio > 0 ? i.precio : s.precio,
      moneda: i.moneda ?? s.moneda,
    }
  })
}

// WhatsApp message to Juanba through the n8n notify webhook; never blocks the caller
export async function notifyJuanba(message: string) {
  try {
    await fetch(NOTIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-secret': process.env.LEADS_WEBHOOK_SECRET ?? '' },
      body: JSON.stringify({ message }),
    })
  } catch (error) {
    console.error('notifyJuanba', error)
  }
}

type Copy = { titulo: string; diagnostico: string; solucion: string }

const COPY_SCHEMA = {
  type: 'object',
  properties: {
    titulo: { type: 'string', description: 'Título corto de la propuesta, ej. "Tu tienda online lista para vender"' },
    diagnostico: { type: 'string', description: 'Lo que el cliente nos contó: su situación y lo que quiere resolver. 2 a 4 oraciones.' },
    solucion: { type: 'string', description: 'Cómo lo resolvemos con los servicios propuestos y por qué le sirven. 2 a 4 oraciones.' },
  },
  required: ['titulo', 'diagnostico', 'solucion'],
  additionalProperties: false,
} as const

const SYSTEM = `Redactás propuestas comerciales para ViaStudio, una agencia de marketing digital y automatización de Reconquista, Santa Fe (Argentina), fundada por Juanba.
Escribís en español rioplatense con voseo, cercano y profesional, dirigido al cliente ("vos"). Oraciones claras, sin relleno ni frases de marketing vacías.
Usá solo la información que te pasan sobre el cliente. No inventes datos del negocio, números, resultados ni promesas (nada de "vas a duplicar tus ventas"). Si falta información, escribí en términos generales sin inventar.
No menciones precios ni plazos en estos textos: van en otra sección.`

// Writes the diagnosis/solution copy with Claude; falls back to a plain template if the API is unavailable
export async function writeCopy(input: { nombre: string; negocio?: string | null; contexto: string; items: ProposalItem[]; notas?: string }): Promise<Copy> {
  const fallback: Copy = {
    titulo: `Propuesta para ${input.negocio || input.nombre}`,
    diagnostico: input.notas || (input.contexto ? `Nos contaste: ${input.contexto.split('\n').filter((l) => /^(Datos clave|Dolor|Rubro|Servicio):/.test(l)).join(' ')}` : '') || `Gracias por contarnos sobre ${input.negocio || 'tu negocio'}.`,
    solucion: `Te proponemos ${input.items.map((i) => i.nombre).join(' + ')}. ${input.items.map((i) => i.descripcion).join(' ')}`,
  }
  if (!process.env.ANTHROPIC_API_KEY) return fallback

  try {
    const client = new Anthropic()
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: COPY_SCHEMA } },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          `Cliente: ${input.nombre}${input.negocio ? ` (${input.negocio})` : ''}`,
          `Lo que sabemos del cliente (de la charla con el bot y con Juanba):\n${input.contexto || '(sin detalle)'}`,
          input.notas ? `Notas de Juanba para esta propuesta: ${input.notas}` : '',
          `Servicios propuestos:\n${input.items.map((i) => `- ${i.nombre}: ${i.descripcion} Incluye: ${i.entregables.join('; ')}.`).join('\n')}`,
          'Escribí el título, el diagnóstico y la solución.',
        ].filter(Boolean).join('\n\n'),
      }],
    } as Parameters<typeof client.beta.messages.create>[0])
    if (!('content' in response) || response.stop_reason === 'refusal') return fallback
    const text = response.content.find((b) => b.type === 'text')
    if (!text || text.type !== 'text') return fallback
    const parsed = JSON.parse(text.text) as Copy
    return parsed.diagnostico && parsed.solucion ? parsed : fallback
  } catch (error) {
    console.error('writeCopy', error)
    return fallback
  }
}

export async function createProposal(input: {
  leadId?: string
  nombre?: string
  negocio?: string
  servicios: ServiceInput[]
  plazo?: string
  notas?: string
  formaDePago?: string
  validezDias?: number
}) {
  const lead = input.leadId ? await prisma.lead.findUnique({ where: { id: input.leadId } }) : null
  if (input.leadId && !lead) throw new Error('Lead no encontrado')
  const nombre = input.nombre || lead?.name
  if (!nombre) throw new Error('Falta el nombre del cliente')
  const negocio = input.negocio || (lead?.company && lead.company !== lead.name ? lead.company : null)
  if (!input.servicios?.length) throw new Error('Falta al menos un servicio')

  const items = buildItems(input.servicios)
  const blue = items.some((i) => i.moneda === 'USD') ? (await getDolarBlue())?.venta ?? null : null
  const copy = await writeCopy({ nombre, negocio, contexto: lead?.notes?.slice(-1500) ?? '', items, notas: input.notas })

  const proposal = await prisma.proposal.create({
    data: {
      slug: slug(),
      leadId: lead?.id ?? null,
      clientName: nombre,
      business: negocio,
      items: items as unknown as object,
      diagnosis: copy.diagnostico,
      solution: copy.solucion,
      timeline: input.plazo || null,
      paymentTerms: input.formaDePago || null,
      notes: copy.titulo,
      exchangeRate: blue,
      validUntil: new Date(Date.now() + (input.validezDias ?? 7) * 24 * 60 * 60 * 1000),
    },
  })
  return proposal
}

export function money(amount: number, currency: string) {
  return currency === 'USD'
    ? `US$${new Intl.NumberFormat('en-US').format(amount)}`
    : `$${new Intl.NumberFormat('es-AR').format(Math.round(amount))}`
}

export function proposalSummary(p: { slug: string; clientName: string; business: string | null; items: unknown; status: string; viewCount: number; validUntil: Date | null }) {
  const items = (p.items as ProposalItem[]) ?? []
  return {
    cliente: `${p.clientName}${p.business ? ` (${p.business})` : ''}`,
    servicios: items.map((i) => `${i.nombre}: ${money(i.precio, i.moneda)}${i.modalidad === 'mensual' ? '/mes' : ''}${i.mantenimiento ? ` + US$${i.mantenimiento}/mes de mantenimiento` : ''}`),
    estado: p.status,
    vistas: p.viewCount,
    valida_hasta: p.validUntil,
    link: proposalUrl(p.slug),
  }
}
