'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const LETTERS = ['N', 'E', 'R', 'U', 'M']

/**
 * Entry sequence: the NERUM wordmark assembles letter-by-letter over a charging
 * signal bar, then the whole curtain lifts away to reveal the page.
 * Reduced-motion users get an near-instant dismissal with no movement.
 */
export default function EntryLoader() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = window.setTimeout(() => setShow(false), reduced ? 220 : 1700)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="entry"
          exit={{ y: '-100%' }}
          transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9000,
            background: '#07080F',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 26,
          }}
        >
          {/* ambient glow behind the mark */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              width: 420,
              height: 420,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(123,47,255,0.35), transparent 65%)',
              filter: 'blur(40px)',
            }}
          />

          {/* massive faded logo backdrop */}
          <img
            src="/nerum-logo.png"
            alt=""
            aria-hidden
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
            style={{ position: 'absolute', width: '65vw', height: '65vw', maxWidth: 650, maxHeight: 650, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.18, zIndex: 0, animation: 'pulse 3s ease-in-out infinite' }}
          />

          <div style={{ display: 'flex', position: 'relative' }}>
            {LETTERS.map((ch, i) => (
              <motion.span
                key={ch + i}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.11, duration: 0.5, ease: 'easeOut' }}
                className="font-display plasma-gradient-text"
                style={{
                  fontSize: 'clamp(48px, 12vw, 104px)',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  lineHeight: 1,
                }}
              >
                {ch}
              </motion.span>
            ))}
          </div>

          {/* charging signal bar */}
          <div style={{ width: 'min(220px, 60vw)', height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.3, ease: 'easeInOut' }}
              style={{
                height: '100%',
                transformOrigin: 'left',
                background: 'linear-gradient(90deg, #FF6B00, #7B2FFF, #00D4FF)',
              }}
            />
          </div>

          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="font-mono"
            style={{ fontSize: 12, letterSpacing: '0.28em', color: '#9AA0B8', textTransform: 'uppercase' }}
          >
            Your business, automated
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
