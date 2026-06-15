'use client'

import { useMemo, useState } from 'react'
import { Search, ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SIDEBAR_GROUPS, KIND_COLOR, NODE_ICON, type NodeDef, type NodeKind } from './catalog'

function ItemIcon({ subtype, color }: { subtype: string; color: string }) {
  const spec = NODE_ICON[subtype]
  if (spec?.slug) {
    return <img src={`https://cdn.simpleicons.org/${spec.slug}/${spec.hex}`} alt="" width={16} height={16} onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
  }
  const L = spec?.Lucide
  return L ? <L size={16} strokeWidth={2} color={color} /> : null
}

export default function NodeSidebar() {
  const [q, setQ] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [open, setOpen] = useState<Record<NodeKind, boolean>>({ trigger: true, action: true, ai: true, condition: true, logic: true, note: true })

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return SIDEBAR_GROUPS
    return SIDEBAR_GROUPS.map((g) => ({ ...g, defs: g.defs.filter((d) => d.label.toLowerCase().includes(query) || d.subtitle.toLowerCase().includes(query)) })).filter((g) => g.defs.length > 0)
  }, [q])

  function onDragStart(e: React.DragEvent, def: NodeDef) {
    e.dataTransfer.setData('application/nerum-builder', def.subtype)
    e.dataTransfer.effectAllowed = 'move'
  }

  if (collapsed) {
    return (
      <aside style={{ width: 56, flexShrink: 0, height: '100%', background: 'rgba(10,11,20,0.7)', borderRight: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 6, overflowY: 'auto' }}>
        <button onClick={() => setCollapsed(false)} aria-label="Expand sidebar" style={iconBtn}><PanelLeftOpen size={18} /></button>
        {SIDEBAR_GROUPS.flatMap((g) => g.defs).map((d) => (
          <div key={d.subtype} draggable onDragStart={(e) => onDragStart(e, d)} title={d.label} style={{ width: 36, height: 36, borderRadius: 9, background: `${KIND_COLOR[d.kind]}14`, border: `1px solid ${KIND_COLOR[d.kind]}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', flexShrink: 0 }}>
            <ItemIcon subtype={d.subtype} color={KIND_COLOR[d.kind]} />
          </div>
        ))}
      </aside>
    )
  }

  return (
    <aside className="builder-sidebar" style={{ width: 264, flexShrink: 0, height: '100%', background: 'rgba(10,11,20,0.7)', borderRight: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', overflowY: 'auto' }}>
      <div style={{ padding: 12, position: 'sticky', top: 0, background: 'rgba(10,11,20,0.92)', backdropFilter: 'blur(8px)', zIndex: 1 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} color="#6B7090" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search nodes…" style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '9px 10px 9px 32px', color: '#fff', fontSize: 13, fontFamily: 'var(--font-sans)' }} />
          </div>
          <button onClick={() => setCollapsed(true)} aria-label="Collapse sidebar" style={iconBtn}><PanelLeftClose size={17} /></button>
        </div>
        <p style={{ fontSize: 11, color: '#6B7090', marginTop: 9 }}>Drag a node onto the canvas →</p>
      </div>

      {groups.map((g) => (
        <div key={g.kind} style={{ marginBottom: 4 }}>
          <button onClick={() => setOpen((o) => ({ ...o, [g.kind]: !o[g.kind] }))} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: KIND_COLOR[g.kind], flexShrink: 0 }} />
            <span className="plasma-gradient-text" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>{g.title}</span>
            <span style={{ fontSize: 10.5, color: '#6B7090', background: 'rgba(255,255,255,0.05)', borderRadius: 999, padding: '1px 7px' }}>{g.defs.length}</span>
            <motion.span animate={{ rotate: open[g.kind] ? 0 : -90 }} transition={{ duration: 0.18 }} style={{ marginLeft: 'auto', color: '#6B7090', display: 'inline-flex' }}><ChevronDown size={15} /></motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open[g.kind] && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                {g.defs.map((d) => (
                  <div
                    key={d.subtype}
                    draggable
                    onDragStart={(e) => onDragStart(e, d)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${KIND_COLOR[d.kind]}`, borderRadius: 9, padding: '9px 11px', margin: '5px 12px', cursor: 'grab', transition: 'background 0.15s, transform 0.15s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateX(2px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'none' }}
                  >
                    <span style={{ width: 28, height: 28, borderRadius: 7, background: `${KIND_COLOR[d.kind]}16`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ItemIcon subtype={d.subtype} color={KIND_COLOR[d.kind]} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#fff' }}>{d.label}</div>
                      <div style={{ fontSize: 10.5, color: '#9AA0B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.subtitle}</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
      {groups.length === 0 && <p style={{ color: '#9AA0B8', fontSize: 13, textAlign: 'center', padding: 20 }}>No nodes match.</p>}
    </aside>
  )
}

const iconBtn: React.CSSProperties = { width: 34, height: 34, flexShrink: 0, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#cdd0dd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
