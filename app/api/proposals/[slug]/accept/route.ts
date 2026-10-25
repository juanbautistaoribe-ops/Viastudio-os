import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { money, notifyJuanba, proposalUrl, type ProposalItem } from '@/lib/proposals'

// Public: the lead taps "Quiero avanzar" on the proposal page
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const proposal = await prisma.proposal.findUnique({ where: { slug } })
  if (!proposal) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (proposal.status === 'aceptada') return NextResponse.json({ ok: true })
  if (proposal.validUntil && proposal.validUntil < new Date()) return NextResponse.json({ error: 'Vencida' }, { status: 410 })

  await prisma.proposal.update({ where: { id: proposal.id }, data: { status: 'aceptada', acceptedAt: new Date() } })

  if (proposal.leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: proposal.leadId } })
    if (lead && !['WON', 'LOST'].includes(lead.status)) {
      const today = new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'NEGOTIATION',
          nextAction: 'Escribirle para coordinar el arranque y el pago',
          nextActionDate: new Date(),
          notes: `${lead.notes ?? ''}\n\n✅ ${today}: aceptó la propuesta ${proposalUrl(proposal.slug)}`.trim(),
        },
      })
    }
  }

  const items = (proposal.items as ProposalItem[]) ?? []
  await notifyJuanba([
    `🎉 ${proposal.clientName}${proposal.business ? ` (${proposal.business})` : ''} quiere avanzar con la propuesta!`,
    items.map((i) => `• ${i.nombre}: ${money(i.precio, i.moneda)}${i.modalidad === 'mensual' ? '/mes' : ''}`).join('\n'),
    'Escribile para coordinar el arranque y el pago.',
  ].join('\n\n'))

  return NextResponse.json({ ok: true })
}
