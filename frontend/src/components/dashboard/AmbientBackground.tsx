'use client'

import { useEffect, useRef } from 'react'

// Same universe as the landing page, dialled right down — this is a working app,
// not a marketing page. Fewer stars, very faint orbs (opacity ~0.06).
const ORBS = [
  { color: '#7B2FFF', size: 520, blur: 150, opacity: 0.07, style: { top: '-200px', left: '-160px' } },
  { color: '#FF6B00', size: 440, blur: 140, opacity: 0.05, style: { top: '30%', right: '-180px' } },
  { color: '#00D4FF', size: 480, blur: 150, opacity: 0.05, style: { bottom: '-240px', left: '20%' } },
] as const

export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = window.innerWidth
    let h = window.innerHeight

    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    size()

    type P = { x: number; y: number; r: number; vy: number; a: number; phase: number }
    const count = w < 640 ? 50 : 90
    const stars: P[] = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.8 + Math.random() * 1.2,
      vy: 0.05 + Math.random() * 0.18,
      a: 0.25 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
    }))

    const paint = (animate: boolean) => {
      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        if (animate) {
          s.y -= s.vy
          s.phase += 0.015
          if (s.y < -4) {
            s.y = h + 4
            s.x = Math.random() * w
          }
        }
        ctx.globalAlpha = s.a * (0.6 + 0.4 * Math.sin(s.phase))
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    let raf = 0
    if (reduced) {
      paint(false)
    } else {
      const loop = () => {
        paint(true)
        raf = requestAnimationFrame(loop)
      }
      loop()
    }

    let t = 0
    const onResize = () => {
      window.clearTimeout(t)
      t = window.setTimeout(size, 150)
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', background: '#07080F' }}>
      {ORBS.map((o, i) => (
        <div
          key={i}
          className="orb"
          style={{
            position: 'absolute',
            width: o.size,
            height: o.size,
            borderRadius: '50%',
            background: o.color,
            filter: `blur(${o.blur}px)`,
            opacity: o.opacity,
            animation: `orb-float-${i % 2 === 0 ? 'a' : 'b'} ${18 + i * 3}s ease-in-out infinite`,
            ...o.style,
          }}
        />
      ))}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  )
}
