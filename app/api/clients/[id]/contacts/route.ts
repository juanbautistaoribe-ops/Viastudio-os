import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const contacts = await prisma.contact.findMany({
      where: { clientId: id },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    })
    return NextResponse.json(contacts)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    if (body.isPrimary) {
      await prisma.contact.updateMany({ where: { clientId: id }, data: { isPrimary: false } })
    }

    const contact = await prisma.contact.create({
      data: {
        clientId: id,
        name: body.name,
        role: body.role ?? '',
        email: body.email ?? '',
        phone: body.phone ?? null,
        isPrimary: body.isPrimary ?? false,
      },
    })
    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
