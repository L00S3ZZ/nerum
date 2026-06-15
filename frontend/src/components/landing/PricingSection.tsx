'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import MagneticButton from '@/components/ui/MagneticButton'

type CTAStyle = 'violet-outline' | 'violet-fill' | 'orange' | 'cyan-outline'

interface Plan {
  name: string
  price: number
  tagline: string
  features: string[]
  cta: string
  ctaStyle: CTAStyle
  popular?: boolean
}

const PLANS: Plan[] = [
  {
    name: 'Free',
    price: 0,
    tagline: 'Start automating today',
    features: ['3 workflows', '1 Smart List', '10 rows', '1000 tokens', 'WhatsApp + Gmail + Telegram'],
    cta: 'Get Started',
    ctaStyle: 'violet-outline',
  },
  {
    name: 'Starter',
    price: 799,
    tagline: 'For growing businesses',
    features: ['10 workflows', '5 Smart Lists', '100 rows', '1000 tokens', 'All Free + Google Sheets + Razorpay'],
    cta: 'Start Free Trial',
    ctaStyle: 'violet-fill',
  },
  {
    name: 'Pro',
    price: 1399,
    tagline: 'For serious automation',
    features: ['50 workflows', '20 Smart Lists', '1000 rows', '1000 tokens', 'All Starter + Priority support + AI Workflows'],
    cta: 'Go Pro',
    ctaStyle: 'orange',
    popular: true,
  },
  {
    name: 'Business',
    price: 3499,
    tagline: 'For power users',
    features: ['Unlimited workflows', 'Unlimited Smart Lists', 'Unlimited rows', '1000 tokens', 'All Pro + Dedicated support + Custom integrations + White label'],
    cta: 'Contact Us',
    ctaStyle: 'cyan-outline',
  },
]

const TITLE_WORDS = ['Simple', 'pricing.', 'No', 'surprises.']

function ctaCss(style: CTAStyle): React.CSSProperties {
  const base: React.CSSProperties = { display: 'block', textAlign: 'center', width: '100%', fontWeight: 700, fontSize: 14.5, padding: '13px 18px', borderRadius: 999, textDecoration: 'none', cursor: 'pointer' }
  switch (style) {
    case 'violet-outline':
      return { ...base, background: 'transparent', border: '1px solid rgba(123,47,255,0.6)', color: '#B98CFF' }
    case 'violet-fill':
      return { ...base, background: '#7B2FFF', border: '1px solid #7B2FFF', color: '#fff' }
    case 'orange':
      return { ...base, background: 'linear-gradient(135deg, #FF6B00, #7B2FFF)', border: 'none', color: '#fff', boxShadow: '0 14px 32px -12px rgba(255,107,0,0.7)' }
    case 'cyan-outline':
      return { ...base, background: 'transparent', border: '1px solid rgba(0,212,255,0.6)', color: '#00D4FF' }
  }
}

function PlanCard({ plan, annual, index, reduced }: { plan: Plan; annual: boolean; index: number; reduced: boolean }) {
  const pro = !!plan.popular
  const monthly = annual ? Math.round(plan.price * 0.8) : plan.price

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 28, scale: pro ? 1.05 : 1 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: pro ? 1.05 : 1 }}
      viewport={{ once: true, amount: 0.2 }}
      whileHover={{ y: -4, scale: pro ? 1.05 : 1 }}
      transition={{ type: 'spring', stiffness: 110, damping: 18, delay: index * 0.1 }}
      className="glass-card"
      style={{
        position: 'relative',
        padding: 26,
        display: 'flex',
        flexDirection: 'column',
        border: pro ? '1px solid #FF6B00' : '1px solid rgba(255,255,255,0.08)',
        boxShadow: pro ? '0 24px 70px -28px rgba(255,107,0,0.65)' : undefined,
        zIndex: pro ? 1 : 0,
      }}
    >
      {pro && (
        <span className="font-mono" style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #FF6B00, #FFD60A)', color: '#07080F', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', padding: '5px 14px', borderRadius: 999, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Most Popular
        </span>
      )}

      <div style={{ marginBottom: 14 }}>
        <h3 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{plan.name}</h3>
        <p style={{ fontSize: 13.5, color: '#9AA0B8', marginTop: 4 }}>{plan.tagline}</p>
      </div>

      <div style={{ marginBottom: 22, minHeight: 64 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: '#fff' }}>₹</span>
          <span className="font-display" style={{ fontSize: 44, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em' }}>{monthly.toLocaleString('en-IN')}</span>
          <span style={{ fontSize: 14, color: '#9AA0B8' }}>/mo</span>
        </div>
        {annual && plan.price > 0 && (
          <div style={{ marginTop: 6, fontSize: 12.5, color: '#6B7090' }}>
            <span style={{ textDecoration: 'line-through' }}>₹{plan.price.toLocaleString('en-IN')}</span>
            <span style={{ color: '#00E676', marginLeft: 8, fontWeight: 600 }}>billed annually</span>
          </div>
        )}
      </div>

      <MagneticButton strength={0.25} style={{ width: '100%', marginBottom: 22 }}>
        <Link href="/signup" style={ctaCss(plan.ctaStyle)}>{plan.cta}</Link>
      </MagneticButton>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {plan.features.map((f) => (
          <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#cdd0dd', lineHeight: 1.45 }}>
            <Check size={15} color="#00D4FF" strokeWidth={2.6} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{f}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default function PricingSection() {
  const reduced = useReducedMotion()
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" style={{ padding: '48px 24px 48px', position: 'relative', zIndex: 1 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {/* heading */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <p className="font-mono" style={{ color: '#7B2FFF', fontWeight: 600, fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>
            Pricing
          </p>
          <h2 className="font-display" style={{ fontSize: 'clamp(30px, 5vw, 50px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            {TITLE_WORDS.map((w, i) => (
              <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', marginRight: '0.26em' }}>
                <motion.span
                  initial={reduced ? false : { y: '110%' }}
                  whileInView={reduced ? undefined : { y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{ display: 'inline-block' }}
                >
                  {w}
                </motion.span>
              </span>
            ))}
          </h2>
          <p style={{ color: '#9AA0B8', fontSize: 17, maxWidth: 540, margin: '14px auto 0', lineHeight: 1.6 }}>
            Start free. Upgrade when you&apos;re ready. Cancel anytime.
          </p>
        </div>

        {/* monthly / annual toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: 4 }}>
            {([['Monthly', false], ['Annual', true]] as const).map(([labelTxt, val]) => (
              <button
                key={labelTxt}
                onClick={() => setAnnual(val)}
                style={{ padding: '8px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: annual === val ? '#fff' : '#9AA0B8', background: annual === val ? 'linear-gradient(135deg, #FF6B00, #7B2FFF)' : 'transparent', transition: 'all 0.25s' }}
              >
                {labelTxt}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#00E676', background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.3)', borderRadius: 999, padding: '5px 11px' }}>
            Save 20%
          </span>
        </div>

        {/* cards */}
        <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, alignItems: 'start' }}>
          {PLANS.map((p, i) => (
            <PlanCard key={p.name} plan={p} annual={annual} index={i} reduced={reduced} />
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) { .pricing-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 520px) { .pricing-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  )
}
