import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { APP_URL, money, notifyJuanba, type ProposalItem } from '@/lib/proposals'
import { AcceptProposal } from './accept'

// Public proposal page (no login). Shared by Juanba with the lead by WhatsApp.

export const dynamic = 'force-dynamic'

const BOT_UA = /whatsapp|facebookexternalhit|bot|crawler|spider|preview|slack|telegram|discord/i

async function load(slug: string) {
  return prisma.proposal.findUnique({ where: { slug } })
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug)
  if (!p) return { title: 'Propuesta' }
  const title = `Propuesta para ${p.business || p.clientName} · ViaStudio`
  const description = p.notes ?? 'Propuesta comercial de ViaStudio'
  return {
    // Public domain, not the per-deployment URL (protected): WhatsApp has to be able to fetch the preview image
    metadataBase: new URL(APP_URL),
    title: { absolute: title },
    description,
    openGraph: { title, description, siteName: 'ViaStudio', type: 'website', images: [{ url: `${APP_URL}/p/${p.slug}/og`, width: 1200, height: 630 }] },
    robots: { index: false, follow: false },
  }
}

const fmtDate = (d: Date) => d.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'long' })

export default async function ProposalPage({ params }: { params: Promise<{ slug: string }> }) {
  const proposal = await load((await params).slug)
  if (!proposal) notFound()

  // Count real views by the lead: only after it was sent, not link previews, not Juanba logged into the app
  const ua = (await headers()).get('user-agent') ?? ''
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (['enviada', 'vista'].includes(proposal.status) && !BOT_UA.test(ua) && !user) {
    const first = !proposal.firstViewedAt
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { viewCount: { increment: 1 }, ...(first && { firstViewedAt: new Date(), status: 'vista' }) },
    })
    if (first) await notifyJuanba(`👀 ${proposal.clientName}${proposal.business ? ` (${proposal.business})` : ''} abrió la propuesta.`)
  }

  const items = (proposal.items as ProposalItem[]) ?? []
  const expired = !!proposal.validUntil && proposal.validUntil < new Date() && proposal.status !== 'aceptada'
  const rate = proposal.exchangeRate

  return (
    <main className="min-h-full px-4 py-10" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/via-logo.svg" alt="ViaStudio" className="h-10 w-10 rounded-xl object-cover" />
          <div>
            <p className="text-sm font-semibold">ViaStudio</p>
            <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>Marketing digital y automatización · Reconquista</p>
          </div>
        </header>

        <section className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #3300A6 0%, #6F2BFA 100%)' }}>
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">Propuesta para {proposal.business || proposal.clientName}</p>
          <h1 className="mt-2 text-2xl font-bold leading-tight">{proposal.notes || `Propuesta para ${proposal.clientName}`}</h1>
          <p className="mt-3 text-sm opacity-90">
            Preparada para {proposal.clientName} el {fmtDate(proposal.createdAt)}
            {proposal.validUntil && !expired && ` · válida hasta el ${fmtDate(proposal.validUntil)}`}
          </p>
        </section>

        {expired && (
          <div className="rounded-xl p-4 text-sm" style={{ background: '#F59E0B18', border: '1px solid #F59E0B55', color: '#F5C46B' }}>
            Esta propuesta venció el {fmtDate(proposal.validUntil!)}. Escribile a Juanba y te la actualiza.
          </div>
        )}

        {proposal.diagnosis && (
          <section className="card p-5">
            <h2 className="mb-2 text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>Lo que nos contaste</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}>{proposal.diagnosis}</p>
          </section>
        )}

        {proposal.solution && (
          <section className="card p-5">
            <h2 className="mb-2 text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>Nuestra propuesta</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}>{proposal.solution}</p>
          </section>
        )}

        {items.map((item) => (
          <section key={item.key} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold">{item.nombre}</h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-text-2)' }}>{item.descripcion}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xl font-bold tabular-nums">{money(item.precio, item.moneda)}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>{item.modalidad === 'mensual' ? 'por mes' : 'pago único'}</p>
                {item.moneda === 'USD' && rate && (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>≈ {money(item.precio * rate, 'ARS')} al blue de hoy</p>
                )}
              </div>
            </div>
            <ul className="mt-4 space-y-1.5">
              {item.entregables.map((e) => (
                <li key={e} className="flex gap-2 text-sm" style={{ color: 'var(--color-text)' }}>
                  <span style={{ color: 'var(--color-success)' }}>✓</span>{e}
                </li>
              ))}
            </ul>
            {(item.mantenimiento || item.aclaraciones?.length) && (
              <div className="mt-4 space-y-1 border-t pt-3 text-xs" style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-2)' }}>
                {item.mantenimiento ? <p>+ Mantenimiento: US${item.mantenimiento} por mes.</p> : null}
                {item.aclaraciones?.map((a) => <p key={a}>{a}</p>)}
              </div>
            )}
          </section>
        ))}

        {(proposal.timeline || proposal.paymentTerms || items.some((i) => i.moneda === 'USD')) && (
          <section className="card space-y-2 p-5 text-sm">
            {proposal.timeline && <p><span className="font-semibold">Plazo: </span><span style={{ color: 'var(--color-text-2)' }}>{proposal.timeline}</span></p>}
            {proposal.paymentTerms && <p><span className="font-semibold">Forma de pago: </span><span style={{ color: 'var(--color-text-2)' }}>{proposal.paymentTerms}</span></p>}
            {items.some((i) => i.moneda === 'USD') && (
              <p style={{ color: 'var(--color-text-2)' }}>Los precios en dólares se pagan en pesos, al valor del dólar blue del día del pago.</p>
            )}
          </section>
        )}

        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>Cómo seguimos</h2>
          <ol className="space-y-2 text-sm" style={{ color: 'var(--color-text-2)' }}>
            <li>1. Tocás &quot;Quiero avanzar&quot;.</li>
            <li>2. Juanba te escribe para coordinar los detalles y el pago.</li>
            <li>3. Arrancamos.</li>
          </ol>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {!expired && <AcceptProposal slug={proposal.slug} accepted={proposal.status === 'aceptada'} />}
            <a
              href={`/api/proposals/${proposal.slug}/contact`}
              className="flex-1 rounded-xl px-4 py-3 text-center text-sm font-medium"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            >
              Tengo una consulta
            </a>
          </div>
        </section>

        <footer className="pb-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
          ViaStudio · Reconquista, Santa Fe
        </footer>
      </div>
    </main>
  )
}
