'use client'

import { INTEGRATIONS, iconUrl, Integration } from './landing-data'
import Reveal from './Reveal'

function Pill({ app }: { app: Integration }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 999,
        padding: '11px 22px',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        backdropFilter: 'blur(8px)',
        transition: 'border-color 0.3s ease, transform 0.3s ease, background 0.3s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `#${app.color}66`
        e.currentTarget.style.background = `#${app.color}12`
        e.currentTarget.style.transform = 'translateY(-3px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        e.currentTarget.style.transform = 'none'
      }}
    >
      <img
        src={iconUrl(app.slug, app.color)}
        alt={app.name}
        width={22}
        height={22}
        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
      />
      <span style={{ fontSize: 14, fontWeight: 500, color: '#E7E9F4' }}>{app.name}</span>
    </div>
  )
}

function Row({ items, dir, speed }: { items: Integration[]; dir: 'left' | 'right'; speed: number }) {
  const doubled = [...items, ...items]
  return (
    <div style={{ display: 'flex', overflow: 'hidden', maskImage: 'linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)' }}>
      <div className="marquee-track" style={{ animation: `${dir === 'left' ? 'marquee-left' : 'marquee-right'} ${speed}s linear infinite` }}>
        {doubled.map((app, i) => (
          <Pill key={app.slug + i} app={app} />
        ))}
      </div>
    </div>
  )
}

export default function Integrations() {
  return (
    <section id="integrations" style={{ padding: '56px 0 48px', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      <Reveal variant="up" className="" style={{ textAlign: 'center', marginBottom: 28, padding: '0 24px' }}>
        <p className="font-mono" style={{ color: '#7B2FFF', fontWeight: 600, fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>
          Integrations
        </p>
        <h2 className="plasma-gradient-text" style={{ fontSize: 'clamp(30px, 5vw, 50px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}>
          The tools Nerum runs on
        </h2>
        <p style={{ color: '#9AA0B8', fontSize: 17, maxWidth: 540, margin: '0 auto', lineHeight: 1.6 }}>
          WhatsApp to Razorpay, Tally to Shopify. Nerum speaks to the apps your business already uses.
        </p>
      </Reveal>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Row items={INTEGRATIONS} dir="left" speed={34} />
        <Row items={[...INTEGRATIONS].reverse()} dir="right" speed={28} />
      </div>
    </section>
  )
}
