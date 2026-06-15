'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

export default function GlassCard({
  children,
  delay = 0,
  className,
  style,
}: {
  children: ReactNode
  delay?: number
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18, delay }}
      className={`glass-card ${className ?? ''}`}
      style={style}
    >
      {children}
    </motion.div>
  )
}
