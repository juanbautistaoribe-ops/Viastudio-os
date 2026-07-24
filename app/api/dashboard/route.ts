import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const [
    clients,
    tasks,
    leads,
    events,
    activities,
  ] = await Promise.all([
    prisma.client.findMany({
      orderBy: { monthlyValue: 'desc' },
      include: { contacts: true },
    }),
    prisma.task.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      take: 20,
      include: {
        client: { select: { id: true, name: true, company: true, avatar: true } },
        checklist: true,
        attachments: true,
        comments: true,
      },
    }),
    prisma.lead.findMany(),
    prisma.calendarEvent.findMany({
      where: { startDate: { gte: now } },
      orderBy: { startDate: 'asc' },
      take: 5,
    }),
    prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: true, client: true },
    }),
  ])

  const activeClients = clients.filter(c => c.status === 'ACTIVE')
  const pendingTasks = tasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED')
  const criticalTasks = pendingTasks.filter(t => t.priority === 'CRITICAL')
  const tasksCompletedThisWeek = tasks.filter(t => t.status === 'DONE' && t.updatedAt >= startOfWeek)
  const activeLeads = leads.filter(l => !['WON', 'LOST'].includes(l.status))
  const leadsValue = activeLeads.reduce((a, l) => a + l.potentialValue, 0)
  const monthlyRevenueARS = activeClients.filter(c => c.currency === 'ARS').reduce((a, c) => a + c.monthlyValue, 0)
  const monthlyRevenueUSD = activeClients.filter(c => c.currency === 'USD').reduce((a, c) => a + c.monthlyValue, 0)
  const monthlyRevenue = monthlyRevenueARS + monthlyRevenueUSD

  const stats = {
    activeClients: activeClients.length,
    activeClientsGrowth: 0,
    monthlyRevenue,
    monthlyRevenueARS,
    monthlyRevenueUSD,
    monthlyRevenueGrowth: 0,
    pendingTasks: pendingTasks.length,
    criticalTasks: criticalTasks.length,
    activeLeads: activeLeads.length,
    leadsValue,
    leadsValueGrowth: 0,
    upcomingEvents: events.length,
    tasksCompletedThisWeek: tasksCompletedThisWeek.length,
    newClientsThisMonth: 0,
  }

  function normalizeTask(t: any) {
    return {
      ...t,
      status: t.status.toLowerCase(),
      priority: t.priority.toLowerCase(),
    }
  }

  function normalizeClient(c: any) {
    return {
      ...c,
      status: c.status.toLowerCase(),
      services: c.services.map((s: string) => s.toLowerCase()),
    }
  }

  function normalizeEvent(e: any) {
    return {
      ...e,
      type: e.type.toLowerCase(),
    }
  }

  function normalizeActivity(a: any) {
    return {
      ...a,
      type: a.type.toLowerCase(),
    }
  }

  return NextResponse.json({
    stats,
    clients: clients.map(normalizeClient),
    tasks: tasks.map(normalizeTask),
    events: events.map(normalizeEvent),
    activities: activities.map(normalizeActivity),
  })
}
