'use client'

/* ============================================================================
 * NERUM — Builder bottom chat drawer ("Chat with Neru")
 * ----------------------------------------------------------------------------
 * Ported from the old /dashboard/agent page: chat input, message bubbles, and
 * the SSE streaming logic (api.stream → /agent/run). The War Room grid / Brain
 * Map / "Neru's mind" panel are intentionally dropped — the Builder's own orbit
 * canvas is now the live agent visualization.
 *
 * Collapsed → a 48px handle bar pinned to the bottom. Click → slides up to a
 * ~46vh chat panel (Framer Motion slide + fade, 300ms) that OVERLAYS the canvas
 * without resizing it. Messages persist in localStorage as a simple history.
 * ========================================================================== */

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, ChevronUp, ChevronDown, Plus } from 'lucide-react'
import { api } from '@/lib/api'

type Role = 'user' | 'neru'
interface Message { id: number; role: Role; text: string }
type Status = 'idle' | 'thinking' | 'responding'

const CONFIG_PANEL_W = 340 // matches the Builder node config side-panel width

const STORAGE_KEY = 'neru_chat_v1'
const GREETING: Message = {
  id: 0,
  role: 'neru',
  text: 'Vanakkam 👋 I’m Neru. Describe any task and I’ll wire it up across your tools. What should we automate today?',
}
const SUGGESTIONS = [
  'Send a WhatsApp receipt on every Razorpay payment',
  'Email new leads and follow up after a day',
  'Auto-reply to customer WhatsApp messages',
]

export default function AgentChatDrawer({ configOpen = false, open, onOpenChange }: { configOpen?: boolean; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const idRef = useRef(1)
  // Backend session id — null until the first `session` SSE event. Reused on
  // every send so the same conversation keeps its server-side memory; reset by
  // newChat() so a fresh chat gets a fresh server session.
  const sessionIdRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const busy = status !== 'idle'

  // simple conversation history — restore previous session from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Message[]
        if (Array.isArray(saved) && saved.length) {
          setMessages(saved)
          idRef.current = saved.reduce((m, x) => Math.max(m, x.id), 0) + 1
        }
      }
    } catch {
      /* ignore corrupt history */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {
      /* quota / disabled storage — non-fatal */
    }
  }, [messages])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, status, open])

  function newChat() {
    setMessages([GREETING])
    idRef.current = 1
    sessionIdRef.current = null // fresh conversation → fresh server session
    setStatus('idle')
  }

  function send(textArg?: string) {
    const text = (textArg ?? input).trim()
    if (!text || busy) return
    setMessages((m) => [...m, { id: ++idRef.current, role: 'user', text }])
    setInput('')
    setStatus('thinking')
    const neruId = ++idRef.current
    setMessages((m) => [...m, { id: neruId, role: 'neru', text: '' }])

    const appendErr = (msg: string) =>
      setMessages((m) => m.map((x) => (x.id === neruId ? { ...x, text: x.text || `⚠ ${msg}` } : x)))
    const appendMsg = (chunk: string) =>
      setMessages((m) => m.map((x) => (x.id === neruId ? { ...x, text: x.text ? `${x.text}\n${chunk}` : chunk } : x)))

    api
      .stream('/agent/run', { message: text, language: 'english', session_id: sessionIdRef.current }, (e) => {
        if (e.type === 'session') {
          // Capture the server session id so follow-ups reuse the same memory.
          if (e.session_id) sessionIdRef.current = e.session_id
        } else if (e.type === 'tool_start') {
          setStatus('responding')
        } else if (e.type === 'tool_result') {
          appendMsg(String(e.content ?? ''))
        } else if (e.type === 'tool_error') {
          appendMsg(`⚠ ${String(e.content ?? 'error')}`)
        } else if (e.type === 'complete') {
          setMessages((m) => m.map((x) => (x.id === neruId ? { ...x, text: String(e.content ?? '') || x.text } : x)))
          setStatus('idle')
        } else if (e.type === 'error') {
          appendErr(String(e.content ?? 'error'))
          setStatus('idle')
        }
        // thinking / plan / loop events are internal — orbit shows live state
      })
      .catch((err) => {
        appendErr(err instanceof Error ? err.message : 'Request failed')
        setStatus('idle')
      })
  }

  const statusColor = status === 'idle' ? '#00E676' : '#FFD60A'
  const statusLabel = status === 'thinking' ? 'thinking…' : status === 'responding' ? 'responding…' : 'online'

  return (
    <>
      {/* collapsed handle bar */}
      {!open && (
        <button
          onClick={() => onOpenChange(true)}
          aria-label="Open chat with Neru"
          style={{
            position: 'absolute',
            left: 0,
            right: configOpen ? CONFIG_PANEL_W : 0,
            bottom: 0,
            height: 48,
            zIndex: 8,
            transition: 'right 0.25s ease',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 16px',
            background: 'rgba(255,255,255,0.03)',
            borderTop: '0.5px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            color: '#cdd0dd',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}`, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Chat with Neru</span>
          <ChevronUp size={16} color="#6b7280" style={{ marginLeft: 'auto' }} />
        </button>
      )}

      {/* expanded chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'absolute',
              left: 0,
              right: configOpen ? CONFIG_PANEL_W : 0,
              bottom: 0,
              height: '46vh',
              minHeight: 300,
              zIndex: 8,
              transition: 'right 0.25s ease',
              display: 'flex',
              flexDirection: 'column',
              background: '#07080F',
              borderTop: '0.5px solid rgba(255,255,255,0.1)',
              boxShadow: '0 -24px 60px -28px rgba(0,0,0,0.9)',
            }}
          >
            {/* header / handle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}`, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>Chat with Neru</span>
              <span className="font-mono" style={{ fontSize: 11, color: statusColor }}>{statusLabel}</span>

              <button
                onClick={newChat}
                title="New chat"
                style={{ marginLeft: 'auto', background: '#7B2FFF22', border: '0.5px solid #7B2FFF55', borderRadius: 8, padding: '5px 10px', color: '#a78bfa', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <Plus size={13} /> New
              </button>
              <button onClick={() => onOpenChange(false)} aria-label="Collapse chat" style={{ background: '#111327', border: '0.5px solid #1e2240', borderRadius: 8, padding: 6, color: '#cdd0dd', cursor: 'pointer', display: 'inline-flex' }}>
                <ChevronDown size={16} />
              </button>
            </div>

            {/* messages */}
            <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {messages.map((m) => (
                <Bubble key={m.id} m={m} />
              ))}
              {status === 'thinking' && <TypingBubble />}

              {messages.length <= 1 && status === 'idle' && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      style={{ fontSize: 12, color: '#cdd0dd', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '7px 12px', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,107,0,0.5)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* input */}
            <div style={{ padding: 12, borderTop: '0.5px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 6 }}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Ask Neru to automate something…"
                  rows={1}
                  style={{ flex: 1, resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14, fontFamily: 'var(--font-sans)', padding: '8px 10px', maxHeight: 100, lineHeight: 1.5 }}
                />
                <button
                  onClick={() => send()}
                  disabled={busy || !input.trim()}
                  aria-label="Send"
                  style={{ width: 38, height: 38, borderRadius: 10, border: 'none', cursor: busy || !input.trim() ? 'default' : 'pointer', background: busy || !input.trim() ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #FF6B00, #7B2FFF)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function NeruAvatar({ size = 28 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg, #FF6B00, #7B2FFF)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: size * 0.42, color: '#fff', fontFamily: 'var(--font-display)' }}>
      N
    </span>
  )
}

function Bubble({ m }: { m: Message }) {
  const isUser = m.role === 'user'
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} style={{ display: 'flex', gap: 10, flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
      {!isUser && <NeruAvatar />}
      <div
        style={{
          maxWidth: '76%',
          padding: '11px 14px',
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          background: isUser ? 'linear-gradient(135deg, #FF6B00, #7B2FFF)' : 'rgba(255,255,255,0.04)',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
          color: isUser ? '#fff' : '#E7E9F4',
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {m.text || '…'}
      </div>
    </motion.div>
  )
}

function TypingBubble() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <NeruAvatar />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '13px 15px', borderRadius: '14px 14px 14px 4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {[0, 1, 2].map((i) => (
          <motion.span key={i} animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#9AA0B8' }} />
        ))}
      </div>
    </motion.div>
  )
}
