'use client'

import { LayoutGrid } from 'lucide-react'

// Phase 2: full template gallery. For now this route just resolves with a placeholder.
export default function TemplatesPage() {
  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <h1 className="font-display plasma-gradient-text" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Templates
        </h1>
        <p style={{ color: '#9AA0B8', fontSize: 14, marginTop: 3 }}>Ready-made workflows you can drop straight into the Builder.</p>

        <div
          style={{
            marginTop: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: '64px 24px',
            border: '1px dashed rgba(255,255,255,0.12)',
            borderRadius: 16,
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <span
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(123,47,255,0.14)',
              border: '1px solid rgba(123,47,255,0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#B98CFF',
            }}
          >
            <LayoutGrid size={26} />
          </span>
          <div style={{ textAlign: 'center' }}>
            <div className="plasma-gradient-text" style={{ fontSize: 18, fontWeight: 700 }}>
              Templates coming soon
            </div>
            <p style={{ color: '#6B7090', fontSize: 13.5, marginTop: 6, maxWidth: 420, lineHeight: 1.6 }}>
              We&apos;re curating business-shaped workflow templates — sweet-shop orders, clinic reminders, invoice-via-WhatsApp and more. Check back shortly.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
