import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `Sos el project manager de ViaStudio, una agencia de marketing digital.
Tu trabajo es interpretar pedidos de tareas en lenguaje natural y crear las tareas en el sistema.
Cuando el usuario pida crear una tarea, usá la herramienta create_task con los datos que puedas extraer del mensaje.
Si el usuario menciona un cliente, intentá hacer match con los clientes disponibles.
Respondé siempre en español.`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { messages, systemContext } = await req.json()

    const clients = await prisma.client.findMany({ select: { id: true, name: true, company: true } })

    const system = systemContext
      ? `${SYSTEM}\n\nContexto adicional:\n${systemContext}`
      : SYSTEM

    const tools: Anthropic.Tool[] = [
      {
        name: 'create_task',
        description: 'Crea una tarea en el sistema de ViaStudio OS',
        input_schema: {
          type: 'object' as const,
          properties: {
            title: { type: 'string', description: 'Título conciso de la tarea' },
            description: { type: 'string', description: 'Descripción detallada opcional' },
            priority: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], description: 'Prioridad de la tarea' },
            dueDate: { type: 'string', description: 'Fecha de vencimiento en formato ISO 8601 (ej: 2025-07-27)' },
            estimatedMinutes: { type: 'number', description: 'Tiempo estimado en minutos' },
            clientId: { type: 'string', description: 'ID del cliente al que pertenece la tarea' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags o etiquetas relevantes' },
          },
          required: ['title'],
        },
      },
    ]

    const clientList = clients.map(c => `- ID: ${c.id} | Nombre: ${c.name} (${c.company})`).join('\n')
    const fullSystem = `${system}\n\nClientes disponibles:\n${clientList}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: fullSystem,
      tools,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    // Handle tool use
    const createdTasks: any[] = []
    let textResponse = ''

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')
      const textBlocks = response.content.filter(b => b.type === 'text')
      textResponse = textBlocks.map(b => b.type === 'text' ? b.text : '').join('')

      for (const block of toolUseBlocks) {
        if (block.type !== 'tool_use' || block.name !== 'create_task') continue
        const input = block.input as any

        const task = await prisma.task.create({
          data: {
            title: input.title,
            description: input.description ?? null,
            priority: input.priority ?? 'MEDIUM',
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
      }

      // Get Claude's final confirmation
      if (createdTasks.length > 0) {
        const toolResults = toolUseBlocks.map(block => ({
          type: 'tool_result' as const,
          tool_use_id: block.type === 'tool_use' ? block.id : '',
          content: JSON.stringify({ success: true, taskId: createdTasks[0]?.id }),
        }))

        const finalResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 512,
          system: fullSystem,
          tools,
          messages: [
            ...messages.map((m: { role: string; content: string }) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
            { role: 'assistant' as const, content: response.content },
            { role: 'user' as const, content: toolResults },
          ],
        })

        const finalText = finalResponse.content.find(b => b.type === 'text')
        if (finalText?.type === 'text') textResponse = finalText.text
      }
    } else {
      textResponse = response.content.find(b => b.type === 'text')?.type === 'text'
        ? (response.content.find(b => b.type === 'text') as any).text
        : ''
    }

    return NextResponse.json({ text: textResponse, createdTasks })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
