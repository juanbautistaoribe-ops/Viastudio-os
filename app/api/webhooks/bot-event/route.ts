import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isWebhookAuthorized } from '@/lib/webhook-auth'
import { sourceFromMessage } from '@/lib/bot-metrics'
import { registerColdChat, registerReactivationReply } from '@/lib/reactivation'

export const maxDuration = 30

// Conversation state from the n8n WhatsApp bot, one call per processed message or follow-up.
// Juanba's own number (tests, assistant) is not counted.
const EXCLUDED_PHONES = (process.env.BOT_EXCLUDED_PHONES ?? '5493482323255').split(',').map((p) => p.trim())

function str(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(req: NextRequest) {
  if (!isWebhookAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const chatId = str(body.chatId)
    const phone = str(body.telefono) || chatId.replace('@c.us', '')
    if (!chatId) return NextResponse.json({ error: 'chatId requerido' }, { status: 400 })
    if (EXCLUDED_PHONES.includes(phone)) return NextResponse.json({ ok: true, skipped: 'excluido' })

    // The bot gave up after the follow-ups: the chat becomes a cold lead in Leads
    if (str(body.tipo) === 'frio') {
      await prisma.botConversation.updateMany({ where: { chatId }, data: { status: 'frio' } })
      const result = await registerColdChat({ phone, nombre: str(body.nombre), textoLead: str(body.texto), textoBot: str(body.texto_bot) })
      return NextResponse.json({ ok: true, ...result })
    }

    const status = str(body.estado) || 'activo'
    const isFollowup = str(body.tipo) === 'seguimiento'
    const text = str(body.texto)
    if (!isFollowup && text) await registerReactivationReply(phone, text).catch((e) => console.error('reactivation reply', e))
    const existing = await prisma.botConversation.findUnique({ where: { chatId } })

    const conv = existing
      ? await prisma.botConversation.update({
          where: { chatId },
          data: {
            status,
            ...(str(body.nombre) && { name: str(body.nombre) }),
            ...(isFollowup ? { followups: { increment: 1 } } : { messages: { increment: 1 }, lastMessageAt: new Date() }),
            ...(status === 'calificado' && !existing.qualifiedAt && { qualifiedAt: new Date() }),
          },
        })
      : await prisma.botConversation.create({
          data: {
            chatId,
            phone,
            name: str(body.nombre) || null,
            firstMessage: text.slice(0, 300) || null,
            source: sourceFromMessage(text),
            status,
            messages: isFollowup ? 0 : 1,
            followups: isFollowup ? 1 : 0,
            qualifiedAt: status === 'calificado' ? new Date() : null,
          },
        })

    return NextResponse.json({ ok: true, id: conv.id, source: conv.source })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
