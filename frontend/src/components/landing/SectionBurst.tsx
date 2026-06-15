'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const COLORS = ['#FF6B00', '#7B2FFF', '#00D4FF']

// A brief one-time particle burst fired when a section scrolls into view.
export default function SectionBurst() {
  const reduced = useReducedMotion()
  if (reduced) return null

  const dots = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * Math.PI * 2
    const dist = 40 + (i % 4) * 12
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, c: COLORS[i % 3], s: 3 + (i % 3) }
  })

  return (
    <div aria-hidden style={{ position: 'relative', height: 0, width: '100%', zIndex: 1 }}>
      <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)' }}>
        {dots.map((d, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, x: 0, y: 0 }}
            whileInView={{ opacity: [0, 1, 0], x: d.x, y: d.y }}
            viewport={{ once: true, amount: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut', delay: i * 0.02 }}
            style={{ position: 'absolute', width: d.s, height: d.s, borderRadius: '50%', background: d.c, boxShadow: `0 0 8px ${d.c}` }}
          />
        ))}
      </div>
    </div>
  )
}
