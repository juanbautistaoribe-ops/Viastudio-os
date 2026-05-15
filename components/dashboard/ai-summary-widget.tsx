'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RefreshCw, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const WEEKLY_SUMMARY = `**This week at ViaStudio:**

- 🟢 **18 tasks completed** — ahead of last week's pace (+22%)
- 💰 **$3,200 received** from Bloom Skincare (May invoice)
- 🚨 **3 critical tasks** need attention this week (Google Ads + Monthly Reports)
- 📈 **NexoBank proposal** due Friday — high-value lead ($8,000/mo potential)
- 🆕 **Luxora Jewelry onboarded** — schedule kick-off call

**Recommended next actions:**
1. Finalize TechForge Google Ads campaign (critical, due tomorrow)
2. Send NexoBank proposal deck before Friday
3. Confirm May calendar with Bloom Skincare team`

export function AISummaryWidget() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="card p-5 h-full"
      style={{
        background: 'linear-gradient(135deg, rgba(111,43,250,0.06) 0%, rgba(15,15,46,1) 60%)',
        borderColor: 'rgba(111,43,250,0.2)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(111,43,250,0.15)', color: 'var(--color-accent)' }}
          >
            <Sparkles size={13} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              Resumen Semanal IA
            </h3>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              Generado por Claude · 14 mayo 2025
            </p>
          </div>
        </div>
        <button
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
          style={{
            background: 'rgba(111,43,250,0.1)',
            color: 'var(--color-accent)',
            border: '1px solid rgba(111,43,250,0.2)',
          }}
        >
          <RefreshCw size={11} />
          Actualizar
        </button>
      </div>

      <div className="space-y-2">
        <div
          className="text-xs leading-relaxed"
          style={{ color: 'var(--color-text-2)' }}
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={expanded ? 'expanded' : 'collapsed'}
              initial={false}
              animate={{ height: expanded ? 'auto' : '80px', overflow: 'hidden' }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-1.5">
                {[
                  { icon: '🟢', text: '18 tareas completadas — por encima del ritmo de la semana pasada (+22%)' },
                  { icon: '💰', text: '$3,200 recibidos de Bloom Skincare (factura de mayo)' },
                  { icon: '🚨', text: '3 tareas críticas requieren atención esta semana' },
                  { icon: '📈', text: 'Propuesta NexoBank vence el viernes — potencial $8,000/mes' },
                  { icon: '🆕', text: 'Luxora Jewelry incorporada — agendar llamada de inicio' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span>{item.icon}</span>
                    <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>
                      {item.text}
                    </p>
                  </div>
                ))}
                {expanded && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                      Acciones recomendadas:
                    </p>
                    {[
                      'Finalizar campaña Google Ads de TechForge (crítico, vence mañana)',
                      'Enviar propuesta a NexoBank antes del viernes',
                      'Confirmar calendario de mayo con el equipo de Bloom Skincare',
                    ].map((action, i) => (
                      <div key={i} className="flex items-center gap-2 py-1">
                        <span
                          className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: 'var(--color-primary)' }}
                        >
                          {i + 1}
                        </span>
                        <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>{action}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-medium transition-colors"
          style={{ color: 'var(--color-accent)' }}
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
        <Link
          href="/ai"
          className="flex items-center gap-1 text-xs font-medium transition-colors"
          style={{ color: 'var(--color-accent)' }}
        >
          Abrir Centro IA <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  )
}
