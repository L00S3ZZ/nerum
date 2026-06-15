'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'

const SHORTCUTS: [string, string][] = [
  ['Ctrl / ⌘ + Z', 'Undo'],
  ['Ctrl / ⌘ + Shift + Z', 'Redo'],
  ['Ctrl / ⌘ + S', 'Save workflow'],
  ['Ctrl / ⌘ + A', 'Select all nodes'],
  ['Delete / Backspace', 'Delete selection'],
  ['Space + drag', 'Pan the canvas'],
  ['Drag on empty canvas', 'Box-select nodes'],
  ['Double-click node title', 'Rename node'],
  ['?', 'Toggle this help'],
]

export default function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(3,4,10,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <motion.div initial={{ scale: 0.92, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }} onClick={(e) => e.stopPropagation()} style={{ width: 420, maxWidth: '92vw', background: 'rgba(13,14,26,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: 24, backdropFilter: 'blur(16px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(0,212,255,0.14)', border: '1px solid rgba(0,212,255,0.35)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#00D4FF' }}><Keyboard size={17} /></span>
                <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Keyboard shortcuts</h3>
              </div>
              <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: '#9AA0B8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {SHORTCUTS.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 13.5, color: '#cdd0dd' }}>{v}</span>
                  <span className="font-mono" style={{ fontSize: 12, color: '#fff', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '4px 9px', whiteSpace: 'nowrap' }}>{k}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
