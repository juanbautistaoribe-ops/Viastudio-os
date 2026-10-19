import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false })

  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId: user.id, provider: 'google' } },
    select: { id: true, updatedAt: true },
  })

  return NextResponse.json({ connected: !!integration, updatedAt: integration?.updatedAt ?? null })
}
