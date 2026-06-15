'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import MagneticButton from '@/components/ui/MagneticButton'
import { useAuth } from '@/store/auth'
import { api } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const login = useAuth((s) => s.login)
  const verify2fa = useAuth((s) => s.verify2fa)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Enter your email and password')
      return
    }
    setLoading(true)
    try {
      const res = await login(email, password)
      if (res.requires_2fa) setOtpStep(true)
      else router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await verify2fa(email, otp)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  function googleLogin() {
    window.location.href = `${api.url}/auth/google`
  }

  return (
    <main style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>
      {/* LEFT */}
      <section
        className="auth-visual"
        style={{
          width: '50%',
          background: '#07080F',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 48,
        }}
      >
        <div style={orb('#FF6B00', '10%', '12%', 360)} />
        <div style={orb('#7B2FFF', '60%', '55%', 420)} />
        <Link href="/" className="plasma-gradient-text" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.1em', textDecoration: 'none', position: 'relative', zIndex: 1 }}>
          NERUM
        </Link>
      </section>

      {/* RIGHT */}
      <section
        style={{
          width: '50%',
          background: '#0D0E1A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
        className="auth-form-panel"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={error ? 'shake' : undefined}
          style={{ width: '100%', maxWidth: 400 }}
        >
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Welcome back</h1>
          <p style={{ color: '#8B8FA8', marginBottom: error ? 12 : 32 }}>
            {otpStep ? 'Enter the 6-digit code we sent you' : 'Sign in to your Nerum account'}
          </p>
          {error && (
            <p style={{ color: '#FF4D6D', fontSize: 13, marginBottom: 20, background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.25)', borderRadius: 8, padding: '9px 12px' }}>
              {error}
            </p>
          )}

          <form onSubmit={otpStep ? onVerify : onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.in"
                style={inputStyle}
                onFocus={focusOn}
                onBlur={focusOff}
              />
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
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  style={eyeBtn}
                  aria-label="Toggle password"
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </Field>

            {otpStep && (
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
            )}

            {!otpStep && (
              <Link href="/forgot-password" style={{ color: '#FF6B00', fontSize: 13, textAlign: 'right', textDecoration: 'none', marginTop: -6 }}>
                Forgot password?
              </Link>
            )}

            <MagneticButton style={{ display: 'block' }}>
              <button type="submit" disabled={loading} style={primaryBtn}>
                {loading ? <Spinner /> : otpStep ? 'Verify →' : 'Sign in →'}
              </button>
            </MagneticButton>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0', color: '#8B8FA8', fontSize: 13 }}>
            <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            or continue with
            <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <button type="button" style={googleBtn} onClick={googleLogin}>
            <img src="https://cdn.simpleicons.org/google/ffffff" alt="" width={18} height={18} />
            Continue with Google
          </button>

          <p style={{ textAlign: 'center', color: '#8B8FA8', fontSize: 14, marginTop: 28 }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: '#FF6B00', textDecoration: 'none', fontWeight: 600 }}>
              Sign up free
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
    <span
      style={{
        display: 'inline-block',
        width: 18,
        height: 18,
        border: '2px solid rgba(255,255,255,0.4)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    >
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
const googleBtn: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#fff',
  fontWeight: 600,
  fontSize: 14,
  padding: '13px',
  borderRadius: 10,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
}
function orb(color: string, left: string, top: string, size: number): React.CSSProperties {
  return {
    position: 'absolute',
    left,
    top,
    width: size,
    height: size,
    borderRadius: '50%',
    background: color,
    filter: 'blur(120px)',
    opacity: 0.3,
    pointerEvents: 'none',
  }
}
