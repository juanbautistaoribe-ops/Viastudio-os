import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { role, content } = await req.json()

  const message = await prisma.aIMessage.create({
    data: { conversationId: id, role, content },
  })

  await prisma.aIConversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  })

  return NextResponse.json(message, { status: 201 })
}
