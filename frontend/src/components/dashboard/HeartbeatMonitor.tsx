'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

// One ECG period (width 200). Tiled so the trace can scroll seamlessly.
const SEG = 'h36 l8 0 l6 -20 l6 40 l8 -20 l30 0 l10 -8 l8 12 l14 -4 l74 0'
const PERIOD = 200
const TILES = 8

const LEVEL_COLOR = { ok: '#00E676', info: '#00D4FF', warn: '#FFD60A' }

function clock(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour12: false })
}

export default function HeartbeatMonitor() {
  const reduced = useReducedMotion()
  const [logs, setLogs] = useState<{ id: number; level: 'ok' | 'info' | 'warn'; text: string; time: string }[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLogs([{ id: 0, level: 'info', text: 'Nerum is ready. Connect an integration to get started.', time: clock(new Date()) }])
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  return (
    <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ color: '#00E676', display: 'inline-flex' }}><Activity size={18} strokeWidth={2.2} /></span>
        <h2 className="plasma-gradient-text" style={{ fontSize: 16, fontWeight: 700 }}>System pulse</h2>
        <span style={{ position: 'relative', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#00E676' }} className="font-mono">
          <span style={{ position: 'relative', width: 8, height: 8 }}>
            <span className="ping-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#00E676' }} />
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#00E676' }} />
          </span>
          live
        </span>
      </div>

      {/* ECG trace */}
      <div style={{ position: 'relative', height: 64, borderRadius: 12, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: 16 }}>
        <svg viewBox="0 0 800 64" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }} aria-hidden>
          <defs>
            <linearGradient id="ecg-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#00E676" stopOpacity="0.15" />
              <stop offset="0.5" stopColor="#00E676" stopOpacity="1" />
              <stop offset="1" stopColor="#00D4FF" stopOpacity="1" />
            </linearGradient>
          </defs>
          <motion.path
            d={`M0 12 ${Array.from({ length: TILES }).map(() => SEG).join(' ')}`}
            fill="none"
            stroke="url(#ecg-grad)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            animate={reduced ? undefined : { x: [0, -PERIOD] }}
            transition={{ duration: 2.2, ease: 'linear', repeat: Infinity }}
          />
        </svg>
        {/* leading scan glow */}
        {!reduced && (
          <motion.div
            style={{ position: 'absolute', top: 0, bottom: 0, width: 60, background: 'linear-gradient(90deg, transparent, rgba(0,230,118,0.12))' }}
            animate={{ left: ['-60px', '100%'] }}
            transition={{ duration: 3.2, ease: 'linear', repeat: Infinity }}
          />
        )}
      </div>

      {/* live log stream */}
      <div ref={scrollRef} className="font-mono" style={{ flex: 1, minHeight: 96, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, lineHeight: 1.5 }}>
        {logs.map((l) => (
          <motion.div
            key={l.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}
          >
            <span style={{ color: '#555d72', flexShrink: 0 }}>{l.time}</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: LEVEL_COLOR[l.level], flexShrink: 0, transform: 'translateY(-1px)' }} />
            <span style={{ color: '#cdd0dd' }}>{l.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
