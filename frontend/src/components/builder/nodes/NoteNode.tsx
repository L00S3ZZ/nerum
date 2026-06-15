'use client'

import { type NodeProps } from '@xyflow/react'
import { StickyNote } from 'lucide-react'
import { type NodeData } from '../catalog'
import { useWorkflow } from '../hooks/useWorkflow'

const YELLOW = '#FFD60A'

export default function NoteNode({ id, data, selected }: NodeProps) {
  const updateNodeConfig = useWorkflow((s) => s.updateNodeConfig)
  const d = data as NodeData
  const text = typeof d.config.text === 'string' ? d.config.text : ''

  return (
    <div
      style={{
        width: 220,
        minHeight: 120,
        background: 'rgba(255,214,10,0.07)',
        border: `1px solid ${selected ? YELLOW : 'rgba(255,214,10,0.35)'}`,
        borderRadius: 12,
        padding: 10,
        boxShadow: selected ? `0 0 0 1px ${YELLOW}66, 0 16px 40px -22px ${YELLOW}` : '0 8px 24px -14px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: YELLOW }}>
        <StickyNote size={13} />
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em' }}>NOTE</span>
      </div>
      <textarea
        className="nodrag nowheel"
        value={text}
        onChange={(e) => updateNodeConfig(id, 'text', e.target.value)}
        placeholder="Write a note…"
        style={{ width: '100%', minHeight: 80, resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: '#F0EAD0', fontSize: 13, lineHeight: 1.5, fontFamily: 'var(--font-sans)' }}
      />
    </div>
  )
}
