'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Lock, ExternalLink, Eye, EyeOff, KeyRound, Plus } from 'lucide-react'
import { useToast } from '@/components/dashboard/Toast'
import { api } from '@/lib/api'
import {
  useDbConnections,
  DbConnectionModal,
  DeleteDbDialog,
  DbConnectionCard,
  DbLogo,
  DB_META,
  DB_TYPES,
  type DbConnection,
  type DbModalMode,
} from '@/components/databases/DbConnections'

type Category = 'Messaging' | 'Email' | 'Payments' | 'Productivity' | 'CRM' | 'Ecommerce' | 'Social'

interface Integration {
  id: string
  name: string
  color: string
  category: Category
  slug: string // simpleicons slug
  hex: string // simpleicons icon colour (no #)
}

const INTEGRATIONS: Integration[] = [
  { id: 'whatsapp', name: 'WhatsApp Business', color: '#25D366', category: 'Messaging', slug: 'whatsapp', hex: '25D366' },
  { id: 'gmail', name: 'Gmail', color: '#EA4335', category: 'Email', slug: 'gmail', hex: 'EA4335' },
  { id: 'telegram', name: 'Telegram', color: '#2AABEE', category: 'Messaging', slug: 'telegram', hex: '2AABEE' },
  { id: 'googlesheets', name: 'Google Sheets', color: '#34A853', category: 'Productivity', slug: 'googlesheets', hex: '34A853' },
  { id: 'razorpay', name: 'Razorpay', color: '#2D76F9', category: 'Payments', slug: 'razorpay', hex: '2D76F9' },
  { id: 'slack', name: 'Slack', color: '#4A154B', category: 'Messaging', slug: 'slack', hex: 'E01E5A' },
  { id: 'notion', name: 'Notion', color: '#000000', category: 'Productivity', slug: 'notion', hex: 'FFFFFF' },
  { id: 'zoho', name: 'Zoho CRM', color: '#E42527', category: 'CRM', slug: 'zoho', hex: 'E42527' },
  { id: 'tally', name: 'Tally', color: '#F5A623', category: 'Payments', slug: 'tally', hex: 'F5A623' },
  { id: 'shopify', name: 'Shopify', color: '#96BF48', category: 'Ecommerce', slug: 'shopify', hex: '96BF48' },
  { id: 'woocommerce', name: 'WooCommerce', color: '#7F54B3', category: 'Ecommerce', slug: 'woocommerce', hex: '7F54B3' },
  { id: 'hubspot', name: 'HubSpot', color: '#FF7A59', category: 'CRM', slug: 'hubspot', hex: 'FF7A59' },
  { id: 'airtable', name: 'Airtable', color: '#18BFFF', category: 'Productivity', slug: 'airtable', hex: '18BFFF' },
  { id: 'calendly', name: 'Calendly', color: '#006BFF', category: 'Productivity', slug: 'calendly', hex: '006BFF' },
  { id: 'stripe', name: 'Stripe', color: '#635BFF', category: 'Payments', slug: 'stripe', hex: '635BFF' },
  { id: 'discord', name: 'Discord', color: '#5865F2', category: 'Messaging', slug: 'discord', hex: '5865F2' },
  { id: 'gcal', name: 'Google Calendar', color: '#4285F4', category: 'Productivity', slug: 'googlecalendar', hex: '4285F4' },
  { id: 'typeform', name: 'Typeform', color: '#262627', category: 'Productivity', slug: 'typeform', hex: '262627' },
  { id: 'mailchimp', name: 'Mailchimp', color: '#FFE01B', category: 'Email', slug: 'mailchimp', hex: 'FFE01B' },
  { id: 'instagram', name: 'Instagram Business', color: '#E1306C', category: 'Social', slug: 'instagram', hex: 'E1306C' },
]

const FILTERS: ('All' | Category | 'Database')[] = ['All', 'Messaging', 'Email', 'Payments', 'Productivity', 'CRM', 'Ecommerce', 'Social', 'Database']
const INITIAL_CONNECTED = ['whatsapp', 'gmail', 'googlesheets', 'razorpay']

// frontend card id ⇄ backend provider key
const ID_TO_PROVIDER: Record<string, string> = { googlesheets: 'sheets' }
const idToProvider = (id: string) => ID_TO_PROVIDER[id] ?? id
const providerToId = (p: string) => (p === 'sheets' ? 'googlesheets' : p)

interface FieldDef { label: string; placeholder: string; textarea?: boolean }
interface Guide { steps: string[]; fields: FieldDef[] }

const GUIDES: Record<string, Guide> = {
  whatsapp: {
    steps: ['Go to developers.facebook.com', 'Create a Meta App → Add the WhatsApp product', 'Open WhatsApp → API Setup', 'Copy your Phone Number ID and Access Token'],
    fields: [{ label: 'Phone Number ID', placeholder: 'e.g. 123456789012345' }, { label: 'Access Token', placeholder: 'EAAG...' }],
  },
  gmail: {
    steps: ['Go to console.cloud.google.com', 'Create a project → Enable the Gmail API', 'Create OAuth credentials', 'Copy your Client ID and Client Secret'],
    fields: [{ label: 'Client ID', placeholder: '....apps.googleusercontent.com' }, { label: 'Client Secret', placeholder: 'GOCSPX-...' }],
  },
  razorpay: {
    steps: ['Login to dashboard.razorpay.com', 'Go to Settings → API Keys', 'Generate a new key pair'],
    fields: [{ label: 'Key ID', placeholder: 'rzp_live_...' }, { label: 'Key Secret', placeholder: 'Your key secret' }],
  },
  telegram: {
    steps: ['Open Telegram → search @BotFather', 'Send /newbot and follow the instructions', 'Copy the bot token BotFather gives you'],
    fields: [{ label: 'Bot Token', placeholder: '123456:ABC-DEF...' }],
  },
  googlesheets: {
    steps: ['Go to console.cloud.google.com', 'Enable the Google Sheets API', 'Create a Service Account → download the JSON key'],
    fields: [{ label: 'Service Account JSON', placeholder: '{ "type": "service_account", ... }', textarea: true }],
  },
}

function guideFor(it: Integration): Guide {
  return (
    GUIDES[it.id] ?? {
      steps: [`Login to your ${it.name} dashboard`, 'Go to Settings → API / Integrations', 'Create a new API key or token', 'Copy and paste it below'],
      fields: [{ label: 'API Key / Access Token', placeholder: `Paste your ${it.name} key` }],
    }
  )
}

function LogoCircle({ it, size }: { it: Integration; size: number }) {
  // Tally isn't on the Simple Icons CDN — render a branded letter tile instead.
  if (it.slug === 'tally') {
    return (
      <div style={{ width: size, height: size, background: '#F5A623', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: Math.round(size * 0.4), color: '#000', flexShrink: 0 }}>T</div>
    )
  }
  // Typeform mark is near-black on Simple Icons — use a branded TF tile instead.
  if (it.slug === 'typeform') {
    return (
      <div style={{ width: size, height: size, background: '#262627', border: '2px solid #00D4FF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00D4FF', fontWeight: 700, fontSize: Math.round(size * 0.3), flexShrink: 0 }}>TF</div>
    )
  }
  return (
    <img
      src={`https://cdn.simpleicons.org/${it.slug}/${it.hex}`}
      alt={it.name}
      width={size}
      height={size}
      className="rounded-md"
      style={{ flexShrink: 0, objectFit: 'contain' }}
      onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
    />
  )
}

const input: React.CSSProperties = { width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '11px 12px', color: '#fff', fontSize: 13, fontFamily: 'var(--font-mono)' }
const label: React.CSSProperties = { display: 'block', fontSize: 12.5, color: '#9AA0B8', marginBottom: 7 }

const PROVIDERS = [
  { key: 'anthropic', name: 'Anthropic (Claude)', color: '#D97757', placeholder: 'sk-ant-...', url: 'https://console.anthropic.com' },
  { key: 'openai', name: 'OpenAI (GPT)', color: '#74AA9C', placeholder: 'sk-...', url: 'https://platform.openai.com/api-keys' },
  { key: 'groq', name: 'Groq', color: '#F55036', placeholder: 'gsk_...', url: 'https://console.groq.com' },
  { key: 'gemini', name: 'Google Gemini', color: '#4285F4', placeholder: 'AIza...', url: 'https://aistudio.google.com/app/apikey' },
]

export default function IntegrationsPage() {
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'All' | Category | 'Database'>('All')
  // database connections (shared module)
  const { conns: dbConns, reload: reloadDb } = useDbConnections()
  const [dbModal, setDbModal] = useState<DbModalMode | null>(null)
  const [dbDelete, setDbDelete] = useState<DbConnection | null>(null)
  const [modal, setModal] = useState<Integration | null>(null)
  const [connected, setConnected] = useState<Record<string, boolean>>(Object.fromEntries(INITIAL_CONNECTED.map((s) => [s, true])))
  const [aiKeys, setAiKeys] = useState<Record<string, string>>({})
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [creds, setCreds] = useState<Record<string, string>>({})

  useEffect(() => {
    api
      .get<{ integrations: { provider: string; connected: boolean }[] }>('/integrations')
      .then((d) => {
        const map: Record<string, boolean> = {}
        d.integrations.forEach((x) => { map[providerToId(x.provider)] = x.connected })
        setConnected((c) => ({ ...c, ...map }))
      })
      .catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return INTEGRATIONS.filter((it) => {
      const matchQ = !q || it.name.toLowerCase().includes(q) || it.category.toLowerCase().includes(q)
      const matchF = filter === 'All' ? true : it.category === filter
      return matchQ && matchF
    })
  }, [query, filter])

  const connectedCount = Object.values(connected).filter(Boolean).length

  async function confirmConnect() {
    if (!modal) return
    try {
      await api.post('/integrations/connect', { provider: idToProvider(modal.id), credentials: creds })
      setConnected((c) => ({ ...c, [modal.id]: true }))
      toast(`${modal.name} connected`, 'success')
      setModal(null)
      setCreds({})
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Connect failed', 'error')
    }
  }

  async function disconnect(it: Integration) {
    try {
      await api.del(`/integrations/${idToProvider(it.id)}/disconnect`)
      setConnected((c) => ({ ...c, [it.id]: false }))
      toast(`${it.name} disconnected`, 'info')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Disconnect failed', 'error')
    }
  }

  async function saveAiKeys() {
    const entries = Object.entries(aiKeys).filter(([, v]) => v && v.trim())
    if (!entries.length) {
      toast('Enter at least one key', 'error')
      return
    }
    try {
      for (const [provider, key] of entries) {
        await api.post('/integrations/byok', { provider, key })
      }
      toast('AI keys saved', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error')
    }
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* sticky header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 3, background: 'rgba(7,8,15,0.85)', backdropFilter: 'blur(10px)', padding: '24px 24px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
            <div>
              <h1 className="font-display plasma-gradient-text" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Integrations</h1>
              <p style={{ color: '#9AA0B8', fontSize: 14, marginTop: 3 }}>
                <span className="plasma-gradient-text" style={{ fontWeight: 600 }}>{connectedCount} connected</span> · {INTEGRATIONS.length} available
              </p>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#6B7090" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="search"
                name="integration-search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search integrations..."
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 16px 11px 38px', color: '#fff', fontSize: 14, width: 260, fontFamily: 'var(--font-sans)' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{ fontSize: 13, fontWeight: 600, padding: '7px 15px', borderRadius: 999, cursor: 'pointer', border: filter === f ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)', color: filter === f ? '#fff' : '#9AA0B8', background: filter === f ? 'linear-gradient(135deg, #FF6B00, #7B2FFF)' : 'transparent', transition: 'all 0.2s' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* grid */}
        <div className="int-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, padding: 24 }}>
          {filter !== 'Database' && filtered.map((it, i) => {
            const isOn = !!connected[it.id]
            return (
              <motion.div
                key={it.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), type: 'spring', stiffness: 130, damping: 18 }}
                whileHover={{ y: -4 }}
                className="glass-card"
                style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, borderLeft: `4px solid ${it.color}`, opacity: isOn ? 1 : 0.82, boxShadow: isOn ? `0 18px 50px -26px ${it.color}` : undefined }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <LogoCircle it={it} size={46} />
                  {isOn ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 600, color: '#00E676' }}>
                      <span style={{ position: 'relative', width: 8, height: 8 }}>
                        <span className="ping-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#00E676' }} />
                        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#00E676' }} />
                      </span>
                      Connected
                    </span>
                  ) : (
                    <span style={{ fontSize: 11.5, color: '#6B7090', fontWeight: 500 }}>{it.category}</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{it.name}</div>
                  <div style={{ fontSize: 12.5, color: '#9AA0B8', marginTop: 3 }}>{it.category}</div>
                </div>
                {isOn ? (
                  <button onClick={() => disconnect(it)} style={{ background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.28)', color: '#FF4D6D', fontWeight: 600, fontSize: 13, padding: '10px', borderRadius: 9, cursor: 'pointer', width: '100%' }}>
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => setModal(it)}
                    style={{ background: 'rgba(123,47,255,0.14)', border: '1px solid rgba(123,47,255,0.4)', color: '#B98CFF', fontWeight: 600, fontSize: 13, padding: '10px', borderRadius: 9, cursor: 'pointer', width: '100%', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(123,47,255,0.24)'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(123,47,255,0.14)'; e.currentTarget.style.color = '#B98CFF' }}
                  >
                    Connect
                  </button>
                )}
              </motion.div>
            )
          })}
          {filter !== 'Database' && filtered.length === 0 && <p style={{ color: '#9AA0B8', textAlign: 'center', padding: 48, gridColumn: '1 / -1' }}>No integrations match your search.</p>}

          {/* database engine tiles — open the shared add-connection modal */}
          {(filter === 'All' || filter === 'Database') &&
            DB_TYPES.filter((ty) => {
              const q = query.trim().toLowerCase()
              return !q || DB_META[ty].label.toLowerCase().includes(q) || 'database'.includes(q)
            }).map((ty, i) => {
              const m = DB_META[ty]
              const count = dbConns.filter((c) => c.db_type === ty).length
              return (
                <motion.div
                  key={`db-${ty}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), type: 'spring', stiffness: 130, damping: 18 }}
                  whileHover={{ y: -4 }}
                  onClick={() => setDbModal({ kind: 'create', presetType: ty })}
                  className="glass-card"
                  style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, borderLeft: `4px solid ${m.color}`, cursor: 'pointer', boxShadow: count > 0 ? `0 18px 50px -26px ${m.color}` : undefined }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <DbLogo type={ty} size={46} />
                    {count > 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 600, color: '#00E676' }}>
                        <span style={{ position: 'relative', width: 8, height: 8 }}>
                          <span className="ping-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#00E676' }} />
                          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#00E676' }} />
                        </span>
                        Connected
                      </span>
                    ) : (
                      <span style={{ fontSize: 11.5, color: '#6B7090', fontWeight: 500 }}>Database</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{m.label}</div>
                    <div style={{ fontSize: 12.5, color: '#9AA0B8', marginTop: 3 }}>{count > 0 ? `${count} connection${count > 1 ? 's' : ''}` : 'Connect a database to query'}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDbModal({ kind: 'create', presetType: ty }) }}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(123,47,255,0.14)', border: '1px solid rgba(123,47,255,0.4)', color: '#B98CFF', fontWeight: 600, fontSize: 13, padding: '10px', borderRadius: 9, cursor: 'pointer', width: '100%' }}
                  >
                    <Plus size={15} /> Add connection
                  </button>
                </motion.div>
              )
            })}
        </div>

        {/* connected database connections — manage (test / edit / delete) */}
        {(filter === 'All' || filter === 'Database') && dbConns.length > 0 && (
          <div style={{ padding: '0 24px 8px' }}>
            <h2 className="font-display plasma-gradient-text" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 14 }}>Your databases</h2>
            <div className="int-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {dbConns.map((c) => (
                <DbConnectionCard key={c.id} conn={c} onEdit={(x) => setDbModal({ kind: 'edit', conn: x })} onDelete={(x) => setDbDelete(x)} />
              ))}
            </div>
          </div>
        )}

        {/* ===== BYOK AI model keys ===== */}
        <div style={{ padding: '8px 24px 60px' }}>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 6 }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,214,10,0.14)', border: '1px solid rgba(255,214,10,0.35)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#FFD60A' }}>
                <KeyRound size={17} />
              </span>
              <h2 className="font-display plasma-gradient-text" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>AI Model Keys · Bring Your Own Key</h2>
            </div>
            <p style={{ color: '#9AA0B8', fontSize: 14, marginBottom: 22, maxWidth: 620, lineHeight: 1.6 }}>
              Nerum uses your own AI provider keys for AI Steps in workflows. Billed by the provider, not us.
            </p>

            <div className="byok-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {PROVIDERS.map((p) => (
                <div key={p.key} className="glass-card" style={{ padding: 18, borderLeft: `4px solid ${p.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span className="plasma-gradient-text" style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: p.color, textDecoration: 'none', fontWeight: 600 }}>
                      Get API key <ExternalLink size={12} />
                    </a>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showKey[p.key] ? 'text' : 'password'}
                      value={aiKeys[p.key] ?? ''}
                      onChange={(e) => setAiKeys((k) => ({ ...k, [p.key]: e.target.value }))}
                      placeholder={p.placeholder}
                      style={{ ...input, paddingRight: 44 }}
                    />
                    <button onClick={() => setShowKey((s) => ({ ...s, [p.key]: !s[p.key] }))} aria-label={showKey[p.key] ? 'Hide key' : 'Show key'} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9AA0B8', cursor: 'pointer', display: 'inline-flex' }}>
                      {showKey[p.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={saveAiKeys} style={{ marginTop: 20, background: 'linear-gradient(135deg, #FF6B00, #7B2FFF)', color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px 22px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>
              Save AI Keys
            </button>
          </div>
        </div>
      </div>

      {/* connect modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModal(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(3,4,10,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: 460, maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto', background: 'rgba(13,14,26,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: 26, backdropFilter: 'blur(16px)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                  <LogoCircle it={modal} size={48} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>{modal.name}</div>
                    <div style={{ fontSize: 13, color: '#9AA0B8' }}>{modal.category}</div>
                  </div>
                </div>
                <button onClick={() => setModal(null)} aria-label="Close" style={{ background: 'none', border: 'none', color: '#9AA0B8', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              {/* security info box */}
              <div style={{ display: 'flex', gap: 9, background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.22)', borderRadius: 10, padding: '11px 13px', marginBottom: 20, fontSize: 12.5, color: '#9FD9EC', lineHeight: 1.5 }}>
                <Lock size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>🔒 Your credentials are encrypted with AES-256 and stored securely. Nerum never stores plaintext keys.</span>
              </div>

              {/* step-by-step guide */}
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>How to get your API key</h3>
              <ol style={{ listStyle: 'none', counterReset: 'step', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
                {guideFor(modal).steps.map((s, i) => (
                  <li key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', fontSize: 13.5, color: '#cdd0dd', lineHeight: 1.5 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: `${modal.color}22`, border: `1px solid ${modal.color}66`, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>

              {/* input fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 22 }}>
                {guideFor(modal).fields.map((f) => (
                  <label key={f.label}>
                    <span style={label}>{f.label}</span>
                    {f.textarea ? (
                      <textarea value={creds[f.label] ?? ''} onChange={(e) => setCreds((c) => ({ ...c, [f.label]: e.target.value }))} placeholder={f.placeholder} rows={4} style={{ ...input, resize: 'vertical', lineHeight: 1.5 }} />
                    ) : (
                      <input value={creds[f.label] ?? ''} onChange={(e) => setCreds((c) => ({ ...c, [f.label]: e.target.value }))} placeholder={f.placeholder} style={input} />
                    )}
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, fontSize: 14, padding: '12px', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
                <button onClick={confirmConnect} style={{ flex: 1, background: 'linear-gradient(135deg, #FF6B00, #7B2FFF)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px', borderRadius: 10, cursor: 'pointer' }}>Connect {modal.name.split(' ')[0]}</button>
              </div>
              <div style={{ textAlign: 'center' }}>
                <a href="https://docs.nerum.in" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: '#9AA0B8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  Need help? Read the docs <ExternalLink size={12} />
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* shared database add/edit modal + delete confirm */}
      {dbModal && <DbConnectionModal mode={dbModal} onClose={() => setDbModal(null)} onSaved={reloadDb} />}
      {dbDelete && <DeleteDbDialog conn={dbDelete} onCancel={() => setDbDelete(null)} onDeleted={() => { setDbDelete(null); reloadDb() }} />}

      <style>{`
        @media (max-width: 920px) { .int-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 620px) { .int-grid { grid-template-columns: 1fr !important; } .byok-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
