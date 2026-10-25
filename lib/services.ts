// ViaStudio service catalog (same data the WhatsApp sales bot uses). Prices are list prices;
// proposals can override them per lead.

export type ServiceKey =
  | 'plan-unico' | 'solo-anuncios' | 'web-estandar' | 'web-compleja'
  | 'branding' | 'chatbot' | 'consultoria' | 'desayuno'

export type Service = {
  key: ServiceKey
  nombre: string
  descripcion: string
  entregables: string[]
  precio: number
  moneda: 'ARS' | 'USD'
  modalidad: 'mensual' | 'unico'
  mantenimiento?: number // USD per month, for one-time services that have it
  aclaraciones?: string[]
}

export const SERVICES: Record<ServiceKey, Service> = {
  'plan-unico': {
    key: 'plan-unico',
    nombre: 'Plan Único',
    descripcion: 'Contenido y publicidad para que tu negocio crezca en redes, sin que tengas que ocuparte.',
    entregables: ['4 reels por mes (guion, grabación y edición)', '14 placas de diseño', '3 anuncios en Meta Ads (Facebook e Instagram)', 'Carga y publicación en tus redes', 'Gestión y optimización de campañas'],
    precio: 400000, moneda: 'ARS', modalidad: 'mensual',
    aclaraciones: ['La inversión en pauta va aparte y se paga directo a Meta (recomendamos al menos $150.000 por mes).', 'Se cobra a mes vencido.', 'La grabación es en Reconquista y zona.'],
  },
  'solo-anuncios': {
    key: 'solo-anuncios',
    nombre: 'Gestión de anuncios (Meta Ads)',
    descripcion: 'Campañas en Facebook e Instagram pensadas para traerte consultas y ventas.',
    entregables: ['Estrategia y configuración de campañas', '3 creativos por mes', 'Optimización y seguimiento de resultados'],
    precio: 280000, moneda: 'ARS', modalidad: 'mensual',
    aclaraciones: ['La inversión en pauta va aparte y se paga directo a Meta.'],
  },
  'web-estandar': {
    key: 'web-estandar',
    nombre: 'Sitio web',
    descripcion: 'Una web profesional para presentar tu negocio y recibir consultas.',
    entregables: ['Landing o sitio institucional', 'Diseño adaptado a celular', 'Formulario y botón de WhatsApp', 'Publicación en tu dominio'],
    precio: 350, moneda: 'USD', modalidad: 'unico', mantenimiento: 20,
  },
  'web-compleja': {
    key: 'web-compleja',
    nombre: 'Tienda online',
    descripcion: 'Una web con venta online para vender tus productos las 24 horas.',
    entregables: ['Catálogo de productos', 'Carrito y medios de pago', 'Diseño adaptado a celular', 'Publicación en tu dominio'],
    precio: 700, moneda: 'USD', modalidad: 'unico', mantenimiento: 60,
  },
  'branding': {
    key: 'branding',
    nombre: 'Branding',
    descripcion: 'Una identidad de marca completa para que tu negocio se vea profesional y se recuerde.',
    entregables: ['Logo y variantes', 'Paleta de colores y tipografías', 'Manual de marca'],
    precio: 500, moneda: 'USD', modalidad: 'unico',
  },
  'chatbot': {
    key: 'chatbot',
    nombre: 'Chatbot IA para WhatsApp',
    descripcion: 'Un asistente con inteligencia artificial que responde las consultas de WhatsApp por vos, las 24 horas.',
    entregables: ['Bot entrenado con la información de tu negocio', 'Respuestas automáticas y calificación de consultas', 'Seguimiento a quienes no responden', 'Aviso a tu WhatsApp cuando hay un cliente listo', 'Conexión opcional con tu CRM'],
    precio: 420, moneda: 'USD', modalidad: 'unico', mantenimiento: 20,
  },
  'consultoria': {
    key: 'consultoria',
    nombre: 'Consultoría de marketing',
    descripcion: 'Acompañamiento semanal con Juanba para ordenar y ejecutar la estrategia de marketing de tu negocio.',
    entregables: ['1 reunión de 1 hora por semana', 'Plan de acción y prioridades', 'Revisión de métricas y resultados'],
    precio: 150000, moneda: 'ARS', modalidad: 'mensual',
  },
  'desayuno': {
    key: 'desayuno',
    nombre: 'Análisis "Desayuno"',
    descripcion: 'Un análisis express de tu Instagram: qué estás haciendo bien, qué no y hacia dónde conviene ir.',
    entregables: ['Revisión de perfil, contenido y anuncios', 'Recomendaciones concretas', 'Próximos pasos sugeridos'],
    precio: 19000, moneda: 'ARS', modalidad: 'unico',
  },
}

export function serviceFromText(text: string): ServiceKey | null {
  const t = text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (SERVICES[t as ServiceKey]) return t as ServiceKey
  if (/tienda|e-?commerce|venta online|compleja/.test(t)) return 'web-compleja'
  if (/web|pagina|sitio|landing/.test(t)) return 'web-estandar'
  if (/plan|contenido|redes/.test(t)) return 'plan-unico'
  if (/anuncio|ads|campa|publicidad|pauta/.test(t)) return 'solo-anuncios'
  if (/brand|marca|logo/.test(t)) return 'branding'
  if (/bot|automatiz/.test(t)) return 'chatbot'
  if (/consultor/.test(t)) return 'consultoria'
  if (/desayuno|analisis/.test(t)) return 'desayuno'
  return null
}
