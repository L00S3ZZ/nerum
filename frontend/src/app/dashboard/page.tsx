'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Workflow, MessageCircle, Boxes, Sparkles, Plus, Settings as SettingsIcon, CheckCircle2, XCircle, ArrowRight, LucideIcon } from 'lucide-react'
import StatCard, { StatCardProps } from '@/components/dashboard/StatCard'
import { SkeletonStat, SkeletonRow } from '@/components/dashboard/Skeleton'
import HeartbeatMonitor from '@/components/dashboard/HeartbeatMonitor'
import { api } from '@/lib/api'

const STATS: StatCardProps[] = [
  { label: 'Workflows Run', value: 0, accent: '#FF6B00', icon: Workflow },
  { label: 'Messages Sent', value: 0, accent: '#7B2FFF', icon: MessageCircle },
  { label: 'Integrations Connected', value: 0, accent: '#00D4FF', icon: Boxes },
  { label: 'Tokens Used', value: 0, suffix: ' / 1k', accent: '#FFD60A', icon: Sparkles },
]

interface QuickAction {
  label: string
  desc: string
  href: string
  icon: LucideIcon
  accent: string
}
const ACTIONS: QuickAction[] = [
  { label: 'New Workflow', desc: 'Build on the canvas', href: '/dashboard/builder', icon: Plus, accent: '#FF6B00' },
  { label: 'Ask Neru', desc: 'Describe it in words', href: '/dashboard/agent', icon: Sparkles, accent: '#FFD60A' },
  { label: 'Connect an app', desc: '10+ integrations', href: '/dashboard/integrations', icon: Boxes, accent: '#00D4FF' },
  { label: 'Settings', desc: 'Keys & billing', href: '/dashboard/settings', icon: SettingsIcon, accent: '#7B2FFF' },
]

interface LiveStats {
  workflows_run: number
  messages_sent: number
  integrations_connected: number
  tokens_used: number
  token_limit: number
}
interface LiveRun {
  id: number
  workflow: string
  status: string
  ran_at: string | null
}

const GREETINGS = (h: number) => (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')

export default function OverviewPage() {
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState<Date | null>(null)
  const [stats, setStats] = useState<LiveStats>({ workflows_run: 0, messages_sent: 0, integrations_connected: 0, tokens_used: 0, token_limit: 1000 })
  const [runs, setRuns] = useState<LiveRun[]>([])

  useEffect(() => {
    setNow(new Date())
    const clock = window.setInterval(() => setNow(new Date()), 1000)
    Promise.all([
      api.get<LiveStats>('/dashboard/stats').then(setStats).catch(() => {}),
      api.get<{ items: LiveRun[] }>('/dashboard/recent-runs').then((r) => setRuns(r.items)).catch(() => {}),
    ]).finally(() => setLoading(false))
    return () => window.clearInterval(clock)
  }, [])

  const statValues = [stats.workflows_run, stats.messages_sent, stats.integrations_connected, stats.tokens_used]

  const greeting = now ? GREETINGS(now.getHours()) : 'Good morning'
  const timeStr = now ? now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '—'
  const dateStr = now ? now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : ''

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* greeting */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="font-display plasma-gradient-text" style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, letterSpacing: '-0.02em' }}>
              {greeting}, Sri Hari. Your nerve is active.
            </h1>
            <p style={{ color: '#9AA0B8', fontSize: 14, marginTop: 4 }}>{dateStr}</p>
          </div>
          <div className="font-mono" style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#fff', letterSpacing: '0.02em' }}>{timeStr}</div>
            <div style={{ fontSize: 12, color: '#6B7090', marginTop: 2 }}>Chennai · IST</div>
          </div>
        </motion.div>

        {/* stats */}
        <div className="ov-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {loading ? [0, 1, 2, 3].map((i) => <SkeletonStat key={i} />) : STATS.map((s, i) => <StatCard key={s.label} {...s} value={statValues[i]} index={i} />)}
        </div>

        {/* quick actions */}
        <div>
          <h2 className="plasma-gradient-text" style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Quick actions</h2>
          <div className="ov-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {ACTIONS.map((a, i) => {
              const Icon = a.icon
              return (
                <motion.div key={a.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                  <Link
                    href={a.href}
                    className="glass-card"
                    style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 16, textDecoration: 'none' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${a.accent}55` }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
                  >
                    <span style={{ width: 40, height: 40, borderRadius: 11, background: `${a.accent}1c`, border: `1px solid ${a.accent}3a`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: a.accent, flexShrink: 0 }}>
                      <Icon size={19} strokeWidth={2} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{a.label}</div>
                      <div style={{ fontSize: 12, color: '#9AA0B8' }}>{a.desc}</div>
                    </div>
                    <ArrowRight size={16} color="#6B7090" />
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* bottom: activity + heartbeat */}
        <div className="ov-bottom" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* recent activity */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }} className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 className="plasma-gradient-text" style={{ fontSize: 16, fontWeight: 700 }}>Recent runs</h2>
              <Link href="/dashboard/builder" style={{ fontSize: 12.5, color: '#FF6B00', textDecoration: 'none', fontWeight: 600 }}>View all</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {loading
                ? [0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)
                : runs.length === 0
                ? (
                    <Link href="/dashboard/builder" style={{ display: 'block', textAlign: 'center', padding: '30px 12px', textDecoration: 'none' }}>
                      <div style={{ fontSize: 14, color: '#9AA0B8' }}>
                        No workflows run yet. <span style={{ color: '#FF6B00', fontWeight: 600 }}>Build your first →</span>
                      </div>
                    </Link>
                  )
                : runs.map((r, i) => {
                    const ok = r.status === 'success'
                    return (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.06 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 8px', borderRadius: 10, borderBottom: i < runs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                      >
                        <span style={{ width: 34, height: 34, borderRadius: 9, background: ok ? 'rgba(0,230,118,0.12)' : 'rgba(255,77,109,0.12)', color: ok ? '#00E676' : '#FF4D6D', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.workflow}</div>
                          <div className="font-mono" style={{ fontSize: 11.5, color: '#6B7090' }}>{r.ran_at ? new Date(r.ran_at).toLocaleString('en-IN') : ''}</div>
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: ok ? '#00E676' : '#FF4D6D', background: ok ? 'rgba(0,230,118,0.1)' : 'rgba(255,77,109,0.1)', padding: '4px 10px', borderRadius: 999 }}>
                          {r.status}
                        </span>
                      </motion.div>
                    )
                  })}
            </div>
          </motion.div>

          {/* heartbeat */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ minHeight: 0 }}>
            <HeartbeatMonitor />
          </motion.div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1000px) {
          .ov-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .ov-actions { grid-template-columns: repeat(2, 1fr) !important; }
          .ov-bottom { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 520px) {
          .ov-stats { grid-template-columns: 1fr !important; }
          .ov-actions { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
