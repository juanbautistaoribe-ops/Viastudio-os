import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeDoc(doc: any) {
  return { ...doc, type: doc.type?.toLowerCase() }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const docs = await prisma.document.findMany({
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(docs.map(normalizeDoc))
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await getOrCreateProfile(user.id, user.email ?? '')
    const body = await req.json()

    const doc = await prisma.document.create({
      data: {
        title: body.title,
        content: body.content ?? '',
        type: (body.type ?? 'sop').toUpperCase() as any,
        category: body.category ?? 'General',
        tags: body.tags ?? [],
        isFavorite: false,
        isPublished: false,
        authorId: profile.id,
      },
    })

    logActivity('DOC_CREATED', `Documento creado: ${doc.title}`, user.id, { entityId: doc.id, entityType: 'document' })
    return NextResponse.json(normalizeDoc(doc), { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
