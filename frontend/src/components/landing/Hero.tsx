'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import MagneticButton from '@/components/ui/MagneticButton'
import { INTEGRATIONS, iconUrl } from './landing-data'
import { useReducedMotion } from '@/hooks/useReducedMotion'

// The kinetic device: the headline noun cycles through who Nerum is built for.
const SEGMENTS = ['shops', 'clinics', 'schools', 'restaurants', 'gyms']
const LINE1 = ['Automation', 'for']

export default function Hero() {
  const reduced = useReducedMotion()
  const [seg, setSeg] = useState(0)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => setSeg((s) => (s + 1) % SEGMENTS.length), 2100)
    return () => window.clearInterval(id)
  }, [reduced])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: '64px 24px 32px',
      }}
    >
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 880, margin: '0 auto' }}>
        <h1 className="font-display" style={{ fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.03em', marginBottom: 26, marginTop: 8 }}>
          <span className="plasma-gradient-text" style={{ display: 'block', fontSize: 'clamp(40px, 8vw, 80px)' }}>
            {LINE1.map((word, i) => (
              <span key={word} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', marginRight: '0.28em' }}>
                <motion.span
                  initial={{ y: '110%' }}
                  animate={{ y: 0 }}
                  transition={{ delay: 1.9 + i * 0.09, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{ display: 'inline-block' }}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </span>
          <span style={{ display: 'block', fontSize: 'clamp(48px, 10vw, 104px)', height: '1.06em', position: 'relative' }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={SEGMENTS[seg]}
                initial={reduced ? false : { y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduced ? undefined : { y: -40, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="plasma-gradient-text"
                style={{ display: 'inline-block', fontWeight: 700 }}
              >
                {SEGMENTS[seg]}.
              </motion.span>
            </AnimatePresence>
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.25, duration: 0.6 }}
          style={{ fontSize: 'clamp(16px, 2.4vw, 19px)', color: '#9AA0B8', maxWidth: 600, lineHeight: 1.6, marginBottom: 34 }}
        >
          NERUM is the nerve that connects WhatsApp, Razorpay, Tally and 10+ tools your business
          already runs on — and makes them fire together. No code. No agency. ₹0 to start.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.4, duration: 0.5 }}
          style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 18 }}
        >
          <MagneticButton strength={0.35}>
            <Link
              href="/signup"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #FF6B00, #7B2FFF)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 16,
                padding: '15px 30px',
                borderRadius: 999,
                textDecoration: 'none',
                boxShadow: '0 14px 36px -12px rgba(255,107,0,0.75)',
              }}
            >
              Start Free →
            </Link>
          </MagneticButton>
          <MagneticButton strength={0.35}>
            <a
              href="#wow"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 9,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 16,
                padding: '15px 26px',
                borderRadius: 999,
                textDecoration: 'none',
              }}
            >
              <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>▶</span>
              Watch Demo
            </a>
          </MagneticButton>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.55, duration: 0.5 }}
          className="font-mono"
          style={{ fontSize: 12, color: '#6B7090', letterSpacing: '0.04em', marginBottom: 22 }}
        >
          no credit card · free to start · live in 5 minutes
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.7, duration: 0.6 }}
          style={{ display: 'flex', gap: 22, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', maxWidth: 560 }}
        >
          {INTEGRATIONS.map((ic) => (
            <img
              key={ic.slug}
              src={iconUrl(ic.slug, ic.color)}
              alt={ic.name}
              width={24}
              height={24}
              style={{ opacity: 0.82, transition: 'opacity 0.3s ease, filter 0.3s ease, transform 0.3s ease', cursor: 'pointer' }}
              onMouseEnter={(e) => {
                const el = e.currentTarget
                el.style.opacity = '1'
                el.style.transform = 'translateY(-3px) scale(1.12)'
                el.style.filter = `drop-shadow(0 0 9px #${ic.color})`
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget
                el.style.opacity = '0.82'
                el.style.transform = 'none'
                el.style.filter = 'none'
              }}
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
            />
          ))}
        </motion.div>
      </div>

      <AnimatePresence>
        {!scrolled && (
          <motion.a
            href="#integrations"
            aria-label="Scroll down"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 2.9, duration: 0.4 }}
            style={{ position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)', zIndex: 1, color: '#9AA0B8' }}
          >
            <svg className="chev-bounce" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </motion.a>
        )}
      </AnimatePresence>
    </section>
  )
}
