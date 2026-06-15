'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export default function CursorTrail() {
  const [enabled, setEnabled] = useState(false)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const ringX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.5 })
  const ringY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.5 })

  useEffect(() => {
    // disable on touch / coarse-pointer devices
    if (window.matchMedia('(pointer: coarse)').matches) return
    setEnabled(true)
    document.body.classList.add('cursor-none')

    const move = (e: MouseEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
    }
    window.addEventListener('mousemove', move)
    return () => {
      window.removeEventListener('mousemove', move)
      document.body.classList.remove('cursor-none')
    }
  }, [x, y])

  if (!enabled) return null

  return (
    <>
      {/* dot — follows cursor exactly */}
      <motion.div
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          x,
          y,
          width: 8,
          height: 8,
          marginLeft: -4,
          marginTop: -4,
          borderRadius: '50%',
          background: '#fff',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      />
      {/* ring — follows with spring lag */}
      <motion.div
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          x: ringX,
          y: ringY,
          width: 28,
          height: 28,
          marginLeft: -14,
          marginTop: -14,
          borderRadius: '50%',
          border: '1.5px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.03)',
          pointerEvents: 'none',
          zIndex: 9998,
        }}
      />
    </>
  )
}
