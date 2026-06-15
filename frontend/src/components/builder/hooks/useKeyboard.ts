'use client'

import { useEffect } from 'react'
import { useWorkflow } from './useWorkflow'

function isTyping(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null
  if (!t) return false
  const tag = t.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable
}

/** Global builder shortcuts. Delete is handled here (not React Flow) so undo can snapshot. */
export function useKeyboard({ onSave, onToggleHelp }: { onSave: () => void; onToggleHelp: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useWorkflow.getState()
      const mod = e.ctrlKey || e.metaKey

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) s.redo()
        else s.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); s.redo(); return }
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); onSave(); return }
      if (mod && e.key.toLowerCase() === 'a') {
        if (isTyping(e.target)) return
        e.preventDefault()
        s.selectAll()
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping(e.target)) {
        e.preventDefault()
        s.deleteSelected()
        return
      }
      if (e.key === '?' && !isTyping(e.target)) { e.preventDefault(); onToggleHelp(); return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSave, onToggleHelp])
}
