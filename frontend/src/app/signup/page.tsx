'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import MagneticButton from '@/components/ui/MagneticButton'
import { useAuth } from '@/store/auth'

function strengthOf(pw: string): number {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}
const STRENGTH_COLOR = ['#FF4D6D', '#FF6B00', '#FFD60A', '#00E676']
const STRENGTH_LABEL = ['Weak', 'Fair', 'Good', 'Strong']

export default function SignupPage() {
  const router = useRouter()
  const register = useAuth((s) => s.register)
  const verifyEmail = useAuth((s) => s.verifyEmail)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')

  const strength = useMemo(() => strengthOf(password), [password])

  async function onRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Enter your name')
    if (!email.trim()) return setError('Enter your email')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    if (password !== confirm) return setError("Passwords don't match")
    if (!agree) return setError('Please accept the Terms to continue')
    setLoading(true)
    try {
      await register(name.trim(), email.trim(), password)
      setOtpStep(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account')
    } finally {
      setLoading(false)
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await verifyEmail(email.trim(), otp.trim())
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>
      {/* LEFT */}
      <section
        className="auth-visual"
        style={{ width: '50%', background: '#07080F', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 48 }}
      >
        <div style={orb('#7B2FFF', '8%', '14%', 380)} />
        <div style={orb('#00D4FF', '58%', '58%', 400)} />
        <Link href="/" className="plasma-gradient-text" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.1em', textDecoration: 'none', position: 'relative', zIndex: 1 }}>
          NERUM
        </Link>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 420 }}>
          <p style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.45, marginBottom: 16 }}>
            Start automating in minutes. Free to start, no card needed.
          </p>
          <p style={{ color: '#8B8FA8', fontSize: 15 }}>WhatsApp, Gmail, Razorpay and more — wired together by AI.</p>
        </div>
        <span style={{ position: 'relative', zIndex: 1, color: 'rgba(255,255,255,0.25)', fontSize: 12 }} className="font-mono">© 2026 Nerum</span>
      </section>

      {/* RIGHT */}
      <section
        className="auth-form-panel"
        style={{ width: '50%', background: '#0D0E1A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={error ? 'shake' : undefined}
          style={{ width: '100%', maxWidth: 400 }}
        >
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>{otpStep ? 'Verify your email' : 'Create your account'}</h1>
          <p style={{ color: '#8B8FA8', marginBottom: error ? 12 : 28 }}>
            {otpStep ? `Enter the 6-digit code sent to ${email}` : 'Automate your business with AI'}
          </p>
          {error && (
            <p style={{ color: '#FF4D6D', fontSize: 13, marginBottom: 20, background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.25)', borderRadius: 8, padding: '9px 12px' }}>
              {error}
            </p>
          )}

          {otpStep ? (
            <form onSubmit={onVerify} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Field label="6-digit code">
                <input
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  style={{ ...inputStyle, letterSpacing: '0.3em', textAlign: 'center', fontFamily: 'var(--font-mono)' }}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </Field>
              <MagneticButton style={{ display: 'block' }}>
                <button type="submit" disabled={loading} style={primaryBtn}>
                  {loading ? <Spinner /> : 'Verify & continue →'}
                </button>
              </MagneticButton>
              <button type="button" onClick={() => { setOtpStep(false); setOtp(''); setError('') }} style={{ background: 'none', border: 'none', color: '#8B8FA8', fontSize: 13, cursor: 'pointer' }}>
                ← Back to details
              </button>
            </form>
          ) : (
            <form onSubmit={onRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Full Name">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sri Hari" style={inputStyle} onFocus={focusOn} onBlur={focusOff} autoComplete="name" />
              </Field>
              <Field label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.in" style={inputStyle} onFocus={focusOn} onBlur={focusOff} autoComplete="email" />
              </Field>
              <Field label="Password">
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={focusOn}
                    onBlur={focusOff}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPw((s) => !s)} style={eyeBtn} aria-label="Toggle password">
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
                {password && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i < strength ? STRENGTH_COLOR[strength - 1] : 'rgba(255,255,255,0.1)', transition: 'background 0.25s' }} />
                      ))}
                    </div>
                    {strength > 0 && (
                      <span style={{ fontSize: 12, color: STRENGTH_COLOR[strength - 1], marginTop: 6, display: 'block' }}>{STRENGTH_LABEL[strength - 1]} password</span>
                    )}
                  </div>
                )}
              </Field>
              <Field label="Confirm Password">
                <input type={showPw ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" style={inputStyle} onFocus={focusOn} onBlur={focusOff} autoComplete="new-password" />
                {confirm && confirm !== password && (
                  <span style={{ fontSize: 12, color: '#FF4D6D', marginTop: 6, display: 'block' }}>Passwords don&apos;t match</span>
                )}
              </Field>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: '#cdd0dd' }}>
                <span
                  onClick={() => setAgree((a) => !a)}
                  style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1, border: agree ? 'none' : '1px solid rgba(255,255,255,0.2)', background: agree ? 'linear-gradient(135deg, #FF6B00, #7B2FFF)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}
                >
                  {agree ? '✓' : ''}
                </span>
                <span>
                  I agree to the <Link href="/terms" style={{ color: '#FF6B00', textDecoration: 'none' }}>Terms of Service</Link> and{' '}
                  <Link href="/terms" style={{ color: '#FF6B00', textDecoration: 'none' }}>Privacy Policy</Link>
                </span>
              </label>

              <MagneticButton style={{ display: 'block' }}>
                <button type="submit" disabled={loading} style={primaryBtn}>
                  {loading ? <Spinner /> : 'Create free account →'}
                </button>
              </MagneticButton>
            </form>
          )}

          <p style={{ textAlign: 'center', color: '#8B8FA8', fontSize: 14, marginTop: 24 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#FF6B00', textDecoration: 'none', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </motion.div>
      </section>

      <style>{`
        @media (max-width: 860px) {
          .auth-visual { display: none !important; }
          .auth-form-panel { width: 100% !important; }
        }
        input::placeholder { color: #555d72; }
      `}</style>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 13, color: '#cdd0dd', marginBottom: 8, fontWeight: 500 }}>{label}</span>
      {children}
    </label>
  )
}

function Spinner() {
  return (
    <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#07080F',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '14px 16px',
  color: '#fff',
  fontSize: 15,
  fontFamily: 'var(--font-sans)',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}
function focusOn(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#FF6B00'
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,0,0.15)'
}
function focusOff(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
  e.currentTarget.style.boxShadow = 'none'
}
const eyeBtn: React.CSSProperties = {
  position: 'absolute',
  right: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 16,
}
const primaryBtn: React.CSSProperties = {
  width: '100%',
  background: 'linear-gradient(135deg, #FF6B00, #7B2FFF)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 15,
  padding: '14px',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 48,
}
function orb(color: string, left: string, top: string, size: number): React.CSSProperties {
  return { position: 'absolute', left, top, width: size, height: size, borderRadius: '50%', background: color, filter: 'blur(120px)', opacity: 0.3, pointerEvents: 'none' }
}
