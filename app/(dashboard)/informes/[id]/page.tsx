import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { REVIEW_CATEGORY } from '@/lib/agency-review'

// Agency review (behind login): the link Juanba gets over WhatsApp twice a month

export const dynamic = 'force-dynamic'

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const doc = await prisma.document.findFirst({ where: { id, category: REVIEW_CATEGORY } })
  if (!doc) notFound()

  return (
    <main className="flex-1 overflow-y-auto px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/sops" className="mb-6 inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft size={12} /> Documentos
        </Link>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{doc.title}</p>
        <div className="mt-2 space-y-3">
          {doc.content.split('\n\n').map((block, i) => <Block key={i} text={block} />)}
        </div>
      </div>
    </main>
  )
}

function Block({ text }: { text: string }) {
  if (text.startsWith('# ')) return <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{text.slice(2)}</h1>
  if (text.startsWith('## ')) return <h2 className="pt-6 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{text.slice(3)}</h2>
  if (text.startsWith('### ')) return <h3 className="pt-3 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{text.slice(4)}</h3>
  if (text.startsWith('> ')) return (
    <blockquote className="card whitespace-pre-wrap p-3 text-sm" style={{ color: 'var(--color-text-2)' }}>
      {text.split('\n').map((l) => l.replace(/^> ?/, '')).join('\n')}
    </blockquote>
  )
  if (text.startsWith('- ')) return <p className="flex gap-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}><span>•</span><span>{text.slice(2)}</span></p>
  return <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}>{text}</p>
}
