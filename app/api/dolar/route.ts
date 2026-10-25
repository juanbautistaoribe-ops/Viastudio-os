import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDolarBlue } from '@/lib/dolar'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const blue = await getDolarBlue()
  if (!blue) return NextResponse.json({ error: 'No se pudo obtener el dólar' }, { status: 502 })
  return NextResponse.json({ blue })
}
