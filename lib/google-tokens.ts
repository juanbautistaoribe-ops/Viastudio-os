import { prisma } from '@/lib/prisma'

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: 'google' } },
  })
  if (!integration) return null

  // Token still valid
  if (integration.expiresAt && integration.expiresAt > new Date(Date.now() + 60_000)) {
    return integration.accessToken
  }

  // Refresh
  if (!integration.refreshToken) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: integration.refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null

  const tokens = await res.json()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  await prisma.integration.update({
    where: { userId_provider: { userId, provider: 'google' } },
    data: { accessToken: tokens.access_token, expiresAt },
  })

  return tokens.access_token
}
