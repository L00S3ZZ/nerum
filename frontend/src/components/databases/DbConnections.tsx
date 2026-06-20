'use client'

/* ============================================================================
 * NERUM — Shared database-connection primitives
 * ----------------------------------------------------------------------------
 * Single source of truth for the database-integration UI, reused by both the
 * Integrations settings page and the Garden Builder's "Database" picker tab.
 * Nothing here is duplicated per-page.
 *
 *   types/consts : DbType, DbConnection, DB_META, DB_TYPES
 *   helpers      : fmtDate, DbLogo, AccessChips, useDbConnections, testDb
 *   components   : DbConnectionModal (add/edit + auto-test),
 *                  DeleteDbDialog, DbConnectionCard (manage: test/edit/delete)
 *
 * Credentials are write-only from the UI — the API only ever returns a masked
 * summary, never raw secrets.
 * ========================================================================== */

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Lock, Loader2, CheckCircle2, XCircle, Trash2, Pencil } from 'lucide-react'
import { api } from '@/lib/api'

export type DbType = 'postgresql' | 'mysql' | 'mongodb'

export interface DbConnection {
  id: number
  name: string
  db_type: DbType
  allow_write: boolean
  allow_delete: boolean
  is_active: boolean
  credentials_masked: Record<string, unknown>
  created_at: string | null
  last_used_at: string | null
}

export const DB_META: Record<DbType, { label: string; slug: string; hex: string; color: string; port: string }> = {
  postgresql: { label: 'PostgreSQL', slug: 'postgresql', hex: '4169E1', color: '#4169E1', port: '5432' },
  mysql: { label: 'MySQL', slug: 'mysql', hex: '4479A1', color: '#00D4FF', port: '3306' },
  mongodb: { label: 'MongoDB', slug: 'mongodb', hex: '47A248', color: '#47A248', port: '27017' },
}
export const DB_TYPES = Object.keys(DB_META) as DbType[]

const input: React.CSSProperties = { width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '11px 12px', color: '#fff', fontSize: 13, fontFamily: 'var(--font-mono)' }
const label: React.CSSProperties = { display: 'block', fontSize: 12.5, color: '#9AA0B8', marginBottom: 7 }

export function fmtDate(s: string | null): string {
  if (!s) return 'Never used'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return 'Never used'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function DbLogo({ type, size }: { type: DbType; size: number }) {
  const m = DB_META[type]
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={`https://cdn.simpleicons.org/${m.slug}/${m.hex}`}
      alt={m.label}
      width={size}
      height={size}
      style={{ flexShrink: 0, objectFit: 'contain' }}
      onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
    />
  )
}

/** Read-only access summary chips. */
export function AccessChips({ c }: { c: DbConnection }) {
  const chip = (color: string): React.CSSProperties => ({
    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
    color, background: `${color}1A`, border: `1px solid ${color}55`,
  })
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <span style={chip('#00D4FF')}>Read</span>
      {c.allow_write && <span style={chip('#FFD60A')}>Write</span>}
      {c.allow_delete && <span style={chip('#FF4D6D')}>Delete</span>}
      {!c.allow_write && !c.allow_delete && <span style={chip('#00E676')}>Read-only</span>}
    </div>
  )
}

function Toggle({ on, onChange, color = '#7B2FFF', disabled }: { on: boolean; onChange: (v: boolean) => void; color?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!on)}
      aria-pressed={on}
      style={{ width: 42, height: 24, borderRadius: 999, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', background: on ? color : 'rgba(255,255,255,0.14)', opacity: disabled ? 0.5 : 1, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
    >
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </button>
  )
}

type TestState = { loading: boolean; ok?: boolean; msg?: string }

/** Load + cache the user's database connections, with a manual reload. */
export function useDbConnections() {
  const [conns, setConns] = useState<DbConnection[]>([])
  const [loading, setLoading] = useState(true)
  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.get<{ connections: DbConnection[] }>('/db-connections')
      setConns(d.connections)
    } catch {
      /* surfaced by callers' own UX; keep the list as-is */
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { reload() }, [reload])
  return { conns, loading, reload }
}

export function testDb(id: number) {
  return api.post<{ success: boolean; error: string | null }>(`/db-connections/${id}/test`)
}

// ── add / edit modal ───────────────────────────────────────────────────────
export type DbModalMode = { kind: 'create'; presetType?: DbType } | { kind: 'edit'; conn: DbConnection }

interface FormState {
  name: string
  db_type: DbType
  method: 'fields' | 'uri'
  host: string; port: string; user: string; password: string; database: string; ssl: boolean
  uri: string
  allow_write: boolean
  allow_delete: boolean
}

function initForm(mode: DbModalMode): FormState {
  if (mode.kind === 'edit') {
    const c = mode.conn
    return { name: c.name, db_type: c.db_type, method: 'fields', host: '', port: '', user: '', password: '', database: '', ssl: true, uri: '', allow_write: c.allow_write, allow_delete: c.allow_delete }
  }
  return { name: '', db_type: mode.presetType ?? 'postgresql', method: 'fields', host: '', port: '', user: '', password: '', database: '', ssl: true, uri: '', allow_write: false, allow_delete: false }
}

export function DbConnectionModal({ mode, onClose, onSaved }: { mode: DbModalMode; onClose: () => void; onSaved: () => void }) {
  const isEdit = mode.kind === 'edit'
  const [form, setForm] = useState<FormState>(() => initForm(mode))
  const [saving, setSaving] = useState(false)
  const [modalTest, setModalTest] = useState<TestState | null>(null)
  const [saved, setSaved] = useState(false)

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))
  const setWrite = (v: boolean) => setForm((f) => ({ ...f, allow_write: v, allow_delete: v ? f.allow_delete : false }))

  function hasCredInput(f: FormState): boolean {
    return f.method === 'uri' ? f.uri.trim() !== '' : [f.host, f.port, f.user, f.password, f.database].some((v) => v.trim() !== '')
  }
  function buildCreds(f: FormState): Record<string, unknown> {
    if (f.method === 'uri') return { uri: f.uri.trim() }
    const c: Record<string, unknown> = { ssl: f.ssl }
    if (f.host.trim()) c.host = f.host.trim()
    if (f.port.trim()) c.port = Number(f.port) || f.port.trim()
    if (f.user.trim()) c.user = f.user.trim()
    if (f.password) c.password = f.password
    if (f.database.trim()) c.database = f.database.trim()
    return c
  }

  async function submit() {
    if (!form.name.trim()) { setModalTest({ loading: false, ok: false, msg: 'Give the connection a name' }); return }
    const credsEntered = hasCredInput(form)
    if (!isEdit && !credsEntered) { setModalTest({ loading: false, ok: false, msg: 'Enter connection details (fields or a URI)' }); return }

    setSaving(true)
    try {
      let id: number
      if (mode.kind === 'edit') {
        const body: Record<string, unknown> = { name: form.name.trim(), allow_write: form.allow_write, allow_delete: form.allow_delete }
        if (credsEntered) body.credentials = buildCreds(form)
        const r = await api.patch<DbConnection>(`/db-connections/${mode.conn.id}`, body)
        id = r.id
      } else {
        const r = await api.post<DbConnection>('/db-connections', {
          name: form.name.trim(), db_type: form.db_type, credentials: buildCreds(form),
          allow_write: form.allow_write, allow_delete: form.allow_delete,
        })
        id = r.id
      }
      setSaved(true)
      onSaved()
      // auto-test, shown inline before the user closes
      setModalTest({ loading: true })
      try {
        const tr = await testDb(id)
        setModalTest({ loading: false, ok: tr.success, msg: tr.success ? 'Connection OK' : (tr.error || 'Failed') })
        onSaved() // refresh last_used / status
      } catch (err) {
        setModalTest({ loading: false, ok: false, msg: err instanceof Error ? err.message : 'Test failed' })
      }
    } catch (err) {
      setModalTest({ loading: false, ok: false, msg: err instanceof Error ? err.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(3,4,10,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 500, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto', background: 'rgba(13,14,26,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: 26, backdropFilter: 'blur(16px)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <DbLogo type={form.db_type} size={40} />
            <div style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>{isEdit ? 'Edit Connection' : 'Add Database Connection'}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: '#9AA0B8', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', gap: 9, background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.22)', borderRadius: 10, padding: '11px 13px', marginBottom: 20, fontSize: 12.5, color: '#9FD9EC', lineHeight: 1.5 }}>
          <Lock size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>🔒 Credentials are encrypted with AES-256 and never shown to the AI — it only sees a connection reference.</span>
        </div>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={label}>Connection name</span>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Prod Postgres" style={{ ...input, fontFamily: 'var(--font-sans)' }} />
        </label>

        <span style={label}>Database type</span>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {DB_TYPES.map((ty) => {
            const m = DB_META[ty]
            const active = form.db_type === ty
            return (
              <button
                key={ty} type="button" disabled={isEdit} onClick={() => set('db_type', ty)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '12px 8px', borderRadius: 11, cursor: isEdit ? 'not-allowed' : 'pointer', background: active ? `${m.color}1F` : 'rgba(255,255,255,0.03)', border: active ? `1px solid ${m.color}` : '1px solid rgba(255,255,255,0.1)', opacity: isEdit && !active ? 0.4 : 1 }}
              >
                <DbLogo type={ty} size={26} />
                <span style={{ fontSize: 12, fontWeight: 600, color: active ? '#fff' : '#9AA0B8' }}>{m.label}</span>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 4, marginBottom: 16 }}>
          {(['fields', 'uri'] as const).map((mth) => (
            <button key={mth} type="button" onClick={() => set('method', mth)} style={{ flex: 1, padding: '8px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: form.method === mth ? '#fff' : '#9AA0B8', background: form.method === mth ? 'linear-gradient(135deg, #FF6B00, #7B2FFF)' : 'transparent' }}>
              {mth === 'fields' ? 'Individual fields' : 'Connection string'}
            </button>
          ))}
        </div>

        {isEdit && <p style={{ fontSize: 12, color: '#6B7090', marginBottom: 14 }}>Leave credential fields blank to keep the existing credentials.</p>}

        {form.method === 'fields' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ flex: 2 }}><span style={label}>Host</span><input value={form.host} onChange={(e) => set('host', e.target.value)} placeholder="db.example.com" style={input} /></label>
              <label style={{ flex: 1 }}><span style={label}>Port</span><input value={form.port} onChange={(e) => set('port', e.target.value)} placeholder={DB_META[form.db_type].port} style={input} /></label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ flex: 1 }}><span style={label}>User</span><input value={form.user} onChange={(e) => set('user', e.target.value)} placeholder="username" style={input} /></label>
              <label style={{ flex: 1 }}><span style={label}>Password</span><input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" style={input} /></label>
            </div>
            <label><span style={label}>Database</span><input value={form.database} onChange={(e) => set('database', e.target.value)} placeholder="database name" style={input} /></label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#cdd0dd' }}>Use SSL/TLS</span>
              <Toggle on={form.ssl} onChange={(v) => set('ssl', v)} color="#00D4FF" />
            </div>
          </div>
        ) : (
          <label style={{ display: 'block', marginBottom: 18 }}>
            <span style={label}>Connection string / URI</span>
            <textarea value={form.uri} onChange={(e) => set('uri', e.target.value)} rows={3} placeholder={form.db_type === 'mongodb' ? 'mongodb+srv://user:pass@cluster/db' : 'postgresql://user:pass@host:5432/db'} style={{ ...input, resize: 'vertical', lineHeight: 1.5 }} />
          </label>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Allow write</div>
              <div style={{ fontSize: 12, color: '#9AA0B8' }}>INSERT / UPDATE</div>
            </div>
            <Toggle on={form.allow_write} onChange={setWrite} color="#FFD60A" />
          </div>
          {form.allow_write && (
            <div style={{ display: 'flex', gap: 8, background: 'rgba(255,214,10,0.07)', border: '1px solid rgba(255,214,10,0.3)', borderRadius: 9, padding: '9px 12px', fontSize: 12.5, color: '#F0D070', lineHeight: 1.5 }}>
              ⚠ The agent will be able to insert and update data in this database.
            </div>
          )}
          {form.allow_write && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Allow delete</div>
                  <div style={{ fontSize: 12, color: '#9AA0B8' }}>DELETE / DROP / TRUNCATE</div>
                </div>
                <Toggle on={form.allow_delete} onChange={(v) => set('allow_delete', v)} color="#FF4D6D" />
              </div>
              {form.allow_delete && (
                <div style={{ display: 'flex', gap: 8, background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.35)', borderRadius: 9, padding: '9px 12px', fontSize: 12.5, color: '#FF8DA3', lineHeight: 1.5 }}>
                  ⚠ The agent will be able to delete or drop data. This cannot be undone.
                </div>
              )}
            </>
          )}
        </div>

        {modalTest && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, fontWeight: 600, color: modalTest.loading ? '#9AA0B8' : modalTest.ok ? '#00E676' : '#FF4D6D' }}>
            {modalTest.loading ? <><Loader2 size={15} className="db-spin" /> Testing connection…</> : modalTest.ok ? <><CheckCircle2 size={16} /> {modalTest.msg}</> : <><XCircle size={16} /> {modalTest.msg}</>}
          </div>
        )}

        {saved ? (
          <button onClick={onClose} style={{ width: '100%', background: 'linear-gradient(135deg, #FF6B00, #7B2FFF)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px', borderRadius: 10, cursor: 'pointer' }}>Done</button>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, fontSize: 14, padding: '12px', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
            <button onClick={submit} disabled={saving} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg, #FF6B00, #7B2FFF)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px', borderRadius: 10, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.8 : 1 }}>
              {saving ? <><Loader2 size={15} className="db-spin" /> Saving…</> : isEdit ? 'Save Changes' : 'Create & Test'}
            </button>
          </div>
        )}
      </motion.div>
      <style>{`.db-spin { animation: db-spin 0.8s linear infinite; } @keyframes db-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export function DeleteDbDialog({ conn, onCancel, onDeleted }: { conn: DbConnection; onCancel: () => void; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false)
  async function go() {
    setBusy(true)
    try {
      await api.del(`/db-connections/${conn.id}`)
      onDeleted()
    } catch {
      setBusy(false)
    }
  }
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 410, background: 'rgba(3,4,10,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()} style={{ width: 400, maxWidth: '94vw', background: 'rgba(13,14,26,0.97)', border: '1px solid rgba(255,77,109,0.3)', borderRadius: 16, padding: 24, backdropFilter: 'blur(16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,77,109,0.12)', border: '1px solid rgba(255,77,109,0.35)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#FF4D6D' }}><Trash2 size={17} /></span>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Delete connection?</div>
        </div>
        <p style={{ fontSize: 13.5, color: '#9AA0B8', lineHeight: 1.6, marginBottom: 20 }}>
          <strong style={{ color: '#fff' }}>{conn.name}</strong> will be removed. The agent will no longer be able to query it. This does not affect the database itself.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, fontSize: 14, padding: '11px', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
          <button onClick={go} disabled={busy} style={{ flex: 1, background: 'rgba(255,77,109,0.16)', border: '1px solid rgba(255,77,109,0.5)', color: '#FF4D6D', fontWeight: 700, fontSize: 14, padding: '11px', borderRadius: 10, cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Deleting…' : 'Delete'}</button>
        </div>
      </motion.div>
    </div>
  )
}

/** Management card for a single connection: masked summary, chips, test/edit/delete. */
export function DbConnectionCard({ conn, onEdit, onDelete }: { conn: DbConnection; onEdit: (c: DbConnection) => void; onDelete: (c: DbConnection) => void }) {
  const meta = DB_META[conn.db_type]
  const [t, setT] = useState<TestState | null>(null)
  async function runTest() {
    setT({ loading: true })
    try {
      const r = await testDb(conn.id)
      setT({ loading: false, ok: r.success, msg: r.success ? 'Connection OK' : (r.error || 'Failed') })
    } catch (err) {
      setT({ loading: false, ok: false, msg: err instanceof Error ? err.message : 'Failed' })
    }
  }
  return (
    <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, borderLeft: `4px solid ${meta.color}`, opacity: conn.is_active ? 1 : 0.7 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <DbLogo type={conn.db_type} size={40} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{conn.name}</div>
            <div style={{ fontSize: 12, color: meta.color, fontWeight: 600 }}>{meta.label}</div>
          </div>
        </div>
        <AccessChips c={conn} />
      </div>

      <div className="font-mono" style={{ fontSize: 11.5, color: '#9AA0B8', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 3, wordBreak: 'break-all' }}>
        {Object.keys(conn.credentials_masked || {}).length === 0 ? (
          <span style={{ color: '#6B7090' }}>credentials stored (encrypted)</span>
        ) : (
          Object.entries(conn.credentials_masked).map(([k, v]) => (
            <span key={k}><span style={{ color: '#6B7090' }}>{k}:</span> {String(v)}</span>
          ))
        )}
      </div>

      <div style={{ fontSize: 11.5, color: '#6B7090' }}>Last used: {fmtDate(conn.last_used_at)}</div>

      {t && !t.loading && t.msg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: t.ok ? '#00E676' : '#FF4D6D' }}>
          {t.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />} {t.msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <button onClick={runTest} disabled={t?.loading} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.35)', color: '#00D4FF', fontWeight: 600, fontSize: 13, padding: '9px', borderRadius: 9, cursor: t?.loading ? 'wait' : 'pointer' }}>
          {t?.loading ? <><Loader2 size={14} className="db-spin" /> Testing…</> : 'Test Connection'}
        </button>
        <button onClick={() => onEdit(conn)} aria-label="Edit" title="Edit" style={{ background: 'rgba(123,47,255,0.14)', border: '1px solid rgba(123,47,255,0.4)', color: '#B98CFF', padding: '9px 11px', borderRadius: 9, cursor: 'pointer', display: 'inline-flex' }}><Pencil size={15} /></button>
        <button onClick={() => onDelete(conn)} aria-label="Delete" title="Delete" style={{ background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.28)', color: '#FF4D6D', padding: '9px 11px', borderRadius: 9, cursor: 'pointer', display: 'inline-flex' }}><Trash2 size={15} /></button>
      </div>
      <style>{`.db-spin { animation: db-spin 0.8s linear infinite; } @keyframes db-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
