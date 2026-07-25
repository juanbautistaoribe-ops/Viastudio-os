'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Phone, Mail, Star, MoreHorizontal, Loader2, Users } from 'lucide-react'
import type { Client, Contact } from '@/types'

const EMPTY_FORM = { name: '', role: '', email: '', phone: '', isPrimary: false }

function ContactForm({
  initial,
  onSubmit,
  onCancel,
  loading,
  error,
}: {
  initial?: Partial<typeof EMPTY_FORM>
  onSubmit: (data: typeof EMPTY_FORM) => void
  onCancel: () => void
  loading: boolean
  error: string
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial })
  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>Nombre *</label>
          <input className="input-base w-full text-xs py-1.5" placeholder="Nombre completo" value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
        </div>
        <div>
          <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>Rol</label>
          <input className="input-base w-full text-xs py-1.5" placeholder="CEO, Marketing…" value={form.role} onChange={e => set('role', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>Email</label>
          <input type="email" className="input-base w-full text-xs py-1.5" placeholder="email@empresa.com" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>Teléfono</label>
          <input className="input-base w-full text-xs py-1.5" placeholder="+54 11 1234-5678" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.isPrimary}
          onChange={e => set('isPrimary', e.target.checked)}
          className="w-3.5 h-3.5 rounded accent-violet-600"
        />
        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Contacto principal</span>
      </label>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}>
          Cancelar
        </button>
        <button
          onClick={() => onSubmit(form)}
          disabled={loading || !form.name.trim()}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-60"
          style={{ background: 'var(--color-primary)' }}
        >
          {loading && <Loader2 size={11} className="animate-spin" />}
          Guardar
        </button>
      </div>
    </div>
  )
}

function ContactRow({
  contact,
  onEdit,
  onDelete,
}: {
  contact: Contact
  onEdit: (c: Contact) => void
  onDelete: (c: Contact) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div className="flex items-start gap-3 py-3 group" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white mt-0.5"
        style={{ background: contact.isPrimary ? 'var(--color-primary)' : 'var(--color-surface-3)' }}
      >
        {contact.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>{contact.name}</p>
          {contact.isPrimary && <Star size={9} fill="var(--color-accent)" style={{ color: 'var(--color-accent)', flexShrink: 0 }} />}
        </div>
        {contact.role && <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>{contact.role}</p>}
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-[10px] mt-1 hover:underline" style={{ color: 'var(--color-info)' }}>
            <Mail size={9} /> {contact.email}
          </a>
        )}
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-[10px] mt-0.5 hover:underline" style={{ color: 'var(--color-text-muted)' }}>
            <Phone size={9} /> {contact.phone}
          </a>
        )}
      </div>
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v) }}
          className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <MoreHorizontal size={13} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-7 z-30 rounded-xl shadow-xl py-1 w-28" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)' }}>
            <button onClick={() => { setMenuOpen(false); onEdit(contact) }} className="w-full text-left px-3 py-1.5 text-xs" style={{ color: 'var(--color-text-2)' }}>
              Editar
            </button>
            <button onClick={() => { setMenuOpen(false); onDelete(contact) }} className="w-full text-left px-3 py-1.5 text-xs" style={{ color: '#EF4444' }}>
              Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  client: Client | null
  onClose: () => void
}

export function ContactsPanel({ client, onClose }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!client) { setContacts([]); return }
    setLoading(true)
    fetch(`/api/clients/${client.id}/contacts`)
      .then(r => r.json())
      .then(data => setContacts(Array.isArray(data) ? data : []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false))
    setShowAdd(false)
    setEditingContact(null)
  }, [client?.id])

  async function handleAdd(form: typeof EMPTY_FORM) {
    if (!client) return
    if (!form.name.trim()) { setFormError('El nombre es obligatorio'); return }
    setSaving(true)
    setFormError('')
    try {
      const res = await fetch(`/api/clients/${client.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      const contact = await res.json()
      setContacts(prev => {
        const updated = form.isPrimary ? prev.map(c => ({ ...c, isPrimary: false })) : prev
        return [contact, ...updated].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
      })
      setShowAdd(false)
    } catch {
      setFormError('Error al guardar el contacto')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(form: typeof EMPTY_FORM) {
    if (!client || !editingContact) return
    setSaving(true)
    setFormError('')
    try {
      const res = await fetch(`/api/clients/${client.id}/contacts/${editingContact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      const updated = await res.json()
      setContacts(prev => {
        const list = form.isPrimary ? prev.map(c => ({ ...c, isPrimary: false })) : prev
        return list.map(c => c.id === editingContact.id ? updated : c)
          .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
      })
      setEditingContact(null)
    } catch {
      setFormError('Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(contact: Contact) {
    if (!client) return
    if (!confirm(`¿Eliminar a ${contact.name}?`)) return
    await fetch(`/api/clients/${client.id}/contacts/${contact.id}`, { method: 'DELETE' })
    setContacts(prev => prev.filter(c => c.id !== contact.id))
  }

  return (
    <AnimatePresence>
      {client && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
            style={{
              width: 360,
              background: 'var(--color-surface)',
              borderLeft: '1px solid var(--color-border-subtle)',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.3)',
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 shrink-0" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              <div>
                <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Contactos de</p>
                <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{client.company}</h2>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-3)' }}>
                <X size={14} />
              </button>
            </div>

            {/* Add button */}
            <div className="px-5 pt-4 pb-2 shrink-0">
              <button
                onClick={() => { setShowAdd(true); setEditingContact(null); setFormError('') }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold"
                style={{ background: 'var(--color-primary)', color: 'white' }}
              >
                <Plus size={13} strokeWidth={2.5} /> Agregar contacto
              </button>
            </div>

            {/* Add form */}
            {showAdd && (
              <div className="px-5 pb-3 shrink-0">
                <ContactForm
                  onSubmit={handleAdd}
                  onCancel={() => { setShowAdd(false); setFormError('') }}
                  loading={saving}
                  error={formError}
                />
              </div>
            )}

            {/* Contacts list */}
            <div className="flex-1 overflow-y-auto px-5">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
                </div>
              ) : contacts.length === 0 && !showAdd ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users size={28} className="mb-3 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Sin contactos todavía</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>Agregá el primer contacto con el botón de arriba</p>
                </div>
              ) : (
                contacts.map(contact => (
                  editingContact?.id === contact.id ? (
                    <div key={contact.id} className="py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <ContactForm
                        initial={{ name: contact.name, role: contact.role, email: contact.email, phone: contact.phone ?? '', isPrimary: contact.isPrimary }}
                        onSubmit={handleEdit}
                        onCancel={() => { setEditingContact(null); setFormError('') }}
                        loading={saving}
                        error={formError}
                      />
                    </div>
                  ) : (
                    <ContactRow
                      key={contact.id}
                      contact={contact}
                      onEdit={setEditingContact}
                      onDelete={handleDelete}
                    />
                  )
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
