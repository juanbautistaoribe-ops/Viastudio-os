import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { botMetrics } from '@/lib/bot-metrics'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const days = Number(new URL(req.url).searchParams.get('days')) || 30
  const to = new Date()
  return NextResponse.json(await botMetrics(new Date(to.getTime() - days * 24 * 60 * 60 * 1000), to))
}
