'use client'

import { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { KIND_LABEL, NODE_ICON, type NodeData } from '../catalog'
import { useWorkflow } from '../hooks/useWorkflow'

export type OutputMode = 'single' | 'yesno' | 'none'

function NodeIcon({ subtype, color }: { subtype: string; color: string }) {
  const spec = NODE_ICON[subtype]
  if (spec?.slug) {
    return (
      <img
        src={`https://cdn.simpleicons.org/${spec.slug}/${spec.hex}`}
        alt=""
        width={18}
        height={18}
        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
      />
    )
  }
  const L = spec?.Lucide
  return L ? <L size={18} strokeWidth={2} color={color} /> : null
}

export default function BaseNode({
  id,
  data,
  selected,
  color,
  hasInput,
  output,
}: {
  id: string
  data: NodeData
  selected: boolean
  color: string
  hasInput: boolean
  output: OutputMode
}) {
  const runState = useWorkflow((s) => s.runState[id] ?? 'idle')
  const runError = useWorkflow((s) => s.runError[id])
  const updateNodeData = useWorkflow((s) => s.updateNodeData)

  const [editing, setEditing] = useState(false)
  const [hover, setHover] = useState(false)

  const running = runState === 'running'
  const done = runState === 'done'
  const error = runState === 'error'

  const borderColor = error ? '#FF4D6D' : running || selected || hover ? color : `${color}66`
  const handleStyle = (c: string): React.CSSProperties => ({ width: 11, height: 11, background: c, border: '2px solid #07080F' })

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        minWidth: 224,
        maxWidth: 280,
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${selected ? color : 'rgba(255,255,255,0.08)'}`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 14,
        padding: '12px 14px',
        backdropFilter: 'blur(8px)',
        boxShadow: running
          ? `0 0 0 1px ${color}, 0 0 30px -4px ${color}`
          : selected
          ? `0 0 0 1px ${color}66, 0 16px 40px -22px ${color}`
          : hover
          ? `0 0 22px -8px ${color}`
          : '0 8px 24px -14px rgba(0,0,0,0.7)',
        transition: 'box-shadow 0.3s, border-color 0.3s',
      }}
    >
      {/* running pulse ring */}
      {running && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: -2, borderRadius: 16, border: `2px solid ${color}`, pointerEvents: 'none' }}
        />
      )}

      {/* status badge */}
      {(done || error) && (
        <span
          title={error ? runError : 'Completed'}
          style={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: '50%', background: error ? '#FF4D6D' : '#00E676', color: '#07080F', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
        >
          {error ? <X size={13} strokeWidth={3} /> : <Check size={13} strokeWidth={3} />}
        </span>
      )}

      {hasInput && <Handle type="target" position={Position.Left} style={handleStyle(color)} className="nodrag" />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', color, background: `${color}1a`, border: `1px solid ${color}40`, borderRadius: 5, padding: '2px 6px' }}>
          {KIND_LABEL[data.kind]}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: `${color}1c`, border: `1px solid ${color}33`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <NodeIcon subtype={data.subtype} color={color} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          {editing ? (
            <input
              className="nodrag"
              autoFocus
              defaultValue={data.label}
              onBlur={(e) => { updateNodeData(id, { label: e.target.value || data.label }); setEditing(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              style={{ width: '100%', background: '#07080F', border: `1px solid ${color}55`, borderRadius: 6, color: '#fff', fontSize: 14, fontWeight: 600, padding: '3px 6px', fontFamily: 'var(--font-sans)' }}
            />
          ) : (
            <div
              onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
              title="Double-click to rename"
              style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {data.label}
            </div>
          )}
          {data.subtitle && <div style={{ fontSize: 11.5, color: '#9AA0B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.subtitle}</div>}
        </div>
      </div>

      {output === 'single' && <Handle type="source" position={Position.Right} style={handleStyle(color)} className="nodrag" />}
      {output === 'yesno' && (
        <>
          <Handle id="yes" type="source" position={Position.Right} style={{ ...handleStyle('#00E676'), top: '38%' }} className="nodrag" />
          <Handle id="no" type="source" position={Position.Right} style={{ ...handleStyle('#FF4D6D'), top: '72%' }} className="nodrag" />
          <div style={{ position: 'absolute', right: 14, top: 'calc(38% - 8px)', fontSize: 9, fontWeight: 700, color: '#00E676' }}>YES</div>
          <div style={{ position: 'absolute', right: 14, top: 'calc(72% - 8px)', fontSize: 9, fontWeight: 700, color: '#FF4D6D' }}>NO</div>
        </>
      )}
    </div>
  )
}
