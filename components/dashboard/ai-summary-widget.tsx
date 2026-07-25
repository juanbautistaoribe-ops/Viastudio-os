'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RefreshCw, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

type Summary = {
  highlights: { icon: string; text: string }[]
  actions: string[]
  generatedAt: string
}

export function AISummaryWidget() {
  const [expanded, setExpanded] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/dashboard/summary', { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSummary(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  const generatedLabel = summary
    ? new Date(summary.generatedAt).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

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
              {loading ? 'Generando…' : error ? 'Error al generar' : `Generado por Claude · ${generatedLabel}`}
            </p>
          </div>
        </div>
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
          style={{
            background: 'rgba(111,43,250,0.1)',
            color: 'var(--color-accent)',
            border: '1px solid rgba(111,43,250,0.2)',
          }}
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          Actualizar
        </button>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2 py-2"
            >
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-3 rounded animate-pulse"
                  style={{ background: 'rgba(111,43,250,0.1)', width: `${70 + i * 8}%` }}
                />
              ))}
            </motion.div>
          ) : error ? (
            <motion.p
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs py-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              No se pudo generar el resumen. Intentá de nuevo.
            </motion.p>
          ) : summary ? (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                animate={{ height: expanded ? 'auto' : '80px', overflow: 'hidden' }}
                transition={{ duration: 0.2 }}
              >
                <div className="space-y-1.5">
                  {summary.highlights.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span>{item.icon}</span>
                      <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>{item.text}</p>
                    </div>
                  ))}
                  {expanded && summary.actions.length > 0 && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                        Acciones recomendadas:
                      </p>
                      {summary.actions.map((action, i) => (
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
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-medium transition-colors"
          style={{ color: 'var(--color-accent)' }}
          disabled={loading || error}
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
