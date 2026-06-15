'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Copy, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useWorkflow } from './hooks/useWorkflow'
import { useToast } from '@/components/dashboard/Toast'

const LEVEL_COLOR = { info: '#9AA0B8', token: '#00D4FF', success: '#00E676', error: '#FF4D6D' }

export default function ExecutionPanel() {
  const { toast } = useToast()
  const logs = useWorkflow((s) => s.logs)
  const runStatus = useWorkflow((s) => s.runStatus)
  const clearLogs = useWorkflow((s) => s.clearLogs)
  const [min, setMin] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [logs])

  const visible = logs.length > 0 || runStatus === 'running'

  function copyAll() {
    const text = logs.map((l) => `${l.time} ${l.nodeLabel ? `[${l.nodeLabel}] ` : ''}${l.text}`).join('\n')
    navigator.clipboard?.writeText(text)
    toast('Output copied', 'success')
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 240 }}
          animate={{ y: 0 }}
          exit={{ y: 240 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 5, background: '#070810', borderTop: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 -20px 50px -30px rgba(0,0,0,0.9)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: min ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
            <Terminal size={15} color="#00D4FF" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Execution</span>
            <span className="font-mono" style={{ fontSize: 11.5, color: runStatus === 'running' ? '#FFD60A' : runStatus === 'success' ? '#00E676' : runStatus === 'error' ? '#FF4D6D' : '#6B7090' }}>
              · {runStatus}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button onClick={copyAll} title="Copy output" style={btn}><Copy size={14} /></button>
              <button onClick={() => clearLogs()} title="Clear" style={btn}><Trash2 size={14} /></button>
              <button onClick={() => setMin((m) => !m)} title={min ? 'Expand' : 'Minimize'} style={btn}>{min ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>
            </div>
          </div>

          {!min && (
            <div ref={bodyRef} className="font-mono" style={{ height: 188, overflowY: 'auto', padding: '10px 14px', fontSize: 12, lineHeight: 1.65 }}>
              {logs.map((l) => (
                <div key={l.id} style={{ display: 'flex', gap: 9, alignItems: 'baseline' }}>
                  <span style={{ color: '#555d72', flexShrink: 0 }}>{l.time}</span>
                  {l.nodeLabel && <span style={{ color: '#7B8499', flexShrink: 0 }}>[{l.nodeLabel}]</span>}
                  <span style={{ color: LEVEL_COLOR[l.level], whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{l.text}</span>
                </div>
              ))}
              {logs.length === 0 && <span style={{ color: '#555d72' }}>Waiting for output…</span>}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const btn: React.CSSProperties = { width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cdd0dd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
