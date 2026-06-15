'use client'

import { ReactNode } from 'react'
import { motion, useMotionTemplate, useTransform } from 'framer-motion'
import { MessageCircle, Mail, Users, Sparkles, IndianRupee, Send, LucideIcon } from 'lucide-react'
import { useTilt } from '@/hooks/useTilt'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import Reveal from './Reveal'

interface Feature {
  icon: LucideIcon
  title: string
  desc: string
  accent: string
  span: 1 | 2
  visual?: ReactNode
}

// Decorative chat bubbles for the WhatsApp hero card.
function ChatVisual() {
  return (
    <div style={{ position: 'absolute', right: 22, bottom: 18, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', opacity: 0.9 }}>
      <span style={{ fontSize: 12, color: '#0b0b0b', background: '#25D366', padding: '7px 12px', borderRadius: '12px 12px 4px 12px', fontWeight: 600 }}>Order received ✓</span>
      <span style={{ fontSize: 12, color: '#E7E9F4', background: 'rgba(255,255,255,0.07)', padding: '7px 12px', borderRadius: '12px 12px 12px 4px' }}>Vanakkam! Saved 🙏</span>
    </div>
  )
}

// Faux workflow code for the AI card.
function CodeVisual() {
  return (
    <div className="font-mono" style={{ position: 'absolute', right: 22, bottom: 18, fontSize: 11.5, lineHeight: 1.8, color: '#9AA0B8', textAlign: 'right', opacity: 0.85 }}>
      <div><span style={{ color: '#FF6B00' }}>when</span> message.contains(<span style={{ color: '#00D4FF' }}>"order"</span>)</div>
      <div><span style={{ color: '#7B2FFF' }}>then</span> reply + log + charge</div>
    </div>
  )
}

const FEATURES: Feature[] = [
  { icon: MessageCircle, title: 'WhatsApp Automation', desc: 'Auto-reply, broadcast, reminders and order confirmations — on the channel your customers actually use. Tamil or English.', accent: '#25D366', span: 2, visual: <ChatVisual /> },
  { icon: Mail, title: 'Gmail Campaigns', desc: 'Trigger-based emails and follow-ups straight from your inbox.', accent: '#EA4335', span: 1 },
  { icon: Users, title: 'Smart Lists', desc: 'Auto-segment customers by spend, visit or condition. Always up to date.', accent: '#FFD60A', span: 1 },
  { icon: Sparkles, title: 'AI Workflows', desc: 'Describe what you want in plain language. Nerum builds the multi-step flow and runs it for you.', accent: '#7B2FFF', span: 2, visual: <CodeVisual /> },
  { icon: IndianRupee, title: 'Razorpay Payments', desc: 'Send payment links and reconcile automatically.', accent: '#00D4FF', span: 1 },
  { icon: Send, title: 'Telegram Bot', desc: 'Run alerts, approvals and internal ops from a Telegram bot your whole team can use.', accent: '#26A5E4', span: 2 },
]

function FeatureCard({ f, index }: { f: Feature; index: number }) {
  const reduced = useReducedMotion()
  const { ref, rotateX, rotateY, px, py, onMouseMove, onMouseLeave } = useTilt(7)
  const gx = useTransform(px, (v) => `${v * 100}%`)
  const gy = useTransform(py, (v) => `${v * 100}%`)
  const glare = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.1), transparent 42%)`
  const Icon = f.icon

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ type: 'spring', stiffness: 110, damping: 18, delay: (index % 3) * 0.08 }}
      className="glass-card iris-border feature-card"
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
        transformStyle: 'preserve-3d',
        gridColumn: `span ${f.span}`,
        position: 'relative',
        overflow: 'hidden',
        padding: 28,
        minHeight: f.span === 2 ? 230 : 210,
      }}
    >
      <motion.div aria-hidden style={{ position: 'absolute', inset: 0, background: glare, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', transform: 'translateZ(40px)' }}>
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 14,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
            background: `${f.accent}1c`,
            border: `1px solid ${f.accent}44`,
            color: f.accent,
          }}
        >
          <Icon size={24} strokeWidth={2} />
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: '#fff' }}>{f.title}</h3>
        <p style={{ color: '#9AA0B8', fontSize: 15, lineHeight: 1.6, maxWidth: f.span === 2 ? 340 : '100%' }}>{f.desc}</p>
      </div>
      {f.visual}
    </motion.div>
  )
}

export default function Features() {
  return (
    <section id="features" style={{ padding: '56px 24px', position: 'relative', zIndex: 1 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal variant="up" style={{ textAlign: 'center', marginBottom: 28 }}>
          <p className="font-mono" style={{ color: '#00D4FF', fontWeight: 600, fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>
            Features
          </p>
          <h2 className="plasma-gradient-text" style={{ fontSize: 'clamp(30px, 5vw, 50px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}>
            One nerve, every move
          </h2>
          <p style={{ color: '#9AA0B8', fontSize: 17, maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
            Connect your tools, message your customers, take payments — and let your business run on autopilot.
          </p>
        </Reveal>

        <div className="bento-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} f={f} index={i} />
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .bento-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .bento-grid > .feature-card { grid-column: span 1 !important; }
        }
        @media (max-width: 560px) {
          .bento-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
