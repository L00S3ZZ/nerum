'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import MagneticButton from '@/components/ui/MagneticButton'

const LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'Integrations', href: '#integrations' },
]


export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.7, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'center', padding: '0 16px' }}
    >
      <nav
        style={{
          width: '100%',
          maxWidth: 1180,
          marginTop: scrolled ? 10 : 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: scrolled ? '10px 14px 10px 18px' : '14px 14px 14px 20px',
          borderRadius: 999,
          background: scrolled ? 'rgba(13,14,26,0.72)' : 'rgba(13,14,26,0.32)',
          border: `1px solid ${scrolled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: scrolled ? '0 16px 40px -24px rgba(0,0,0,0.9)' : 'none',
          transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/nerum-logo.png" width={28} height={28} alt="Nerum" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
          <span className="font-display plasma-gradient-text" style={{ fontSize: 19, fontWeight: 700, letterSpacing: '0.04em' }}>
            NERUM
          </span>
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E676', boxShadow: '0 0 8px #00E676' }} />
        </Link>

        <div className="nav-links" style={{ display: 'flex', gap: 28 }}>
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{ fontSize: 14, fontWeight: 500, color: '#9AA0B8', textDecoration: 'none', transition: 'color 0.25s ease' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#9AA0B8')}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/login"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#fff',
              textDecoration: 'none',
              padding: '9px 16px',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.15)',
              transition: 'background 0.25s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Login
          </Link>
          <MagneticButton strength={0.4}>
            <Link
              href="/signup"
              style={{
                display: 'inline-block',
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                textDecoration: 'none',
                padding: '10px 18px',
                borderRadius: 999,
                background: 'linear-gradient(135deg, #FF6B00, #7B2FFF)',
                boxShadow: '0 10px 26px -10px rgba(255,107,0,0.7)',
              }}
            >
              Get Started
            </Link>
          </MagneticButton>
        </div>
      </nav>

      <style>{`
        @media (max-width: 760px) {
          .nav-links { display: none !important; }
        }
      `}</style>
    </motion.header>
  )
}
