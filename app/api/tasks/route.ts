import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

function normalizeTask(task: any) {
  return {
    ...task,
    status: task.status.toLowerCase() as string,
    priority: task.priority.toLowerCase() as string,
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tasks = await prisma.task.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    include: {
      checklist: { orderBy: { order: 'asc' } },
      attachments: true,
      comments: true,
      client: { select: { id: true, name: true, company: true, avatar: true } },
    },
  })

  return NextResponse.json(tasks.map(normalizeTask))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, status, priority, clientId, dueDate, tags } = body

  // Ensure creator profile exists
  let profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        userId: user.id,
        name: user.email?.split('@')[0] ?? 'Usuario',
        email: user.email ?? '',
      },
    })
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      status: (status ?? 'TODO').toUpperCase() as any,
      priority: (priority ?? 'MEDIUM').toUpperCase() as any,
      createdById: profile.id,
      clientId: clientId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      tags: tags ?? [],
    },
    include: {
      checklist: true,
      attachments: true,
      comments: true,
      client: { select: { id: true, name: true, company: true, avatar: true } },
    },
  })

  return NextResponse.json(normalizeTask(task), { status: 201 })
}
