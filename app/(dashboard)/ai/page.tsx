'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '@/components/layout/header'
import {
  Sparkles, Send, Plus, Loader2, Copy, Check,
  TrendingUp, FileText, MessageSquare, Zap, BarChart,
  List, PenLine, Users, Lightbulb, ChevronRight, CheckSquare,
  ImageIcon, X
} from 'lucide-react'
import type { AIFunction } from '@/types'

interface CreatedTask {
  id: string
  title: string
  priority: string
  dueDate: string | null
  client: { name: string; company: string } | null
}

interface PendingImage {
  data: string
  mediaType: string
  name: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  image?: { data: string; mediaType: string }
  hadImage?: boolean
  createdAt: Date
  createdTasks?: CreatedTask[]
}

const AI_FUNCTIONS: {
  id: AIFunction
  label: string
  description: string
  icon: typeof Sparkles
  color: string
  prompt: string
}[] = [
  {
    id: 'weekly_summary',
    label: 'Resumen Semanal',
    description: 'Genera un resumen semanal completo de la agencia',
    icon: BarChart,
    color: '#6F2BFA',
    prompt: 'Generate a comprehensive weekly summary for ViaStudio agency. Include: key metrics, completed tasks, client updates, revenue highlights, upcoming priorities, and 3 recommended actions for next week.',
  },
  {
    id: 'content_ideas',
    label: 'Ideas de Contenido',
    description: 'Genera ideas de contenido frescas para clientes',
    icon: Lightbulb,
    color: '#F59E0B',
    prompt: 'Generate 10 creative and high-engagement content ideas for a beauty/skincare brand on Instagram and TikTok. Include content format, hook, and brief description for each.',
  },
  {
    id: 'copywriting',
    label: 'Copywriting',
    description: 'Redacta copy de alta conversión',
    icon: PenLine,
    color: '#3B82F6',
    prompt: 'Write 5 high-converting Instagram caption variations for a new product launch. Include: emotional hook, value proposition, social proof, and a clear CTA. Tone: professional but warm.',
  },
  {
    id: 'campaign_analysis',
    label: 'Análisis de Campañas',
    description: 'Analiza y optimiza tus campañas',
    icon: TrendingUp,
    color: '#22C55E',
    prompt: 'Analyze the following campaign metrics and provide optimization recommendations: CTR 1.8%, CPC $2.40, ROAS 2.8x, Conversion Rate 1.2%. What should we change to improve performance?',
  },
  {
    id: 'meeting_summary',
    label: 'Resumen de Reunión',
    description: 'Resume reuniones y extrae acciones clave',
    icon: MessageSquare,
    color: '#EC4899',
    prompt: 'Summarize the following client meeting notes and extract all action items with owners and deadlines:',
  },
  {
    id: 'task_generator',
    label: 'Generador de Tareas',
    description: 'Genera listas de tareas desde objetivos',
    icon: List,
    color: '#8B5CF6',
    prompt: 'Create a detailed task list for launching a complete social media strategy for a new e-commerce client. Organize by week, include owners (strategy, design, copy), and estimate time for each task.',
  },
  {
    id: 'client_analysis',
    label: 'Análisis de Cliente',
    description: 'Análisis profundo de la cuenta de un cliente',
    icon: Users,
    color: '#06B6D4',
    prompt: 'Perform a comprehensive analysis of a skincare brand client. Include: content performance patterns, audience insights, competitive positioning, 3 growth opportunities, and recommended strategy pivots.',
  },
  {
    id: 'strategy',
    label: 'Constructor de Estrategia',
    description: 'Crea estrategias de marketing completas',
    icon: Zap,
    color: '#F97316',
    prompt: 'Create a 90-day social media and paid ads strategy for a B2B SaaS company targeting marketing managers. Include: goals, channels, content mix, budget allocation, and KPIs.',
  },
]

function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) return (
          <h3 key={i} className="text-base font-bold mt-3 first:mt-0" style={{ color: 'var(--color-text)' }}>
            {line.slice(2)}
          </h3>
        )
        if (line.startsWith('## ')) return (
          <h4 key={i} className="text-sm font-semibold mt-2" style={{ color: 'var(--color-text)' }}>
            {line.slice(3)}
          </h4>
        )
        if (line.startsWith('**') && line.endsWith('**')) return (
          <p key={i} className="font-semibold" style={{ color: 'var(--color-text)' }}>
            {line.slice(2, -2)}
          </p>
        )
        if (line.startsWith('- ') || line.startsWith('* ')) return (
          <p key={i} className="flex items-start gap-2" style={{ color: 'inherit' }}>
            <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--color-accent)' }} />
            {line.slice(2)}
          </p>
        )
        if (/^\d+\. /.test(line)) return (
          <p key={i} className="flex items-start gap-2" style={{ color: 'inherit' }}>
            <span className="shrink-0 font-bold text-xs" style={{ color: 'var(--color-accent)' }}>
              {line.match(/^\d+/)?.[0]}.
            </span>
            {line.replace(/^\d+\. /, '')}
          </p>
        )
        if (line === '') return <div key={i} className="h-1" />
        return <p key={i} style={{ color: 'inherit' }}>{line}</p>
      })}
    </div>
  )
}

const PLAN_UNICO_DESCRIPTION = '12 piezas/mes (carruseles, fotos e historias) + 3 reels con guión + 3 pautas en Meta + programación de contenido + medición y presentación de métricas'

function buildClientContext(clients: any[]): string {
  if (!clients.length) return ''
  const lines = clients
    .filter(c => (c.status as string).toLowerCase() === 'active')
    .map(c => {
      const services = (c.services as string[]).map(s => s.toLowerCase().replace(/_/g, ' ')).join(', ')
      const plan = c.planType === 'unico'
        ? `Plan Único (${PLAN_UNICO_DESCRIPTION})`
        : c.planType === 'personalizado' && c.planNotes
          ? `Plan Personalizado: ${c.planNotes}`
          : 'Sin plan definido'
      return `- ${c.company} | Servicios: ${services || 'sin definir'} | ${c.currency} $${c.monthlyValue}/mes | ${plan}`
    })
  if (!lines.length) return ''
  return `Clientes activos de ViaStudio:\n${lines.join('\n')}`
}

export default function AIPage() {
  const [messages, setMessagesState] = useState<Record<string, Message[]>>({})
  const [convIds, setConvIds] = useState<Record<string, string>>({}) // functionId → DB conversation id
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [activeFn, setActiveFn] = useState<AIFunction | null>(null)
  const [clients, setClients] = useState<any[]>([])
  const [dbLoaded, setDbLoaded] = useState(false)
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentMessages = activeFn ? (messages[activeFn] ?? []) : []

  function setMessages(fnId: string, updater: Message[] | ((prev: Message[]) => Message[])) {
    setMessagesState(prev => {
      const current = prev[fnId] ?? []
      const next = typeof updater === 'function' ? updater(current) : updater
      return { ...prev, [fnId]: next }
    })
  }

  // Carga historial desde DB al montar
  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(r => r.json()).catch(() => []),
      fetch('/api/ai/conversations').then(r => r.json()).catch(() => []),
    ]).then(([clientData, convData]) => {
      if (Array.isArray(clientData)) setClients(clientData)
      if (Array.isArray(convData)) {
        const msgMap: Record<string, Message[]> = {}
        const idMap: Record<string, string> = {}
        // Toma la conversación más reciente por función
        for (const conv of convData) {
          const fnKey = conv.function.toLowerCase() as string
          if (!msgMap[fnKey]) {
            idMap[fnKey] = conv.id
            msgMap[fnKey] = (conv.messages ?? []).map((m: any) => {
              const IMAGE_PREFIX = '[imagen adjunta] '
              const hasImage = m.content.startsWith(IMAGE_PREFIX)
              return {
                id: m.id,
                role: m.role as 'user' | 'assistant',
                content: hasImage ? m.content.slice(IMAGE_PREFIX.length) : m.content,
                hadImage: hasImage || undefined,
                createdAt: new Date(m.createdAt),
              }
            })
          }
        }
        setMessagesState(msgMap)
        setConvIds(idMap)
      }
      setDbLoaded(true)
    })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages])

  async function saveMessage(fnId: string, role: string, content: string): Promise<string | null> {
    let convId = convIds[fnId]
    if (!convId) {
      const res = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionId: fnId, title: AI_FUNCTIONS.find(f => f.id === fnId)?.label ?? fnId }),
      })
      if (!res.ok) return null
      const conv = await res.json()
      convId = conv.id
      setConvIds(prev => ({ ...prev, [fnId]: convId }))
    }
    await fetch(`/api/ai/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, content }),
    })
    return convId
  }

  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      const base64 = dataUrl.split(',')[1]
      setPendingImage({ data: base64, mediaType: file.type, name: file.name })
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleImageFile(file)
  }

  async function sendMessage(content: string) {
    if ((!content.trim() && !pendingImage) || loading || !activeFn) return

    const imageToSend = pendingImage
    setPendingImage(null)

    const userMsg: Message = {
      id: Math.random().toString(36).slice(2),
      role: 'user',
      content: content.trim(),
      image: imageToSend ? { data: imageToSend.data, mediaType: imageToSend.mediaType } : undefined,
      createdAt: new Date(),
    }

    const newMessages = [...currentMessages, userMsg]
    setMessages(activeFn, newMessages)
    setInput('')
    setLoading(true)

    const assistantMsg: Message = {
      id: Math.random().toString(36).slice(2),
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    }
    setMessages(activeFn, [...newMessages, assistantMsg])

    // Guarda el mensaje del usuario en DB (crea la conversación si no existe)
    const fnId = activeFn
    const savedContent = imageToSend
      ? `[imagen adjunta] ${userMsg.content}`.trim()
      : userMsg.content
    saveMessage(fnId, 'user', savedContent)

    try {
      const clientContext = buildClientContext(clients)

      if (fnId === 'task_generator') {
        // Usa el endpoint con tool calling para crear tareas reales
        const response = await fetch('/api/ai/create-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
            systemContext: clientContext || undefined,
            currentImage: imageToSend ?? undefined,
          }),
        })
        if (!response.ok) throw new Error('API error')
        const data = await response.json()
        const fullContent = data.text ?? ''
        const createdTasks = data.createdTasks ?? []
        setMessages(fnId, (prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...assistantMsg, content: fullContent, createdTasks }
          return updated
        })
        if (fullContent) saveMessage(fnId, 'assistant', fullContent)
      } else {
        // Chat normal con streaming
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
            functionId: activeFn,
            systemContext: clientContext || undefined,
            currentImage: imageToSend ?? undefined,
          }),
        })
        if (!response.ok) throw new Error('API error')

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let fullContent = ''

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value)
            fullContent += chunk
            setMessages(fnId, (prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = { ...assistantMsg, content: fullContent }
              return updated
            })
          }
        }
        if (fullContent) saveMessage(fnId, 'assistant', fullContent)
      }
    } catch {
      setMessages(fnId, (prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...assistantMsg,
          content: 'Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo.',
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
    // paste image from clipboard
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      navigator.clipboard.read?.().then(items => {
        for (const item of items) {
          const imgType = item.types.find(t => t.startsWith('image/'))
          if (imgType) {
            item.getType(imgType).then(blob => handleImageFile(new File([blob], 'pasted.png', { type: imgType })))
          }
        }
      }).catch(() => {})
    }
  }

  async function copyMessage(content: string, id: string) {
    await navigator.clipboard.writeText(content)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  async function newConversation() {
    if (!activeFn) return
    // Borra la conversación actual en DB y crea una nueva al mandar el próximo mensaje
    setMessages(activeFn, [])
    setConvIds(prev => { const n = { ...prev }; delete n[activeFn]; return n })
    setInput('')
  }

  function useFunction(fn: typeof AI_FUNCTIONS[0]) {
    setActiveFn(fn.id)
    const hasHistory = (messages[fn.id] ?? []).length > 0
    if (!hasHistory) setInput(fn.prompt)
    else setInput('')
    textareaRef.current?.focus()
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div
        className="w-72 flex flex-col shrink-0 overflow-hidden"
        style={{ borderRight: '1px solid var(--color-border-subtle)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(111,43,250,0.15)', color: 'var(--color-accent)' }}
            >
              <Sparkles size={13} />
            </div>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
              Funciones IA
            </span>
          </div>
          <button
            onClick={newConversation}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-colors"
            style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}
          >
            <Plus size={10} /> Nuevo
          </button>
        </div>

        {/* Functions */}
        <div className="flex-1 overflow-y-auto p-2">
          {AI_FUNCTIONS.map((fn) => {
            const Icon = fn.icon
            return (
              <button
                key={fn.id}
                onClick={() => useFunction(fn)}
                className="w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all mb-1"
                style={{
                  background: activeFn === fn.id ? `${fn.color}12` : 'transparent',
                  border: activeFn === fn.id ? `1px solid ${fn.color}30` : '1px solid transparent',
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${fn.color}18`, color: fn.color }}
                >
                  <Icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                    {fn.label}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {fn.description}
                  </p>
                </div>
                <ChevronRight size={11} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
              </button>
            )
          })}
        </div>

        {/* Model info */}
        <div
          className="px-3 py-2.5 shrink-0"
          style={{ borderTop: '1px solid var(--color-border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--color-success)' }}
            />
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              Claude Sonnet 4 · Listo
            </p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Nav */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
        >
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {activeFn
                ? AI_FUNCTIONS.find((f) => f.id === activeFn)?.label ?? 'AI Center'
                : 'AI Center'
              }
            </h2>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              Impulsado por Claude · ViaStudio OS
            </p>
          </div>
          {currentMessages.length > 0 && (
            <button
              onClick={newConversation}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}
            >
              Limpiar chat
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5">
          {currentMessages.length === 0 ? (
            <WelcomeScreen onSelect={(fn) => useFunction(fn)} />
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {currentMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'rgba(111,43,250,0.15)', color: 'var(--color-accent)' }}
                    >
                      <Sparkles size={13} />
                    </div>
                  )}

                  <div className={`group max-w-2xl ${msg.role === 'user' ? 'max-w-lg' : ''}`}>
                    <div
                      className="rounded-2xl px-4 py-3 text-sm"
                      style={
                        msg.role === 'user'
                          ? {
                              background: 'var(--color-primary)',
                              color: 'white',
                              borderBottomRightRadius: '4px',
                            }
                          : {
                              background: 'var(--color-surface)',
                              border: '1px solid var(--color-border-subtle)',
                              color: 'var(--color-text-2)',
                              borderBottomLeftRadius: '4px',
                            }
                      }
                    >
                      {msg.role === 'user' && msg.image && (
                        <img
                          src={`data:${msg.image.mediaType};base64,${msg.image.data}`}
                          alt="imagen adjunta"
                          className="max-w-xs max-h-48 rounded-xl mb-2 object-cover"
                        />
                      )}
                      {msg.role === 'user' && !msg.image && msg.hadImage && (
                        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.15)' }}>
                          <ImageIcon size={11} />
                          <span>Imagen enviada (no disponible en historial)</span>
                        </div>
                      )}
                    {msg.role === 'assistant' && msg.content === '' && loading ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: 'var(--color-accent)' }}
                                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                              />
                            ))}
                          </div>
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            Pensando…
                          </span>
                        </div>
                      ) : msg.role === 'assistant' ? (
                        <MessageContent content={msg.content} />
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>

                    {msg.role === 'assistant' && msg.createdTasks && msg.createdTasks.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {msg.createdTasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs"
                            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
                          >
                            <CheckSquare size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--color-success)' }} />
                            <div>
                              <p className="font-semibold" style={{ color: 'var(--color-text)' }}>
                                ✓ Tarea creada: {task.title}
                              </p>
                              <p style={{ color: 'var(--color-text-muted)' }}>
                                {[
                                  task.client?.company,
                                  task.priority,
                                  task.dueDate ? `Vence ${new Date(task.dueDate).toLocaleDateString('es-AR')}` : null,
                                ].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.role === 'assistant' && msg.content && (
                      <button
                        onClick={() => copyMessage(msg.content, msg.id)}
                        className="flex items-center gap-1 mt-1.5 ml-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {copied === msg.id ? (
                          <><Check size={10} style={{ color: 'var(--color-success)' }} /> Copiado</>
                        ) : (
                          <><Copy size={10} /> Copiar</>
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div
          className="px-5 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--color-border-subtle)' }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="max-w-3xl mx-auto relative">
            {/* Drag overlay */}
            <AnimatePresence>
              {isDragging && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl pointer-events-none"
                  style={{ background: 'rgba(111,43,250,0.12)', border: '2px dashed var(--color-primary)' }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon size={24} style={{ color: 'var(--color-primary)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>Soltá la imagen aquí</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Image preview */}
            {pendingImage && (
              <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)' }}>
                <img
                  src={`data:${pendingImage.mediaType};base64,${pendingImage.data}`}
                  alt="preview"
                  className="w-10 h-10 rounded-lg object-cover shrink-0"
                />
                <p className="text-xs flex-1 truncate" style={{ color: 'var(--color-text-muted)' }}>{pendingImage.name}</p>
                <button onClick={() => setPendingImage(null)} className="w-5 h-5 rounded flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                  <X size={12} />
                </button>
              </div>
            )}

            <div
              className="flex items-end gap-3 p-3 rounded-2xl"
              style={{
                background: 'var(--color-surface)',
                border: isDragging ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              }}
            >
              {/* Image upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                title="Adjuntar imagen"
                style={{ color: pendingImage ? 'var(--color-primary)' : 'var(--color-text-muted)', background: pendingImage ? 'rgba(111,43,250,0.12)' : 'transparent' }}
              >
                <ImageIcon size={15} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = '' }}
              />

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={pendingImage ? 'Describí qué hacer con la imagen…' : 'Pregúntale a Claude sobre tu agencia…'}
                rows={1}
                className="flex-1 text-sm resize-none bg-transparent outline-none"
                style={{
                  color: 'var(--color-text)',
                  minHeight: '20px',
                  maxHeight: '120px',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={(!input.trim() && !pendingImage) || loading}
                className="flex items-center justify-center w-8 h-8 rounded-xl transition-all shrink-0"
                style={{
                  background: (input.trim() || pendingImage) && !loading ? 'var(--color-primary)' : 'var(--color-surface-3)',
                  color: (input.trim() || pendingImage) && !loading ? 'white' : 'var(--color-text-muted)',
                }}
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
            <p className="text-center text-[10px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Enter para enviar · Shift+Enter para nueva línea · Arrastrá una imagen o usá el ícono
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function WelcomeScreen({ onSelect }: { onSelect: (fn: typeof AI_FUNCTIONS[0]) => void }) {
  const quickStart = AI_FUNCTIONS.slice(0, 4)
  return (
    <div className="flex flex-col items-center justify-center min-h-full py-12 max-w-2xl mx-auto">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'rgba(111,43,250,0.12)', color: 'var(--color-accent)' }}
      >
        <Sparkles size={26} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
        Centro IA
      </h2>
      <p className="text-sm mb-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
        Tu asistente inteligente de agencia, impulsado por Claude.
        <br />Inicia una conversación o elige una función.
      </p>

      <div className="grid grid-cols-2 gap-3 w-full">
        {quickStart.map((fn) => {
          const Icon = fn.icon
          return (
            <button
              key={fn.id}
              onClick={() => onSelect(fn)}
              className="flex items-start gap-3 p-4 rounded-xl text-left transition-all card-hover"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${fn.color}18`, color: fn.color }}
              >
                <Icon size={15} />
              </div>
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--color-text)' }}>
                  {fn.label}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {fn.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
