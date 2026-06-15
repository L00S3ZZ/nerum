'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play } from 'lucide-react'
import Reveal from './Reveal'

export default function DemoSection() {
  const [failed, setFailed] = useState(false)

  return (
    <section id="demo" style={{ padding: '48px 24px', position: 'relative', zIndex: 1 }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <Reveal variant="up" style={{ textAlign: 'center', marginBottom: 20 }}>
          <p className="font-mono" style={{ color: '#FF6B00', fontWeight: 600, fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>
            Demo
          </p>
          <h2 className="plasma-gradient-text" style={{ fontSize: 'clamp(30px, 5vw, 50px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}>
            See Nerum fire in 60 seconds
          </h2>
          <p style={{ color: '#9AA0B8', fontSize: 17, maxWidth: 620, margin: '0 auto', lineHeight: 1.6 }}>
            Watch a sweet shop owner automate their WhatsApp orders, Sheets logging and Razorpay payments — in one workflow.
          </p>
        </Reveal>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
          className="glass-card iris-border"
          style={{ padding: 10, borderRadius: 22 }}
        >
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 14, overflow: 'hidden', background: 'radial-gradient(120% 140% at 50% 0%, rgba(123,47,255,0.18), #0A0B14 60%)' }}>
            {failed ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <span style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(255,107,0,0.14)', border: '1px solid rgba(255,107,0,0.45)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#FF6B00', boxShadow: '0 0 40px -8px rgba(255,107,0,0.7)' }}>
                  <Play size={30} fill="#FF6B00" />
                </span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#cdd0dd' }}>Demo coming soon</span>
              </div>
            ) : (
              <video
                src="/demo-video.mp4"
                poster="/nerum-logo.png"
                controls
                onError={() => setFailed(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
