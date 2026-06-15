'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Copy, Braces, Plus, Eye } from 'lucide-react'
import { useWorkflow } from './hooks/useWorkflow'
import { useToast } from '@/components/dashboard/Toast'
import { FIELD_SCHEMAS, OPERATORS, KIND_COLOR, KIND_LABEL, type FieldDef, type Condition } from './catalog'

const inputCss: React.CSSProperties = { width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '10px 12px', color: '#fff', fontSize: 13, fontFamily: 'var(--font-sans)' }
const labelCss: React.CSSProperties = { display: 'block', fontSize: 12, color: '#9AA0B8', marginBottom: 6 }

const CRON_PRESETS = [
  { label: 'Every hour', cron: '0 * * * *' },
  { label: 'Every day 9am', cron: '0 9 * * *' },
  { label: 'Every Monday', cron: '0 9 * * 1' },
]
function cronHuman(c: string): string {
  const map: Record<string, string> = { '0 * * * *': 'At the start of every hour', '0 9 * * *': 'Every day at 9:00 AM', '0 9 * * 1': 'Every Monday at 9:00 AM', '*/5 * * * *': 'Every 5 minutes' }
  return map[c.trim()] ?? 'Custom schedule'
}

function VarInsert({ vars, onPick }: { vars: string[]; onPick: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} title="Insert variable" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#00D4FF', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: 7, padding: '3px 8px', cursor: 'pointer' }}>
        <Braces size={12} /> Insert
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} style={{ position: 'absolute', right: 0, top: 28, width: 200, maxHeight: 220, overflowY: 'auto', background: 'rgba(13,14,26,0.98)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 5, zIndex: 20, boxShadow: '0 16px 40px -16px rgba(0,0,0,0.8)' }}>
            {vars.map((v) => (
              <button key={v} onClick={() => { onPick(v); setOpen(false) }} className="font-mono" style={{ display: 'block', width: '100%', textAlign: 'left', fontSize: 12, color: '#cdd0dd', background: 'none', border: 'none', borderRadius: 6, padding: '7px 8px', cursor: 'pointer' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}>
                {'{{'}{v}{'}}'}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ConditionBuilder({ value, onChange, vars }: { value: Condition[]; onChange: (c: Condition[]) => void; vars: string[] }) {
  const rows = Array.isArray(value) ? value : []
  const update = (i: number, patch: Partial<Condition>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9, padding: 8 }}>
          <input value={r.field} onChange={(e) => update(i, { field: e.target.value })} placeholder="field e.g. {{category}}" list="cb-vars" style={{ ...inputCss, fontFamily: 'var(--font-mono)', fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={r.op} onChange={(e) => update(i, { op: e.target.value })} style={{ ...inputCss, flex: 1 }}>
              {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {r.op !== 'empty' && <input value={r.value} onChange={(e) => update(i, { value: e.target.value })} placeholder="value" style={{ ...inputCss, flex: 1 }} />}
            {rows.length > 1 && <button onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="Remove" style={{ background: 'none', border: 'none', color: '#FF4D6D', cursor: 'pointer' }}><X size={16} /></button>}
          </div>
        </div>
      ))}
      <datalist id="cb-vars">{vars.map((v) => <option key={v} value={`{{${v}}}`} />)}</datalist>
      <button onClick={() => onChange([...rows, { field: '', op: 'contains', value: '' }])} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', fontSize: 12, color: '#00D4FF', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: 8, padding: '6px 11px', cursor: 'pointer' }}>
        <Plus size={13} /> Add condition
      </button>
    </div>
  )
}

export default function ConfigPanel() {
  const { toast } = useToast()
  const selectedId = useWorkflow((s) => s.selectedId)
  const node = useWorkflow((s) => s.nodes.find((n) => n.id === s.selectedId) ?? null)
  const updateNodeConfig = useWorkflow((s) => s.updateNodeConfig)
  const updateNodeData = useWorkflow((s) => s.updateNodeData)
  const deleteNode = useWorkflow((s) => s.deleteNode)
  const setSelected = useWorkflow((s) => s.setSelected)
  const variablesFor = useWorkflow((s) => s.variablesFor)

  const open = !!node
  const color = node ? KIND_COLOR[node.data.kind] : '#7B2FFF'
  const fields: FieldDef[] = node ? FIELD_SCHEMAS[node.data.subtype] ?? [] : []
  const vars = selectedId ? variablesFor(selectedId) : []

  const str = (k: string): string => {
    const v = node?.data.config[k]
    return v === undefined || v === null ? '' : String(v)
  }

  function renderField(f: FieldDef) {
    if (!node) return null
    const id = node.id
    switch (f.type) {
      case 'textarea':
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#9AA0B8' }}>{f.label}</span>
              {f.vars && <VarInsert vars={vars} onPick={(v) => updateNodeConfig(id, f.key, `${str(f.key)}${str(f.key) ? ' ' : ''}{{${v}}}`)} />}
            </div>
            <textarea value={str(f.key)} onChange={(e) => updateNodeConfig(id, f.key, e.target.value)} placeholder={f.placeholder} rows={4} style={{ ...inputCss, resize: 'vertical', lineHeight: 1.5 }} />
          </div>
        )
      case 'select':
        return (
          <label><span style={labelCss}>{f.label}</span>
            <select value={str(f.key)} onChange={(e) => updateNodeConfig(id, f.key, e.target.value)} style={inputCss}>
              {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        )
      case 'number':
        return (
          <label><span style={labelCss}>{f.label}</span>
            <input type="number" min={f.min} value={str(f.key)} onChange={(e) => updateNodeConfig(id, f.key, e.target.value === '' ? '' : Number(e.target.value))} style={inputCss} />
          </label>
        )
      case 'slider': {
        const val = Number(node.data.config[f.key] ?? 0)
        return (
          <label><span style={labelCss}>{f.label}: <span style={{ color: '#fff' }}>{val}</span></span>
            <input type="range" min={f.min} max={f.max} step={f.step} value={val} onChange={(e) => updateNodeConfig(id, f.key, Number(e.target.value))} style={{ width: '100%', accentColor: color }} />
          </label>
        )
      }
      case 'langToggle': {
        const v = str(f.key) || 'en'
        return (
          <div><span style={labelCss}>{f.label}</span>
            <div style={{ display: 'inline-flex', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: 3 }}>
              {([['en', 'English'], ['ta', 'தமிழ்']] as const).map(([code, lbl]) => (
                <button key={code} onClick={() => updateNodeConfig(id, f.key, code)} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: v === code ? '#fff' : '#9AA0B8', background: v === code ? 'linear-gradient(135deg, #FF6B00, #7B2FFF)' : 'transparent' }}>{lbl}</button>
              ))}
            </div>
          </div>
        )
      }
      case 'cron':
        return (
          <div><span style={labelCss}>{f.label}</span>
            <input value={str(f.key)} onChange={(e) => updateNodeConfig(id, f.key, e.target.value)} placeholder={f.placeholder} style={{ ...inputCss, fontFamily: 'var(--font-mono)' }} />
            <p style={{ fontSize: 12, color: '#00E676', marginTop: 6 }}>{cronHuman(str(f.key))}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {CRON_PRESETS.map((p) => (
                <button key={p.cron} onClick={() => updateNodeConfig(id, f.key, p.cron)} style={{ fontSize: 11.5, color: '#cdd0dd', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '5px 11px', cursor: 'pointer' }}>{p.label}</button>
              ))}
            </div>
          </div>
        )
      case 'webhookUrl': {
        const url = `https://api.nerum.in/webhook/${node.id}`
        return (
          <div><span style={labelCss}>{f.label}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly value={url} style={{ ...inputCss, fontFamily: 'var(--font-mono)', fontSize: 12 }} />
              <button onClick={() => { navigator.clipboard?.writeText(url); toast('Webhook URL copied', 'success') }} aria-label="Copy" style={{ flexShrink: 0, width: 40, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#cdd0dd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Copy size={15} /></button>
            </div>
          </div>
        )
      }
      case 'conditions':
        return (
          <div><span style={labelCss}>{f.label}</span>
            <ConditionBuilder value={(node.data.config[f.key] as Condition[]) ?? []} onChange={(c) => updateNodeConfig(id, f.key, c)} vars={vars} />
          </div>
        )
      default:
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#9AA0B8' }}>{f.label}</span>
              {f.vars && <VarInsert vars={vars} onPick={(v) => updateNodeConfig(id, f.key, `${str(f.key)}${str(f.key) ? ' ' : ''}{{${v}}}`)} />}
            </div>
            <input value={str(f.key)} onChange={(e) => updateNodeConfig(id, f.key, e.target.value)} placeholder={f.placeholder} style={inputCss} />
          </div>
        )
    }
  }

  return (
    <AnimatePresence>
      {open && node && (
        <motion.aside
          key={node.id}
          initial={{ x: 340, opacity: 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 340, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 340, maxWidth: '90vw', background: 'rgba(13,14,26,0.96)', borderLeft: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', zIndex: 6, display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color }}>{KIND_LABEL[node.data.kind]}</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.data.label}</div>
            </div>
            <button onClick={() => setSelected(null)} aria-label="Close" style={{ background: 'none', border: 'none', color: '#9AA0B8', cursor: 'pointer' }}><X size={19} /></button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label><span style={labelCss}>Node name</span>
              <input value={node.data.label} onChange={(e) => updateNodeData(node.id, { label: e.target.value })} style={inputCss} />
            </label>

            {fields.map((f) => <div key={f.key}>{renderField(f)}</div>)}

            {node.data.subtype === 'wa_send' && (
              <button onClick={() => toast(`Preview: ${str('message') || '(empty message)'}`, 'info')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start', fontSize: 12.5, color: '#25D366', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 9, padding: '8px 13px', cursor: 'pointer' }}>
                <Eye size={14} /> Preview message
              </button>
            )}

            <label><span style={labelCss}>Notes</span>
              <textarea value={node.data.notes ?? ''} onChange={(e) => updateNodeData(node.id, { notes: e.target.value })} placeholder="Add a note about this node…" rows={2} style={{ ...inputCss, resize: 'vertical' }} />
            </label>
          </div>

          <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => deleteNode(node.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: 'transparent', color: '#FF4D6D', fontWeight: 600, fontSize: 14, padding: '11px', borderRadius: 10, border: '1px solid rgba(255,77,109,0.3)', cursor: 'pointer' }}>
              <Trash2 size={15} /> Delete node
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
