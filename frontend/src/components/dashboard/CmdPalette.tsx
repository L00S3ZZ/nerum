'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

type Item = { label: string; icon: string; href: string; hint?: string }

const ITEMS: Item[] = [
  { label: 'Overview', icon: '🏠', href: '/dashboard', hint: 'Dashboard home' },
  { label: 'AI Agent', icon: '⚡', href: '/dashboard/agent', hint: 'Workflow builder' },
  { label: 'Integrations', icon: '🔗', href: '/dashboard/integrations', hint: 'Connect apps' },
  { label: 'Settings', icon: '⚙️', href: '/dashboard/settings', hint: 'Account & billing' },
  { label: 'Docs', icon: '📚', href: '/dashboard', hint: 'Documentation' },
]

export default function CmdPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ITEMS
    return ITEMS.filter(
      (i) => i.label.toLowerCase().includes(q) || i.hint?.toLowerCase().includes(q)
    )
  }, [query])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('nerum:open-cmd', onOpen as EventListener)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('nerum:open-cmd', onOpen as EventListener)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query])

  function go(item: Item) {
    setOpen(false)
    router.push(item.href)
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[active]) go(results[active])
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(3,4,10,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '14vh',
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 560,
              maxWidth: '90vw',
              background: '#0D0E1A',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 30px 80px -30px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: '#8B8FA8', fontSize: 18 }}>🔍</span>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onListKey}
                placeholder="Search pages and actions…"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: 16,
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <kbd style={{ fontSize: 11, color: '#8B8FA8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '2px 6px' }}>ESC</kbd>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto', padding: 8 }}>
              {results.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: '#8B8FA8', fontSize: 14 }}>No results</div>
              )}
              {results.map((item, i) => (
                <button
                  key={item.label + i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    background: i === active ? 'rgba(255,107,0,0.12)' : 'transparent',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', color: '#fff', fontSize: 14, fontWeight: 600 }}>{item.label}</span>
                    {item.hint && <span style={{ display: 'block', color: '#8B8FA8', fontSize: 12 }}>{item.hint}</span>}
                  </span>
                  {i === active && <span style={{ color: '#FF6B00', fontSize: 13 }}>↵</span>}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
