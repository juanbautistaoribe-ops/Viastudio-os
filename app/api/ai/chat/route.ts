import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

export const maxDuration = 60

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are the AI assistant for ViaStudio OS, the internal operating system of a modern marketing agency.

Your role:
- Help the agency team with marketing strategy, copywriting, campaign analysis, and operations
- Generate weekly summaries, content ideas, meeting notes, and task lists
- Analyze client data and suggest improvements
- Draft professional communications
- Always be concise, actionable, and professional
- Respond in the same language the user uses (Spanish or English)

Context: This is ViaStudio, a digital marketing agency specializing in social media, paid ads, SEO, content, and branding for brands across Latin America and the US.

Formatting: Use markdown when helpful. Be concise but thorough. Prioritize actionable insights.`

export async function POST(req: NextRequest) {
  try {
    const { messages, systemContext } = await req.json()

    const system = systemContext
      ? `${SYSTEM_PROMPT}\n\nAdditional context:\n${systemContext}`
      : SYSTEM_PROMPT

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    return new Response(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
