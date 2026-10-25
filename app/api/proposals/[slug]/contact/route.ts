import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyJuanba } from '@/lib/proposals'

const JUANBA_WA = '5493482323255'

// Public: "Tengo una consulta" on the proposal page. Records the tap (stops follow-ups),
// lets Juanba know, and opens his WhatsApp with a ready message.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const proposal = await prisma.proposal.findUnique({ where: { slug } })
  const name = proposal ? proposal.business || proposal.clientName : ''
  const text = encodeURIComponent(`Hola Juanba! Tengo una consulta sobre la propuesta${name ? ` para ${name}` : ''}.`)

  if (proposal && !proposal.contactClickedAt) {
    await prisma.proposal.update({ where: { id: proposal.id }, data: { contactClickedAt: new Date() } })
    await notifyJuanba(`💬 ${proposal.clientName}${proposal.business ? ` (${proposal.business})` : ''} tocó "Tengo una consulta" en la propuesta: te va a escribir a tu WhatsApp. Ya no le hago seguimiento.`)
  }
  return NextResponse.redirect(`https://wa.me/${JUANBA_WA}?text=${text}`)
}
