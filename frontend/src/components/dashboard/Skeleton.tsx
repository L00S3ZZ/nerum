'use client'

import { CSSProperties } from 'react'

/** Dark shimmer placeholder. Reserve the same box the real content will fill (no CLS). */
export default function Skeleton({
  width = '100%',
  height = 16,
  radius = 10,
  style,
}: {
  width?: number | string
  height?: number | string
  radius?: number
  style?: CSSProperties
}) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />
}

export function SkeletonStat() {
  return (
    <div className="glass-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Skeleton width={90} height={12} />
        <Skeleton width={32} height={32} radius={9} />
      </div>
      <Skeleton width={70} height={28} />
      <Skeleton width="100%" height={30} style={{ marginTop: 12 }} />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 6px' }}>
      <Skeleton width={32} height={32} radius={9} />
      <Skeleton width="60%" height={13} />
      <Skeleton width={48} height={11} style={{ marginLeft: 'auto' }} />
    </div>
  )
}
