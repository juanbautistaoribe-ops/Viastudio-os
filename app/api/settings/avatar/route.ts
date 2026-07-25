import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) return NextResponse.json({ error: 'Archivo muy grande (máx 5MB)' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    if (!allowed.includes(ext)) return NextResponse.json({ error: 'Formato no soportado' }, { status: 400 })

    const path = `${user.id}/avatar.${ext}`
    const bytes = await file.arrayBuffer()

    // Use service role key if available for storage operations, fall back to anon key
    const storageClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY)
      : supabase

    const { error: uploadError } = await storageClient.storage
      .from('avatars')
      .upload(path, bytes, { contentType: file.type, upsert: true })

    if (uploadError) {
      console.error('Storage error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = storageClient.storage.from('avatars').getPublicUrl(path)
    const avatarUrl = `${publicUrl}?t=${Date.now()}`

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: { avatar: avatarUrl },
      create: { userId: user.id, email: user.email ?? '', name: user.user_metadata?.full_name ?? '', avatar: avatarUrl },
    })

    return NextResponse.json({ url: avatarUrl })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
