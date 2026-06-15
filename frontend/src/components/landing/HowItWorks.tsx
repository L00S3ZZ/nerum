'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Link2, Wand2, Zap, LucideIcon } from 'lucide-react'
import { useTilt } from '@/hooks/useTilt'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import Reveal from './Reveal'

interface Step {
  num: string
  icon: LucideIcon
  title: string
  desc: string
  accent: string
}

const STEPS: Step[] = [
  { num: '01', icon: Link2, title: 'Connect', desc: 'Link WhatsApp, Razorpay, Sheets and more in one tap. We handle the keys and permissions.', accent: '#FF6B00' },
  { num: '02', icon: Wand2, title: 'Build', desc: 'Type what you want in Tamil or English. Nerum turns it into a working multi-step flow.', accent: '#7B2FFF' },
  { num: '03', icon: Zap, title: 'Automate', desc: 'Your nerve fires 24/7 — every order, reply and payment handled. You just watch it run.', accent: '#00D4FF' },
]

function StepCard({ s, index }: { s: Step; index: number }) {
  const reduced = useReducedMotion()
  const { ref, rotateX, rotateY, onMouseMove, onMouseLeave } = useTilt(8)
  const Icon = s.icon

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      initial={reduced ? false : { opacity: 0, y: 34 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ type: 'spring', stiffness: 110, damping: 18, delay: index * 0.14 }}
      className="glass-card iris-border"
      style={{ rotateX, rotateY, transformPerspective: 900, transformStyle: 'preserve-3d', padding: 30, textAlign: 'center', position: 'relative' }}
    >
      <div style={{ position: 'relative', transform: 'translateZ(36px)' }}>
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: '50%',
            margin: '0 auto 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${s.accent}18`,
            border: `1px solid ${s.accent}55`,
            color: s.accent,
            boxShadow: `0 0 28px -8px ${s.accent}80`,
          }}
        >
          <Icon size={28} strokeWidth={2} />
        </div>
        <div className="font-mono gradient-text" style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.24em', marginBottom: 10 }}>
          {s.num}
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10, color: '#fff' }}>{s.title}</h3>
        <p style={{ color: '#9AA0B8', fontSize: 15, lineHeight: 1.6 }}>{s.desc}</p>
      </div>
    </motion.div>
  )
}

export default function HowItWorks() {
  const reduced = useReducedMotion()
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start 75%', 'center 55%'] })
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section id="how" style={{ padding: '56px 24px', position: 'relative', zIndex: 1 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }} ref={sectionRef}>
        <Reveal variant="up" style={{ textAlign: 'center', marginBottom: 30 }}>
          <p className="font-mono" style={{ color: '#FFD60A', fontWeight: 600, fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>
            How it works
          </p>
          <h2 className="plasma-gradient-text" style={{ fontSize: 'clamp(30px, 5vw, 50px)', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Live in three steps
          </h2>
        </Reveal>

        <div style={{ position: 'relative' }}>
          {/* scroll-lit nerve line behind the cards (desktop) */}
          <div className="hiw-line" style={{ position: 'absolute', top: 64, left: '16%', width: '68%', height: 2, background: 'rgba(255,255,255,0.08)', zIndex: 0 }}>
            <motion.div
              style={{
                height: '100%',
                transformOrigin: 'left',
                scaleX: reduced ? 1 : lineScale,
                background: 'linear-gradient(90deg, #FF6B00, #7B2FFF, #00D4FF)',
                boxShadow: '0 0 12px rgba(123,47,255,0.6)',
              }}
            />
          </div>

          <div className="hiw-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 26, position: 'relative', zIndex: 1 }}>
            {STEPS.map((s, i) => (
              <StepCard key={s.num} s={s} index={i} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hiw-grid { grid-template-columns: 1fr !important; }
          .hiw-line { display: none !important; }
        }
      `}</style>
    </section>
  )
}
