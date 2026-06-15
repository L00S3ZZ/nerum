'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import MagneticButton from '@/components/ui/MagneticButton'
import Reveal from './Reveal'

export default function CTABanner() {
  return (
    <section style={{ padding: '24px 24px 48px', position: 'relative', zIndex: 1 }}>
      <Reveal variant="scale">
        <div
          className="iris-border"
          style={{
            maxWidth: 1080,
            margin: '0 auto',
            padding: '52px 28px',
            borderRadius: 32,
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'center',
            background: 'radial-gradient(120% 140% at 50% 0%, rgba(123,47,255,0.28), rgba(10,11,20,0.7) 60%)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* drifting glow orbs inside the panel */}
          <div className="orb" aria-hidden style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: '#FF6B00', filter: 'blur(120px)', opacity: 0.25, top: -80, left: -40, animation: 'orb-float-a 14s ease-in-out infinite' }} />
          <div className="orb" aria-hidden style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: '#00D4FF', filter: 'blur(120px)', opacity: 0.18, bottom: -100, right: -40, animation: 'orb-float-b 16s ease-in-out infinite' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="font-mono"
              style={{ fontSize: 13, color: '#FFD60A', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 18 }}
            >
              Unga business-ku ready-ah?
            </motion.p>
            <h2 className="plasma-gradient-text" style={{ fontSize: 'clamp(32px, 6vw, 60px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 18, lineHeight: 1.05 }}>
              Put your business <br />
              on autopilot.
            </h2>
            <p style={{ fontSize: 18, color: '#C2C6D9', marginBottom: 36, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
              Join the shops, clinics and restaurants letting Nerum do the busywork. Free to start, no card needed.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <MagneticButton strength={0.35}>
                <Link
                  href="/signup"
                  style={{
                    display: 'inline-block',
                    background: 'linear-gradient(135deg, #FF6B00, #7B2FFF)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 16,
                    padding: '16px 32px',
                    borderRadius: 999,
                    textDecoration: 'none',
                    boxShadow: '0 16px 40px -12px rgba(255,107,0,0.8)',
                  }}
                >
                  Start Free →
                </Link>
              </MagneticButton>
              <MagneticButton strength={0.35}>
                <Link
                  href="/dashboard"
                  style={{
                    display: 'inline-block',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.16)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 16,
                    padding: '16px 28px',
                    borderRadius: 999,
                    textDecoration: 'none',
                  }}
                >
                  Open Dashboard
                </Link>
              </MagneticButton>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
