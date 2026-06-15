'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import OdometerNumber from '@/components/ui/OdometerNumber'

export interface StatCardProps {
  label: string
  value: number
  prefix?: string
  suffix?: string
  accent: string
  icon: LucideIcon
  delta?: string
  spark?: number[]
  index?: number
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 100
  const h = 30
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((d - min) / span) * (h - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const id = `spark-${color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 30, marginTop: 10 }} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.32" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill={`url(#${id})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export default function StatCard({ label, value, prefix, suffix, accent, icon: Icon, delta, spark, index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 130, damping: 18 }}
      whileHover={{ y: -4 }}
      className="glass-card"
      style={{ padding: 18, position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span className="plasma-gradient-text" style={{ fontSize: 12.5 }}>{label}</span>
        <span style={{ width: 32, height: 32, borderRadius: 9, background: `${accent}1c`, border: `1px solid ${accent}3a`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
          <Icon size={17} strokeWidth={2} />
        </span>
      </div>
      <div className="font-display" style={{ fontSize: 30, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
        <OdometerNumber value={value} prefix={prefix} suffix={suffix} />
      </div>
      {delta && (
        <div style={{ fontSize: 12, color: accent, marginTop: 6, fontWeight: 500 }}>{delta}</div>
      )}
      {spark && <Sparkline data={spark} color={accent} />}
    </motion.div>
  )
}
