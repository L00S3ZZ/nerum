'use client'

import { RefObject, useRef } from 'react'
import { useMotionValue, useSpring, MotionValue } from 'framer-motion'
import { useReducedMotion } from './useReducedMotion'

export interface Tilt {
  ref: RefObject<HTMLDivElement>
  rotateX: MotionValue<number>
  rotateY: MotionValue<number>
  /** 0..1 pointer position, useful for moving a glare highlight */
  px: MotionValue<number>
  py: MotionValue<number>
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseLeave: () => void
}

/**
 * Pointer-driven 3D tilt for cards. Transform-only (rotateX/rotateY), spring-smoothed,
 * and a no-op when the user prefers reduced motion.
 */
export function useTilt(max = 9): Tilt {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)

  const rotateX = useSpring(rx, { stiffness: 220, damping: 18, mass: 0.4 })
  const rotateY = useSpring(ry, { stiffness: 220, damping: 18, mass: 0.4 })

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduced) return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const nx = (e.clientX - r.left) / r.width
    const ny = (e.clientY - r.top) / r.height
    px.set(nx)
    py.set(ny)
    ry.set((nx - 0.5) * max * 2)
    rx.set((0.5 - ny) * max * 2)
  }

  function onMouseLeave() {
    rx.set(0)
    ry.set(0)
    px.set(0.5)
    py.set(0.5)
  }

  return { ref, rotateX, rotateY, px, py, onMouseMove, onMouseLeave }
}
