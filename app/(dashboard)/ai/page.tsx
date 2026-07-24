'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '@/components/layout/header'
import {
  Sparkles, Send, Plus, Loader2, Copy, Check,
  TrendingUp, FileText, MessageSquare, Zap, BarChart,
  List, PenLine, Users, Lightbulb, ChevronRight
} from 'lucide-react'
import type { AIFunction } from '@/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
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

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [activeFn, setActiveFn] = useState<AIFunction | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return

    const userMsg: Message = {
      id: Math.random().toString(36).slice(2),
      role: 'user',
      content: content.trim(),
      createdAt: new Date(),
    }

    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const assistantMsg: Message = {
      id: Math.random().toString(36).slice(2),
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    }
    setMessages([...newMessages, assistantMsg])

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
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
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = { ...assistantMsg, content: fullContent }
            return updated
          })
        }
      }
    } catch (error) {
      setMessages((prev) => {
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
  }

  async function copyMessage(content: string, id: string) {
    await navigator.clipboard.writeText(content)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function newConversation() {
    setMessages([])
    setActiveFn(null)
    setInput('')
  }

  function useFunction(fn: typeof AI_FUNCTIONS[0]) {
    setActiveFn(fn.id)
    setMessages([])
    setInput(fn.prompt)
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
          {messages.length > 0 && (
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
          {messages.length === 0 ? (
            <WelcomeScreen onSelect={(fn) => useFunction(fn)} />
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg) => (
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
        >
          <div className="max-w-3xl mx-auto">
            <div
              className="flex items-end gap-3 p-3 rounded-2xl"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregúntale a Claude sobre tu agencia…"
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
                disabled={!input.trim() || loading}
                className="flex items-center justify-center w-8 h-8 rounded-xl transition-all shrink-0"
                style={{
                  background: input.trim() && !loading ? 'var(--color-primary)' : 'var(--color-surface-3)',
                  color: input.trim() && !loading ? 'white' : 'var(--color-text-muted)',
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
              Enter para enviar · Shift+Enter para nueva línea
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
