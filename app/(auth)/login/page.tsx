'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Zap, Mail, Lock, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('Algo salió mal. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Logo */}
      <div className="flex items-center justify-center gap-2.5 mb-8">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6F2BFA 0%, #3300A6 100%)' }}
        >
          <Zap size={18} color="white" strokeWidth={2.5} />
        </div>
        <span
          className="text-lg font-bold tracking-tight"
          style={{ color: 'var(--color-text)' }}
        >
          ViaStudio OS
        </span>
      </div>

      {/* Card */}
      <div
        className="rounded-2xl p-8"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-subtle)',
        }}
      >
        <h2
          className="text-xl font-bold mb-1 text-center"
          style={{ color: 'var(--color-text)' }}
        >
          Bienvenido de vuelta
        </h2>
        <p
          className="text-sm text-center mb-6"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Inicia sesión en tu workspace
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: 'var(--color-danger)',
              }}
            >
              {error}
            </motion.div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--color-text-2)' }}
            >
              Correo electrónico
            </label>
            <div className="relative">
              <Mail
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}
              />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base pl-9"
                placeholder="you@viastudio.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--color-text-2)' }}
            >
              Contraseña
            </label>
            <div className="relative">
              <Lock
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base pl-9 pr-9"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: loading ? 'rgba(111,43,250,0.5)' : 'var(--color-primary)',
              color: 'white',
            }}
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <>
                Iniciar sesión
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>
      </div>

      <p
        className="text-center text-xs mt-4"
        style={{ color: 'var(--color-text-muted)' }}
      >
        ¿No tienes cuenta?{' '}
        <Link
          href="/signup"
          className="font-medium"
          style={{ color: 'var(--color-accent)' }}
        >
          Regístrate
        </Link>
      </p>
    </motion.div>
  )
}
