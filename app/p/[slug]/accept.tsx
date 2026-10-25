'use client'

import { useState } from 'react'

export function AcceptProposal({ slug, accepted }: { slug: string; accepted: boolean }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>(accepted ? 'done' : 'idle')

  async function accept() {
    setState('sending')
    try {
      const res = await fetch(`/api/proposals/${slug}/accept`, { method: 'POST' })
      setState(res.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div className="flex-1 rounded-xl px-4 py-3 text-center text-sm font-medium" style={{ background: '#22C55E22', color: '#4ADE80' }}>
        ¡Listo! Juanba te va a escribir para arrancar 🙌
      </div>
    )
  }

  return (
    <button
      onClick={accept}
      disabled={state === 'sending'}
      className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      style={{ background: 'var(--color-primary)' }}
    >
      {state === 'sending' ? 'Enviando…' : state === 'error' ? 'No se pudo enviar, probá de nuevo' : 'Quiero avanzar'}
    </button>
  )
}
