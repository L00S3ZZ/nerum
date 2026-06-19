'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Workflow, LayoutGrid, Boxes, Settings, Bell, User, LogOut, LucideIcon } from 'lucide-react'

interface Tab {
  label: string
  href: string
  icon: LucideIcon
}

const TABS: Tab[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Builder', href: '/dashboard/builder', icon: Workflow },
  { label: 'Templates', href: '/dashboard/templates', icon: LayoutGrid },
  { label: 'Integrations', href: '/dashboard/integrations', icon: Boxes },
]

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(href + '/')
}

/** Neuron mark + spinning live ring — the same identity as the landing navbar. */
function Logo() {
  return (
    <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
      <img src="/nerum-logo.png" width={28} height={28} alt="Nerum" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
      <span className="font-display plasma-gradient-text" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.05em' }}>NERUM</span>
      {/* spinning live dot */}
      <span style={{ position: 'relative', width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spin-slow" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 0deg, transparent, #00E676)', WebkitMask: 'radial-gradient(circle, transparent 55%, #000 57%)', mask: 'radial-gradient(circle, transparent 55%, #000 57%)' }} />
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00E676', boxShadow: '0 0 8px #00E676' }} />
      </span>
    </Link>
  )
}

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function logout() {
    localStorage.removeItem('nerum_token')
    router.push('/login')
  }

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        background: 'rgba(10,11,20,0.72)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 18px',
        gap: 12,
      }}
    >
      <div style={{ flex: '0 0 auto' }}>
        <Logo />
      </div>

      {/* center tabs with sliding underline */}
      <div className="topnav-tabs" style={{ display: 'flex', gap: 2, overflowX: 'auto', flex: '1 1 auto', justifyContent: 'center' }}>
        {TABS.map((t) => {
          const active = isActive(pathname, t.href)
          const Icon = t.icon
          return (
            <Link
              key={t.href}
              href={t.href}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 14px',
                borderRadius: 10,
                textDecoration: 'none',
                color: active ? '#fff' : '#9AA0B8',
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                whiteSpace: 'nowrap',
                transition: 'color 0.2s, background 0.2s',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#fff' }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#9AA0B8' }}
            >
              <Icon size={17} strokeWidth={2} color={active ? '#FF6B00' : 'currentColor'} />
              <span className="tab-label">{t.label}</span>
              {active && (
                <motion.span
                  layoutId="nav-underline"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  style={{ position: 'absolute', left: 12, right: 12, bottom: -1, height: 2, borderRadius: 2, background: 'linear-gradient(90deg, #FF6B00, #7B2FFF)' }}
                />
              )}
            </Link>
          )
        })}
      </div>

      {/* right */}
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={iconBtn} aria-label="Notifications" title="Notifications">
          <Bell size={18} strokeWidth={2} />
          <span style={{ position: 'absolute', top: 5, right: 5, minWidth: 15, height: 15, borderRadius: 999, background: '#FF6B00', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid #0A0B14' }}>3</span>
        </button>

        <div ref={dropRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', background: 'linear-gradient(135deg, #FF6B00, #7B2FFF)', color: '#fff', fontWeight: 700, fontSize: 13 }}
            aria-label="Account"
          >
            SH
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                style={{ position: 'absolute', top: 48, right: 0, width: 200, background: 'rgba(13,14,26,0.96)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 6, backdropFilter: 'blur(14px)', boxShadow: '0 20px 50px -20px rgba(0,0,0,0.8)' }}
              >
                <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 6 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#fff' }}>Sri Hari</div>
                  <div className="font-mono" style={{ fontSize: 11.5, color: '#6B7090' }}>sri@nerum.in</div>
                </div>
                <Link href="/dashboard/settings" onClick={() => setMenuOpen(false)} style={dropItem}><User size={15} /> Profile</Link>
                <Link href="/dashboard/settings" onClick={() => setMenuOpen(false)} style={dropItem}><Settings size={15} /> Settings</Link>
                <button onClick={logout} style={{ ...dropItem, width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#FF4D6D' }}>
                  <LogOut size={15} /> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        .topnav-tabs::-webkit-scrollbar { display: none; }
        .topnav-tabs { scrollbar-width: none; }
        @media (max-width: 820px) {
          .tab-label { display: none; }
        }
        @media (max-width: 560px) {
          .topnav-tabs { justify-content: flex-start; }
        }
      `}</style>
    </nav>
  )
}

const iconBtn: React.CSSProperties = {
  position: 'relative',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 10,
  width: 38,
  height: 38,
  cursor: 'pointer',
  color: '#cdd0dd',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
const dropItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  padding: '9px 10px',
  borderRadius: 8,
  color: '#cdd0dd',
  fontSize: 13.5,
  textDecoration: 'none',
}
