'use client'

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, AlertTriangle, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastCtx {
  toast: (message: string, kind?: ToastKind) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

const META: Record<ToastKind, { color: string; Icon: typeof Check }> = {
  success: { color: '#00E676', Icon: Check },
  error: { color: '#FF4D6D', Icon: AlertTriangle },
  info: { color: '#00D4FF', Icon: Info },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const remove = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toast = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      const id = ++idRef.current
      setToasts((t) => [...t, { id, kind, message }])
      window.setTimeout(() => remove(id), 3600)
    },
    [remove]
  )

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9000, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const { color, Icon } = META[t.kind]
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                style={{
                  pointerEvents: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  minWidth: 260,
                  maxWidth: 360,
                  padding: '13px 14px',
                  borderRadius: 13,
                  background: 'rgba(13,14,26,0.92)',
                  border: `1px solid ${color}55`,
                  backdropFilter: 'blur(14px)',
                  boxShadow: '0 18px 50px -20px rgba(0,0,0,0.8)',
                }}
              >
                <span style={{ width: 28, height: 28, borderRadius: 8, background: `${color}1f`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                  <Icon size={16} strokeWidth={2.4} />
                </span>
                <span style={{ flex: 1, fontSize: 13.5, color: '#E7E9F4', lineHeight: 1.4 }}>{t.message}</span>
                <button onClick={() => remove(t.id)} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: '#6B7090', cursor: 'pointer', display: 'inline-flex' }}>
                  <X size={15} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}
