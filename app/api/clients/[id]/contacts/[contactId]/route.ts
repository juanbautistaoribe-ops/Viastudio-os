import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, contactId } = await params
    const body = await req.json()

    if (body.isPrimary) {
      await prisma.contact.updateMany({ where: { clientId: id }, data: { isPrimary: false } })
    }

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.role !== undefined && { role: body.role }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.isPrimary !== undefined && { isPrimary: body.isPrimary }),
      },
    })
    return NextResponse.json(contact)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contactId } = await params
    await prisma.contact.delete({ where: { id: contactId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
