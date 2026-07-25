import { prisma } from './prisma'

export async function logActivity(
  type: string,
  title: string,
  userId: string,
  options?: { clientId?: string; entityId?: string; entityType?: string; description?: string }
) {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId } })
    if (!profile) return
    await prisma.activity.create({
      data: {
        type: type as any,
        title,
        userId: profile.id,
        clientId: options?.clientId ?? null,
        entityId: options?.entityId ?? null,
        entityType: options?.entityType ?? null,
        description: options?.description ?? null,
      },
    })
  } catch {
    // Non-blocking
  }
}
