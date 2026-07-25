import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'

export const maxDuration = 30

function normalizeTask(task: any) {
  return {
    ...task,
    status: task.status.toLowerCase() as string,
    priority: task.priority.toLowerCase() as string,
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      checklist: { orderBy: { order: 'asc' } },
      attachments: true,
      comments: { include: { author: true } },
      client: { select: { id: true, name: true, company: true, avatar: true } },
    },
  })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(normalizeTask(task))
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const data: any = {}
  if (body.title !== undefined) data.title = body.title
  if (body.description !== undefined) data.description = body.description
  if (body.status !== undefined) data.status = body.status.toUpperCase()
  if (body.priority !== undefined) data.priority = body.priority.toUpperCase()
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null
  if (body.clientId !== undefined) data.clientId = body.clientId || null
  if (body.tags !== undefined) data.tags = body.tags
  if (body.order !== undefined) data.order = body.order

  const task = await prisma.task.update({
    where: { id },
    data,
    include: {
      checklist: true,
      attachments: true,
      comments: true,
      client: { select: { id: true, name: true, company: true, avatar: true } },
    },
  })
  if (body.status?.toUpperCase() === 'DONE') {
    logActivity('TASK_COMPLETED', `Tarea completada: ${task.title}`, user.id, { entityId: task.id, entityType: 'task' })
  }
  return NextResponse.json(normalizeTask(task))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.task.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
