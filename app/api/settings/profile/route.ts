import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const maxDuration = 30

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
    return NextResponse.json({
      email: user.email ?? '',
      name: profile?.name ?? user.user_metadata?.full_name ?? '',
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: { ...(body.name !== undefined && { name: body.name }) },
      create: { userId: user.id, email: user.email ?? '', name: body.name ?? '' },
    })

    if (body.name) {
      await supabase.auth.updateUser({ data: { full_name: body.name } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
