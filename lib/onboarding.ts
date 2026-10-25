import { prisma } from '@/lib/prisma'
import { notifyJuanba, type ProposalItem } from '@/lib/proposals'
import { SERVICES, type ServiceKey } from '@/lib/services'

// Kickoff for a won lead: starter tasks per service (created right away) and a welcome message
// draft for the client that Juanba approves before the bot sends it.

type Step = { title: string; day: number }

const STEPS: Record<ServiceKey, Step[]> = {
  'plan-unico': [
    { title: 'Pedir accesos: Meta Business Manager, cuenta publicitaria e Instagram', day: 0 },
    { title: 'Reunión de arranque: objetivos, público y estilo', day: 1 },
    { title: 'Armar estrategia y calendario de contenido del primer mes', day: 3 },
    { title: 'Primeros guiones y coordinar la grabación', day: 4 },
    { title: 'Configurar y lanzar las primeras campañas', day: 6 },
  ],
  'solo-anuncios': [
    { title: 'Pedir accesos: Meta Business Manager y cuenta publicitaria', day: 0 },
    { title: 'Reunión de arranque: objetivos, público y presupuesto de pauta', day: 1 },
    { title: 'Diseñar los primeros 3 creativos', day: 3 },
    { title: 'Configurar y lanzar las campañas', day: 4 },
  ],
  'web-estandar': [
    { title: 'Pedir logo, fotos, textos y acceso al dominio', day: 0 },
    { title: 'Reunión de arranque: secciones y referencias', day: 1 },
    { title: 'Presentar el diseño de la web', day: 5 },
    { title: 'Desarrollar, revisar con el cliente y publicar', day: 10 },
  ],
  'web-compleja': [
    { title: 'Pedir logo, fotos, catálogo de productos, medios de pago y acceso al dominio', day: 0 },
    { title: 'Reunión de arranque: productos, envíos y pagos', day: 1 },
    { title: 'Presentar el diseño de la tienda', day: 5 },
    { title: 'Cargar productos, configurar pagos y publicar', day: 12 },
  ],
  'branding': [
    { title: 'Enviar el cuestionario de marca (brief)', day: 0 },
    { title: 'Reunión de arranque: valores, público y referencias', day: 1 },
    { title: 'Presentar las primeras propuestas de logo', day: 6 },
    { title: 'Entregar el manual de marca', day: 10 },
  ],
  'chatbot': [
    { title: 'Pedir info del negocio: servicios, precios, preguntas frecuentes y número de WhatsApp', day: 0 },
    { title: 'Crear la instancia de Green API y configurar el bot con la plantilla', day: 2 },
    { title: 'Pruebas con el cliente y ajustes', day: 4 },
    { title: 'Activar el bot y explicarle cómo usarlo', day: 5 },
  ],
  'consultoria': [
    { title: 'Agendar el día y horario fijo de la reunión semanal', day: 0 },
    { title: 'Diagnóstico inicial: métricas, redes y objetivos', day: 1 },
  ],
  'desayuno': [
    { title: 'Hacer el Análisis Desayuno del Instagram', day: 0 },
    { title: 'Enviar el análisis y proponer próximos pasos', day: 1 },
  ],
}

// What the client has to send, for the welcome message
const NEEDS: Partial<Record<ServiceKey, string>> = {
  'plan-unico': 'los accesos a tu Instagram y a Meta Business (te paso cómo darlos)',
  'solo-anuncios': 'el acceso a Meta Business y a la cuenta publicitaria (te paso cómo darlos)',
  'web-estandar': 'tu logo, algunas fotos, los textos que quieras incluir y los datos del dominio si ya tenés uno',
  'web-compleja': 'tu logo, fotos de los productos con sus precios, los medios de pago que usás y los datos del dominio si ya tenés uno',
  'branding': 'algunas respuestas sobre tu marca (te mando un cuestionario cortito)',
  'chatbot': 'la info de tu negocio (servicios, precios, preguntas que te hacen siempre) y el número de WhatsApp donde va a funcionar el bot',
  'consultoria': 'qué día y horario te queda cómodo para la reunión semanal',
  'desayuno': 'el @ de tu Instagram (si no me lo pasaste ya)',
}

const ENUM_TO_SERVICE: Record<string, ServiceKey> = {
  WEB: 'web-estandar', BRANDING: 'branding', CONSULTING: 'consultoria', PAID_ADS: 'solo-anuncios', CONTENT: 'plan-unico', SOCIAL_MEDIA: 'plan-unico',
}
const TAG_TO_SERVICE: Record<string, ServiceKey> = {
  'plan-unico': 'plan-unico', 'solo-anuncios': 'solo-anuncios', 'web': 'web-estandar', 'branding': 'branding', 'chatbot': 'chatbot', 'consultoria': 'consultoria', 'desayuno': 'desayuno',
}

type LeadLike = { id: string; name: string; company: string; phone: string | null; tags: string[]; services: string[]; notes: string | null; potentialValue: number; currency: string }

// Services of the deal: accepted proposal first (most precise), then bot tags, then CRM services
async function servicesOf(lead: LeadLike): Promise<ServiceKey[]> {
  const proposal = await prisma.proposal.findFirst({ where: { leadId: lead.id }, orderBy: [{ acceptedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }] })
  const fromProposal = ((proposal?.items as ProposalItem[] | undefined) ?? []).map((i) => i.key)
  if (fromProposal.length) return [...new Set(fromProposal)]
  // A bot "web" lead is an online store when it mentions selling online or carries the store price
  const store = /venta online|tienda|e-?commerce/i.test(lead.notes ?? '') || (lead.currency === 'USD' && lead.potentialValue >= 700)
  const fromTags = lead.tags.map((t) => (t === 'web' && store ? 'web-compleja' : TAG_TO_SERVICE[t])).filter(Boolean)
  if (fromTags.length) return [...new Set(fromTags)]
  const fromEnum = lead.services.map((s) => ENUM_TO_SERVICE[s]).filter(Boolean)
  // Content + ads together is the Plan Único
  return [...new Set(fromEnum.includes('plan-unico') ? fromEnum.filter((s) => s !== 'solo-anuncios') : fromEnum)]
}

// N business days from today at 10:00 Argentina time
function businessDay(n: number) {
  const d = new Date(`${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })}T10:00:00-03:00`)
  const weekend = () => d.getUTCDay() === 0 || d.getUTCDay() === 6
  while (weekend()) d.setUTCDate(d.getUTCDate() + 1) // day 0 = next business day
  for (let left = n; left > 0;) {
    d.setUTCDate(d.getUTCDate() + 1)
    if (!weekend()) left--
  }
  return d
}

const firstName = (name: string) => name.trim().split(/\s+/)[0]

export function welcomeMessage(name: string, services: ServiceKey[]) {
  const needs = services.map((s) => NEEDS[s]).filter(Boolean)
  const nombres = services.map((s) => SERVICES[s].nombre).join(' + ')
  return [
    `¡Hola ${firstName(name)}! 🎉 Bienvenido/a a ViaStudio, qué bueno arrancar a trabajar juntos${nombres ? ` con ${nombres}` : ''}.`,
    needs.length ? `Para empezar necesito ${needs.join('; y ')}.` : '',
    'En estos días coordinamos una reunión de arranque para conocer bien tu negocio. Cualquier duda, escribime por acá. ¡Vamos! 🙌',
  ].filter(Boolean).join('\n\n')
}

export async function onboardingDraft(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) throw new Error('Lead no encontrado')
  const services = await servicesOf(lead)
  return { lead, services, mensaje: welcomeMessage(lead.name, services) }
}

// Idempotent: tasks are tagged onb-<leadId>, a second call does nothing
export async function startOnboarding(leadId: string, clientId?: string | null) {
  const tag = `onb-${leadId}`
  if (await prisma.task.findFirst({ where: { tags: { has: tag } } })) return { created: 0, already: true }

  const { lead, services, mensaje } = await onboardingDraft(leadId)
  const owner = await prisma.profile.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!owner) return { created: 0, already: false }
  const client = clientId ? { id: clientId } : await prisma.client.findFirst({ where: { OR: [{ phone: lead.phone ?? '__' }, { company: lead.company }] } })

  const steps = services.length ? services.flatMap((s) => STEPS[s].map((st) => ({ ...st, s }))) : [{ title: 'Reunión de arranque', day: 1, s: null }]
  const who = lead.company && lead.company !== lead.name ? lead.company : lead.name
  await prisma.task.createMany({
    data: steps.map((st) => ({
      title: `${who} · ${st.title}`,
      description: `Onboarding${st.s ? ` de ${SERVICES[st.s].nombre}` : ''}.`,
      dueDate: businessDay(st.day),
      clientId: client?.id ?? null,
      createdById: owner.id,
      assigneeId: owner.id,
      priority: st.day === 0 ? 'HIGH' as const : 'MEDIUM' as const,
      tags: ['onboarding', tag],
    })),
  })

  await notifyJuanba([
    `🎉 Nuevo cliente: ${who}${services.length ? ` (${services.map((s) => SERVICES[s].nombre).join(' + ')})` : ''}`,
    `Creé ${steps.length} tareas de arranque:\n${steps.map((st) => `• ${st.title}`).join('\n')}`,
    lead.phone
      ? `Borrador de bienvenida para ${firstName(lead.name)}:\n\n"${mensaje}"\n\nSi está bien, decime "mandale la bienvenida a ${firstName(lead.name)}" (o pasame los cambios).`
      : `No tengo su teléfono, así que la bienvenida se la mandás vos. Borrador:\n\n"${mensaje}"`,
  ].join('\n\n'))
  return { created: steps.length, already: false }
}
