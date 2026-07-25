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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeEvent(event: any) {
  return { ...event, type: event.type?.toLowerCase() }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const events = await prisma.calendarEvent.findMany({
      orderBy: { startDate: 'asc' },
    })

    return NextResponse.json(events.map(normalizeEvent))
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

    const startDate = new Date(body.startDate)
    const endDate = body.endDate ? new Date(body.endDate) : startDate

    const event = await prisma.calendarEvent.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        type: (body.type ?? 'meeting').toUpperCase() as any,
        startDate,
        endDate,
        allDay: body.allDay ?? false,
        clientId: body.clientId ?? null,
        attendees: body.attendees ?? [],
        location: body.location ?? null,
        meetingUrl: body.meetingUrl ?? null,
        createdById: profile.id,
      },
    })

    return NextResponse.json(normalizeEvent(event), { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
