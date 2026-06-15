'use client'

import Link from 'next/link'
import { Linkedin } from 'lucide-react'

const COLS = [
  { title: 'PRODUCT', links: ['Features', 'Integrations', 'How it works', 'Pricing', 'Changelog'] },
  { title: 'COMPANY', links: ['About', 'Blog', 'Careers', 'Contact', 'Support'] },
  { title: 'LEGAL', links: ['Privacy', 'Terms', 'Data Processing', 'Cookies'] },
]

const SOCIAL = [
  { slug: 'whatsapp', name: 'WhatsApp', href: '#' },
  { slug: 'linkedin', name: 'LinkedIn', href: 'https://linkedin.com/company/nerum-in' },
  { slug: 'x', name: 'X', href: '#' },
  { slug: 'instagram', name: 'Instagram', href: '#' },
]

function NerveMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 30 30" fill="none" aria-hidden>
      <defs>
        <linearGradient id="footer-nerve" x1="0" y1="0" x2="30" y2="30">
          <stop offset="0" stopColor="#FF6B00" />
          <stop offset="0.5" stopColor="#7B2FFF" />
          <stop offset="1" stopColor="#00D4FF" />
        </linearGradient>
      </defs>
      <g stroke="url(#footer-nerve)" strokeWidth="1.8" strokeLinecap="round">
        <path d="M15 15 L5 6" /><path d="M15 15 L26 9" /><path d="M15 15 L9 25" /><path d="M15 15 L24 24" />
      </g>
      <g fill="url(#footer-nerve)">
        <circle cx="5" cy="6" r="2" /><circle cx="26" cy="9" r="2" /><circle cx="9" cy="25" r="2" /><circle cx="24" cy="24" r="2" />
      </g>
      <circle cx="15" cy="15" r="4" fill="#07080F" stroke="url(#footer-nerve)" strokeWidth="1.8" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '64px 24px 40px', position: 'relative', overflow: 'hidden', background: 'rgba(7,8,15,0.6)' }}>
      <div
        className="footer-grid"
        style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 40, position: 'relative', zIndex: 1 }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <NerveMark />
            <span className="font-display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.04em', color: '#fff' }}>NERUM</span>
          </div>
          <p style={{ color: '#9AA0B8', fontSize: 14, lineHeight: 1.6, marginBottom: 20, maxWidth: 260 }}>
            The nerve of your business. Automation in English or Tamil.
          </p>
          <div style={{ display: 'flex', gap: 14 }}>
            {SOCIAL.map((s) => (
              <a
                key={s.slug}
                href={s.href}
                target={s.href.startsWith('http') ? '_blank' : undefined}
                rel={s.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                aria-label={s.name}
                style={{ width: 38, height: 38, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', transition: 'border-color 0.25s ease, transform 0.25s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,107,0,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'none' }}
              >
                {s.slug === 'linkedin' ? (
                  <Linkedin size={18} color="#9AA0B8" />
                ) : (
                  <img src={`https://cdn.simpleicons.org/${s.slug}/9AA0B8`} alt={s.name} width={18} height={18} onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
                )}
              </a>
            ))}
          </div>
        </div>

        {COLS.map((col) => (
          <div key={col.title}>
            <h4 className="font-mono" style={{ color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', marginBottom: 16 }}>{col.title}</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11 }}>
              {col.links.map((l) => (
                <li key={l}>
                  <Link
                    href={l === 'Terms' ? '/terms' : '#'}
                    style={{ color: '#9AA0B8', fontSize: 14, textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#9AA0B8')}
                  >
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div
        className="footer-bottom"
        style={{ maxWidth: 1100, margin: '44px auto 0', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}
      >
        <span style={{ color: '#9AA0B8', fontSize: 13 }}>© 2026 Nerum · Built in Chennai, Tamil Nadu</span>
        <a href="mailto:hello@nerum.in" className="font-mono" style={{ color: '#9AA0B8', fontSize: 13, textDecoration: 'none' }}>hello@nerum.in</a>
      </div>

      <style>{`
        @media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 520px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .footer-bottom { flex-direction: column; align-items: flex-start !important; }
        }
      `}</style>
    </footer>
  )
}
