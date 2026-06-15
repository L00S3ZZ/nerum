'use client'

import { useRef } from 'react'
import { Undo2, Save, Play, FileDown, FileUp, HelpCircle, Check, FilePlus } from 'lucide-react'
import type { Edge } from '@xyflow/react'
import { useWorkflow } from './hooks/useWorkflow'
import { useExecution } from './hooks/useExecution'
import { saveWorkflow, clearSavedWorkflow } from './hooks/useAutoSave'
import { useToast } from '@/components/dashboard/Toast'
import { type FlowNode } from './catalog'

export default function TopBar({ onHelp }: { onHelp: () => void }) {
  const { toast } = useToast()
  const { run, running } = useExecution()
  const name = useWorkflow((s) => s.name)
  const setName = useWorkflow((s) => s.setName)
  const runStatus = useWorkflow((s) => s.runStatus)
  const canUndo = useWorkflow((s) => s.canUndo)
  const undo = useWorkflow((s) => s.undo)
  const load = useWorkflow((s) => s.load)
  const reset = useWorkflow((s) => s.reset)

  const fileRef = useRef<HTMLInputElement>(null)

  function save() {
    saveWorkflow()
    toast('Workflow saved', 'success')
  }

  function newWorkflow() {
    reset()
    setName('Untitled workflow')
    clearSavedWorkflow()
    toast('New workflow', 'info')
  }

  function exportJson() {
    const { name: nm, nodes, edges } = useWorkflow.getState()
    const blob = new Blob([JSON.stringify({ name: nm, nodes, edges }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${nm.replace(/\s+/g, '-').toLowerCase() || 'workflow'}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Workflow exported', 'success')
  }

  function importJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as { name?: string; nodes: FlowNode[]; edges: Edge[] }
        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error('bad file')
        load({ name: data.name ?? 'Imported workflow', nodes: data.nodes, edges: data.edges })
        toast('Workflow imported', 'success')
      } catch {
        toast('Invalid workflow file', 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const statusMeta =
    runStatus === 'running' ? { c: '#FFD60A', t: 'running' } : runStatus === 'success' ? { c: '#00E676', t: 'success' } : runStatus === 'error' ? { c: '#FF4D6D', t: 'error' } : { c: '#9AA0B8', t: 'idle' }

  return (
    <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 16px', background: 'rgba(10,11,20,0.85)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}>
      {/* left: name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
          aria-label="Workflow name"
          className="plasma-gradient-text"
          style={{ background: 'transparent', border: '1px solid transparent', borderRadius: 8, caretColor: '#fff', fontWeight: 700, fontSize: 15, padding: '6px 8px', fontFamily: 'var(--font-display)', maxWidth: 280, minWidth: 0 }}
          onFocus={(e) => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.14)')}
          onMouseEnter={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)' }}
          onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.border = '1px solid transparent' }}
        />
      </div>

      {/* center: status */}
      <div className="bld-status" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: statusMeta.c, background: `${statusMeta.c}1a`, border: `1px solid ${statusMeta.c}40`, borderRadius: 999, padding: '5px 13px' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusMeta.c, boxShadow: `0 0 8px ${statusMeta.c}` }} />
        <span className="font-mono">{statusMeta.t}</span>
      </div>

      {/* right: controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button onClick={() => fileRef.current?.click()} title="Import JSON" style={iconBtn}><FileUp size={16} /></button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={importJson} style={{ display: 'none' }} />
        <button onClick={exportJson} title="Export JSON" style={iconBtn}><FileDown size={16} /></button>
        <button onClick={onHelp} title="Shortcuts (?)" style={iconBtn}><HelpCircle size={16} /></button>
        <button onClick={() => undo()} disabled={!canUndo} title="Undo (Ctrl+Z)" style={{ ...iconBtn, opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'default' }}><Undo2 size={16} /></button>

        <button onClick={newWorkflow} style={ghostBtn}><FilePlus size={15} /> <span className="bld-btn-label">New</span></button>
        <button onClick={save} style={ghostBtn}><Save size={15} /> <span className="bld-btn-label">Save</span></button>
        <button onClick={() => run()} disabled={running} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 18px', borderRadius: 9, border: 'none', cursor: running ? 'default' : 'pointer', fontWeight: 700, fontSize: 13.5, color: '#fff', background: running ? 'rgba(255,255,255,0.12)' : 'linear-gradient(135deg, #FF6B00, #7B2FFF)', boxShadow: running ? 'none' : '0 10px 24px -10px rgba(255,107,0,0.7)' }}>
          {running ? <Check size={15} /> : <Play size={15} />} {running ? 'Running…' : 'Run'}
        </button>
      </div>

      <style>{`
        @media (max-width: 900px) { .bld-btn-label { display: none; } .bld-status { display: none !important; } }
      `}</style>
    </div>
  )
}

const iconBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#cdd0dd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const ghostBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 13px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#cdd0dd', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
