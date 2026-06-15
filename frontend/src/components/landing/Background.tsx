'use client'

import { useEffect, useRef } from 'react'

// Ambient plasma orbs — colour wash drifting behind the whole page.
const ORBS = [
  { color: '#7B2FFF', size: 620, blur: 150, opacity: 0.22, style: { top: '-180px', left: '-160px' }, anim: 'orb-ellipse-a 24s ease-in-out infinite' },
  { color: '#FF6B00', size: 520, blur: 130, opacity: 0.16, style: { top: '-120px', right: '-140px' }, anim: 'orb-float-b 19s ease-in-out infinite' },
  { color: '#00D4FF', size: 440, blur: 120, opacity: 0.12, style: { top: '46%', left: '50%', marginLeft: '-220px' }, anim: 'orb-ellipse-b 26s ease-in-out infinite' },
  { color: '#7B2FFF', size: 720, blur: 180, opacity: 0.14, style: { bottom: '-300px', left: '24%' }, anim: 'orb-float-b 18s ease-in-out infinite' },
  { color: '#FF6B00', size: 480, blur: 140, opacity: 0.12, style: { bottom: '-200px', right: '-120px' }, anim: 'orb-ellipse-a 21s ease-in-out infinite' },
  { color: '#FFD60A', size: 460, blur: 150, opacity: 0.08, style: { bottom: '-240px', left: '50%', marginLeft: '-230px' }, anim: 'orb-ellipse-b 15s ease-in-out infinite' },
] as const

// Nerve-field particle palette — bright enough to read on #07080F.
const PARTICLE_COLORS = [
  { c: '255,255,255', a: 0.7 },
  { c: '255,107,0', a: 0.55 },
  { c: '123,47,255', a: 0.5 },
  { c: '0,212,255', a: 0.5 },
]

/**
 * Fixed, full-viewport ambient layer rendered once behind the entire page:
 * drifting plasma orbs + a rising "nerve field" of particles + a faint grid.
 */
export default function Background() {
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

    const sizeCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    sizeCanvas()

    type P = { x: number; y: number; r: number; vy: number; base: number; col: string; phase: number; tw: number }
    const count = w < 640 ? 130 : 260
    const particles: P[] = Array.from({ length: count }, () => {
      const pc = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1.2 + Math.random() * 1.6,
        vy: 0.12 + Math.random() * 0.4,
        base: pc.a,
        col: pc.c,
        phase: Math.random() * Math.PI * 2,
        tw: 0.6 + Math.random() * 0.8,
      }
    })

    const paint = (animate: boolean) => {
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        if (animate) {
          p.y -= p.vy
          p.phase += 0.02 * p.tw
          if (p.y < -6) {
            p.y = h + 6
            p.x = Math.random() * w
          }
        }
        const twinkle = 0.7 + 0.3 * Math.sin(p.phase)
        ctx.globalAlpha = p.base * twinkle
        ctx.fillStyle = `rgb(${p.col})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
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

    let resizeTimer = 0
    const onResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(sizeCanvas, 150)
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }}>
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
            animation: o.anim,
            ...o.style,
          }}
        />
      ))}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      {/* slowly drifting grid lines */}
      <div
        className="grid-drift"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '-80px',
          bottom: '-80px',
          backgroundImage: 'linear-gradient(rgba(124,47,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(124,47,255,0.03) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
      <div className="grid-bg" style={{ position: 'absolute', inset: 0 }} />
      {/* bottom vignette to seat the footer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 120% 80% at 50% 0%, transparent 55%, rgba(7,8,15,0.6) 100%)',
        }}
      />
    </div>
  )
}
