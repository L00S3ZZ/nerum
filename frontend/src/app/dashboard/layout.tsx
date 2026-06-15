/* ============================================================================
 * NERUM — Dashboard shell
 * ----------------------------------------------------------------------------
 * DESIGN DECISIONS
 *
 * Same universe, different job. The landing page sells; the dashboard works.
 * So the brand "nerve" metaphor stays (neuron logo, star-field, faint plasma
 * orbs at ~0.06 opacity, glass cards), but the energy is dialled down — calm,
 * legible, fast. A Chennai business owner should feel *in control of a living
 * system*, not entertained.
 *
 * The ONE element that ties it to the landing page and says "alive": the
 * heartbeat. Overview carries an ECG-style nerve pulse + a live log stream. The
 * landing page shows a Nerum "firing"; the dashboard shows your nerve's pulse,
 * right now. Opening Gmail feels like a chore; opening Nerum should feel like a
 * cockpit powering on.
 *
 * Layout — TOP NAV ONLY, zero sidebar (non-negotiable). Glass blur bar, neuron
 * logo + spinning live dot on the left, page tabs with a spring-driven sliding
 * underline in the centre, bell + avatar on the right. Content sits in a fixed
 * region below the bar; each page owns its own scroll so the Builder canvas can
 * go full-bleed while Overview/Integrations/Settings scroll.
 *
 * Motion — page transitions via App-Router template.tsx (fade+slide), stat
 * count-ups, staggered list reveals, skeleton shimmer while "data loads",
 * spring toggles/underlines. All transform/opacity, all reduced-motion safe.
 *
 * Colour language (consistent across every page): orange = primary action,
 * violet = secondary, cyan = info/status, yellow = AI/warning, green = success.
 * Icons are Lucide (never emoji). Brand bg #07080F, glass rgba(255,255,255,0.03).
 * ========================================================================== */
'use client'

import { useEffect } from 'react'
import TopNav from '@/components/dashboard/TopNav'
import CmdPalette from '@/components/dashboard/CmdPalette'
import AmbientBackground from '@/components/dashboard/AmbientBackground'
import { ToastProvider } from '@/components/dashboard/Toast'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    // Real auth gate: no JWT → go to login (no demo token).
    if (typeof localStorage !== 'undefined' && !localStorage.getItem('nerum_token')) {
      router.replace('/login')
    }
  }, [router])

  return (
    <ToastProvider>
      <AmbientBackground />
      <TopNav />
      <CmdPalette />
      <div
        style={{
          position: 'fixed',
          top: 64,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </ToastProvider>
  )
}
