import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `Sos el project manager de ViaStudio, una agencia de marketing digital.
Tu trabajo es interpretar pedidos de tareas en lenguaje natural y crear las tareas en el sistema usando la herramienta create_task.

REGLAS IMPORTANTES:
1. Cuando el usuario mencione un cliente, hacer match con la lista de clientes disponibles y usar su ID.
2. Si te dan una imagen de un calendario, planilla o agenda, debés crear UNA TAREA POR CADA ÍTEM visible usando create_task para cada uno.
3. SIEMPRE extraé la fecha del contexto o imagen y poné dueDate en formato ISO 8601 (ej: 2025-08-15). Si el calendario muestra días del mes, calculá la fecha completa usando el año y mes actual.
4. Si la imagen muestra tareas para un cliente específico, asigná clientId a todas las tareas de ese cliente.
5. Usá la herramienta create_task REPETIDAMENTE, una vez por cada tarea individual. No agrupés tareas.
6. CRÍTICO: Jamás respondas con texto diciendo que "vas a crear" las tareas. Directamente llamá create_task sin anunciarlo. No digas "voy a hacerlo", "las creo ahora", ni nada similar — simplemente ejecutá la herramienta.
7. No respondas en texto hasta haber creado TODAS las tareas. Primero ejecutá todas las herramientas, después confirmá.
8. Respondé siempre en español.`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { messages, systemContext, currentImage } = await req.json()

    const clients = await prisma.client.findMany({ select: { id: true, name: true, company: true } })

    const system = systemContext
      ? `${SYSTEM}\n\nContexto adicional:\n${systemContext}`
      : SYSTEM

    const today = new Date().toISOString().slice(0, 10)

    const tools: Anthropic.Tool[] = [
      {
        name: 'create_task',
        description: 'Crea UNA tarea en el sistema de ViaStudio OS. Llamá esta herramienta una vez por cada tarea individual.',
        input_schema: {
          type: 'object' as const,
          properties: {
            title: { type: 'string', description: 'Título conciso de la tarea' },
            description: { type: 'string', description: 'Descripción detallada opcional' },
            priority: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], description: 'Prioridad de la tarea' },
            dueDate: { type: 'string', description: `Fecha de vencimiento en formato ISO 8601. Fecha de hoy: ${today}. SIEMPRE incluir si hay información de fecha disponible.` },
            estimatedMinutes: { type: 'number', description: 'Tiempo estimado en minutos' },
            clientId: { type: 'string', description: 'ID del cliente al que pertenece la tarea' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags o etiquetas relevantes' },
          },
          required: ['title'],
        },
      },
    ]

    const clientList = clients.map(c => `- ID: ${c.id} | Nombre: ${c.name} (${c.company})`).join('\n')
    const fullSystem = `${system}\n\nFecha actual: ${today}\n\nClientes disponibles:\n${clientList}`

    const initialMessages: Anthropic.MessageParam[] = messages.map(
      (m: { role: string; content: string }, i: number) => {
        const isLast = i === messages.length - 1
        if (isLast && m.role === 'user' && currentImage) {
          return {
            role: 'user' as const,
            content: [
              {
                type: 'image' as const,
                source: {
                  type: 'base64' as const,
                  media_type: currentImage.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: currentImage.data,
                },
              },
              { type: 'text' as const, text: m.content || 'Analizá esta imagen y creá las tareas correspondientes.' },
            ],
          }
        }
        return { role: m.role as 'user' | 'assistant', content: m.content }
      }
    )

    // Agentic loop: keep calling until Claude stops using tools
    let currentMessages: Anthropic.MessageParam[] = initialMessages
    const createdTasks: any[] = []
    let textResponse = ''
    let maxRounds = 30
    let isFirstCall = true

    while (maxRounds-- > 0) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: fullSystem,
        tools,
        // Force tool use on the first call to prevent Claude from responding with
        // text like "I'll create them now" instead of actually calling create_task
        tool_choice: isFirstCall ? { type: 'any' as const } : { type: 'auto' as const },
        messages: currentMessages,
      })
      isFirstCall = false

      const textBlock = response.content.find(b => b.type === 'text')
      if (textBlock?.type === 'text') textResponse = textBlock.text

      if (response.stop_reason !== 'tool_use') break

      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[]
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of toolUseBlocks) {
        if (block.name !== 'create_task') {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: 'Unknown tool' })
          continue
        }

        const input = block.input as {
          title: string
          description?: string
          priority?: string
          dueDate?: string
          estimatedMinutes?: number
          clientId?: string
          tags?: string[]
        }

        try {
          const task = await prisma.task.create({
            data: {
              title: input.title,
              description: input.description ?? null,
              priority: (input.priority ?? 'MEDIUM') as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
              status: 'TODO',
              dueDate: input.dueDate ? new Date(input.dueDate) : null,
              estimatedHours: input.estimatedMinutes ? input.estimatedMinutes / 60 : null,
              clientId: input.clientId ?? null,
              tags: input.tags ?? [],
              createdById: profile.id,
              order: 0,
            },
            include: { client: { select: { name: true, company: true } } },
          })

          logActivity('TASK_CREATED', `Tarea creada por IA: ${task.title}`, user.id, {
            entityId: task.id,
            entityType: 'task',
            clientId: task.clientId ?? undefined,
          })

          createdTasks.push(task)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ success: true, taskId: task.id, title: task.title }),
          })
        } catch (err) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ success: false, error: String(err) }),
            is_error: true,
          })
        }
      }

      currentMessages = [
        ...currentMessages,
        { role: 'assistant' as const, content: response.content },
        { role: 'user' as const, content: toolResults },
      ]
    }

    return NextResponse.json({ text: textResponse, createdTasks })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
