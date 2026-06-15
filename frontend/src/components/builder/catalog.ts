// ============================================================================
// Nerum Agent Builder — node catalog, field schemas, templates, helpers.
// Single source of truth shared by the sidebar, canvas, config panel and engine.
// ============================================================================
import type { CSSProperties } from 'react'
import type { Node, Edge } from '@xyflow/react'
import {
  Clock, Webhook, FileInput, Timer, Globe, Sparkles, Brain, Braces, PenLine, AlignLeft,
  GitBranch, Split, Filter, Repeat, GitMerge, Variable, StickyNote, ListChecks, type LucideIcon,
} from 'lucide-react'

export type NodeKind = 'trigger' | 'action' | 'ai' | 'condition' | 'logic' | 'note'
export type RunState = 'idle' | 'running' | 'done' | 'error'

export const KIND_COLOR: Record<NodeKind, string> = {
  trigger: '#FF6B00',
  action: '#7B2FFF',
  ai: '#FFD60A',
  condition: '#00D4FF',
  logic: '#FFFFFF',
  note: '#FFD60A',
}
export const KIND_LABEL: Record<NodeKind, string> = {
  trigger: 'TRIGGER', action: 'ACTION', ai: 'AI STEP', condition: 'CONDITION', logic: 'LOGIC', note: 'NOTE',
}

export interface NodeData extends Record<string, unknown> {
  kind: NodeKind
  subtype: string
  label: string
  subtitle: string
  config: Record<string, unknown>
  notes?: string
  outputVar?: string
}

export type FlowNode = Node<NodeData>

// ---- icons ----------------------------------------------------------------
interface IconSpec { slug?: string; hex?: string; Lucide?: LucideIcon }
export const NODE_ICON: Record<string, IconSpec> = {
  wa_received: { slug: 'whatsapp', hex: '25D366' },
  gmail_received: { slug: 'gmail', hex: 'EA4335' },
  schedule: { Lucide: Clock },
  webhook: { Lucide: Webhook },
  form_submit: { Lucide: FileInput },
  razorpay_payment: { slug: 'razorpay', hex: '2D76F9' },
  wa_send: { slug: 'whatsapp', hex: '25D366' },
  gmail_send: { slug: 'gmail', hex: 'EA4335' },
  telegram_send: { slug: 'telegram', hex: '2AABEE' },
  sheets_append: { slug: 'googlesheets', hex: '34A853' },
  razorpay_link: { slug: 'razorpay', hex: '2D76F9' },
  smartlist_update: { Lucide: ListChecks },
  wait: { Lucide: Timer },
  http: { Lucide: Globe },
  ai_step: { Lucide: Sparkles },
  classify: { Lucide: Brain },
  extract: { Lucide: Braces },
  generate_reply: { Lucide: PenLine },
  summarize: { Lucide: AlignLeft },
  if_else: { Lucide: GitBranch },
  switch: { Lucide: Split },
  filter: { Lucide: Filter },
  loop: { Lucide: Repeat },
  merge: { Lucide: GitMerge },
  set_var: { Lucide: Variable },
  note: { Lucide: StickyNote },
}

// ---- node definitions -----------------------------------------------------
export interface NodeDef {
  kind: NodeKind
  subtype: string
  label: string
  subtitle: string
  outputVar?: string
  defaultConfig: Record<string, unknown>
}

export interface Condition { field: string; op: string; value: string }

export const NODE_DEFS: NodeDef[] = [
  // triggers
  { kind: 'trigger', subtype: 'wa_received', label: 'WhatsApp Message', subtitle: 'When a message arrives', defaultConfig: {} },
  { kind: 'trigger', subtype: 'gmail_received', label: 'Email Received', subtitle: 'When an email arrives', defaultConfig: {} },
  { kind: 'trigger', subtype: 'schedule', label: 'Schedule', subtitle: 'Run on a cron schedule', defaultConfig: { cron: '0 9 * * *' } },
  { kind: 'trigger', subtype: 'webhook', label: 'Webhook', subtitle: 'On HTTP POST', defaultConfig: { method: 'POST', auth: 'none' } },
  { kind: 'trigger', subtype: 'form_submit', label: 'Form Submit', subtitle: 'Google Forms / Tally', defaultConfig: {} },
  { kind: 'trigger', subtype: 'razorpay_payment', label: 'Razorpay Payment', subtitle: 'On payment success', defaultConfig: {} },
  // actions
  { kind: 'action', subtype: 'wa_send', label: 'Send WhatsApp', subtitle: 'Message a number or list', defaultConfig: { to: '', message: '', language: 'en' } },
  { kind: 'action', subtype: 'gmail_send', label: 'Send Email', subtitle: 'Send via Gmail', defaultConfig: { to: '', subject: '', body: '' } },
  { kind: 'action', subtype: 'telegram_send', label: 'Send Telegram', subtitle: 'Message a chat or group', defaultConfig: { chatId: '', message: '' } },
  { kind: 'action', subtype: 'sheets_append', label: 'Update Google Sheet', subtitle: 'Append a row', defaultConfig: { spreadsheetId: '', sheetName: 'Sheet1', row: '' } },
  { kind: 'action', subtype: 'razorpay_link', label: 'Create Razorpay Link', subtitle: 'Generate a payment link', outputVar: 'payment_link', defaultConfig: { amount: '', description: '', customer: '' } },
  { kind: 'action', subtype: 'smartlist_update', label: 'Update Smart List', subtitle: 'Add or update a CRM record', defaultConfig: { list: '', field: '', value: '' } },
  { kind: 'action', subtype: 'wait', label: 'Wait / Delay', subtitle: 'Pause the workflow', defaultConfig: { duration: 5, unit: 'seconds' } },
  { kind: 'action', subtype: 'http', label: 'HTTP Request', subtitle: 'Custom API call', outputVar: 'response', defaultConfig: { method: 'GET', url: '', headers: '', body: '' } },
  // ai
  { kind: 'ai', subtype: 'ai_step', label: 'AI Step', subtitle: 'Run a prompt (your key)', outputVar: 'ai_output', defaultConfig: { model: 'claude', system: 'You are a helpful assistant for an Indian small business. Reply concisely.', user: '', temperature: 0.7, maxTokens: 512, outputVar: 'ai_output' } },
  { kind: 'ai', subtype: 'classify', label: 'Classify Intent', subtitle: 'Sort input into a category', outputVar: 'category', defaultConfig: { input: '{{trigger.message}}', categories: 'order, enquiry, complaint', outputVar: 'category' } },
  { kind: 'ai', subtype: 'extract', label: 'Extract Data', subtitle: 'Pull structured fields', outputVar: 'data', defaultConfig: { input: '{{trigger.message}}', fields: 'name, phone, amount', outputVar: 'data' } },
  { kind: 'ai', subtype: 'generate_reply', label: 'Generate Reply', subtitle: 'Write a contextual reply', outputVar: 'reply', defaultConfig: { context: '{{trigger.message}}', language: 'en', outputVar: 'reply' } },
  { kind: 'ai', subtype: 'summarize', label: 'Summarize', subtitle: 'Shorten long text', outputVar: 'summary', defaultConfig: { input: '', length: 'short', outputVar: 'summary' } },
  // conditions
  { kind: 'condition', subtype: 'if_else', label: 'If / Else', subtitle: 'Branch on a condition', defaultConfig: { conditions: [{ field: '{{trigger.message}}', op: 'contains', value: '' }], match: 'all' } },
  { kind: 'condition', subtype: 'switch', label: 'Switch', subtitle: 'Branch on a value', defaultConfig: { field: '{{category}}', cases: 'order, enquiry, complaint' } },
  { kind: 'condition', subtype: 'filter', label: 'Filter', subtitle: 'Pass only if true', defaultConfig: { conditions: [{ field: '', op: 'contains', value: '' }], match: 'all' } },
  // logic
  { kind: 'logic', subtype: 'loop', label: 'Loop', subtitle: 'Iterate over items', defaultConfig: { arrayVar: '{{data.items}}' } },
  { kind: 'logic', subtype: 'merge', label: 'Merge', subtitle: 'Combine multiple inputs', defaultConfig: {} },
  { kind: 'logic', subtype: 'set_var', label: 'Set Variable', subtitle: 'Store a value for later', outputVar: 'my_var', defaultConfig: { name: 'my_var', value: '' } },
  { kind: 'note', subtype: 'note', label: 'Note', subtitle: '', defaultConfig: { text: 'Double-click to edit this note' } },
]

export const DEF_BY_SUBTYPE: Record<string, NodeDef> = Object.fromEntries(NODE_DEFS.map((d) => [d.subtype, d]))

export const SIDEBAR_GROUPS: { kind: NodeKind; title: string; defs: NodeDef[] }[] = (
  ['trigger', 'action', 'ai', 'condition', 'logic'] as NodeKind[]
).map((kind) => ({ kind, title: kind === 'ai' ? 'AI STEPS' : `${KIND_LABEL[kind]}S`, defs: NODE_DEFS.filter((d) => d.kind === kind) }))
// Note lives in the Logic group for discovery.
SIDEBAR_GROUPS[SIDEBAR_GROUPS.length - 1].defs = [...SIDEBAR_GROUPS[SIDEBAR_GROUPS.length - 1].defs, DEF_BY_SUBTYPE.note]

// ---- field schemas (config panel) -----------------------------------------
export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'slider' | 'langToggle' | 'cron' | 'webhookUrl' | 'conditions'
export interface FieldDef {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  step?: number
  vars?: boolean
  help?: string
}

const MODELS = [
  { value: 'claude', label: 'Claude Sonnet' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'groq', label: 'Groq Llama' },
  { value: 'gemini', label: 'Gemini Pro' },
]

export const FIELD_SCHEMAS: Record<string, FieldDef[]> = {
  schedule: [{ key: 'cron', label: 'Cron expression', type: 'cron', placeholder: '0 9 * * *' }],
  webhook: [
    { key: 'url', label: 'Webhook URL', type: 'webhookUrl' },
    { key: 'method', label: 'Method', type: 'select', options: [{ value: 'POST', label: 'POST' }, { value: 'GET', label: 'GET' }] },
    { key: 'auth', label: 'Auth', type: 'select', options: [{ value: 'none', label: 'None' }, { value: 'apikey', label: 'API Key' }, { value: 'bearer', label: 'Bearer Token' }] },
  ],
  wa_send: [
    { key: 'to', label: 'To (phone or Smart List)', type: 'text', placeholder: '+91… or list name', vars: true },
    { key: 'message', label: 'Message', type: 'textarea', placeholder: 'Type your message…', vars: true },
    { key: 'language', label: 'Language', type: 'langToggle' },
  ],
  gmail_send: [
    { key: 'to', label: 'To', type: 'text', placeholder: 'name@email.com', vars: true },
    { key: 'subject', label: 'Subject', type: 'text', vars: true },
    { key: 'body', label: 'Body', type: 'textarea', vars: true },
  ],
  telegram_send: [
    { key: 'chatId', label: 'Chat ID / Group', type: 'text', vars: true },
    { key: 'message', label: 'Message', type: 'textarea', vars: true },
  ],
  sheets_append: [
    { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text' },
    { key: 'sheetName', label: 'Sheet name', type: 'text' },
    { key: 'row', label: 'Row data (comma-separated)', type: 'textarea', placeholder: '{{trigger.phone}}, {{ai_output}}', vars: true },
  ],
  razorpay_link: [
    { key: 'amount', label: 'Amount (₹)', type: 'text', placeholder: '450', vars: true },
    { key: 'description', label: 'Description', type: 'text', vars: true },
    { key: 'customer', label: 'Customer phone', type: 'text', vars: true },
  ],
  smartlist_update: [
    { key: 'list', label: 'Smart List', type: 'text' },
    { key: 'field', label: 'Field', type: 'text' },
    { key: 'value', label: 'Value', type: 'text', vars: true },
  ],
  wait: [
    { key: 'duration', label: 'Duration', type: 'number', min: 1 },
    { key: 'unit', label: 'Unit', type: 'select', options: [{ value: 'seconds', label: 'Seconds' }, { value: 'minutes', label: 'Minutes' }, { value: 'hours', label: 'Hours' }] },
  ],
  http: [
    { key: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'].map((m) => ({ value: m, label: m })) },
    { key: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com', vars: true },
    { key: 'headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{ "Authorization": "Bearer …" }' },
    { key: 'body', label: 'Body (JSON)', type: 'textarea', vars: true },
  ],
  ai_step: [
    { key: 'model', label: 'Model', type: 'select', options: MODELS },
    { key: 'system', label: 'System prompt', type: 'textarea' },
    { key: 'user', label: 'User prompt', type: 'textarea', vars: true },
    { key: 'temperature', label: 'Temperature', type: 'slider', min: 0, max: 1, step: 0.1 },
    { key: 'maxTokens', label: 'Max tokens', type: 'number', min: 1 },
    { key: 'outputVar', label: 'Output variable', type: 'text' },
  ],
  classify: [
    { key: 'input', label: 'Input', type: 'textarea', vars: true },
    { key: 'categories', label: 'Categories (comma-separated)', type: 'text' },
    { key: 'outputVar', label: 'Output variable', type: 'text' },
  ],
  extract: [
    { key: 'input', label: 'Input', type: 'textarea', vars: true },
    { key: 'fields', label: 'Fields (comma-separated)', type: 'text' },
    { key: 'outputVar', label: 'Output variable', type: 'text' },
  ],
  generate_reply: [
    { key: 'context', label: 'Context', type: 'textarea', vars: true },
    { key: 'language', label: 'Language', type: 'langToggle' },
    { key: 'outputVar', label: 'Output variable', type: 'text' },
  ],
  summarize: [
    { key: 'input', label: 'Text to summarize', type: 'textarea', vars: true },
    { key: 'length', label: 'Length', type: 'select', options: [{ value: 'short', label: 'Short' }, { value: 'medium', label: 'Medium' }, { value: 'bullets', label: 'Bullet points' }] },
    { key: 'outputVar', label: 'Output variable', type: 'text' },
  ],
  if_else: [{ key: 'conditions', label: 'Conditions', type: 'conditions' }],
  filter: [{ key: 'conditions', label: 'Keep when', type: 'conditions' }],
  switch: [
    { key: 'field', label: 'Field to switch on', type: 'text', vars: true },
    { key: 'cases', label: 'Cases (comma-separated)', type: 'text' },
  ],
  loop: [{ key: 'arrayVar', label: 'Array variable', type: 'text', vars: true }],
  set_var: [
    { key: 'name', label: 'Variable name', type: 'text' },
    { key: 'value', label: 'Value', type: 'text', vars: true },
  ],
}

export const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'contains', label: 'contains' },
  { value: 'gt', label: 'greater than' },
  { value: 'lt', label: 'less than' },
  { value: 'starts', label: 'starts with' },
  { value: 'empty', label: 'is empty' },
]

// ---- variables ------------------------------------------------------------
export const BUILTIN_VARS = ['trigger.message', 'trigger.phone', 'trigger.email', 'ai.output', 'current.date', 'current.time']

export function nodeOutputVar(n: FlowNode): string | undefined {
  const cfgVar = n.data.config?.outputVar
  if (typeof cfgVar === 'string' && cfgVar.trim()) return cfgVar.trim()
  if (n.data.subtype === 'set_var') {
    const nm = n.data.config?.name
    if (typeof nm === 'string' && nm.trim()) return nm.trim()
  }
  return DEF_BY_SUBTYPE[n.data.subtype]?.outputVar
}

/** Variables produced by nodes upstream of `nodeId`, plus built-ins. */
export function getUpstreamVariables(nodeId: string, nodes: FlowNode[], edges: Edge[]): string[] {
  const incoming = new Map<string, string[]>()
  edges.forEach((e) => {
    const arr = incoming.get(e.target) ?? []
    arr.push(e.source)
    incoming.set(e.target, arr)
  })
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const seen = new Set<string>()
  const out = new Set<string>()
  const visit = (id: string) => {
    for (const src of incoming.get(id) ?? []) {
      if (seen.has(src)) continue
      seen.add(src)
      const n = byId.get(src)
      if (n) {
        const v = nodeOutputVar(n)
        if (v) out.add(v)
      }
      visit(src)
    }
  }
  visit(nodeId)
  return [...BUILTIN_VARS, ...Array.from(out)]
}

// ---- factory + serialization ----------------------------------------------
let idCounter = 1
export function nextId(): string {
  return `n${Date.now().toString(36)}${(idCounter++).toString(36)}`
}

export function createNode(subtype: string, position: { x: number; y: number }, id?: string, configPatch?: Record<string, unknown>): FlowNode {
  const def = DEF_BY_SUBTYPE[subtype]
  return {
    id: id ?? nextId(),
    type: def.kind,
    position,
    data: {
      kind: def.kind,
      subtype: def.subtype,
      label: def.label,
      subtitle: def.subtitle,
      outputVar: def.outputVar,
      config: { ...structuredCloneSafe(def.defaultConfig), ...(configPatch ?? {}) },
    },
  }
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

export function edgeStyle(color: string): CSSProperties {
  return { stroke: color, strokeWidth: 2, strokeDasharray: '6 4' }
}

// Templates removed — users build their own workflows from scratch.
