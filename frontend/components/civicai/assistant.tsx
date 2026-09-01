'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Loader2, Send, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { civicApi, type AssistantChatResponse } from '@/lib/civicai-api'
import { Action, Tag } from './shell'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  citations?: AssistantChatResponse['citations']
  trace?: AssistantChatResponse['agent_trace']
}

const STAFF_SUGGESTIONS = [
  'What are the most severe open incidents right now?',
  'Summarize hotspot activity across Lahore.',
  'Which department has the most unresolved incidents?',
]
const CITIZEN_SUGGESTIONS = [
  'What is the status of drainage complaints near me?',
  'How does CivicAI decide report severity?',
  'What should I do if my reported issue is not fixed?',
]

export function Assistant() {
  const { token, user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [expandedTrace, setExpandedTrace] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const suggestions = user?.role === 'staff' ? STAFF_SUGGESTIONS : CITIZEN_SUGGESTIONS

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text: string) {
    if (!token || !text.trim() || sending) return
    setMessages((m) => [...m, { role: 'user', content: text }])
    setInput('')
    setSending(true)
    try {
      const res = await civicApi.assistantChat(token, text, conversationId)
      setConversationId(res.conversation_id)
      setMessages((m) => [...m, { role: 'assistant', content: res.answer, citations: res.citations, trace: res.agent_trace }])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: err instanceof Error ? err.message : 'Something went wrong reaching the assistant.' },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col p-5 lg:p-8">
      <div className="mb-6">
        <Tag tone="blue">
          <Sparkles className="size-3.5" /> CivicAI assistant
        </Tag>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-.06em]">Ask about the city</h2>
        <p className="mt-2 text-muted-foreground">Grounded answers about civic status, backed by live data and cited sources.</p>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex-1 space-y-4 overflow-y-auto p-5 lg:p-6">
          {messages.length === 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-border bg-muted/40 px-3.5 py-2 text-sm hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xl rounded-2xl px-4 py-3 text-sm leading-6 ${
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1 border-t border-border/40 pt-2">
                    {m.citations.map((c, ci) => (
                      <a key={ci} href={c.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline underline-offset-2">
                        {c.title}
                      </a>
                    ))}
                  </div>
                )}
                {m.trace && m.trace.length > 0 && (
                  <button
                    onClick={() => setExpandedTrace(expandedTrace === i ? null : i)}
                    className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    Agent trace <ChevronDown className={`size-3 transition ${expandedTrace === i ? 'rotate-180' : ''}`} />
                  </button>
                )}
                {expandedTrace === i && m.trace && (
                  <div className="mt-2 flex flex-col gap-1 rounded-xl bg-card/60 p-2 text-xs text-muted-foreground">
                    {m.trace.map((step, si) => (
                      <p key={si}>
                        <span className="font-semibold">{step.agent}:</span> {step.action} — {step.detail}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Thinking…
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="flex items-center gap-2 border-t border-border p-4"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask CivicAI anything about the city…"
            className="h-12 flex-1 rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-4 focus:ring-primary/10"
          />
          <Action type="submit" disabled={sending || !input.trim()}>
            <Send className="size-4" />
          </Action>
        </form>
      </div>
    </div>
  )
}
