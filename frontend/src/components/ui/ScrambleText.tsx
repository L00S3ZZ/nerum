'use client'

import { useCallback, useEffect, useRef, useState, CSSProperties } from 'react'

const CHARS = '!@#$%^&*ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const DURATION = 800 // ms
const FPS = 30
const FRAME = 1000 / FPS

export default function ScrambleText({
  text,
  className,
  style,
  scrambleOnMount = true,
}: {
  text: string
  className?: string
  style?: CSSProperties
  scrambleOnMount?: boolean
}) {
  const [display, setDisplay] = useState(text)
  const timer = useRef<ReturnType<typeof setInterval>>()
  const elapsed = useRef(0)

  const scramble = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(text)
      return
    }
    clearInterval(timer.current)
    elapsed.current = 0
    timer.current = setInterval(() => {
      elapsed.current += FRAME
      const progress = Math.min(elapsed.current / DURATION, 1)
      // resolve one character at a time, left to right
      const revealed = Math.floor(progress * text.length)
      let out = ''
      for (let i = 0; i < text.length; i++) {
        if (i < revealed || text[i] === ' ') out += text[i]
        else out += CHARS[Math.floor(Math.random() * CHARS.length)]
      }
      setDisplay(out)
      if (progress >= 1) {
        setDisplay(text)
        clearInterval(timer.current)
      }
    }, FRAME)
  }, [text])

  useEffect(() => {
    if (scrambleOnMount) scramble()
    return () => clearInterval(timer.current)
  }, [scrambleOnMount, scramble])

  return (
    <span
      className={className}
      style={{ fontFamily: 'var(--font-mono)', ...style }}
      onMouseEnter={scramble}
    >
      {display}
    </span>
  )
}
