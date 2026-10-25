import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { money, proposalUrl, type ProposalItem } from '@/lib/proposals'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const proposals = await prisma.proposal.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
  return NextResponse.json(proposals.map((p) => {
    const items = (p.items as ProposalItem[]) ?? []
    return {
      id: p.id,
      url: proposalUrl(p.slug),
      leadId: p.leadId,
      cliente: p.clientName,
      negocio: p.business,
      servicios: items.map((i) => `${i.nombre} · ${money(i.precio, i.moneda)}${i.modalidad === 'mensual' ? '/mes' : ''}`),
      status: p.status,
      vencida: !!p.validUntil && p.validUntil < new Date() && p.status !== 'aceptada',
      vistas: p.viewCount,
      seguimientos: p.followups,
      porBot: !!p.sentToChat,
      consulta: !!p.contactClickedAt,
      creada: p.createdAt,
      enviada: p.sentAt,
      aceptada: p.acceptedAt,
      validaHasta: p.validUntil,
    }
  }))
}
