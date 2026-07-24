import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

async function getOrCreateProfile(userId: string, email: string) {
  let profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile) {
    profile = await prisma.profile.create({
      data: { userId, name: email.split('@')[0], email },
    })
  }
  return profile
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getOrCreateProfile(user.id, user.email ?? '')

  const conversations = await prisma.aIConversation.findMany({
    where: { createdById: profile.id },
    orderBy: { updatedAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })

  return NextResponse.json(conversations)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getOrCreateProfile(user.id, user.email ?? '')
  const { functionId, title } = await req.json()

  const conversation = await prisma.aIConversation.create({
    data: {
      title: title ?? 'Nueva conversación',
      function: (functionId ?? 'CHAT').toUpperCase() as any,
      createdById: profile.id,
    },
    include: { messages: true },
  })

  return NextResponse.json(conversation, { status: 201 })
}
