'use client'

import OdometerNumber from '@/components/ui/OdometerNumber'
import Reveal from './Reveal'

interface Stat {
  value: number
  prefix?: string
  suffix?: string
  label: string
  accent: string
}

const STATS: Stat[] = [
  { value: 10, suffix: '+', label: 'integrations, growing weekly', accent: '#FF6B00' },
  { value: 3, suffix: '×', label: 'faster than doing it by hand', accent: '#7B2FFF' },
  { value: 0, prefix: '₹', label: 'to get started', accent: '#00D4FF' },
]

export default function Stats() {
  return (
    <section style={{ padding: '24px 24px 48px', position: 'relative', zIndex: 1 }}>
      <Reveal variant="scale">
        <div
          className="iris-border stats-grid"
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            padding: '46px 24px',
            borderRadius: 28,
            background: 'rgba(13,14,26,0.5)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(14px)',
          }}
        >
          {STATS.map((s, i) => (
            <div key={s.label} style={{ textAlign: 'center', position: 'relative', padding: '0 12px', borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.07)' }}>
              <div className="font-display gradient-iris" style={{ fontSize: 'clamp(44px, 7vw, 76px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em' }}>
                <OdometerNumber value={s.value} prefix={s.prefix} suffix={s.suffix} />
              </div>
              <p style={{ color: '#9AA0B8', fontSize: 14, marginTop: 14, maxWidth: 220, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </Reveal>

      <style>{`
        @media (max-width: 640px) {
          .stats-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .stats-grid > div { border-left: none !important; }
        }
      `}</style>
    </section>
  )
}
