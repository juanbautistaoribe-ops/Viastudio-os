import { prisma } from '@/lib/prisma'

// Funnel of the WhatsApp sales bot per ad/service: conversations → qualified → won.
// Conversations come from bot_conversations (n8n), outcomes from leads tagged `whatsapp-bot`.

export const SOURCE_LABELS: Record<string, string> = {
  'web': 'Web',
  'plan-unico': 'Plan Único',
  'solo-anuncios': 'Solo anuncios',
  'branding': 'Branding',
  'chatbot': 'Chatbot',
  'consultoria': 'Consultoría',
  'desayuno': 'Desayuno',
  'general': 'Sin servicio claro',
}

// Same keywords the bot uses to pick the service from the ad's pre-filled message
export function sourceFromMessage(text: string) {
  const t = text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (/\b(web|pagina|sitio|estudio juridico)\b/.test(t)) return 'web'
  if (/\b(analisis|desayuno)\b|revisar mi instagram/.test(t)) return 'desayuno'
  if (/\b(anuncios?|publicidad|campanas?)\b/.test(t)) return 'solo-anuncios'
  if (/\b(contenido|redes|plan)\b/.test(t)) return 'plan-unico'
  if (/\b(marca|logo|branding)\b/.test(t)) return 'branding'
  if (/\b(bot|chatbot|automatizar)\b/.test(t)) return 'chatbot'
  if (/\bconsultoria\b/.test(t)) return 'consultoria'
  return 'general'
}

type Row = {
  fuente: string
  conversaciones: number
  derivados: number
  descartados: number
  frios: number
  ganados: number
  valor_ganado: { ARS: number; USD: number }
}

export async function botMetrics(from: Date, to: Date) {
  const [convs, leads] = await Promise.all([
    prisma.botConversation.findMany({ where: { createdAt: { gte: from, lt: to } } }),
    prisma.lead.findMany({ where: { tags: { has: 'whatsapp-bot' }, createdAt: { gte: from, lt: to } } }),
  ])
  const leadByPhone = new Map(leads.filter((l) => l.phone).map((l) => [l.phone as string, l]))

  const rows = new Map<string, Row>()
  const row = (source: string) => {
    if (!rows.has(source)) rows.set(source, { fuente: SOURCE_LABELS[source] ?? source, conversaciones: 0, derivados: 0, descartados: 0, frios: 0, ganados: 0, valor_ganado: { ARS: 0, USD: 0 } })
    return rows.get(source)!
  }

  for (const c of convs) {
    const r = row(c.source)
    r.conversaciones++
    const lead = leadByPhone.get(c.phone)
    if (c.qualifiedAt || lead) r.derivados++
    if (c.status === 'descartado') r.descartados++
    if (c.status === 'frio') r.frios++
    if (lead?.status === 'WON') {
      r.ganados++
      r.valor_ganado[lead.currency === 'USD' ? 'USD' : 'ARS'] += lead.potentialValue
    }
  }

  const list = [...rows.values()].sort((a, b) => b.conversaciones - a.conversaciones)
  const total = list.reduce((t, r) => ({
    ...t,
    conversaciones: t.conversaciones + r.conversaciones,
    derivados: t.derivados + r.derivados,
    descartados: t.descartados + r.descartados,
    frios: t.frios + r.frios,
    ganados: t.ganados + r.ganados,
    valor_ganado: { ARS: t.valor_ganado.ARS + r.valor_ganado.ARS, USD: t.valor_ganado.USD + r.valor_ganado.USD },
  }), { fuente: 'Total', conversaciones: 0, derivados: 0, descartados: 0, frios: 0, ganados: 0, valor_ganado: { ARS: 0, USD: 0 } } as Row)

  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
  return {
    desde: from,
    hasta: to,
    total: { ...total, tasa_derivacion: pct(total.derivados, total.conversaciones), tasa_cierre: pct(total.ganados, total.derivados) },
    por_fuente: list.map((r) => ({ ...r, tasa_derivacion: pct(r.derivados, r.conversaciones), tasa_cierre: pct(r.ganados, r.derivados) })),
  }
}
