'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Header } from '@/components/layout/header'
import { Avatar } from '@/components/shared/avatar'
import {
  User, Shield, Palette, Plug, Bell, Key,
  ChevronRight, Check, Zap, ExternalLink, Loader2
} from 'lucide-react'

const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'security', label: 'Seguridad', icon: Shield },
  { id: 'appearance', label: 'Apariencia', icon: Palette },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'integrations', label: 'Integraciones', icon: Plug },
  { id: 'api', label: 'API Keys', icon: Key },
]

const INTEGRATIONS = [
  { id: 'claude', name: 'Claude API', description: 'Asistente IA para contenido y estrategia', status: 'connected', color: '#6F2BFA' },
  { id: 'supabase', name: 'Supabase', description: 'Base de datos y autenticación', status: 'connected', color: '#3ECF8E' },
  { id: 'google', name: 'Google Calendar', description: 'Sincroniza reuniones y eventos', status: 'disconnected', color: '#4285F4' },
  { id: 'whatsapp', name: 'WhatsApp Business', description: 'Comunicación con clientes por WhatsApp', status: 'coming_soon', color: '#25D366' },
  { id: 'n8n', name: 'n8n Automations', description: 'Automatización de flujos de trabajo', status: 'coming_soon', color: '#FF6D5A' },
  { id: 'slack', name: 'Slack', description: 'Notificaciones del equipo', status: 'disconnected', color: '#4A154B' },
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  async function handleSave(name: string) {
    setSaveError('')
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setSaveError('Error al guardar. Intentá de nuevo.')
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Settings nav */}
        <div
          className="w-56 shrink-0 p-3 space-y-0.5 overflow-y-auto"
          style={{ borderRight: '1px solid var(--color-border-subtle)' }}
        >
          {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className="sidebar-item w-full"
              style={activeSection === id ? {
                background: 'rgba(111,43,250,0.12)',
                color: 'var(--color-text)',
                boxShadow: 'inset 0 0 0 1px rgba(111,43,250,0.18)',
              } : {}}
            >
              <Icon size={15} style={activeSection === id ? { color: 'var(--color-primary)' } : {}} />
              {label}
            </button>
          ))}
        </div>

        {/* Settings content */}
        <div className="flex-1 overflow-y-auto p-8">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-2xl"
          >
            {activeSection === 'profile' && <ProfileSettings onSave={handleSave} saved={saved} saveError={saveError} />}
            {activeSection === 'integrations' && <IntegrationsSettings />}
            {activeSection === 'appearance' && <AppearanceSettings />}
            {activeSection === 'notifications' && <NotificationsSettings />}
            {activeSection === 'security' && <SecuritySettings />}
            {activeSection === 'api' && <APISettings />}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function SettingSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{title}</h3>
      {description && <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>{description}</p>}
      {!description && <div className="mb-4" />}
      {children}
    </div>
  )
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{label}</p>
        {description && <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="relative w-9 h-5 rounded-full transition-all"
      style={{ background: enabled ? 'var(--color-primary)' : 'var(--color-surface-3)' }}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
        style={{ transform: enabled ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

function ProfileSettings({ onSave, saved, saveError }: { onSave: (name: string) => void; saved: boolean; saveError: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings/profile')
      .then(r => r.json())
      .then(data => { setName(data.name ?? ''); setEmail(data.email ?? '') })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h2 className="text-base font-bold mb-6" style={{ color: 'var(--color-text)' }}>Perfil</h2>

      <SettingSection title="Avatar">
        <div className="flex items-center gap-4">
          <Avatar name={name || 'U'} size="lg" />
          <button
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}
          >
            Cambiar foto
          </button>
        </div>
      </SettingSection>

      <SettingSection title="Información personal">
        {loading ? (
          <div className="flex items-center gap-2 py-4" style={{ color: 'var(--color-text-muted)' }}>
            <Loader2 size={14} className="animate-spin" /> Cargando…
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>Nombre completo</label>
              <input type="text" className="input-base text-xs" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>Email</label>
              <input type="email" className="input-base text-xs opacity-60" value={email} disabled />
            </div>
          </div>
        )}
      </SettingSection>

      {saveError && <p className="text-xs text-red-400 mb-3">{saveError}</p>}

      <button
        onClick={() => onSave(name)}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
        style={{ background: 'var(--color-primary)' }}
      >
        {saved ? <><Check size={14} /> ¡Guardado!</> : 'Guardar cambios'}
      </button>
    </div>
  )
}

function IntegrationsSettings() {
  return (
    <div>
      <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>Integraciones</h2>
      <p className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Conecta ViaStudio OS con tus herramientas favoritas.
      </p>

      <div className="space-y-3">
        {INTEGRATIONS.map((integration) => (
          <div
            key={integration.id}
            className="flex items-center justify-between p-4 rounded-xl"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${integration.color}18` }}
              >
                <Zap size={16} style={{ color: integration.color }} />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                  {integration.name}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {integration.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {integration.status === 'connected' && (
                <span className="badge badge-success">Conectado</span>
              )}
              {integration.status === 'coming_soon' && (
                <span className="badge badge-muted">Próximamente</span>
              )}
              {integration.status === 'disconnected' && (
                <button
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium"
                  style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}
                >
                  Conectar <ExternalLink size={10} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AppearanceSettings() {
  return (
    <div>
      <h2 className="text-base font-bold mb-6" style={{ color: 'var(--color-text)' }}>Apariencia</h2>
      <SettingSection title="Tema" description="ViaStudio OS usa un tema oscuro premium por defecto.">
        <div className="flex gap-3">
          {[
            { id: 'dark', label: 'Oscuro', active: true },
          ].map(({ id, label, active }) => (
            <div
              key={id}
              className="w-20 h-14 rounded-xl flex items-end justify-center pb-2 cursor-pointer"
              style={{
                background: 'var(--color-bg)',
                border: active ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
              }}
            >
              <span className="text-[9px] font-medium" style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </SettingSection>
    </div>
  )
}

function NotificationsSettings() {
  const [settings, setSettings] = useState({
    tasksDue: true,
    newLeads: true,
    payments: true,
    mentions: false,
    weekly: true,
  })
  return (
    <div>
      <h2 className="text-base font-bold mb-6" style={{ color: 'var(--color-text)' }}>Notificaciones</h2>
      <Field label="Tareas para hoy" description="Recibe recordatorios de tareas con vencimiento hoy">
        <Toggle enabled={settings.tasksDue} onChange={(v) => setSettings(s => ({ ...s, tasksDue: v }))} />
      </Field>
      <Field label="Nuevos leads" description="Notificar cuando se agrega un nuevo lead">
        <Toggle enabled={settings.newLeads} onChange={(v) => setSettings(s => ({ ...s, newLeads: v }))} />
      </Field>
      <Field label="Pagos recibidos" description="Notificar cuando se registra un pago">
        <Toggle enabled={settings.payments} onChange={(v) => setSettings(s => ({ ...s, payments: v }))} />
      </Field>
      <Field label="Menciones" description="Notificar cuando alguien te menciona en un comentario">
        <Toggle enabled={settings.mentions} onChange={(v) => setSettings(s => ({ ...s, mentions: v }))} />
      </Field>
      <Field label="Resumen semanal IA" description="Recibe tu resumen semanal de agencia generado por IA">
        <Toggle enabled={settings.weekly} onChange={(v) => setSettings(s => ({ ...s, weekly: v }))} />
      </Field>
    </div>
  )
}

function SecuritySettings() {
  return (
    <div>
      <h2 className="text-base font-bold mb-6" style={{ color: 'var(--color-text)' }}>Seguridad</h2>
      <SettingSection title="Cambiar contraseña">
        <div className="space-y-3 max-w-sm">
          {['Contraseña actual', 'Nueva contraseña', 'Confirmar nueva contraseña'].map((label) => (
            <div key={label}>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>{label}</label>
              <input type="password" className="input-base text-xs" placeholder="••••••••" />
            </div>
          ))}
          <button
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            Actualizar contraseña
          </button>
        </div>
      </SettingSection>
    </div>
  )
}

function APISettings() {
  return (
    <div>
      <h2 className="text-base font-bold mb-6" style={{ color: 'var(--color-text)' }}>API Keys</h2>
      <SettingSection title="Variables de entorno" description="Configura tus API keys en el archivo .env.local.">
        <div className="space-y-3">
          {[
            { key: 'ANTHROPIC_API_KEY', label: 'Anthropic (Claude)', masked: true },
            { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL', masked: false },
            { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key', masked: true },
          ].map(({ key, label, masked }) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>{label}</label>
              <div className="relative">
                <input
                  type={masked ? 'password' : 'text'}
                  className="input-base text-xs font-mono"
                  placeholder={`Set ${key} in .env.local`}
                />
              </div>
            </div>
          ))}
        </div>
      </SettingSection>
    </div>
  )
}
