'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Check, Loader2, Zap } from 'lucide-react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { api } from '@/lib/api'

type Role = 'user' | 'neru'
interface Message { id: number; role: Role; text: string }
interface Thought { label: string; done: boolean }
interface FlowChip { label: string; color: string }
type Status = 'idle' | 'thinking' | 'responding'

const SUGGESTIONS = [
  'Send a WhatsApp receipt on every Razorpay payment',
  'Email new leads and follow up after a day',
  'Auto-reply to customer WhatsApp messages',
]

export default function NeruAgentPage() {
  const reduced = useReducedMotion()
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: 'neru', text: 'Vanakkam Sri Hari 👋 I’m Neru. Describe any task and I’ll wire it up across your tools. What should we automate today?' },
  ])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [flow, setFlow] = useState<FlowChip[]>([])
  const idRef = useRef(1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const busy = status !== 'idle'

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, status])

  function send(textArg?: string) {
    const text = (textArg ?? input).trim()
    if (!text || busy) return
    setMessages((m) => [...m, { id: ++idRef.current, role: 'user', text }])
    setInput('')
    setStatus('thinking')
    setThoughts([])
    setFlow([])
    const neruId = ++idRef.current
    setMessages((m) => [...m, { id: neruId, role: 'neru', text: '' }])

    const appendErr = (msg: string) =>
      setMessages((m) => m.map((x) => (x.id === neruId ? { ...x, text: x.text || `⚠ ${msg}` } : x)))

    api
      .stream('/agent/run', { message: text, language: 'english' }, (e) => {
        const finishLastThought = () =>
          setThoughts((t) => t.map((x, i) => (i === t.length - 1 && !x.done ? { ...x, done: true } : x)))
        const appendMsg = (chunk: string) =>
          setMessages((m) => m.map((x) => (x.id === neruId ? { ...x, text: x.text ? `${x.text}\n${chunk}` : chunk } : x)))

        if (e.type === 'thinking' || e.type === 'plan') {
          setThoughts((t) => [...t, { label: String(e.content ?? ''), done: true }])
        } else if (e.type === 'tool_start') {
          setStatus('responding')
          setThoughts((t) => [...t, { label: String(e.content ?? ''), done: false }])
        } else if (e.type === 'tool_result') {
          finishLastThought()
          appendMsg(String(e.content ?? ''))
        } else if (e.type === 'tool_error') {
          finishLastThought()
          appendMsg(`⚠ ${String(e.content ?? 'error')}`)
        } else if (e.type === 'loop' || e.type === 'session') {
          // internal — ignore
        } else if (e.type === 'complete') {
          setMessages((m) => m.map((x) => (x.id === neruId ? { ...x, text: String(e.content ?? '') || x.text } : x)))
          setStatus('idle')
        } else if (e.type === 'error') {
          appendErr(String(e.content ?? 'error'))
          setStatus('idle')
        }
      })
      .catch((err) => {
        appendErr(err instanceof Error ? err.message : 'Request failed')
        setStatus('idle')
      })
  }

  const statusLabel = status === 'thinking' ? 'thinking…' : status === 'responding' ? 'responding…' : 'online'
  const statusColor = status === 'idle' ? '#00E676' : '#FFD60A'

  return (
    <div className="agent-wrap" style={{ height: '100%', display: 'grid', gridTemplateColumns: '1fr 340px' }}>
      {/* ===== chat column ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <img src="/nerum-logo.png" width={36} height={36} alt="Neru" style={{ borderRadius: '50%' }} onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
          <div>
            <div className="font-display plasma-gradient-text" style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.04em' }}>NERU</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }} className="font-mono">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
              <span style={{ color: statusColor }}>{statusLabel}</span>
            </div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'rgba(255,255,255,0.3)', display: 'inline-flex', alignItems: 'center', gap: 6 }} className="font-mono">
            <Zap size={13} color="#FFD60A" /> demo mode
          </span>
        </div>

        {/* messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((m) => (
            <Bubble key={m.id} m={m} />
          ))}
          {status === 'thinking' && <TypingBubble />}

          {messages.length <= 1 && status === 'idle' && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{ fontSize: 12.5, color: '#cdd0dd', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '8px 13px', cursor: 'pointer', textAlign: 'left' }}
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
        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 8 }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Ask Neru to automate something…"
              rows={1}
              style={{ flex: 1, resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14.5, fontFamily: 'var(--font-sans)', padding: '8px 10px', maxHeight: 120, lineHeight: 1.5 }}
            />
            <button
              onClick={() => send()}
              disabled={busy || !input.trim()}
              aria-label="Send"
              style={{ width: 40, height: 40, borderRadius: 11, border: 'none', cursor: busy || !input.trim() ? 'default' : 'pointer', background: busy || !input.trim() ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #FF6B00, #7B2FFF)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}
            >
              <Send size={17} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#555d72', marginTop: 8, textAlign: 'center' }}>Neru can build workflows, draft messages and read your data. Enter to send.</p>
        </div>
      </div>

      {/* ===== Neru's mind panel ===== */}
      <div className="agent-mind" style={{ display: 'flex', flexDirection: 'column', padding: 20, overflowY: 'auto', gap: 18 }}>
        <MindOrb status={status} reduced={reduced} />

        <div>
          <h3 className="font-mono plasma-gradient-text" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>Reasoning</h3>
          {thoughts.length === 0 ? (
            <p style={{ fontSize: 13, color: '#555d72' }}>Neru&apos;s thought process appears here while it works.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {thoughts.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: t.done ? '#00E676' : '#FFD60A' }}>
                    {t.done ? <Check size={14} /> : <Loader2 size={13} className={reduced ? '' : 'spin-slow'} style={reduced ? undefined : { animationDuration: '1s' }} />}
                  </span>
                  <span style={{ color: t.done ? '#cdd0dd' : '#9AA0B8' }}>{t.label}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {flow.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h3 className="font-mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#6B7090', textTransform: 'uppercase', marginBottom: 12 }}>Building</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {flow.map((f, i) => (
                  <motion.div key={f.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.18 }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${f.color}44`, borderLeft: `3px solid ${f.color}` }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: f.color }} />
                    <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{f.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .agent-wrap { grid-template-columns: 1fr !important; }
          .agent-mind { display: none !important; }
        }
      `}</style>
    </div>
  )
}

function NeruAvatar({ size = 30 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg, #FF6B00, #7B2FFF)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: size * 0.42, color: '#fff', fontFamily: 'var(--font-display)' }}>
      N
    </span>
  )
}

function Bubble({ m }: { m: Message }) {
  const isUser = m.role === 'user'
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} style={{ display: 'flex', gap: 10, flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
      {!isUser && <NeruAvatar />}
      <div
        style={{
          maxWidth: '76%',
          padding: '12px 15px',
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          background: isUser ? 'linear-gradient(135deg, #FF6B00, #7B2FFF)' : 'rgba(255,255,255,0.04)',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
          color: isUser ? '#fff' : '#E7E9F4',
          fontSize: 14.5,
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <NeruAvatar />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '14px 16px', borderRadius: '14px 14px 14px 4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {[0, 1, 2].map((i) => (
          <motion.span key={i} animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#9AA0B8' }} />
        ))}
      </div>
    </motion.div>
  )
}

function MindOrb({ status, reduced }: { status: Status; reduced: boolean }) {
  const active = status !== 'idle'
  return (
    <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {active && !reduced && (
        <>
          <span className="ping-ring" style={{ position: 'absolute', width: 70, height: 70, borderRadius: '50%', background: 'rgba(123,47,255,0.3)' }} />
          <span className="ping-ring" style={{ position: 'absolute', width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,107,0,0.25)', animationDelay: '0.6s' }} />
        </>
      )}
      <motion.div
        animate={reduced ? undefined : { scale: active ? [1, 1.12, 1] : [1, 1.05, 1] }}
        transition={{ duration: active ? 1.1 : 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: 78, height: 78, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #FFD60A, #FF6B00 40%, #7B2FFF 100%)', boxShadow: active ? '0 0 50px -6px rgba(123,47,255,0.8)' : '0 0 36px -10px rgba(123,47,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <span className="font-display" style={{ fontSize: 30, fontWeight: 700, color: '#fff' }}>N</span>
      </motion.div>
    </div>
  )
}
