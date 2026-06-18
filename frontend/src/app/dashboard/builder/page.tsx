'use client'

/* ============================================================================
 * NERUM — Solar System Agent Builder
 * ----------------------------------------------------------------------------
 * The AI Commander is the sun; every integration is a planet orbiting on a ring.
 * Rings fill by capacity (3, 6, 9, 12, 15, +3…); a new ring is born when the
 * inner ones are full. Pure Canvas + requestAnimationFrame — no animation deps.
 * Icons are the Simple Icons CDN marks already used on the Integrations page.
 * ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react'

/* ---------------------------------- tokens -------------------------------- */
const PLASMA = {
  bg: '#07080F',
  orange: '#FF6B00',
  violet: '#7B2FFF',
  cyan: '#00D4FF',
  yellow: '#FFD60A',
  card: '#0d0f1e',
  border: '#1e2240',
  muted: '#6b7280',
  white: '#ffffff',
}

const CANVAS_FONT = 'Inter, system-ui, -apple-system, sans-serif'
const COLORS = ['#00D4FF', '#FF6B00', '#7B2FFF', '#FFD60A', '#25D366']

/* ---------------------------------- types --------------------------------- */
interface AgentNode {
  name: string
  sub: string
  ring: number
  iconUrl: string
  brandColor: string
}

interface RingConfig {
  radius: number
  capacity: number
  color: string
  speed: number
}

interface IntMeta {
  name: string
  sub: string
  slug: string // Simple Icons slug
  hex: string // Simple Icons colour (no #)
  color: string // brand colour (with #)
}

/* ----- integration metadata (icon URLs match the Integrations page) ------- */
const INTEGRATIONS: IntMeta[] = [
  { name: 'WhatsApp', sub: 'Send messages', slug: 'whatsapp', hex: '25D366', color: '#25D366' },
  { name: 'Gmail', sub: 'Send emails', slug: 'gmail', hex: 'EA4335', color: '#EA4335' },
  { name: 'Telegram', sub: 'Bot messages', slug: 'telegram', hex: '2AABEE', color: '#2AABEE' },
  { name: 'Sheets', sub: 'Read/write data', slug: 'googlesheets', hex: '34A853', color: '#34A853' },
  { name: 'Razorpay', sub: 'Process payments', slug: 'razorpay', hex: '2D76F9', color: '#2D76F9' },
  { name: 'Webhook', sub: 'External trigger', slug: 'webhooks', hex: '00D4FF', color: '#00D4FF' },
  { name: 'Forms', sub: 'Collect input', slug: 'googleforms', hex: '7248B9', color: '#7248B9' },
  { name: 'SMS', sub: 'Text messages', slug: 'twilio', hex: 'F22F46', color: '#F22F46' },
  { name: 'Calendar', sub: 'Schedule events', slug: 'googlecalendar', hex: '4285F4', color: '#4285F4' },
  { name: 'Notion', sub: 'Update docs', slug: 'notion', hex: 'FFFFFF', color: '#ffffff' },
  { name: 'Slack', sub: 'Team alerts', slug: 'slack', hex: 'E01E5A', color: '#E01E5A' },
  { name: 'Airtable', sub: 'Database ops', slug: 'airtable', hex: '18BFFF', color: '#18BFFF' },
  { name: 'Drive', sub: 'File storage', slug: 'googledrive', hex: '4285F4', color: '#4285F4' },
  { name: 'Shopify', sub: 'E-commerce', slug: 'shopify', hex: '96BF48', color: '#96BF48' },
  { name: 'Discord', sub: 'Server messages', slug: 'discord', hex: '5865F2', color: '#5865F2' },
  { name: 'Stripe', sub: 'Payments', slug: 'stripe', hex: '635BFF', color: '#635BFF' },
  { name: 'HubSpot', sub: 'CRM updates', slug: 'hubspot', hex: 'FF7A59', color: '#FF7A59' },
  { name: 'Jira', sub: 'Create tickets', slug: 'jira', hex: '0052CC', color: '#0052CC' },
  { name: 'LinkedIn', sub: 'Post updates', slug: 'linkedin', hex: '0A66C2', color: '#0A66C2' },
  { name: 'YouTube', sub: 'Upload videos', slug: 'youtube', hex: 'FF0000', color: '#FF0000' },
]

const iconUrlFor = (m: IntMeta) => `https://cdn.simpleicons.org/${m.slug}/${m.hex}`
const iconMap: Record<string, string> = Object.fromEntries(INTEGRATIONS.map((m) => [m.name, iconUrlFor(m)]))

const makeNode = (m: IntMeta, ring: number): AgentNode => ({
  name: m.name,
  sub: m.sub,
  ring,
  iconUrl: iconUrlFor(m),
  brandColor: m.color,
})

/* --------------------------------- rings ---------------------------------- */
const RING_PRESETS: RingConfig[] = [
  { radius: 80, capacity: 3, color: '#00D4FF', speed: 0.007 },
  { radius: 148, capacity: 6, color: '#FF6B00', speed: 0.0035 },
  { radius: 216, capacity: 9, color: '#7B2FFF', speed: 0.0023 },
  { radius: 284, capacity: 12, color: '#FFD60A', speed: 0.00175 },
  { radius: 352, capacity: 15, color: '#25D366', speed: 0.0014 },
]

function ringConfig(ri: number): RingConfig {
  if (ri < RING_PRESETS.length) return RING_PRESETS[ri]
  // Ring 6+ : radius += 68, capacity += 3, colour cycles, speed slows.
  return {
    radius: 352 + 68 * (ri - 4),
    capacity: 15 + 3 * (ri - 4),
    color: COLORS[ri % COLORS.length],
    speed: 0.007 / (ri + 1),
  }
}

const countInRing = (list: AgentNode[], ri: number) => list.filter((n) => n.ring === ri).length

/** First ring with free space; an unused outer ring is created automatically. */
function pickRing(list: AgentNode[]): number {
  let ri = 0
  while (countInRing(list, ri) >= ringConfig(ri).capacity) ri++
  return ri
}

/* ================================ component ================================ */
export default function BuilderPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)
  const ringAnglesRef = useRef<number[]>([])
  const imageCache = useRef<Record<string, HTMLImageElement>>({})
  const sunPulseRef = useRef(0)
  const sizeRef = useRef({ w: 0, h: 0 })
  const nodePositionsRef = useRef<{ idx: number; x: number; y: number }[]>([])

  const [nodes, setNodes] = useState<AgentNode[]>(() => [makeNode(INTEGRATIONS[0], 0)])
  const [activeIdx, setActiveIdx] = useState(-1)
  const [openDropdown, setOpenDropdown] = useState<number | null>(null)
  const [hovered, setHovered] = useState<{ idx: number; x: number; y: number } | null>(null)

  // Refs mirror state so the single RAF loop + native handlers read fresh values.
  const nodesRef = useRef(nodes)
  const activeRef = useRef(activeIdx)
  nodesRef.current = nodes
  activeRef.current = activeIdx

  const maxRing = nodes.reduce((m, n) => Math.max(m, n.ring), 0)
  const ringCount = maxRing + 1

  /* --------------------------- icon preloading --------------------------- */
  const preloadIcons = useCallback((list: AgentNode[]) => {
    return Promise.all(
      list.map(
        (n) =>
          new Promise<void>((resolve) => {
            if (imageCache.current[n.name]) return resolve()
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              imageCache.current[n.name] = img
              resolve()
            }
            img.onerror = () => resolve()
            img.src = iconMap[n.name] || n.iconUrl || ''
          })
      )
    )
  }, [])

  useEffect(() => {
    preloadIcons(nodes)
  }, [nodes, preloadIcons])

  /* ------------------------------ add node ------------------------------- */
  const addNode = useCallback((ringIndex?: number) => {
    setNodes((prev) => {
      const meta = INTEGRATIONS[prev.length % INTEGRATIONS.length]
      const ring =
        ringIndex !== undefined && countInRing(prev, ringIndex) < ringConfig(ringIndex).capacity
          ? ringIndex
          : pickRing(prev)
      return [...prev, makeNode(meta, ring)]
    })
  }, [])

  /* ---------------------------- canvas resize ---------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const apply = () => {
      const dpr = window.devicePixelRatio || 1
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      sizeRef.current = { w, h }
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(wrap)
    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [])

  /* ---------------------------- animation loop --------------------------- */
  useEffect(() => {
    let running = true

    const drawFrame = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      const { w, h } = sizeRef.current
      if (!canvas || !ctx || !w || !h) return

      const CX = w / 2
      const CY = h / 2
      const ns = nodesRef.current
      const active = activeRef.current
      const rings = ns.reduce((m, n) => Math.max(m, n.ring), 0) + 1

      // background
      ctx.fillStyle = PLASMA.bg
      ctx.fillRect(0, 0, w, h)

      // advance ring rotation
      const angles = ringAnglesRef.current
      for (let ri = 0; ri < rings; ri++) {
        if (angles[ri] === undefined) angles[ri] = 0
        angles[ri] += ringConfig(ri).speed
      }

      // orbit rings (faint strokes)
      for (let ri = 0; ri < rings; ri++) {
        const rc = ringConfig(ri)
        ctx.beginPath()
        ctx.arc(CX, CY, rc.radius, 0, Math.PI * 2)
        ctx.strokeStyle = rc.color + '22'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // sun — the AI Commander
      sunPulseRef.current += 0.04
      const pulse = Math.sin(sunPulseRef.current) * 2
      ctx.beginPath()
      ctx.arc(CX, CY, 38, 0, Math.PI * 2)
      ctx.fillStyle = '#FF6B0010'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(CX, CY, 26 + pulse, 0, Math.PI * 2)
      ctx.fillStyle = '#110800'
      ctx.fill()
      ctx.strokeStyle = '#FF6B00'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#FF6B00'
      ctx.font = `500 11px ${CANVAS_FONT}`
      ctx.fillText('AI', CX, CY - 3)
      ctx.fillStyle = '#FF6B0077'
      ctx.font = `400 8px ${CANVAS_FONT}`
      ctx.fillText('Core', CX, CY + 8)

      // planets
      const positions: { idx: number; x: number; y: number }[] = []
      for (let ri = 0; ri < rings; ri++) {
        const rc = ringConfig(ri)
        const idxs: number[] = []
        ns.forEach((n, i) => {
          if (n.ring === ri) idxs.push(i)
        })
        const total = idxs.length
        idxs.forEach((gi, k) => {
          const baseAngle = (2 * Math.PI * k) / total
          const finalAngle = baseAngle + angles[ri]
          const x = CX + rc.radius * Math.cos(finalAngle)
          const y = CY + rc.radius * Math.sin(finalAngle)
          positions.push({ idx: gi, x, y })

          const node = ns[gi]
          const isActive = gi === active

          // step 1 — active glow
          if (isActive) {
            ctx.beginPath()
            ctx.arc(x, y, 30, 0, Math.PI * 2)
            ctx.fillStyle = rc.color + '25'
            ctx.fill()
          }
          // step 2 — node circle
          ctx.beginPath()
          ctx.arc(x, y, 22, 0, Math.PI * 2)
          ctx.fillStyle = '#07080F'
          ctx.fill()
          ctx.strokeStyle = isActive ? rc.color : rc.color + '55'
          ctx.lineWidth = isActive ? 2 : 1
          ctx.stroke()
          // step 3 — icon (or 2-char fallback while loading)
          const img = imageCache.current[node.name]
          if (img) {
            try {
              ctx.drawImage(img, x - 11, y - 11, 22, 22)
            } catch {
              /* image not yet decodable */
            }
          } else {
            ctx.fillStyle = rc.color
            ctx.font = `500 9px ${CANVAS_FONT}`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(node.name.slice(0, 2), x, y)
          }
        })
      }
      nodePositionsRef.current = positions
    }

    const render = () => {
      if (!running) return
      drawFrame()
      animFrameRef.current = requestAnimationFrame(render)
    }
    animFrameRef.current = requestAnimationFrame(render)
    return () => {
      running = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  /* ------------------------- canvas interaction -------------------------- */
  const hitNode = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { mx: 0, my: 0, hit: undefined as undefined | { idx: number; x: number; y: number } }
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const hit = nodePositionsRef.current.find((p) => Math.hypot(p.x - mx, p.y - my) <= 24)
    return { mx, my, hit }
  }

  const onMove = (e: React.MouseEvent) => {
    const { mx, my, hit } = hitNode(e)
    if (canvasRef.current) canvasRef.current.style.cursor = hit ? 'pointer' : 'default'
    setHovered(hit ? { idx: hit.idx, x: mx, y: my } : null)
  }

  const onClick = (e: React.MouseEvent) => {
    const { mx, my, hit } = hitNode(e)
    if (hit) {
      setActiveIdx(hit.idx)
      setOpenDropdown(nodesRef.current[hit.idx].ring)
      return
    }
    const { w, h } = sizeRef.current
    if (Math.hypot(w / 2 - mx, h / 2 - my) <= 30) {
      setActiveIdx(-1)
      setOpenDropdown(null)
      return
    }
    setOpenDropdown(null)
  }

  /* ----------------- close dropdowns on outside click -------------------- */
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('[data-ring-dropdown]')) return // inside topbar dropdown UI
      if (t.tagName === 'CANVAS') return // canvas manages its own clicks
      setOpenDropdown(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  /* ----------------- scroll active node into dropdown view --------------- */
  useEffect(() => {
    if (openDropdown === null || activeIdx < 0) return
    const el = document.querySelector(`[data-dropdown="${openDropdown}"] [data-node-idx="${activeIdx}"]`)
    if (el) (el as HTMLElement).scrollIntoView({ block: 'nearest' })
  }, [openDropdown, activeIdx])

  /* --------------------------------- view -------------------------------- */
  const hoveredNode = hovered ? nodes[hovered.idx] : null

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ============================ TOPBAR ============================ */}
      <div
        style={{
          background: '#0d0f1e',
          borderBottom: '0.5px solid #1e2240',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {/* + Add Agent */}
        <button
          onClick={() => addNode()}
          style={{
            background: '#7B2FFF22',
            border: '0.5px solid #7B2FFF55',
            borderRadius: 8,
            padding: '6px 14px',
            color: '#a78bfa',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          + Add Agent
        </button>

        {/* per-ring dropdown buttons */}
        {Array.from({ length: ringCount }).map((_, ri) => {
          const rc = ringConfig(ri)
          const count = countInRing(nodes, ri)
          const open = openDropdown === ri
          const ringNodes = nodes.map((n, i) => ({ n, i })).filter((o) => o.n.ring === ri)
          return (
            <div key={ri} data-ring-dropdown style={{ position: 'relative' }}>
              <button
                onClick={() => setOpenDropdown(open ? null : ri)}
                style={{
                  background: '#111327',
                  border: '0.5px solid #1e2240',
                  borderRadius: 8,
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  cursor: 'pointer',
                  color: '#cdd0dd',
                  fontSize: 12,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: rc.color, flexShrink: 0 }} />
                <span>Ring {ri + 1}</span>
                <span style={{ color: rc.color, fontSize: 11, fontWeight: 600 }}>
                  {count}/{rc.capacity}
                </span>
                <span style={{ color: PLASMA.muted, fontSize: 10 }}>▾</span>
              </button>

              {open && (
                <div
                  data-dropdown={ri}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    background: '#0d0f1e',
                    border: '0.5px solid #1e2240',
                    borderRadius: 10,
                    minWidth: 170,
                    maxHeight: 280,
                    overflowY: 'auto',
                    padding: 4,
                    zIndex: 10,
                    boxShadow: '0 20px 50px -20px rgba(0,0,0,0.8)',
                  }}
                >
                  {ringNodes.map(({ n, i }) => {
                    const isActive = i === activeIdx
                    return (
                      <div
                        key={i}
                        data-node-idx={i}
                        onClick={() => {
                          setActiveIdx(i)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 9,
                          padding: '7px 8px',
                          borderRadius: 7,
                          cursor: 'pointer',
                          background: isActive ? '#1a1020' : 'transparent',
                          borderLeft: isActive ? `2px solid ${rc.color}` : '2px solid transparent',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={iconMap[n.name]}
                          alt={n.name}
                          width={16}
                          height={16}
                          style={{ flexShrink: 0, objectFit: 'contain' }}
                          onError={(ev) => ((ev.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, color: '#fff', fontWeight: 500, lineHeight: 1.2 }}>{n.name}</div>
                          <div style={{ fontSize: 10.5, color: PLASMA.muted, lineHeight: 1.2 }}>{n.sub}</div>
                        </div>
                      </div>
                    )
                  })}

                  {count < rc.capacity && (
                    <div
                      onClick={() => addNode(ri)}
                      style={{
                        padding: '8px',
                        borderRadius: 7,
                        cursor: 'pointer',
                        color: '#a78bfa',
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      + Add to Ring {ri + 1}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* counter */}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: PLASMA.muted }}>
          {nodes.length} agent{nodes.length !== 1 ? 's' : ''} · {ringCount} ring{ringCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ========================= SOLAR CANVAS ========================= */}
      <div ref={wrapRef} style={{ flex: 1, position: 'relative', minHeight: 0, background: PLASMA.bg, overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={onMove}
          onMouseLeave={() => setHovered(null)}
          onClick={onClick}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />

        {/* hover tooltip */}
        {hoveredNode && hovered && (
          <div
            style={{
              position: 'absolute',
              left: hovered.x + 20,
              top: hovered.y - 20,
              background: '#0d0f1e',
              border: '0.5px solid #2a2d45',
              borderRadius: 10,
              padding: '8px 12px',
              pointerEvents: 'none',
              zIndex: 5,
              maxWidth: 220,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={iconMap[hoveredNode.name]} alt={hoveredNode.name} width={16} height={16} style={{ objectFit: 'contain' }} />
              <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{hoveredNode.name}</span>
            </div>
            <div style={{ fontSize: 11, color: PLASMA.muted, marginTop: 2 }}>{hoveredNode.sub}</div>
            <div style={{ fontSize: 10, color: ringConfig(hoveredNode.ring).color, fontWeight: 500, marginTop: 3 }}>
              Ring {hoveredNode.ring + 1}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
