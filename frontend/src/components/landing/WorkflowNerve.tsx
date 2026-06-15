'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { iconUrl } from './landing-data'
import Reveal from './Reveal'

interface NodeDef {
  id: string
  x: number
  y: number
  w: number
  h: number
  accent: string
  slug: string
  iconColor: string
  title: string
  sub: string
}

const NW = 250
const NH = 72

// Scene is authored in a 1120×460 viewBox; it scales fluidly with the container.
const NODES: NodeDef[] = [
  { id: 'trigger', x: 40, y: 190, w: NW, h: NH, accent: '#25D366', slug: 'whatsapp', iconColor: '25D366', title: 'WhatsApp message', sub: 'customer says "1kg sweets?"' },
  { id: 'logic', x: 445, y: 190, w: 220, h: NH, accent: '#7B2FFF', slug: 'openai', iconColor: '7B2FFF', title: 'Nerum reads it', sub: 'order or enquiry?' },
  { id: 'reply', x: 850, y: 58, w: NW, h: NH, accent: '#FF6B00', slug: 'whatsapp', iconColor: 'FF6B00', title: 'Reply instantly', sub: 'auto-confirm in Tamil' },
  { id: 'sheet', x: 850, y: 190, w: NW, h: NH, accent: '#34A853', slug: 'googlesheets', iconColor: '34A853', title: 'Log to Sheets', sub: 'order row added' },
  { id: 'pay', x: 850, y: 322, w: NW, h: NH, accent: '#00D4FF', slug: 'razorpay', iconColor: '00D4FF', title: 'Razorpay link', sub: '₹450 payment sent' },
]

interface WireDef {
  id: string
  d: string
  color: string
  dur: number
  begin: number
}

const WIRES: WireDef[] = [
  { id: 'w1', d: 'M290 226 C 360 226 380 226 445 226', color: '#25D366', dur: 1.5, begin: 0 },
  { id: 'w2', d: 'M665 226 C 745 226 770 94 850 94', color: '#FF6B00', dur: 1.9, begin: 0.5 },
  { id: 'w3', d: 'M665 226 C 745 226 770 226 850 226', color: '#34A853', dur: 1.9, begin: 0.75 },
  { id: 'w4', d: 'M665 226 C 745 226 770 358 850 358', color: '#00D4FF', dur: 1.9, begin: 1.0 },
]

const ORDER = ['trigger', 'logic', 'reply', 'sheet', 'pay']

function SceneNode({ n, active }: { n: NodeDef; active: boolean }) {
  return (
    <g
      style={{
        transformBox: 'fill-box',
        transformOrigin: 'center',
        transform: active ? 'scale(1.045)' : 'scale(1)',
        filter: active ? `drop-shadow(0 0 12px ${n.accent}aa)` : 'none',
        transition: 'transform 0.45s cubic-bezier(0.22,1,0.36,1), filter 0.45s ease',
      }}
    >
      <rect
        x={n.x}
        y={n.y}
        width={n.w}
        height={n.h}
        rx={16}
        fill="rgba(13,14,26,0.92)"
        stroke={active ? n.accent : `${n.accent}55`}
        strokeWidth={active ? 1.8 : 1.2}
        style={{ transition: 'stroke 0.45s ease' }}
      />
      <rect x={n.x} y={n.y} width={4} height={n.h} rx={2} fill={n.accent} />
      <rect x={n.x + 18} y={n.y + 19} width={34} height={34} rx={9} fill={`${n.accent}1f`} />
      <image href={iconUrl(n.slug, n.iconColor)} x={n.x + 24} y={n.y + 25} width={22} height={22} />
      <text x={n.x + 66} y={n.y + 31} fill="#FFFFFF" fontSize={16} fontWeight={600} fontFamily="var(--font-display)">
        {n.title}
      </text>
      <text x={n.x + 66} y={n.y + 51} fill="#9AA0B8" fontSize={12} fontFamily="var(--font-mono)">
        {n.sub}
      </text>
    </g>
  )
}

export default function WorkflowNerve() {
  const reduced = useReducedMotion()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(-1)

  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ['start end', 'center center'] })
  const rotateX = useTransform(scrollYProgress, [0, 1], [20, 0])
  const yLift = useTransform(scrollYProgress, [0, 1], [50, 0])
  const opacity = useTransform(scrollYProgress, [0, 0.6], [0.35, 1])

  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => setStep((s) => (s + 1) % ORDER.length), 880)
    return () => window.clearInterval(id)
  }, [reduced])

  const activeId = step >= 0 ? ORDER[step] : null

  return (
    <section id="wow" style={{ padding: '48px 24px 56px', position: 'relative', zIndex: 1 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <Reveal variant="up" style={{ textAlign: 'center', marginBottom: 12 }}>
          <p className="font-mono" style={{ color: '#FF6B00', fontWeight: 600, fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>
            Live workflow
          </p>
          <h2 className="plasma-gradient-text" style={{ fontSize: 'clamp(30px, 5.5vw, 56px)', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 16 }}>
            Watch a Nerum fire.
          </h2>
          <p style={{ color: '#9AA0B8', fontSize: 17, maxWidth: 620, margin: '0 auto 8px', lineHeight: 1.6 }}>
            A customer messages on WhatsApp. Nerum reads it, replies in Tamil, logs the order to
            Sheets and sends a Razorpay link — in one breath. Five tools. Zero clicks.
          </p>
        </Reveal>

        {/* ---- desktop / tablet animated scene ---- */}
        <div ref={wrapRef} className="nerve-desktop" style={{ perspective: 1400, marginTop: 22 }}>
          <motion.div
            style={
              reduced
                ? { transformStyle: 'preserve-3d' }
                : { rotateX, y: yLift, opacity, transformStyle: 'preserve-3d', transformPerspective: 1400 }
            }
          >
            <div
              className="iris-border"
              style={{
                position: 'relative',
                borderRadius: 26,
                padding: 18,
                background: 'rgba(10,11,20,0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 50px 120px -50px rgba(123,47,255,0.5)',
                backdropFilter: 'blur(14px)',
              }}
            >
              {/* window chrome */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 6px 14px' }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#FF5F57' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#FEBC2E' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28C840' }} />
                <span className="font-mono" style={{ marginLeft: 10, fontSize: 12, color: '#6B7090' }}>
                  nerum · sweet-shop-order.flow
                </span>
                <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#00E676' }} className="font-mono">
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00E676', boxShadow: '0 0 8px #00E676' }} />
                  live
                </span>
              </div>

              <svg viewBox="0 0 1120 460" style={{ width: '100%', height: 'auto', display: 'block' }}>
                <defs>
                  {WIRES.map((wire) => (
                    <linearGradient key={`grad-${wire.id}`} id={`grad-${wire.id}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor={wire.color} stopOpacity="0" />
                      <stop offset="0.5" stopColor={wire.color} stopOpacity="0.9" />
                      <stop offset="1" stopColor={wire.color} stopOpacity="0" />
                    </linearGradient>
                  ))}
                </defs>

                {/* wires: faint base + flowing energy + travelling spark */}
                {WIRES.map((wire) => (
                  <g key={wire.id}>
                    <path id={wire.id} d={wire.d} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
                    <path
                      d={wire.d}
                      fill="none"
                      stroke={`url(#grad-${wire.id})`}
                      strokeWidth={3}
                      strokeDasharray="14 16"
                      className="wire-flow"
                      style={{ animationDelay: `${wire.begin}s` }}
                    />
                    {!reduced && (
                      <g>
                        <circle r={9} fill={wire.color} opacity={0.28} />
                        <circle r={4} fill="#FFFFFF" />
                        <animateMotion dur={`${wire.dur}s`} begin={`${wire.begin}s`} repeatCount="indefinite" rotate="auto">
                          <mpath href={`#${wire.id}`} />
                        </animateMotion>
                      </g>
                    )}
                  </g>
                ))}

                {NODES.map((n) => (
                  <SceneNode key={n.id} n={n} active={activeId === n.id} />
                ))}
              </svg>
            </div>
          </motion.div>
        </div>

        {/* ---- mobile vertical fallback ---- */}
        <div className="nerve-mobile" style={{ marginTop: 36, display: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0, position: 'relative' }}>
            {NODES.map((n, i) => (
              <div key={n.id}>
                <div
                  className="glass-card"
                  style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', borderColor: `${n.accent}44` }}
                >
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: `${n.accent}1f`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img src={iconUrl(n.slug, n.iconColor)} alt={n.title} width={20} height={20} onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
                  </span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{n.title}</div>
                    <div className="font-mono" style={{ fontSize: 12, color: '#9AA0B8' }}>{n.sub}</div>
                  </div>
                </div>
                {i < NODES.length - 1 && (
                  <div style={{ height: 30, width: 2, margin: '0 auto', position: 'relative', background: 'linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))', overflow: 'hidden' }}>
                    <span className="pulse-down" style={{ position: 'absolute', left: -2, width: 6, height: 6, borderRadius: '50%', background: '#FF6B00', boxShadow: '0 0 8px #FF6B00' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .nerve-desktop { display: none !important; }
          .nerve-mobile { display: block !important; }
        }
      `}</style>
    </section>
  )
}
