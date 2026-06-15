'use client'

import { useState, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Shield, CreditCard, AlertTriangle, ChevronDown, Check, Trash2, LucideIcon } from 'lucide-react'
import { useToast } from '@/components/dashboard/Toast'

const input: React.CSSProperties = { width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 14, fontFamily: 'var(--font-sans)' }
const label: React.CSSProperties = { display: 'block', fontSize: 13, color: '#cdd0dd', marginBottom: 7, fontWeight: 500 }
const primaryBtn: React.CSSProperties = { background: 'linear-gradient(135deg, #FF6B00, #7B2FFF)', color: '#fff', fontWeight: 700, fontSize: 14, padding: '11px 20px', borderRadius: 10, border: 'none', cursor: 'pointer' }

function Section({ title, icon: Icon, accent, children, danger }: { title: string; icon: LucideIcon; accent: string; children: ReactNode; danger?: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="glass-card" style={{ marginBottom: 16, overflow: 'hidden', borderColor: danger ? 'rgba(255,77,109,0.25)' : undefined }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, background: `${accent}1c`, border: `1px solid ${accent}3a`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0 }}>
          <Icon size={17} />
        </span>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: danger ? '#FF4D6D' : '#fff', flex: 1 }}>{title}</h2>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ color: '#9AA0B8', display: 'inline-flex' }}><ChevronDown size={18} /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 22px 22px' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 46, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', background: on ? 'linear-gradient(135deg, #FF6B00, #7B2FFF)' : 'rgba(255,255,255,0.14)', position: 'relative', padding: 0, flexShrink: 0 }} aria-label="Toggle">
      <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff' }} />
    </button>
  )
}

export default function SettingsPage() {
  const { toast } = useToast()
  const [lang, setLang] = useState<'EN' | 'TA'>('EN')
  const [twoFa, setTwoFa] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const tokensUsed = 847
  const tokenLimit = 1000
  const pct = (tokensUsed / tokenLimit) * 100

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 24px 60px' }}>
        <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Settings</h1>
        <p style={{ color: '#9AA0B8', fontSize: 14, marginBottom: 24 }}>Manage your account, keys and billing.</p>

        {/* Profile */}
        <Section title="Profile" icon={User} accent="#FF6B00">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #FF6B00, #7B2FFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, color: '#fff' }} className="font-display">SH</div>
            <button style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontWeight: 600, fontSize: 13, padding: '9px 16px', borderRadius: 9, cursor: 'pointer' }}>Change photo</button>
          </div>
          <div className="set-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <label><span style={label}>Full name</span><input defaultValue="Sri Hari" style={input} /></label>
            <label>
              <span style={label}>Email</span>
              <div style={{ position: 'relative' }}>
                <input defaultValue="sri@nerum.in" type="email" disabled style={{ ...input, opacity: 0.65, paddingRight: 86 }} />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#00E676', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={13} /> Verified</span>
              </div>
            </label>
          </div>
          <div style={{ marginBottom: 22 }}>
            <span style={label}>Language</span>
            <div style={{ display: 'inline-flex', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 4 }}>
              {(['EN', 'TA'] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} style={{ padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: lang === l ? '#fff' : '#9AA0B8', background: lang === l ? 'linear-gradient(135deg, #FF6B00, #7B2FFF)' : 'transparent' }}>
                  {l === 'EN' ? 'English' : 'தமிழ்'}
                </button>
              ))}
            </div>
          </div>
          <button style={primaryBtn} onClick={() => toast('Profile saved')}>Save changes</button>
        </Section>

        {/* Security */}
        <Section title="Security" icon={Shield} accent="#00D4FF">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 420, marginBottom: 22 }}>
            <label><span style={label}>Current password</span><input type="password" placeholder="••••••••" style={input} autoComplete="current-password" /></label>
            <label><span style={label}>New password</span><input type="password" placeholder="••••••••" style={input} autoComplete="new-password" /></label>
            <label><span style={label}>Confirm new password</span><input type="password" placeholder="••••••••" style={input} autoComplete="new-password" /></label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>Two-factor authentication</div>
              <div style={{ fontSize: 13, color: '#9AA0B8', marginTop: 2 }}>Require a code from your authenticator app at login.</div>
            </div>
            <Toggle on={twoFa} onClick={() => { setTwoFa((t) => !t); toast(twoFa ? '2FA disabled' : '2FA enabled', twoFa ? 'info' : 'success') }} />
          </div>
          <button style={primaryBtn} onClick={() => toast('Password updated')}>Update password</button>
        </Section>

        {/* Plan & Billing */}
        <Section title="Plan & Billing" icon={CreditCard} accent="#7B2FFF">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#FFD60A', background: 'rgba(255,214,10,0.12)', border: '1px solid rgba(255,214,10,0.35)', borderRadius: 999, padding: '5px 13px' }}>FREE</span>
              <span style={{ color: '#9AA0B8', fontSize: 14 }}>₹0 / month</span>
            </div>
            <button style={primaryBtn} onClick={() => toast('Opening upgrade…', 'info')}>Upgrade to Pro →</button>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
              <span style={{ color: '#cdd0dd' }}>AI tokens this month</span>
              <span className="font-mono" style={{ color: '#9AA0B8' }}>{tokensUsed.toLocaleString('en-IN')} / {tokenLimit.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} style={{ height: '100%', background: 'linear-gradient(90deg, #FF6B00, #7B2FFF, #00D4FF)' }} />
            </div>
            <p style={{ fontSize: 12, color: '#6B7090', marginTop: 8 }}>{tokenLimit - tokensUsed} tokens left. Resets on the 1st.</p>
          </div>
        </Section>

        {/* Danger Zone */}
        <Section title="Danger Zone" icon={AlertTriangle} accent="#FF4D6D" danger>
          <p style={{ fontSize: 13, color: '#9AA0B8', marginBottom: 16, lineHeight: 1.6 }}>
            Permanently delete your account, workflows and all data. This cannot be undone.
          </p>
          <button onClick={() => { setConfirm(true); setConfirmText('') }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: '1px solid rgba(255,77,109,0.45)', color: '#FF4D6D', fontWeight: 600, fontSize: 13, padding: '10px 18px', borderRadius: 9, cursor: 'pointer' }}>
            <Trash2 size={15} /> Delete account
          </button>
        </Section>
      </div>

      {/* delete confirm modal */}
      <AnimatePresence>
        {confirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirm(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(3,4,10,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ scale: 0.92, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }} onClick={(e) => e.stopPropagation()} style={{ width: 420, maxWidth: '92vw', background: 'rgba(13,14,26,0.97)', border: '1px solid rgba(255,77,109,0.3)', borderRadius: 18, padding: 26, backdropFilter: 'blur(16px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,77,109,0.14)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#FF4D6D' }}><AlertTriangle size={19} /></span>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Delete account?</h3>
              </div>
              <p style={{ fontSize: 13.5, color: '#cdd0dd', lineHeight: 1.6, marginBottom: 18 }}>
                This erases everything. Type <span className="font-mono" style={{ color: '#FF4D6D', fontWeight: 700 }}>DELETE</span> to confirm.
              </p>
              <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" style={{ ...input, marginBottom: 18, fontFamily: 'var(--font-mono)' }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirm(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, fontSize: 14, padding: '12px', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
                <button
                  disabled={confirmText !== 'DELETE'}
                  onClick={() => { setConfirm(false); toast('Account scheduled for deletion', 'error') }}
                  style={{ flex: 1, background: confirmText === 'DELETE' ? '#FF4D6D' : 'rgba(255,77,109,0.25)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px', borderRadius: 10, cursor: confirmText === 'DELETE' ? 'pointer' : 'not-allowed', opacity: confirmText === 'DELETE' ? 1 : 0.6 }}
                >
                  Delete forever
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 560px) { .set-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
