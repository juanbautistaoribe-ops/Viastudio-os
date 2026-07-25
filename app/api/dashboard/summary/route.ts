import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [clients, tasks, leads] = await Promise.all([
      prisma.client.findMany({
        select: { name: true, company: true, status: true, monthlyValue: true, currency: true, services: true },
        orderBy: { monthlyValue: 'desc' },
      }),
      prisma.task.findMany({
        select: { title: true, status: true, priority: true, dueDate: true, client: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.lead.findMany({
        select: { name: true, company: true, status: true, potentialValue: true, currency: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    const activeClients = clients.filter(c => c.status === 'ACTIVE')
    const mrr = activeClients.reduce((sum, c) => sum + (c.currency === 'USD' ? c.monthlyValue * 1000 : c.monthlyValue), 0)

    const tasksByStatus = tasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const criticalTasks = tasks.filter(t => t.priority === 'CRITICAL' && t.status !== 'DONE')
    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE')

    const activeLeads = leads.filter(l => !['LOST', 'WON'].includes(l.status))
    const pipelineValue = activeLeads.reduce((sum, l) => sum + l.potentialValue, 0)

    const dataContext = `
DATOS REALES DE VIASTUDIO OS — Semana del ${weekAgo.toLocaleDateString('es-AR')} al ${now.toLocaleDateString('es-AR')}

CLIENTES ACTIVOS (${activeClients.length}):
${activeClients.map(c => `- ${c.name} (${c.company}): $${c.monthlyValue.toLocaleString()} ${c.currency}/mes — servicios: ${c.services.join(', ')}`).join('\n')}

FACTURACIÓN MENSUAL ESTIMADA: $${mrr.toLocaleString()} (entre ARS y USD)

TAREAS:
- Total: ${tasks.length}
- Por hacer: ${tasksByStatus['TODO'] || 0}
- En progreso: ${tasksByStatus['IN_PROGRESS'] || 0}
- Completadas: ${tasksByStatus['DONE'] || 0}
- Backlog: ${tasksByStatus['BACKLOG'] || 0}
${criticalTasks.length > 0 ? `\nTAREAS CRÍTICAS PENDIENTES:\n${criticalTasks.map(t => `- "${t.title}"${t.client ? ` (${t.client.name})` : ''}${t.dueDate ? ` — vence ${new Date(t.dueDate).toLocaleDateString('es-AR')}` : ''}`).join('\n')}` : ''}
${overdueTasks.length > 0 ? `\nTAREAS VENCIDAS:\n${overdueTasks.map(t => `- "${t.title}"${t.client ? ` (${t.client.name})` : ''} — venció ${new Date(t.dueDate!).toLocaleDateString('es-AR')}`).join('\n')}` : ''}

LEADS EN PIPELINE (${activeLeads.length}):
${activeLeads.map(l => `- ${l.name} (${l.company}): ${l.status} — potencial $${l.potentialValue.toLocaleString()} ${l.currency}`).join('\n')}
Valor total del pipeline: $${pipelineValue.toLocaleString()}
`.trim()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: `Sos el asistente ejecutivo de ViaStudio, una agencia de marketing digital.
Generás resúmenes semanales breves y accionables para el director de la agencia.
Formato de respuesta — devolvé SOLO un JSON con esta estructura exacta (sin markdown, sin texto extra):
{
  "highlights": [
    {"icon": "emoji", "text": "texto conciso"}
  ],
  "actions": ["acción 1", "acción 2", "acción 3"]
}
- highlights: 4-5 puntos clave sobre el estado actual (clientes, facturación, tareas, leads)
- actions: exactamente 3 próximas acciones prioritarias
- Sé específico con nombres reales y números reales
- Si no hay datos suficientes para un punto, no lo inventes`,
      messages: [{ role: 'user', content: dataContext }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

    let parsed: { highlights: { icon: string; text: string }[]; actions: string[] }
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = { highlights: [], actions: [] }
    }

    return NextResponse.json({ ...parsed, generatedAt: now.toISOString() })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
