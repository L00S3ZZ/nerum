'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/store/auth'

function CallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const setSession = useAuth((s) => s.setSession)
  const fetchMe = useAuth((s) => s.fetchMe)

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      router.replace('/login?error=google_failed')
      return
    }
    setSession(token)
    fetchMe()
      .then(() => router.replace('/dashboard'))
      .catch(() => router.replace('/dashboard'))
  }, [params, router, setSession, fetchMe])

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#07080F', color: '#9AA0B8' }}>
      <p className="font-mono">Signing you in…</p>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  )
}
