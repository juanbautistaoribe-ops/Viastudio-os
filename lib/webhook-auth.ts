import type { NextRequest } from 'next/server'
import { timingSafeEqual } from 'crypto'

// Server-to-server auth for the n8n WhatsApp bot: header `x-webhook-secret` must match LEADS_WEBHOOK_SECRET.
export function isWebhookAuthorized(req: NextRequest) {
  const expected = process.env.LEADS_WEBHOOK_SECRET
  const given = req.headers.get('x-webhook-secret')
  if (!expected || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
