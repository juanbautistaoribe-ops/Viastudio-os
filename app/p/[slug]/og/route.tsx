import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { prisma } from '@/lib/prisma'
import type { ProposalItem } from '@/lib/proposals'

// Link preview image shown by WhatsApp when the proposal is shared (public, referenced from the page metadata)

const size = { width: 1200, height: 630 }

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [proposal, logo] = await Promise.all([
    prisma.proposal.findUnique({ where: { slug } }),
    readFile(join(process.cwd(), 'public/via-logo.svg')),
  ])
  const logoSrc = `data:image/svg+xml;base64,${logo.toString('base64')}`
  const para = proposal ? proposal.business || proposal.clientName : ''
  const title = proposal?.notes || 'Propuesta comercial'
  const servicios = proposal ? ((proposal.items as ProposalItem[]) ?? []).map((i) => i.nombre).join(' · ') : ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '64px 72px', color: '#F0F0FF',
          background: 'linear-gradient(135deg, #0B0B22 0%, #3300A6 55%, #6F2BFA 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <img src={logoSrc} width={72} height={72} style={{ borderRadius: 18 }} alt="" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 34, fontWeight: 700 }}>ViaStudio</span>
            <span style={{ fontSize: 22, color: '#C9B8FF' }}>Marketing digital y automatización</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {para && <span style={{ fontSize: 28, color: '#C9B8FF', textTransform: 'uppercase', letterSpacing: 2 }}>Propuesta para {para}</span>}
          <span style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.1 }}>{title}</span>
          {servicios && <span style={{ fontSize: 28, color: '#E2DAFF' }}>{servicios}</span>}
        </div>
      </div>
    ),
    size,
  )
}
