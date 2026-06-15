'use client'

import { ReactNode, CSSProperties } from 'react'
import { motion, Variants } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

type Variant = 'up' | 'fade' | 'scale' | 'left' | 'right' | 'blur'

const HIDDEN: Record<Variant, Record<string, number>> = {
  up: { opacity: 0, y: 36 },
  fade: { opacity: 0 },
  scale: { opacity: 0, scale: 0.92 },
  left: { opacity: 0, x: -48 },
  right: { opacity: 0, x: 48 },
  blur: { opacity: 0, y: 20 },
}

/**
 * Scroll-triggered reveal. Varies the entrance per section so the page doesn't
 * feel like one repeated fade. Fires once, respects reduced-motion.
 */
export default function Reveal({
  children,
  variant = 'up',
  delay = 0,
  amount = 0.3,
  className,
  style,
}: {
  children: ReactNode
  variant?: Variant
  delay?: number
  amount?: number
  className?: string
  style?: CSSProperties
}) {
  const reduced = useReducedMotion()

  if (reduced) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }

  const variants: Variants = {
    hidden: HIDDEN[variant],
    show: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 90, damping: 18, delay },
    },
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={variants}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}
