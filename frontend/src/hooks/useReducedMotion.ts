'use client'

import { useEffect, useState } from 'react'

/**
 * SSR-safe `prefers-reduced-motion`.
 * Returns `false` on the server and first paint (so initial markup matches),
 * then syncs to the user's OS preference and updates live if it changes.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return reduced
}
