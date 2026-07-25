import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const activities = await prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { user: true, client: true },
    })

    return NextResponse.json(activities.map(a => ({
      ...a,
      type: a.type.toLowerCase(),
    })))
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
