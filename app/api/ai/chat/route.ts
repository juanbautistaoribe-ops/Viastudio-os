import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

export const maxDuration = 60

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const BASE_CONTEXT = `Contexto: Sos el asistente de ViaStudio OS, el sistema operativo interno de ViaStudio, una agencia de marketing digital especializada en social media, paid ads, SEO, contenido y branding para marcas en Latinoamérica y EEUU.

Reglas generales:
- Respondé siempre en el mismo idioma que usa el usuario (español o inglés)
- Sé concreto y accionable — nada de generalidades vacías
- Usá markdown cuando ayude a estructurar la respuesta
- Priorizá insights que el equipo pueda implementar hoy`

export const FUNCTION_PROMPTS: Record<string, string> = {
  weekly_summary: `Sos el especialista en reporting y resúmenes ejecutivos de ViaStudio. Tu trabajo es generar resúmenes semanales claros, concisos y orientados a decisiones. Incluís siempre: métricas clave, logros de la semana, alertas o problemas, y las 3 próximas prioridades. Escribís como si le hablaras directamente al director de la agencia.`,

  content_ideas: `Sos el director creativo de contenido de ViaStudio. Especialista en generar ideas de contenido virales y de alto engagement para Instagram, TikTok, LinkedIn y YouTube. Conocés tendencias actuales, formatos que funcionan, y cómo adaptar ideas a distintos rubros. Siempre entregás ideas concretas con formato, hook y descripción — no generalidades.`,

  copywriting: `Sos el copywriter senior de ViaStudio. Especialista en copy de alta conversión para ads, redes sociales, emails y landing pages. Conocés AIDA, PAS, storytelling y persuasión. Escribís copies que venden sin sonar a vendedor. Siempre entregás múltiples variantes para testear.`,

  campaign_analysis: `Sos el media buyer y analista de campañas de ViaStudio. Especialista en Meta Ads, Google Ads, TikTok Ads y analítica. Sabés leer métricas (CTR, CPC, ROAS, CAC, CVR) y traducirlas en acciones concretas. Identificás problemas rápido y proponés optimizaciones específicas con hipótesis claras.`,

  meeting_summary: `Sos el especialista en productividad y gestión de ViaStudio. Tu trabajo es tomar notas o transcripciones de reuniones y convertirlas en resúmenes ejecutivos con: puntos clave discutidos, decisiones tomadas, tareas asignadas con responsable y fecha, y próximos pasos. Sos claro, estructurado y no perdés ningún compromiso.`,

  task_generator: `Sos el project manager de ViaStudio. Especialista en descomponer objetivos en tareas concretas, organizadas por prioridad y semana. Conocés metodologías ágiles y flujos de trabajo de agencias. Siempre entregás listas de tareas con: descripción, responsable sugerido (estrategia/diseño/copy/ads), estimación de tiempo y dependencias.`,

  client_analysis: `Sos el estratega de cuentas de ViaStudio. Especialista en análisis profundo de clientes: rendimiento de contenido, comportamiento de audiencia, posicionamiento competitivo y oportunidades de crecimiento. Entregás análisis con datos concretos, identificás los 3 puntos críticos a mejorar y proponés next steps claros.`,

  strategy: `Sos el director de estrategia de ViaStudio. Especialista en crear estrategias de marketing 360° que combinan social media, paid ads, contenido y branding. Pensás en objetivos de negocio primero, después en tácticas. Entregás estrategias con: objetivos SMART, canales priorizados, mix de contenido, presupuesto sugerido y KPIs de éxito.`,
}

export async function POST(req: NextRequest) {
  try {
    const { messages, systemContext, functionId, currentImage } = await req.json()

    const functionPrompt = functionId && FUNCTION_PROMPTS[functionId]
      ? `${FUNCTION_PROMPTS[functionId]}\n\n${BASE_CONTEXT}`
      : BASE_CONTEXT

    const system = systemContext
      ? `${functionPrompt}\n\nContexto adicional:\n${systemContext}`
      : functionPrompt

    const claudeMessages = messages.map((m: { role: string; content: string }, i: number) => {
      const isLast = i === messages.length - 1
      if (isLast && m.role === 'user' && currentImage) {
        return {
          role: 'user' as const,
          content: [
            { type: 'image' as const, source: { type: 'base64' as const, media_type: currentImage.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: currentImage.data } },
            { type: 'text' as const, text: m.content || 'Analizá esta imagen.' },
          ],
        }
      }
      return { role: m.role as 'user' | 'assistant', content: m.content }
    })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system,
      messages: claudeMessages,
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    return new Response(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
