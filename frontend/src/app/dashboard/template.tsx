'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * App-Router template: re-mounts on every dashboard route change, so this is the
 * natural home for the fade+slide page transition between Overview / Builder /
 * Agent / Integrations / Settings. Client-side routing — no full reload.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{ height: '100%' }}
    >
      {children}
    </motion.div>
  )
}
